# Visor Security Audit Report: Invariants & Threat Vectors

This audit report outlines the security invariants, threat model, and cryptographic boundaries of the **Visor** privacy-blind submission protocol.

## 1. Security Invariants
- **PII Isolation**: Plaintext personal data (first_name, email, dob) must *never* reside in unsecure Coordinator Agent memory, logs, or network payloads.
- **Verification Authority**: The enclave *must* verify the Groth16 ownership proof and the on-chain x402 payment registry *prior* to executing egress payload decryption.
- **Volatile Scrubbing**: Immediately following placeholder hydration and egress dispatch, the enclave private keys, ephemeral secrets, and decrypted strings must be zeroed in memory using volatile writing routines.

## 2. Threat Analysis & Mitigations

### Threat A: Egress Proxy Eavesdropping
- **Vector**: A malicious node coordinator or host OS intercepts the decrypted outgoing egress webhook payloads since they are dispatched from the host network stack.
- **Mitigation**: Visor mandates HTTPS connections with strict TLS verification. Egress targets are authenticated by the TEE host, ensuring the payload is encrypted in-transit before leaving the hardware boundary.

### Threat B: Groth16 Proof Replay Attacks
- **Vector**: An attacker intercepts a valid user Groth16 proof and attempts to submit it to another template to claim authorization or access service.
- **Mitigation**: Visor binds user proofs to specific template commitments and submission IDs. Reusing the proof for a different template ID or sub ID fails validation inside the enclave.

### Threat C: Volatile Key Extraction
- **Vector**: An attacker runs a memory dump attack on the Coordinator host to extract ephemeral decryption keys.
- **Mitigation**: Visor uses ECIES with ephemeral key pairs. The enclave uses `std::ptr::write_volatile` (Rust) and `.fill(0)` (JS) to clean up keys immediately after decryption, leaving no residual footprint in RAM.
