# Visor CLI (`@edycutjong/visor-cli`)

Developer command-line interface for the Visor privacy-blind submission gateway. It implements options to register templates, submit encrypted payloads, cryptographically verify receipts, and run local performance benchmarks.

## Commands

### `register-template`

```bash
visor register-template \
  --id clinic-intake \
  --schema ./data/fixtures/clinic-schema.json \
  --host clinic.sandbox.test
```

Registers an egress payload template defining placeholder mappings.

### `submit`

```bash
visor submit \
  --did did:t3n:maria123 \
  --template clinic-intake \
  --payload ./data/fixtures/maria-data.json \
  --limit-proof ./data/fixtures/maria-proof.json
```

Runs the client pipeline: ECIES-encrypts raw data, builds Groth16 commitments, and triggers the blind-submit outbox webhook. Saves the signed VC receipt.

### `verify-receipt`

```bash
visor verify-receipt --file ./receipts/submission-1.json
```

Verifies the ECDSA signature of an issued Verifiable Credential receipt.

### `bench`

```bash
visor bench --runs 50
```

Runs local latency benchmarks against the coordinator API.

## Development

```bash
# Install dependencies
npm install

# Build CLI package
npm run build
```
