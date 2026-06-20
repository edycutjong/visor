# Security Policy

## Supported Versions

Visor is currently in active development. We actively monitor and maintain the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of Visor seriously, especially given its role as a privacy-blind submission protocol managing sensitive user PII, Groth16 ownership ZK proofs, and secure out-of-band webhook dispatches inside Intel SGX/TDX enclaves.

If you discover a security vulnerability within Visor, please do not disclose it publicly. Instead, follow these steps to report it responsibly:

1. Go to the [Security Advisories](../../security/advisories) tab on GitHub.
2. Click **Report a vulnerability**.
3. Provide a detailed description of the vulnerability, including steps to reproduce it, potential impact on PII parameter swapping, Groth16 proof verification, ECIES decryption, or the VC receipt signing process.

We will acknowledge receipt of your vulnerability report within 48 hours and strive to resolve the issue responsibly.

## Scope

The following areas are in scope for security reports:
- The Rust/WASM TEE contract (`contract/`)
- The Node.js Coordinator Agent (`agent/`)
- The Visor Console Next.js dashboard (`ui/`)
- The Browser SDK (`sdk/`)
- The CLI submission client (`cli/`)

Thank you for helping keep Visor secure!
