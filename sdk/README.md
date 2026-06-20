# Visor SDK (`@visor/sdk`)

TypeScript client SDK for compiling encrypted payloads and validating submission proofs before forwarding to the Visor agent gateway.

## Exports

### `VisorClient` Class

```typescript
import { VisorClient } from '@visor/sdk';

const client = new VisorClient({
  agentUrl: 'http://localhost:3000'
});
```

#### Key Methods

| Method | Description |
|---|---|
| `encryptPayload(piiData, enclavePubKey)` | Encrypts the client's raw PII parameters into an ECIES encrypted envelope (`EciesEnvelope`). |
| `generateZkProof(userDid, profileCommitment)` | Compiles a Groth16 zero-knowledge ownership proof. |
| `submitBlind(envelope, proof, templateId)` | Forwards the payload and proof to the coordinator agent. |
| `verifyReceipt(vc)` | Validates the ECDSA signature of the issued receipt. |

## Development

```bash
# Install package dependencies
npm install

# Compile TypeScript sources
npm run build

# Run Jest unit tests
npm test
```
