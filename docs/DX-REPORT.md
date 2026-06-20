# developer experience (DX) Friction Log & SDK Feedback

This report details developer experience friction points, API design gaps, and SDK limitations encountered while building Visor with the **Terminal 3 Agent Dev Kit**.

## 1. Schema Validation inside `http-with-placeholders`
- **Friction**: The T3 Host API `http-with-placeholders` performs string replacement of `{{profile.param}}` markers at the network egress edge, but it lacks real-time validation of nested JSON schemas.
- **Impact**: If an unsecure agent injects invalid JSON syntax or if a placeholder resolver outputs a malformed string, the request reaches the target endpoint in a broken state, without the enclave having checked the output payload syntax.
- **Recommendation**: Support inline schema definitions (e.g. JSON Schema format) when registering a template. The enclave should reject egress dispatches if the hydrated JSON fails the validation schema prior to socket dispatch.

## 2. Lack of Native ECIES Helpers in SDK
- **Friction**: The Client SDK does not ship with built-in secp256k1 ECIES encryption/decryption utilities. We had to write custom TypeScript wrapper code utilizing Node's native `crypto` module, handling ephemeral keys, HKDF key derivation, and AES-256-GCM authentication tags.
- **Impact**: Increased boilerplate code on the client side, and elevated risk of developers implementing insecure ECIES parameter configurations (e.g. weak KDFs, bad IV lengths, or omitting tag verification).
- **Recommendation**: Bundle high-level ECIES envelope methods (e.g. `T3nClient.encryptForEnclave(payload, enclavePubKey)`) inside the `@t3n/sdk` NPM package.

## 3. Rigid Egress Authorization Policies
- **Friction**: The `authorisation` module requires whitelisting target hosts (e.g. `https://clinic.sandbox.test`), but does not support path-level wildcards or regex filters.
- **Impact**: It is difficult to authorize sub-paths dynamically, forcing developers to whitelist the entire root domain. This allows an compromised agent to redirect webhook payloads to unauthorized endpoints under the same domain.
- **Recommendation**: Extend the `authorisation` policy schema to support URL path prefixes (e.g., `https://domain.com/api/v1/*`) and HTTP method constraints.
