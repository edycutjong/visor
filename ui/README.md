# Visor Dashboard UI

Next.js 16 interactive dashboard for the Visor privacy-blind submission gate. It provides a split-screen telemetry panel comparing what the unsecure agent sees (variables like `{{profile.ssn}}`) with what the secure enclave dispatches at the HTTP proxy boundary.

## Features

- **Split-Screen Telemetry Console** — Live streaming comparison of the unsecure gateway vs. inside-TEE decrypted wire logs.
- **Interactive Submission Panel** — Configures new templates, uploads payloads, deposits x402 micro-billing fees, and triggers blind submits.
- **Receipt Verifier** — Client-side cryptographic verification of W3C Verifiable Credential receipts issued by the enclave.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: React 19, Lucide React
- **Styling**: Tailwind CSS v4 (with Outfit display and JetBrains Mono typography)
- **Testing**: Playwright E2E testing framework, Lighthouse CI

## Development

```bash
# Install package dependencies
npm install

# Run dev server
npm run dev

# Run E2E tests
npx playwright test
```
