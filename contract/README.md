# Visor TEE Contract

Rust WASM contract compiled to `wasm32-wasip2` and running inside a secure hardware-isolated enclave. Exposes the core privacy-blind submission gate operations.

## WIT Interfaces

| Method | Role |
|---|---|
| `register-template` | Registers the egress webhook structure, path routing, and profile variables mapping inside the enclave's secure KV store. |
| `draft-submission` | Registers a pending submission task, verifying the caller credentials. |
| `blind-submit` | Performs offline Groth16 proof check, verifies x402 payment, decrypts client ECIES envelope, replaces placeholders, and dispatches the payload via `http-with-placeholders`. |
| `finalize` | Issues the signed VC receipt and appends the audit trail records. |

## Build and Testing

```bash
# Compile contract target wasm32-wasip2
cargo build --target wasm32-wasip2 --release

# Run Rust unit tests
cargo test
```

## Security Model

The enclave acts as the cryptographically isolated boundaries. Unsecure agent modules only handle the ECIES ciphertext, and variables are only swapped at the secure edge. Plaintext data is immediately scrubbed from volatile memory on execution.
