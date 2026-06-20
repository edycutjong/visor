# Visor Privacy-Blind Submission Agent Specifications

Visor is a decentralized submission protocol designed for Terminal 3 Bounty Challenge (Launch Edition). It consists of secure TEE enclaves and an untrusted AI coordinator agent.

## Secure TEE Agent
- **Source**: `contract/src/lib.rs`
- **WIT Definition**: `contract/wit/world.wit`
- **Execution Environment**: Intel SGX/TDX Hardware Enclave running CCF (Confidential Consortium Framework).
- **Core Operations**:
  - `register-template`: Registers the egress endpoint structure and profile markers in KV store.
  - `draft-submission`: Instantiates a pending submission mapping, validating the actor against `authorisation` checks.
  - `blind-submit`:
    - Validates x402 payment token verification.
    - Offline-verifies the Groth16 user ownership commitment ZK proof.
    - Decrypts client-side ECIES envelopes using secp256k1 enclave keys.
    - Swaps user parameters (`{{profile.*}}`) in-memory.
    - Performs an out-of-band egress webhook dispatch strictly using `http-with-placeholders`.
    - Volatily scrubs private keys and decrypted strings immediately after execution.
  - `finalize`: Issues ECDSA-signed Verifiable Credential receipts and stores append-only ledger audit records.

## Node.js Coordinator Agent
- **Source**: `agent/src/index.ts`
- **Execution Environment**: Unsecured Host Server (Google Cloud Run / Node.js runtime).
- **Duties**:
  - Exposes JSON-RPC/REST API interface to client CLI, SDK, and Dashboard UI.
  - Passes client encrypted payloads and proofs down to the TEE enclave.
  - Intercepts webhook triggers and mocks sandbox endpoints (`clinic.sandbox.test`, `ats.sandbox.test`) to enable air-gapped integration testing.
  - Buffers telemetry logs from the enclave and agent processes.

## Verification & Trust Model
- The untrusted AI coordinator or LLM never receives, stores, or logs decrypted profile parameters.
- Egress hydration happens at the network edge of the enclave.
- All target hosts must match the registered template host.
