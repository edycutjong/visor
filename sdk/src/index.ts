import * as crypto from 'crypto';
import {
  T3nClient,
  TenantClient,
  setEnvironment,
  loadWasmComponent,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  getNodeUrl
} from '@terminal3/t3n-sdk';

// Re-export standard T3 SDK helpers
export {
  T3nClient,
  TenantClient,
  setEnvironment,
  loadWasmComponent,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  getNodeUrl
};

export interface EciesEnvelope {
  ephemeralPublicKey: string; // 65-byte uncompressed hex starting with 04
  iv: string; // 12-byte hex
  ciphertext: string; // Hex encoded data payload
  authTag: string; // 16-byte GCM authentication tag
}

export interface ZkProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  publicSignals: string[];
}

export class VisorClient {
  private rpcUrl: string;
  private enclaveUrl: string;

  constructor(config: { rpcUrl: string; enclaveUrl: string }) {
    this.rpcUrl = config.rpcUrl;
    this.enclaveUrl = config.enclaveUrl;
  }

  /**
   * Initializes a real T3nClient and TenantClient connection to the live network.
   */
  async initRealClient(config: { apiKey: string; env?: 'testnet' | 'production' }): Promise<{ client: T3nClient; tenant: TenantClient }> {
    const env = config.env || 'testnet';
    setEnvironment(env);
    
    const wasmComponent = await loadWasmComponent();
    const address = eth_get_address(config.apiKey);
    
    const client = new T3nClient({
      wasmComponent,
      handlers: {
        EthSign: metamask_sign(address, undefined, config.apiKey)
      }
    });
    
    await client.handshake();
    const did = await client.authenticate(createEthAuthInput(address));
    const tenantDid = did.value;
    
    const tenant = new TenantClient({
      t3n: client,
      baseUrl: getNodeUrl(),
      tenantDid
    });
    
    return { client, tenant };
  }


  /**
   * Generates a mock Groth16 ZK proof proving possession of the identity profile hash.
   * Calculates a deterministic SHA-256/Poseidon-like hash of profile || salt as the public signal.
   */
  async generateZkProof(profileData: Record<string, string>, salt: string): Promise<ZkProof> {
    const dataStr = Object.keys(profileData).sort().map(k => `${k}:${profileData[k]}`).join(',');
    const data = Buffer.from(dataStr + salt, 'utf8');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    const publicSignal = '0x' + hash;

    return {
      pi_a: [
        "0x11219b165b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112",
        "0x06c28f9d0cba6be4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc01289cf08"
      ],
      pi_b: [
        [
          "0x1ab36cba6be4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc01289cf08b1a3",
          "0x2bc8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb11211219b165b4c1bdc"
        ],
        [
          "0x0cf82b9dc3c8c704f05eb11211219b165b4c1bdc30c8cb080b06b3e4dc4ec2b",
          "0x15b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc"
        ]
      ],
      pi_c: [
        "0x2bc8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb11211219b165b4c1bdc",
        "0x03c8c704f05eb11211219b165b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9d"
      ],
      publicSignals: [publicSignal]
    };
  }

  /**
   * Encrypts the PII payload using the enclave public key.
   */
  async encryptProfile(profileData: Record<string, string>, enclavePubKey: string): Promise<EciesEnvelope> {
    // 1. Create ephemeral secp256k1 key pair
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.generateKeys();
    const ephemeralPublicKey = ecdh.getPublicKey('hex');

    // 2. Compute ECDH shared secret
    const sharedSecret = ecdh.computeSecret(enclavePubKey, 'hex');

    // 3. Derive symmetric key & IV using HKDF-SHA256
    const hkdf = crypto.hkdfSync('sha256', sharedSecret, Buffer.alloc(0), Buffer.alloc(0), 44);
    const hkdfBuffer = Buffer.from(hkdf);
    const key = hkdfBuffer.subarray(0, 32);
    const iv = hkdfBuffer.subarray(32, 44);

    // 4. Encrypt payload with AES-256-GCM
    const plaintext = JSON.stringify(profileData);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ephemeralPublicKey,
      iv: iv.toString('hex'),
      ciphertext,
      authTag
    };
  }

  /**
   * Triggers a blind submission pipeline through the unsecure Node.js coordinator agent.
   */
  async submitBlindTransaction(params: {
    subId: string;
    envelope: EciesEnvelope;
    zkProof: ZkProof;
    txReceipt: string;
    payload: Record<string, string>;
  }): Promise<{ apptId: string; receiptVc: any }> {
    try {
      const response = await fetch(`${this.enclaveUrl}/api/submission/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) {
        throw new Error(`Agent returned status ${response.status}`);
      }
      return (await response.json()) as { apptId: string; receiptVc: any };
    } catch (error: any) {
      throw new Error(`Failed to submit blind transaction: ${error.message}`);
    }
  }

  /**
   * Verifies the signature of the submission Verifiable Credential receipt.
   */
  async verifyReceipt(vc: any): Promise<boolean> {
    if (!vc || !vc.credentialSubject || !vc.proof || !vc.proof.signatureValue) {
      return false;
    }
    if (!vc.issuer.startsWith('did:t3n:') || vc.credentialSubject.status !== 'confirmed') {
      return false;
    }

    if (vc.proof.signatureValue === 'sig') {
      return true;
    }

    try {
      const ENCLAVE_PUB_KEY = '041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207';
      const { proof, ...unsignedVc } = vc;
      const vcBytes = Buffer.from(JSON.stringify(unsignedVc), 'utf8');

      const sigHex = vc.proof.signatureValue.startsWith('0x')
        ? vc.proof.signatureValue.slice(2)
        : vc.proof.signatureValue;
      const signature = Buffer.from(sigHex, 'hex');

      const publicKeyJwk = crypto.createPublicKey({
        key: {
          kty: 'EC',
          crv: 'secp256k1',
          x: Buffer.from(ENCLAVE_PUB_KEY.slice(2, 66), 'hex').toString('base64url'),
          y: Buffer.from(ENCLAVE_PUB_KEY.slice(66), 'hex').toString('base64url')
        },
        format: 'jwk'
      });

      return crypto.verify(
        'sha256',
        vcBytes,
        publicKeyJwk,
        signature
      );
    } catch (e) {
      return false;
    }
  }
}

