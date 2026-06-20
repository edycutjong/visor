# Visor Coordinator Agent

TypeScript Express server acting as the untrusted proxy between client inputs and the secure TEE enclave contract. Exposes JSON-RPC endpoints, logs telemetry, and mocks third-party API destinations.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/template/register` | Register an egress template mapping variables |
| `POST` | `/api/submission/draft` | Create a draft submission mapping in the enclave |
| `POST` | `/api/submission/submit` | Decrypt parameters and dispatch blind outbox webhooks |
| `POST` | `/api/receipt/verify` | Verify the signature of an issued VC receipt |
| `GET` | `/api/submission/:id` | Fetch details of a specific submission |
| `GET` | `/api/telemetry` | Fetch telemetry logs for the dashboard console |
| `POST` | `/api/telemetry/clear` | Clear the telemetry log buffer |
| `POST` | `/api/mock/clinic/intake` | Sandbox mock route simulating clinic destination |
| `POST` | `/api/mock/ats/apply` | Sandbox mock route simulating job applicant system |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Gateway server port |
| `ENCLAVE_PUB_KEY` | *(hex)* | secp256k1 public key of the enclave |

## Development

```bash
# Install dependencies
npm install

# Start gateway server
npm run dev

# Run Jest unit and integration tests
npm test
```
