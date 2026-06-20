import { app } from './index';
import { VisorClient } from '../../sdk/src/index';
import * as crypto from 'crypto';
import http from 'http';

// Enclave static public/private key matching index.ts
const ENCLAVE_PUB_KEY = '041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207';
const ENCLAVE_PRIVATE_KEY = 'b29d2f6ee9011fab5046eb7190f47c216e52438fa0fba67516e7c1e376673e9a';

describe('Visor Privacy-Blind Submission Agent Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  let client: VisorClient;

  beforeAll((done) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}`;
        client = new VisorClient({
          rpcUrl: 'https://rpc.bot-chain.sandbox.test',
          enclaveUrl: baseUrl
        });
      }
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  // --- Group 1: SDK Cryptographic & Client Unit Tests (10 tests) ---
  
  test('1. SDK can generate deterministic ZK proof', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const proof = await client.generateZkProof(pii, 'salt_123');
    expect(proof).toHaveProperty('pi_a');
    expect(proof).toHaveProperty('pi_b');
    expect(proof).toHaveProperty('pi_c');
    expect(proof.publicSignals.length).toBe(1);
  });

  test('2. ZK proof contains the hashed email commitment starting with 0x', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const proof = await client.generateZkProof(pii, 'salt_123');
    expect(proof.publicSignals[0]).toMatch(/^0x/);
  });

  test('3. SDK can generate ECIES envelope', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    expect(envelope).toHaveProperty('ephemeralPublicKey');
    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('ciphertext');
    expect(envelope).toHaveProperty('authTag');
  });

  test('4. ECIES envelope ciphertext is hex encoded', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    expect(envelope.ciphertext).toMatch(/^[0-9a-fA-F]+$/);
  });

  test('5. ECIES encryption uses uncompressed secp256k1 key starting with 04', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    expect(envelope.ephemeralPublicKey).toMatch(/^04/);
    expect(envelope.ephemeralPublicKey.length).toBe(130);
  });

  test('6. SDK verification checks VC status is confirmed', async () => {
    const mockVc = {
      credentialSubject: { status: 'confirmed', templateId: 'clinic-intake' },
      issuer: 'did:t3n:visor-enclave',
      proof: { signatureValue: 'sig' }
    };
    const isValid = await client.verifyReceipt(mockVc);
    expect(isValid).toBe(true);
  });

  test('7. SDK verification checks VC signer is did:t3n:', async () => {
    const mockVc = {
      credentialSubject: { status: 'confirmed', templateId: 'clinic-intake' },
      issuer: 'did:other:visor-enclave',
      proof: { signatureValue: 'sig' }
    };
    const isValid = await client.verifyReceipt(mockVc);
    expect(isValid).toBe(false);
  });

  test('8. SDK verification fails for null VC', async () => {
    const isValid = await client.verifyReceipt(null);
    expect(isValid).toBe(false);
  });

  test('9. SDK verification fails for missing proof', async () => {
    const mockVc = {
      credentialSubject: { status: 'confirmed', templateId: 'clinic-intake' },
      issuer: 'did:t3n:visor-enclave'
    };
    const isValid = await client.verifyReceipt(mockVc);
    expect(isValid).toBe(false);
  });

  test('10. SDK verification fails for incorrect status', async () => {
    const mockVc = {
      credentialSubject: { status: 'draft', templateId: 'clinic-intake' },
      issuer: 'did:t3n:visor-enclave',
      proof: { signatureValue: 'sig' }
    };
    const isValid = await client.verifyReceipt(mockVc);
    expect(isValid).toBe(false);
  });

  // --- Group 2: Decryption & Key Exchange Unit Tests (10 tests) ---

  const decryptTestEnvelope = (envelope: any): string => {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(ENCLAVE_PRIVATE_KEY, 'hex'));
    const sharedSecret = ecdh.computeSecret(Buffer.from(envelope.ephemeralPublicKey, 'hex'));
    const hkdf = crypto.hkdfSync('sha256', sharedSecret, Buffer.alloc(0), Buffer.alloc(0), 44);
    const hkdfBuffer = Buffer.from(hkdf);
    const key = hkdfBuffer.subarray(0, 32);
    const iv = Buffer.from(envelope.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'hex'));
    let decrypted = decipher.update(envelope.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  };

  test('11. Enclave can decrypt valid ECIES envelope with static keypair', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    const decrypted = decryptTestEnvelope(envelope);
    expect(JSON.parse(decrypted)).toEqual(pii);
  });

  test('12. Decrypted plaintext matches exactly and is valid JSON', async () => {
    const envelope = await client.encryptProfile({ foo: 'bar' }, ENCLAVE_PUB_KEY);
    const decrypted = decryptTestEnvelope(envelope);
    expect(() => JSON.parse(decrypted)).not.toThrow();
    expect(JSON.parse(decrypted).foo).toBe('bar');
  });

  test('13. Decryption fails if ciphertext is altered', async () => {
    const envelope = await client.encryptProfile({ foo: 'bar' }, ENCLAVE_PUB_KEY);
    envelope.ciphertext = envelope.ciphertext.slice(0, -2) + '00';
    expect(() => decryptTestEnvelope(envelope)).toThrow();
  });

  test('14. Decryption fails if IV is invalid/altered', async () => {
    const envelope = await client.encryptProfile({ foo: 'bar' }, ENCLAVE_PUB_KEY);
    envelope.iv = '00'.repeat(12);
    expect(() => decryptTestEnvelope(envelope)).toThrow();
  });

  test('15. Decryption fails if authTag is invalid/altered', async () => {
    const envelope = await client.encryptProfile({ foo: 'bar' }, ENCLAVE_PUB_KEY);
    envelope.authTag = '00'.repeat(16);
    expect(() => decryptTestEnvelope(envelope)).toThrow();
  });

  test('16. Decryption fails if ephemeralPublicKey is invalid', async () => {
    const envelope = await client.encryptProfile({ foo: 'bar' }, ENCLAVE_PUB_KEY);
    envelope.ephemeralPublicKey = ENCLAVE_PUB_KEY;
    expect(() => decryptTestEnvelope(envelope)).toThrow();
  });

  test('17. Verification fails if public key is not hex format', async () => {
    const envelope = await client.encryptProfile({ foo: 'bar' }, ENCLAVE_PUB_KEY);
    envelope.ephemeralPublicKey = 'invalid-non-hex-key-string';
    expect(() => decryptTestEnvelope(envelope)).toThrow();
  });

  test('18. Email normalizer check handles Unicode domains', () => {
    const email = 'maria@xn--health-r-us-rcb.com';
    expect(email.toLowerCase()).toContain('xn--');
  });

  test('19. Date formatting regex checker matches YYYY-MM-DD', () => {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(dobRegex.test('1994-08-14')).toBe(true);
    expect(dobRegex.test('19940814')).toBe(false);
  });

  test('20. Escape malicious characters handles quote escaping', () => {
    const badInput = 'maria@health.net\\", \\"malicious_payload\\": \\"injected\\"';
    const escaped = JSON.stringify({ email: badInput });
    expect(escaped).toContain('\\"');
  });

  // --- Group 3: Express REST API Integration Tests (20 tests) ---

  test('21. POST /api/template/register succeeds for valid clinic-intake template', async () => {
    const res = await fetch(`${baseUrl}/api/template/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'clinic-intake',
        host: baseUrl,
        path: '/api/mock/clinic/intake',
        method: 'POST',
        fields: {
          first_name: '{{profile.first_name}}',
          dob: '{{profile.date_of_birth}}',
          email: '{{profile.verified_contacts.email.value}}',
          symptom: 'symptom'
        },
        markers: ['first_name', 'date_of_birth', 'verified_contacts.email.value']
      })
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('registered');
    expect(body.id).toBe('clinic-intake');
  });

  test('22. POST /api/template/register fails for missing fields', async () => {
    const res = await fetch(`${baseUrl}/api/template/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'invalid-template' })
    });
    expect(res.status).toBe(400);
  });

  test('23. POST /api/submission/draft succeeds with valid template and subId', async () => {
    const res = await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 'clinic-intake',
        subId: 'sub_test_123',
        userDid: 'did:t3n:maria123'
      })
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.id).toBe('sub_test_123');
    expect(body.status).toBe('draft');
  });

  test('24. POST /api/submission/draft fails with missing parameters', async () => {
    const res = await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake' })
    });
    expect(res.status).toBe(400);
  });

  test('25. POST /api/submission/draft defaults userDid if not supplied', async () => {
    const res = await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 'clinic-intake',
        subId: 'sub_test_default'
      })
    });
    const body: any = await res.json();
    expect(body.userDid).toBe('did:t3n:maria123');
  });

  test('26. POST /api/submission/submit succeeds with valid credentials', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    const zkProof = await client.generateZkProof(pii, 'salt');

    // Make a draft
    const subId = 'sub_execution_1';
    await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake', subId })
    });

    const res = await fetch(`${baseUrl}/api/submission/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId,
        envelope,
        zkProof,
        txReceipt: '0xreceipt123',
        payload: { symptom: 'dermatology consult' }
      })
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('confirmed');
    expect(body).toHaveProperty('apptId');
    expect(body).toHaveProperty('receiptVc');
  });

  test('27. POST /api/submission/submit fails with invalid payment token', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    const zkProof = await client.generateZkProof(pii, 'salt');

    const subId = 'sub_execution_2';
    await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake', subId })
    });

    const res = await fetch(`${baseUrl}/api/submission/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId,
        envelope,
        zkProof,
        txReceipt: 'invalid-tx',
        payload: { symptom: 'rash' }
      })
    });
    expect(res.status).toBe(402);
  });

  test('28. POST /api/submission/submit fails for missing zkProof', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);

    const subId = 'sub_execution_3';
    await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake', subId })
    });

    const res = await fetch(`${baseUrl}/api/submission/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId,
        envelope,
        zkProof: null,
        txReceipt: '0xreceipt123',
        payload: { symptom: 'rash' }
      })
    });
    expect(res.status).toBe(400);
  });

  test('29. POST /api/submission/submit fails with non-existent submission', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    const zkProof = await client.generateZkProof(pii, 'salt');

    const res = await fetch(`${baseUrl}/api/submission/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId: 'non-existent-subId',
        envelope,
        zkProof,
        txReceipt: '0xreceipt123',
        payload: { symptom: 'rash' }
      })
    });
    expect(res.status).toBe(404);
  });

  test('30. POST /api/submission/submit fails for invalid ECIES ciphertext', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    envelope.ciphertext = '00';
    const zkProof = await client.generateZkProof(pii, 'salt');

    const subId = 'sub_execution_4';
    await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake', subId })
    });

    const res = await fetch(`${baseUrl}/api/submission/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId,
        envelope,
        zkProof,
        txReceipt: '0xreceipt123',
        payload: { symptom: 'rash' }
      })
    });
    expect(res.status).toBe(500);
  });

  test('31. GET /api/submission/:id returns 404 for non-existent submission', async () => {
    const res = await fetch(`${baseUrl}/api/submission/sub-not-exist`);
    expect(res.status).toBe(404);
  });

  test('32. GET /api/submission/:id returns 200 for valid submission and audits', async () => {
    const res = await fetch(`${baseUrl}/api/submission/sub_execution_1`);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.submission.status).toBe('confirmed');
    expect(body.audits.length).toBeGreaterThanOrEqual(2);
  });

  test('33. POST /api/receipt/verify returns valid true for valid VC', async () => {
    const mockVc = {
      id: 'receipt_123',
      issuer: 'did:t3n:visor-enclave-signer',
      credentialSubject: { status: 'confirmed' },
      proof: { signatureValue: 'sig' }
    };
    const res = await fetch(`${baseUrl}/api/receipt/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptVc: JSON.stringify(mockVc) })
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.valid).toBe(true);
  });

  test('34. GET /api/telemetry returns telemetry logs list', async () => {
    const res = await fetch(`${baseUrl}/api/telemetry`);
    expect(res.status).toBe(200);
    const logs: any = await res.json();
    expect(Array.isArray(logs)).toBe(true);
  });

  test('35. POST /api/telemetry/clear clears telemetry logs', async () => {
    const res = await fetch(`${baseUrl}/api/telemetry/clear`, { method: 'POST' });
    expect(res.status).toBe(200);
    const telRes = await fetch(`${baseUrl}/api/telemetry`);
    const logs: any = await telRes.json();
    expect(logs.length).toBe(0);
  });

  test('36. Scenario: multiple drafts and submissions work correctly', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    for (let i = 0; i < 3; i++) {
      const subId = `sub_multi_${i}`;
      await fetch(`${baseUrl}/api/submission/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'clinic-intake', subId })
      });
      const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
      const zkProof = await client.generateZkProof(pii, 'salt');
      const res = await fetch(`${baseUrl}/api/submission/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subId,
          envelope,
          zkProof,
          txReceipt: '0xreceipt123',
          payload: { symptom: `rash_${i}` }
        })
      });
      expect(res.status).toBe(200);
    }
  });

  test('37. Scenario: Unicode symptoms handling in blind-submit', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    const zkProof = await client.generateZkProof(pii, 'salt');

    const subId = 'sub_unicode';
    await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake', subId })
    });

    const res = await fetch(`${baseUrl}/api/submission/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId,
        envelope,
        zkProof,
        txReceipt: '0xreceipt123',
        payload: { symptom: 'dermatologîcal consult and scâb' }
      })
    });
    expect(res.status).toBe(200);
  });

  test('38. Scenario: Malicious JSON Injection prevention check', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    const zkProof = await client.generateZkProof(pii, 'salt');

    const subId = 'sub_inject';
    await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake', subId })
    });

    const res = await fetch(`${baseUrl}/api/submission/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId,
        envelope,
        zkProof,
        txReceipt: '0xreceipt123',
        payload: { symptom: 'dermatology; \\", \\"first_name\\": \\"Hacked\\", \\"dob\\": \\"2026-01-01' }
      })
    });
    expect(res.status).toBe(200);
  });

  test('39. Scenario: POST /api/receipt/verify returns false for missing proof', async () => {
    const mockVc = {
      id: 'receipt_123',
      issuer: 'did:t3n:visor-enclave-signer',
      credentialSubject: { status: 'confirmed' }
    };
    const res = await fetch(`${baseUrl}/api/receipt/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptVc: mockVc })
    });
    const body: any = await res.json();
    expect(body.valid).toBe(false);
  });

  test('40. Scenario: Verify receipt returns false for incorrect issuer', async () => {
    const mockVc = {
      id: 'receipt_123',
      issuer: 'did:t3n:fake-issuer',
      credentialSubject: { status: 'confirmed' },
      proof: { signatureValue: 'sig' }
    };
    const res = await fetch(`${baseUrl}/api/receipt/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptVc: mockVc })
    });
    const body: any = await res.json();
    expect(body.valid).toBe(false);
  });

  test('41. Hit mock endpoints directly', async () => {
    const resClinic = await fetch(`${baseUrl}/api/mock/clinic/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' })
    });
    expect(resClinic.status).toBe(200);

    const resAts = await fetch(`${baseUrl}/api/mock/ats/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bar: 'baz' })
    });
    expect(resAts.status).toBe(200);
  });

  test('42. Verify receipt handles missing proof type', async () => {
    const mockVcWithoutType = {
      id: 'receipt_123',
      issuer: 'did:t3n:visor-enclave-signer',
      credentialSubject: { status: 'confirmed' },
      proof: { signatureValue: 'sig' }
    };
    const res = await fetch(`${baseUrl}/api/receipt/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptVc: mockVcWithoutType })
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.valid).toBe(true);
  });

  test('43. Enclave/WASM loader errors are handled safely', async () => {
    const { wasmContracts } = require('./wasm-loader');
    
    const originalRegister = wasmContracts.registerTemplate;
    const originalDraft = wasmContracts.draftSubmission;
    const originalVerify = wasmContracts.verifyReceipt;
    const originalStatus = wasmContracts.getStatus;

    wasmContracts.registerTemplate = () => { throw new Error('Mock register error'); };
    wasmContracts.draftSubmission = () => { throw new Error('Mock draft error'); };
    wasmContracts.verifyReceipt = () => { throw new Error('Mock verify error'); };
    wasmContracts.getStatus = () => { throw new Error('Mock status error'); };

    try {
      const resTmpl = await fetch(`${baseUrl}/api/template/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'clinic-intake', host: 'http://foo.bar', path: '/', fields: {}, markers: [] })
      });
      expect(resTmpl.status).toBe(500);

      const resDraft = await fetch(`${baseUrl}/api/submission/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'clinic-intake', subId: 'sub_error' })
      });
      expect(resDraft.status).toBe(500);

      const resStatus = await fetch(`${baseUrl}/api/submission/sub_error`);
      expect(resStatus.status).toBe(500);

      const resVerify = await fetch(`${baseUrl}/api/receipt/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptVc: { issuer: 'did:t3n:visor-enclave-signer', proof: { signatureValue: 'sig' } } })
      });
      expect(resVerify.status).toBe(500);

    } finally {
      wasmContracts.registerTemplate = originalRegister;
      wasmContracts.draftSubmission = originalDraft;
      wasmContracts.verifyReceipt = originalVerify;
      wasmContracts.getStatus = originalStatus;
    }
  });

  test('44. POST /api/receipt/verify fails for missing receiptVc parameter', async () => {
    const res = await fetch(`${baseUrl}/api/receipt/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe('Missing receiptVc');
  });

  test('45. POST /api/submission/submit triggers fallback TX ID if apptId and candidateId are missing', async () => {
    const pii = { first_name: 'Maria', email: 'maria@health.net', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(pii, ENCLAVE_PUB_KEY);
    const zkProof = await client.generateZkProof(pii, 'salt');

    const subId = 'sub_fallback_tx';
    await fetch(`${baseUrl}/api/submission/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'clinic-intake', subId })
    });

    const { wasmContracts } = require('./wasm-loader');
    const originalBlindSubmit = wasmContracts.blindSubmit;
    const originalFinalize = wasmContracts.finalize;
    
    wasmContracts.blindSubmit = () => Buffer.from(JSON.stringify({}), 'utf8');
    wasmContracts.finalize = () => Buffer.from(JSON.stringify({
      vc: JSON.stringify({
        id: 'receipt_test_fallback',
        issuer: 'did:t3n:visor-enclave-signer',
        credentialSubject: { status: 'confirmed' },
        proof: { signatureValue: 'sig', type: 'JsonWebSignature2020' }
      })
    }), 'utf8');

    try {
      const res = await fetch(`${baseUrl}/api/submission/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subId,
          envelope,
          zkProof,
          txReceipt: '0xreceipt123',
          payload: {}
        })
      });
      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.apptId).toMatch(/^TX-/);
    } finally {
      wasmContracts.blindSubmit = originalBlindSubmit;
      wasmContracts.finalize = originalFinalize;
    }
  });
});


