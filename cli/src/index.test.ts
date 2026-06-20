let mockExistsSync = true;
let mockReadFileSyncContent = '{}';
const mockMkdirSync = jest.fn();
const mockWriteFileSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (p: string) => mockExistsSync,
  readFileSync: (p: string, encoding: string) => mockReadFileSyncContent,
  mkdirSync: (p: string, options?: any) => mockMkdirSync(p, options),
  writeFileSync: (p: string, data: string) => mockWriteFileSync(p, data),
}));

// Mock only the network calls of VisorClient, keeping real crypto behavior
jest.mock('@edycutjong/visor', () => {
  const actual = jest.requireActual('@edycutjong/visor');
  return {
    ...actual,
    VisorClient: jest.fn().mockImplementation((config) => {
      const client = new actual.VisorClient(config);
      client.submitBlindTransaction = jest.fn().mockResolvedValue({
        apptId: 'appt-123',
        receiptVc: {
          issuer: 'did:t3n:visor',
          credentialSubject: {
            submissionId: 'sub-123',
            templateId: 'clinic-intake',
            status: 'confirmed',
            timestamp: Math.floor(Date.now() / 1000)
          },
          proof: {
            signatureValue: 'sig' // Triggers the shortcut verify validation logic
          }
        }
      });
      return client;
    })
  };
});

import * as fs from 'fs';
import * as path from 'path';

describe('Visor CLI Unit Tests', () => {
  let originalArgv = process.argv;
  let originalExit = process.exit;
  let mockExit: jest.Mock;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeAll(() => {
    mockExit = jest.fn() as any;
    process.exit = mockExit as any;
  });

  afterAll(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  beforeEach(() => {
    jest.resetModules();
    mockExit.mockClear();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn();
    
    // Reset state
    mockExistsSync = true;
    mockReadFileSyncContent = '{}';
    mockMkdirSync.mockClear();
    mockWriteFileSync.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- 1. REGISTER TEMPLATE ---
  test('register-template - fails when file does not exist', async () => {
    mockExistsSync = false;
    process.argv = ['node', 'visor', 'register-template', '--template-id', 'test-template', '--file', 'missing.json'];
    
    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error: Template file not found'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('register-template - succeeds when template is valid and agent resolves ok', async () => {
    mockExistsSync = true;
    mockReadFileSyncContent = JSON.stringify({
      host: 'localhost:3000',
      path: '/api/mock/test',
      method: 'POST',
      fields: { name: '{{profile.first_name}}' },
      markers: ['test']
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true
    });

    process.argv = ['node', 'visor', 'register-template', '--template-id', 'test-template', '--file', 'valid.json'];
    
    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("✓ Template 'test-template' registered successfully."));
  });

  test('register-template - fails when agent returns error status', async () => {
    mockExistsSync = true;
    mockReadFileSyncContent = JSON.stringify({});

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    process.argv = ['node', 'visor', 'register-template', '--template-id', 'test-template', '--file', 'valid.json'];
    
    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('✗ Failed to register template. Status: 500'));
  });

  test('register-template - handles fetch rejection gracefully', async () => {
    mockExistsSync = true;
    mockReadFileSyncContent = JSON.stringify({});

    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

    process.argv = ['node', 'visor', 'register-template', '--template-id', 'test-template', '--file', 'valid.json'];
    
    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error registering template: Connection refused'));
  });

  // --- 2. SUBMIT COMMAND ---
  test('submit - runs blind submission campaign successfully', async () => {
    mockExistsSync = true;
    mockReadFileSyncContent = JSON.stringify({
      first_name: 'Maria',
      dob: '1994-08-14'
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    process.argv = ['node', 'visor', 'submit', '--profile', 'profile.json', '--template', 'clinic-intake', '--plan', '{"symptom":"cough"}'];

    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Generating Groth16 ZK proof of delegation...'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Encrypting PII credentials to ECIES Envelope...'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Submission Confirmed! Transaction receipt saved to'));
  });

  test('submit - fails when profile file does not exist', async () => {
    mockExistsSync = false;
    process.argv = ['node', 'visor', 'submit', '--profile', 'missing.json', '--template', 'clinic-intake', '--plan', '{"symptom":"cough"}'];

    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error: Profile file not found'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('submit - handles draft failure scenario', async () => {
    mockExistsSync = true;
    mockReadFileSyncContent = JSON.stringify({});

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400
    });

    process.argv = ['node', 'visor', 'submit', '--profile', 'profile.json', '--template', 'clinic-intake', '--plan', '{"symptom":"cough"}'];

    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Submission execution failed: Failed to draft submission. Agent status: 400'));
  });

  // --- 3. VERIFY-RECEIPT COMMAND ---
  test('verify-receipt - fails when receipt file does not exist', async () => {
    mockExistsSync = false;
    process.argv = ['node', 'visor', 'verify-receipt', '--receipt', 'missing-receipt.json'];

    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error: Receipt file not found'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('verify-receipt - logs valid message for cryptographically valid receipt', async () => {
    mockExistsSync = true;
    const mockVc = {
      issuer: 'did:t3n:visor',
      credentialSubject: {
        submissionId: 'sub-123',
        templateId: 'clinic-intake',
        status: 'confirmed',
        timestamp: 1781747879
      },
      proof: {
        signatureValue: 'sig'
      }
    };
    mockReadFileSyncContent = JSON.stringify(mockVc);

    process.argv = ['node', 'visor', 'verify-receipt', '--receipt', 'valid-receipt.json'];

    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ VALID RECEIPT: Cryptographic signature matches'));
  });

  test('verify-receipt - logs invalid message for cryptographically invalid receipt', async () => {
    mockExistsSync = true;
    const mockVc = {
      issuer: 'did:t3n:visor',
      credentialSubject: {
        submissionId: 'sub-123',
        templateId: 'clinic-intake',
        status: 'failed',
        timestamp: 1781747879
      }
    };
    mockReadFileSyncContent = JSON.stringify(mockVc);

    process.argv = ['node', 'visor', 'verify-receipt', '--receipt', 'invalid-receipt.json'];

    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ INVALID RECEIPT: Signature check failed'));
  });

  // --- 4. BENCH COMMAND ---
  test('bench - executes performance latency benchmark suite successfully', async () => {
    process.argv = ['node', 'visor', 'bench', '--runs', '2', '--concurrency', '1'];

    const { program } = require('./index');
    await program.parseAsync(process.argv);

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Running Visor Performance Latency Benchmark Suite (2 iterations)...'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('### Latency Benchmark Results (ms)'));
  });
});
