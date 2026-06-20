# Visor Pitch Deck Outline: Your Agent Acts. It Never Sees You.

- **Theme Style**: Swiss International (Geometric, structural sans-serif, deep slate background, cyan primary accent, amber placeholder accent, and bold display layouts).
- **Aesthetic Tokens**: Background: `#060814`, Primary Text: `#f1f5f9`, Accent: `#06b6d4` (Cyan) and `#f59e0b` (Amber).

---

### Slide 1: Title & Hook
- **Layout**: Massive bold display header on left. Code block of ECIES encrypted payload on right.
- **Header**: VISOR
- **Sub-header**: Your AI Agent Acts. It Never Sees You.
- **Visual**: Cybernetic background grid, neon-cyan glowing borders, and link to [readme-hero.png](file:///Users/edycu/Projects/Hackathon/HermesDocs/projects/dorahacks-t3adk-launch-2026/projects/visor/docs/readme-hero.png).
- **Speaker Notes**: "Hello everyone. Today I'm excited to present Visor, a privacy-blind submission agent protocol that resolves a fundamental conflict in AI: how can we let AI agents act for us without surrendering our entire identity? With Visor, your agent does the work, but it never sees your personal data."

---

### Slide 2: The Problem
- **Layout**: Split comparison columns. Highlighting risk stakes.
- **Header**: The PII Crisis of Autonomous Agents
- **Bullet Points**:
  - **Relatable Pain**: Booking clinic appointments or applying for jobs requires SSN, DOB, and email upfront.
  - **AI Eavesdropping**: Modern agent platforms send full context to unsecure LLMs, storing personal records on external history logs.
  - **Compliance Nightmare**: GDPR / HIPAA breaches occur if agents handle raw plaintext PII.
- **Speaker Notes**: "Meet Maria. She needs a dermatologist appointment in 48 hours. The booking form requires her SSN and medical symptoms. She wants her AI booking agent to schedule it, but she doesn't trust the AI with her personal identifiers. Currently, agents must see everything to compile HTTP requests, leaking PII to LLM servers."

---

### Slide 3: The Solution
- **Layout**: Centered hero visual. Clean icons.
- **Header**: Privacy-Blind Egress Proxy
- **Bullet Points**:
  - **Local Encryption**: Client encrypts PII locally using ECIES before agent execution.
  - **Placeholder Routing**: Agent operates only with cryptographic tokens like `{{profile.dob}}`.
  - **TEE Edge Substitution**: Placeholder replacement occurs strictly at the outgoing TEE network proxy edge.
- **Speaker Notes**: "Visor solves this by splitting the coordinator agent from the data boundary. Maria's agent receives only placeholders. It fills out the form with mock markers. When the payload is dispatched, the hardware enclave intercepts the egress wire, decrypts Maria's profile in secure memory, replaces the placeholders on-the-fly, and sends the plaintext directly to the clinic. The coordinator agent and the LLM remain completely blind."

---

### Slide 4: Core Product Flow
- **Layout**: Inline Mermaid sequence diagram or clean visual steps.
- **Header**: How Visor Blinds the Agent
- **Visual Description**:
  1. User encrypts PII locally → Ephemeral ECIES Envelope.
  2. Agent executes flow using template placeholders (`{{profile.*}}`).
  3. Enclave verifies ZK ownership commitment and on-chain payment.
  4. Enclave substitutes placeholders at Egress wire via `http-with-placeholders`.
- **Speaker Notes**: "Let's trace the flow. 1) Maria encrypts her PII locally. 2) The coordinator agent drafts the submission with placeholders. 3) The enclave verifies proof of ownership. 4) The enclave replaces the placeholders at the edge. The coordinator agent only handles the encrypted packet, preserving privacy end-to-end."

---

### Slide 5: Technical Architecture
- **Layout**: Two columns. Left column specifies WIT interfaces; right column lists the Host APIs.
- **Header**: Hardware Enclave & Host APIs
- **WIT Exports**: `register-template`, `draft-submission`, `blind-submit`, `finalize`, `verify-receipt`.
- **Host Imports**: `http-with-placeholders`, `user-profile`, `signing`, `kv-store`, `authorisation`, `clock`.
- **Speaker Notes**: "Under the hood, Visor runs a Rust WASM contract inside an Intel TDX hardware enclave. It leverages the Terminal 3 Host APIs to securely store profiles, check domain authorizations, run out-of-band egress requests, and issue signed verifiable credentials."

---

### Slide 6: Live Demo Highlights
- **Layout**: Split-screen dashboard mockup showing Agent panel (left) vs Egress wire (right).
- **Header**: The Egress Reveal
- **Highlights**:
  - **Agent Panel**: Faded amber text showing `{{profile.first_name}}`.
  - **Egress Wire**: Glowing neon-cyan text showing `"Maria"`.
  - **Ledger Audits**: Immutable ledger tracing actions, templates, and targets.
- **Speaker Notes**: "Our live dashboard demonstrates the 'Egress Reveal'. On the left, we see what the AI Agent/LLM handles: pure amber placeholders. On the right, we see the encrypted wire telemetry as it leaves the enclave: populated with Maria's actual details. The gap between what the agent sees and what is sent is the core security boundary."

---

### Slide 7: Sponsor Integration (Stacking)
- **Layout**: Grid cards highlighting T3 Host API methods.
- **Header**: Powered by Terminal 3 ADK
- **Bullet Points**:
  - `http-with-placeholders`: The critical API allowing on-the-fly replacement at the socket level.
  - `signing`: Enclave issues signed Verifiable Credentials verifying correct booking completion.
  - `kv-store` & `authorisation`: Strict firewall checks protecting Maria's data from unauthorized redirects.
- **Speaker Notes**: "We have integrated 6 Host APIs from the Terminal 3 Agent Dev Kit. This is a deep, native integration. Without the `http-with-placeholders` API, we would be forced to decrypt the PII inside the coordinator process, completely breaking our privacy model."

---

### Slide 8: Market Scale & TAM
- **Layout**: Large statistic callouts.
- **Header**: Quantifying Privacy-Blind AI
- **Metrics**:
  - **TAM**: $320B Medical Booking & ATS Recruitment markets.
  - **SAM**: $45B AI-driven autonomous agent integrations.
  - **SOM**: $1.2B Enterprise enclaved proxy applications.
- **Speaker Notes**: "By blinding agents, we unlock massive regulated industries. Healthcare clinical intakes and financial compliance onboarding can now safely use OpenAI and Anthropic agents without violating HIPAA or GDPR."

---

### Slide 9: Competitive Edge
- **Layout**: Simple 3-column table comparing Visor, standard agents, and static proxies.
- **Header**: Architectural Defensibility
- **Details**:
  - **Standard Agent**: 0% privacy, raw PII leaks to LLMs.
  - **Static Proxies**: High latency, requires custody of decryption keys, no verifiable receipts.
  - **Visor**: 100% PII privacy, hardware attestation, sub-second latency, verifiable receipts.
- **Speaker Notes**: "Compared to traditional proxies, Visor doesn't take custody of persistent keys. Ephemeral ECIES keypairs are generated per transaction, and keys are zeroed out immediately after dispatch. Judges can cryptographically verify receipts using the enclave DID."

---

### Slide 10: Performance Benchmarks
- **Layout**: Sleek latency metrics table.
- **Header**: Sub-Second Enclave Execution
- **Metrics**:
  - `t_profile_encrypt`: **0.43 ms** (Client-side)
  - `t_proof_verify`: **3.27 ms** (ZK & Cryptographic checks)
  - `t_placeholder_hydration`: **3.07 ms** (Egress replacement)
  - `t_signing`: **1.40 ms** (VC Signature)
- **Speaker Notes**: "Speed is critical for real-time agents. Our benchmarks prove that the TEE execution adds less than 10ms of overhead, keeping the entire transaction sub-second. Privacy doesn't come at the cost of speed."

---

### Slide 11: Future Roadmap
- **Layout**: Horizontal timeline showing 30, 60, and 90-day goals.
- **Header**: Visor Development Timeline
- **Roadmap**:
  - **30 Days**: Decentralized Identity (DID) Web/ION binding.
  - **60 Days**: Support nested JSON schemas inside template definitions.
  - **90 Days**: Launch Client-side React SDK for easy developer integration.
- **Speaker Notes**: "Our 90-day roadmap focuses on making Visor a drop-in SDK for web developers, allowing any React app to securely integrate privacy-blind agent handlers."

---

### Slide 12: Conclusion & Ask
- **Layout**: Massive bold slogan in center. Accent cyan backdrop.
- **Header**: Blinding Agents. Securing Identities.
- **Sub-header**: Build with Visor.
- **Speaker Notes**: "In conclusion, Visor makes AI agents safe for regulated enterprises and everyday users. Let agents act, but never let them see. Thank you."
