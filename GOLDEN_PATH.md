# Golden Path — 2-Minute Reviewer Quickstart (Visor)

> For judges: see the whole **confidential application-submission** flow end-to-end with **zero credentials, no API keys, no external services**. Everything runs locally against the bundled Rust→WASM enclave contract.

## Choose your path

| Goal | Command | Time | Credentials |
|------|---------|------|-------------|
| **See it all pass** (lint, types, Rust + agent tests, e2e) | `make bootstrap && make ci` | ~2 min | None |
| **Click through the UI** | `cd ui && npm run dev` → http://localhost:3000 | ~2 min | None |
| **Seed templates / benchmark** | `make seed` · `make bench` | ~1 min | None |
| **Read the full walkthrough** | [DEMO.md](DEMO.md) | — | — |

## The 2-minute demo (UI)

1. **Create an application** — fill a sensitive submission (e.g. medical/financial) containing PII like SSN/income/diagnosis.
2. **Delegate to the agent** — the agent will submit on your behalf, but it (and the LLM) **never see plaintext PII** — values stay encrypted to the enclave.
3. **Pre-flight allowlist** — before any egress, the enclave checks the broker host against an **`authorisation`** allowlist.
4. **Blind submission** — the enclave fires the submission via **`http-with-placeholders`**, substituting `{{profile.*}}` markers at the egress wire so the broker receives real data but neither the agent nor the LLM ever does.
5. **Verifiable receipt** — each confirmed submission returns an enclave-signed **VC receipt** (open the Receipts modal) you can verify, proving what was sent without logging raw PII. Events are durably recorded to the **`outbox`**.

## What's real vs simulated
- **Real:** the Rust→WASM enclave contract, PII-blind placeholder egress, the `authorisation` allowlist pre-flight, enclave-signed VC receipts, and a durable `outbox`.
- **Simulated (local sandbox):** the Terminal 3 host APIs and data-broker endpoints (seeded test targets); no real applications are submitted. See the "Hackathon Simulation Context" banner in the app.

## Bug-bounty track
See **[SDK_AUDIT.md](SDK_AUDIT.md)** — confirmed, code-cited security findings verified from the real published `@terminal3` VC packages — and **[BUGS.md](BUGS.md)** for integration/doc gaps.
