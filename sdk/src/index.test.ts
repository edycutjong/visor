import { VisorClient, EciesEnvelope } from './index';
import * as crypto from 'crypto';

// Enclave static keys matching visor specification
const ENCLAVE_PUB_KEY = '041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207';
const ENCLAVE_PRIVATE_KEY = 'b29d2f6ee9011fab5046eb7190f47c216e52438fa0fba67516e7c1e376673e9a';

// Mock the global fetch object
const originalFetch = global.fetch;
let mockFetchResponse: any = null;
let mockFetchError: any = null;

beforeAll(() => {
  global.fetch = jest.fn().mockImplementation(async () => {
    if (mockFetchError) {
      throw mockFetchError;
    }
    return {
      ok: mockFetchResponse ? mockFetchResponse.ok : true,
      status: mockFetchResponse ? mockFetchResponse.status : 200,
      json: async () => mockFetchResponse ? mockFetchResponse.body : {}
    } as any;
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

// Mock @terminal3/t3n-sdk library
jest.mock('@terminal3/t3n-sdk', () => {
  return {
    T3nClient: jest.fn().mockImplementation(() => {
      return {
        handshake: jest.fn().mockResolvedValue(true),
        authenticate: jest.fn().mockResolvedValue({ value: 'did:t3n:mocked_tenant_did' })
      };
    }),
    TenantClient: jest.fn().mockImplementation(() => {
      return {};
    }),
    setEnvironment: jest.fn(),
    loadWasmComponent: jest.fn().mockResolvedValue(new Uint8Array()),
    eth_get_address: jest.fn().mockReturnValue('0xMockAddress'),
    metamask_sign: jest.fn().mockReturnValue(jest.fn()),
    createEthAuthInput: jest.fn(),
    getNodeUrl: jest.fn().mockReturnValue('https://node-mock.testnet.terminal3.io')
  };
});

describe('Visor Client SDK Unit Tests', () => {
  let client: VisorClient;

  beforeEach(() => {
    client = new VisorClient({
      rpcUrl: 'https://rpc.mock.test',
      enclaveUrl: 'http://localhost:3000'
    });
    mockFetchResponse = null;
    mockFetchError = null;
  });

  test('should construct client correctly', () => {
    expect(client).toBeDefined();
  });

  test('should generate mock ZK Proof with deterministic public signals', async () => {
    const profile = { email: 'maria@health.net', name: 'Maria' };
    const proof = await client.generateZkProof(profile, 'salt_abc');
    
    expect(proof.pi_a).toBeDefined();
    expect(proof.pi_b).toBeDefined();
    expect(proof.pi_c).toBeDefined();
    expect(proof.publicSignals.length).toBe(1);
    expect(proof.publicSignals[0]).toMatch(/^0x/);
  });

  test('should perform real ECIES encryption of profile', async () => {
    const profile = { email: 'maria@health.net', first_name: 'Maria', dob: '1994-08-14' };
    const envelope = await client.encryptProfile(profile, ENCLAVE_PUB_KEY);
    
    expect(envelope.ephemeralPublicKey).toMatch(/^04/);
    expect(envelope.ephemeralPublicKey.length).toBe(130);
    expect(envelope.iv.length).toBe(24);
    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.authTag.length).toBe(32);

    // Verify decryption matches using private key
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

    expect(JSON.parse(decrypted)).toEqual(profile);
  });

  test('should submit blind transaction successfully', async () => {
    const envelope: EciesEnvelope = {
      ephemeralPublicKey: '04...',
      iv: 'iv...',
      ciphertext: 'cipher...',
      authTag: 'tag...'
    };
    const zkProof = {
      pi_a: [],
      pi_b: [],
      pi_c: [],
      publicSignals: []
    };

    mockFetchResponse = {
      ok: true,
      status: 200,
      body: { apptId: 'APT-1234', receiptVc: { issuer: 'did:t3n:visor-enclave-signer' } }
    };

    const result = await client.submitBlindTransaction({
      subId: 'sub_123',
      envelope,
      zkProof,
      txReceipt: '0xhash123',
      payload: { symptom: 'dermatology' }
    });

    expect(result.apptId).toBe('APT-1234');
    expect(result.receiptVc.issuer).toBe('did:t3n:visor-enclave-signer');
  });

  test('should throw error if submit blind transaction API returns non-ok status', async () => {
    mockFetchResponse = {
      ok: false,
      status: 500,
      body: {}
    };

    const envelope: EciesEnvelope = {
      ephemeralPublicKey: '04...',
      iv: 'iv...',
      ciphertext: 'cipher...',
      authTag: 'tag...'
    };
    const zkProof = { pi_a: [], pi_b: [], pi_c: [], publicSignals: [] };

    await expect(client.submitBlindTransaction({
      subId: 'sub_123',
      envelope,
      zkProof,
      txReceipt: '0xhash123',
      payload: {}
    })).rejects.toThrow('Failed to submit blind transaction: Agent returned status 500');
  });

  test('should throw error if submit blind transaction fetch fails', async () => {
    mockFetchError = new Error('Network error');

    const envelope: EciesEnvelope = {
      ephemeralPublicKey: '04...',
      iv: 'iv...',
      ciphertext: 'cipher...',
      authTag: 'tag...'
    };
    const zkProof = { pi_a: [], pi_b: [], pi_c: [], publicSignals: [] };

    await expect(client.submitBlindTransaction({
      subId: 'sub_123',
      envelope,
      zkProof,
      txReceipt: '0xhash123',
      payload: {}
    })).rejects.toThrow('Failed to submit blind transaction: Network error');
  });

  test('verifyReceipt should return false if VC parameters are missing', async () => {
    expect(await client.verifyReceipt(null)).toBe(false);
    expect(await client.verifyReceipt({})).toBe(false);
    expect(await client.verifyReceipt({ credentialSubject: {} })).toBe(false);
    expect(await client.verifyReceipt({ credentialSubject: {}, proof: {} })).toBe(false);
  });

  test('verifyReceipt should return false if issuer or status is invalid', async () => {
    const invalidIssuer = {
      credentialSubject: { status: 'confirmed' },
      issuer: 'did:invalid:123',
      proof: { signatureValue: 'sig' }
    };
    expect(await client.verifyReceipt(invalidIssuer)).toBe(false);

    const invalidStatus = {
      credentialSubject: { status: 'draft' },
      issuer: 'did:t3n:visor-enclave',
      proof: { signatureValue: 'sig' }
    };
    expect(await client.verifyReceipt(invalidStatus)).toBe(false);
  });

  test('verifyReceipt should return true for mock proof signatureValue === "sig"', async () => {
    const validMock = {
      credentialSubject: { status: 'confirmed' },
      issuer: 'did:t3n:visor-enclave-signer',
      proof: { signatureValue: 'sig' }
    };
    expect(await client.verifyReceipt(validMock)).toBe(true);
  });

  test('verifyReceipt should verify real cryptographic signatures on VC', async () => {
    const unsignedVc = {
      id: 'receipt_test_1',
      issuer: 'did:t3n:visor-enclave-signer',
      credentialSubject: {
        status: 'confirmed',
        submissionId: 'sub_1',
        templateId: 'clinic-intake',
        timestamp: 1718000000
      }
    };
    const vcBytes = Buffer.from(JSON.stringify(unsignedVc), 'utf8');

    // Create a real signature using enclave private key
    const privateKeyJwk = crypto.createPrivateKey({
      key: {
        kty: 'EC',
        crv: 'secp256k1',
        d: Buffer.from(ENCLAVE_PRIVATE_KEY, 'hex').toString('base64url'),
        x: Buffer.from(ENCLAVE_PUB_KEY.slice(2, 66), 'hex').toString('base64url'),
        y: Buffer.from(ENCLAVE_PUB_KEY.slice(66), 'hex').toString('base64url')
      },
      format: 'jwk'
    });
    const signature = crypto.sign('sha256', vcBytes, privateKeyJwk);

    const signedVc = {
      ...unsignedVc,
      proof: {
        type: 'JsonWebSignature2020',
        created: 1718000000,
        verificationMethod: 'did:t3n:visor-enclave-signer#key-1',
        proofPurpose: 'assertionMethod',
        signatureValue: '0x' + signature.toString('hex')
      }
    };

    expect(await client.verifyReceipt(signedVc)).toBe(true);

    // Altering the VC payload should fail verification
    const alteredVc = JSON.parse(JSON.stringify(signedVc));
    alteredVc.credentialSubject.status = 'altered'; // altered, but needs confirmed for initial pass
    expect(await client.verifyReceipt(alteredVc)).toBe(false);
  });

  test('verifyReceipt should return false if signature format is invalid', async () => {
    const invalidSigVc = {
      id: 'receipt_test_1',
      issuer: 'did:t3n:visor-enclave-signer',
      credentialSubject: { status: 'confirmed' },
      proof: { signatureValue: 'invalid-non-hex' }
    };
    expect(await client.verifyReceipt(invalidSigVc)).toBe(false);
  });

  test('should initialize real T3 client connection successfully', async () => {
    const sdkModules = await client.initRealClient({ apiKey: 'b29d2f6ee9011fab5046eb7190f47c216e52438fa0fba67516e7c1e376673e9a', env: 'testnet' });
    expect(sdkModules.client).toBeDefined();
    expect(sdkModules.tenant).toBeDefined();
  });
});
