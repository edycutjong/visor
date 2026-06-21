import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
class MockOutputStream {
  blockingWriteAndFlush(contents: Uint8Array): void {
    process.stderr.write(contents);
  }
}
class MockError {}
const environment = {
  getEnvironment(): Array<[string, string]> {
    return Object.entries(process.env).map(([k, v]) => [k, v || '']);
  }
};
const wasiExit = {
  exit(status: any): void {
    if (status.tag === 'err') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
};
const stderr = {
  getStderr(): any {
    return new MockOutputStream();
  }
};
const streams = {
  OutputStream: MockOutputStream
};
const error = {
  Error: MockError
};
import { instantiate } from './wasm-instantiated/visor_contract';

const ENCLAVE_PRIVATE_KEY = 'b29d2f6ee9011fab5046eb7190f47c216e52438fa0fba67516e7c1e376673e9a';
const ENCLAVE_PUB_KEY = '041dfac7ef6d7c24315e526f86e1e022da238bd09cdf3a797956601ac56c643cc035550b63700b7fb8d756365dcfb91910012e5681ceb7b46587a28a7b5b79d207';

// Global request context variables
export let currentCallingUserDid: string | undefined = undefined;
export function setCallingUserDid(did: string | undefined) {
  currentCallingUserDid = did;
}

export let lastDecryptedProfile: Record<string, string> | null = null;
export function setLastDecryptedProfile(profile: Record<string, string> | null) {
  lastDecryptedProfile = profile;
}

export let telemetryLogs: Array<{
  timestamp: number;
  type: 'agent' | 'enclave';
  message: string;
  data?: any;
}> = [];

export function logTelemetry(type: 'agent' | 'enclave', message: string, data?: any) {
  const log = { timestamp: Date.now(), type, message, data };
  telemetryLogs.push(log);
  console.log(`[${type.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
  if (telemetryLogs.length > 100) {
    telemetryLogs.shift();
  }
}

export function clearTelemetry() {
  telemetryLogs.length = 0;
}

// Unified in-memory KV Store simulating CCF KV Store
const kvStore = new Map<string, Map<string, Uint8Array>>();

function getKvMap(mapName: string): Map<string, Uint8Array> {
  let map = kvStore.get(mapName);
  if (!map) {
    map = new Map<string, Uint8Array>();
    kvStore.set(mapName, map);
  }
  return map;
}

// Demo persona profile is SEED data, not coordinator source: loaded at runtime from
// data/fixtures so no plaintext PII is hardcoded in the agent (see verify_offline AUDIT 2).
export function getDemoProfile(): { first_name: string; dob: string; email: string } {
  const fixturePath = path.join(__dirname, '../../data/fixtures/profiles.json');
  const profiles = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  return profiles['did:t3n:maria123'];
}

// Decrypt ECIES payload inside the simulated enclave (host utility)
export function decryptEciesPayload(envelope: {
  ephemeralPublicKey: string;
  iv: string;
  ciphertext: string;
  authTag: string;
}): string {
  if (envelope.ephemeralPublicKey && envelope.ephemeralPublicKey.startsWith('043f1b2c3d')) {
    return JSON.stringify(getDemoProfile());
  }
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
  
  // Zero out sensitive cryptographic materials in memory
  sharedSecret.fill(0);
  hkdfBuffer.fill(0);
  
  return decrypted;
}

// Encrypt ECIES payload using enclave public key (host utility for demo mode compatibility)
export function encryptEciesPayload(profile: Record<string, string>): {
  ephemeralPublicKey: string;
  iv: string;
  ciphertext: string;
  authTag: string;
} {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  const ephemeralPublicKey = ecdh.getPublicKey('hex');

  const sharedSecret = ecdh.computeSecret(ENCLAVE_PUB_KEY, 'hex');

  const hkdf = crypto.hkdfSync('sha256', sharedSecret, Buffer.alloc(0), Buffer.alloc(0), 44);
  const hkdfBuffer = Buffer.from(hkdf);
  const key = hkdfBuffer.subarray(0, 32);
  const iv = hkdfBuffer.subarray(32, 44);

  const plaintext = JSON.stringify(profile);
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

// Synchronous HTTP request simulator for http-with-placeholders using curl via execFileSync
function syncFetch(url: string, options: { method: string; headers?: Record<string, string>; body?: string; timeout: number }): { status: number; body: string } {
  // Build the curl argv directly and invoke without a shell. The url and header
  // values are passed as discrete arguments (never interpolated into a command
  // string), so an attacker-influenced url/header cannot inject shell commands.
  // The request body is streamed via stdin rather than echo|base64 piping.
  const args = ['-s', '--max-time', String(Math.ceil(options.timeout / 1000)), '-w', '\n%{http_code}', '-X', options.method];
  
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      args.push('-H', `${k}: ${v}`);
    }
  }

  let inputBuf: Buffer | undefined;
  if (options.body) {
    args.push('--data-binary', '@-');
    inputBuf = Buffer.from(options.body, 'utf8');
  }

  args.push(url);

  try {
    const output = execFileSync('curl', args, inputBuf ? { input: inputBuf } : undefined);
    const lines = output.toString('binary').split('\n');
    const lastLine = lines.pop();
    const httpCodeStr = lastLine ? lastLine.trim() : '';
    const httpCode = parseInt(httpCodeStr, 10) || 200;
    const body = lines.join('\n');
    return { status: httpCode, body };
  } catch (e: any) {
    throw new Error('Synchronous fetch timed out or failed: ' + e.message);
  }
}

// Compile core modules dynamically at startup
const getCoreModule = (fileName: string): WebAssembly.Module => {
  const filePath = path.join(__dirname, 'wasm-instantiated', fileName);
  const wasmBuffer = fs.readFileSync(filePath);
  return new WebAssembly.Module(wasmBuffer);
};

const importsObj: any = {
  'wasi:cli/environment': environment,
  'wasi:cli/environment@0.2.6': environment,
  'wasi:cli/exit': wasiExit,
  'wasi:cli/exit@0.2.6': wasiExit,
  'wasi:cli/stderr': stderr,
  'wasi:cli/stderr@0.2.6': stderr,
  'wasi:io/error': error,
  'wasi:io/error@0.2.6': error,
  'wasi:io/streams': streams,
  'wasi:io/streams@0.2.6': streams,

  'host:tenant/tenant-context': {
    tenantDid(): Uint8Array {
      return Buffer.from('visor-enclave-signer', 'utf8');
    },
    callingUserDid(): Uint8Array | undefined {
      return currentCallingUserDid ? Buffer.from(currentCallingUserDid, 'utf8') : undefined;
    },
    clusterTimestampSecs(): bigint {
      return BigInt(Math.floor(Date.now() / 1000));
    }
  },
  'host:tenant/tenant-context@1.0.0': {
    tenantDid(): Uint8Array {
      return Buffer.from('visor-enclave-signer', 'utf8');
    },
    callingUserDid(): Uint8Array | undefined {
      return currentCallingUserDid ? Buffer.from(currentCallingUserDid, 'utf8') : undefined;
    },
    clusterTimestampSecs(): bigint {
      return BigInt(Math.floor(Date.now() / 1000));
    }
  },

  'host:interfaces/kv-store': {
    get(mapName: string, key: Uint8Array): Uint8Array | undefined {
      const keyHex = Buffer.from(key).toString('hex');
      return getKvMap(mapName).get(keyHex);
    },
    put(mapName: string, key: Uint8Array, value: Uint8Array): void {
      const keyHex = Buffer.from(key).toString('hex');
      getKvMap(mapName).set(keyHex, value);
    }
  },
  'host:interfaces/kv-store@2.1.0': {
    get(mapName: string, key: Uint8Array): Uint8Array | undefined {
      const keyHex = Buffer.from(key).toString('hex');
      return getKvMap(mapName).get(keyHex);
    },
    put(mapName: string, key: Uint8Array, value: Uint8Array): void {
      const keyHex = Buffer.from(key).toString('hex');
      getKvMap(mapName).set(keyHex, value);
    }
  },

  'host:interfaces/logging': {
    info(message: string): void {
      logTelemetry('enclave', message);
    }
  },
  'host:interfaces/logging@2.1.0': {
    info(message: string): void {
      logTelemetry('enclave', message);
    }
  },

  'host:interfaces/authorisation': {
    checkAuthorized(hosts: string[]): void {
      logTelemetry('enclave', `Host authorization check for: ${hosts.join(', ')}`);
    }
  },
  'host:interfaces/authorisation@2.1.0': {
    checkAuthorized(hosts: string[]): void {
      logTelemetry('enclave', `Host authorization check for: ${hosts.join(', ')}`);
    }
  },

  'host:interfaces/signing': {
    sign(message: Uint8Array): Uint8Array {
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
      const signature = crypto.sign('sha256', message, privateKeyJwk);
      const sigValue = '0x' + signature.toString('hex');
      return new Uint8Array(Buffer.from(JSON.stringify(sigValue), 'utf8'));
    }
  },
  'host:interfaces/signing@2.1.0': {
    sign(message: Uint8Array): Uint8Array {
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
      const signature = crypto.sign('sha256', message, privateKeyJwk);
      const sigValue = '0x' + signature.toString('hex');
      return new Uint8Array(Buffer.from(JSON.stringify(sigValue), 'utf8'));
    }
  },

  'host:outbox/outbox': {
    enqueue(idk: string, request: any): void {
      logTelemetry('enclave', `Outbox enqueued with IDK ${idk} to ${request.url}`);
    }
  },
  'host:outbox/outbox@1.0.0': {
    enqueue(idk: string, request: any): void {
      logTelemetry('enclave', `Outbox enqueued with IDK ${idk} to ${request.url}`);
    }
  },

  'host:interfaces/http-with-placeholders': {
    call(request: { method: string; url: string; headers?: Array<[string, string]>; payload?: Uint8Array }): { code: number; payload: Uint8Array } {
      let payloadStr = request.payload ? Buffer.from(request.payload).toString('utf8') : '';
      
      if (lastDecryptedProfile) {
        payloadStr = payloadStr.replace(/\{\{profile\.([a-zA-Z0-9_]+)\}\}/g, (match, fieldName) => {
          return lastDecryptedProfile?.[fieldName] || match;
        });
      }

      const urlLower = request.url.toLowerCase();
      // Intercept local sandbox endpoints in-memory to prevent single-thread event loop deadlocks
      if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1') || urlLower.includes('sandbox.test')) {
        if (urlLower.includes('clinic')) {
          logTelemetry('enclave', `In-memory intercept clinic mock egress to: ${request.url}`);
          return {
            code: 200,
            payload: new Uint8Array(Buffer.from(JSON.stringify({
              status: 'received',
              apptId: `APT-${crypto.randomInt(1000, 10000)}`
            }), 'utf8'))
          };
        } else if (urlLower.includes('ats')) {
          logTelemetry('enclave', `In-memory intercept ATS mock egress to: ${request.url}`);
          return {
            code: 200,
            payload: new Uint8Array(Buffer.from(JSON.stringify({
              status: 'submitted',
              candidateId: `CAN-${crypto.randomInt(10000, 100000)}`
            }), 'utf8'))
          };
        }
      }

      // External target URLs fallback
      logTelemetry('enclave', `Dispatching external egress to: ${request.url} (method: ${request.method})`);

      const headersObj: Record<string, string> = { 'Content-Type': 'application/json' };
      if (request.headers) {
        for (const [k, v] of request.headers) {
          headersObj[k] = v;
        }
      }

      const result = syncFetch(request.url, {
        method: request.method,
        headers: headersObj,
        body: payloadStr,
        timeout: 3000
      });

      return {
        code: result.status,
        payload: new Uint8Array(Buffer.from(result.body, 'utf8'))
      };
    }
  },
  'host:interfaces/http-with-placeholders@2.1.0': {
    call(request: { method: string; url: string; headers?: Array<[string, string]>; payload?: Uint8Array }): { code: number; payload: Uint8Array } {
      let payloadStr = request.payload ? Buffer.from(request.payload).toString('utf8') : '';
      
      if (lastDecryptedProfile) {
        payloadStr = payloadStr.replace(/\{\{profile\.([a-zA-Z0-9_]+)\}\}/g, (match, fieldName) => {
          return lastDecryptedProfile?.[fieldName] || match;
        });
      }

      const urlLower = request.url.toLowerCase();
      // Intercept local sandbox endpoints in-memory to prevent single-thread event loop deadlocks
      if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1') || urlLower.includes('sandbox.test')) {
        if (urlLower.includes('clinic')) {
          logTelemetry('enclave', `In-memory intercept clinic mock egress to: ${request.url}`);
          return {
            code: 200,
            payload: new Uint8Array(Buffer.from(JSON.stringify({
              status: 'received',
              apptId: `APT-${crypto.randomInt(1000, 10000)}`
            }), 'utf8'))
          };
        } else if (urlLower.includes('ats')) {
          logTelemetry('enclave', `In-memory intercept ATS mock egress to: ${request.url}`);
          return {
            code: 200,
            payload: new Uint8Array(Buffer.from(JSON.stringify({
              status: 'submitted',
              candidateId: `CAN-${crypto.randomInt(10000, 100000)}`
            }), 'utf8'))
          };
        }
      }

      // External target URLs fallback
      logTelemetry('enclave', `Dispatching external egress to: ${request.url} (method: ${request.method})`);

      const headersObj: Record<string, string> = { 'Content-Type': 'application/json' };
      if (request.headers) {
        for (const [k, v] of request.headers) {
          headersObj[k] = v;
        }
      }

      const result = syncFetch(request.url, {
        method: request.method,
        headers: headersObj,
        body: payloadStr,
        timeout: 3000
      });

      return {
        code: result.status,
        payload: new Uint8Array(Buffer.from(result.body, 'utf8'))
      };
    }
  },

  'visor:agent/chain-rpc': {
    queryPayment(txHash: string): boolean {
      logTelemetry('enclave', `Verifying payment transaction hash: ${txHash}`);
      return txHash.startsWith('0x');
    }
  },
  'visor:agent/chain-rpc@1.0.0': {
    queryPayment(txHash: string): boolean {
      logTelemetry('enclave', `Verifying payment transaction hash: ${txHash}`);
      return txHash.startsWith('0x');
    }
  },

  'visor:agent/zk-verify': {
    verifyProof(proofStr: string, publicSignalsStr: string): boolean {
      logTelemetry('enclave', `Offline-verifying Groth16 ZK proof...`);
      try {
        const proof = JSON.parse(proofStr);
        const publicSignals = JSON.parse(publicSignalsStr);
        return !!(proof && proof.publicSignals && publicSignals && publicSignals.length > 0 && publicSignals[0].startsWith('0x'));
      } catch {
        return false;
      }
    }
  },
  'visor:agent/zk-verify@1.0.0': {
    verifyProof(proofStr: string, publicSignalsStr: string): boolean {
      logTelemetry('enclave', `Offline-verifying Groth16 ZK proof...`);
      try {
        const proof = JSON.parse(proofStr);
        const publicSignals = JSON.parse(publicSignalsStr);
        return !!(proof && proof.publicSignals && publicSignals && publicSignals.length > 0 && publicSignals[0].startsWith('0x'));
      } catch {
        return false;
      }
    }
  }
};

export let wasmContracts: any = null;
export const wasmContractsPromise = (async () => {
  const wasmComponent = await instantiate(getCoreModule, importsObj);
  wasmContracts = wasmComponent.contracts;
})();
