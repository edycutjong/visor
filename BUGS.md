# Terminal 3 ADK — Onboarding Bug & Documentation Audit

> Submitted for the **Terminal 3 ADK Dev Challenge 2026 — Track 2 (Bug Bounty)**.
>
> Concrete onboarding blockers and documentation gaps found while building **Visor**
> (and the wider Vouch Suite: Epoch, Lethe, Silo, Synod, Visor) against the T3 ADK host
> APIs and SDK. Each entry lists where it bit us in Visor and the workaround we shipped.

> 🔬 **See [SDK_AUDIT.md](SDK_AUDIT.md)** for **confirmed, code-cited security findings** verified directly from the *real published* `@terminal3` VC packages via `npm pack` (hardcoded BBS `nonce` → proof replay, revocation bypass, no holder/challenge binding). The list below is integration/documentation gaps; the audit is reproducible SDK bugs.

| # | Area | Type | Severity |
|---|---|---|---|
| 1 | `metamask_sign` | Undocumented param | Low |
| 2 | `kv-store` | Interface discrepancy | High |
| 3 | `clock` | Method name mismatch | High |
| 4 | `signing` | Missing WIT helper | Medium |
| 5 | `loadWasmComponent` | Opaque path resolution | Medium |
| 6 | tenant DID | Hex double-encoding trap | High |
| 7 | public KV route | Missing spec (CORS/cache/pagination) | Low |
| 8 | transactions | Rollback semantics undocumented | Medium |
| 9 | `outbox` | Idempotency lifecycle undocumented | Medium |
| 10 | `http-with-placeholders` | Placeholder grammar & failure mode undocumented | High |
| 11 | `authorisation` | Allowlist matching semantics undocumented | Medium |

---

## Bug #1 — Undocumented second parameter in `metamask_sign`
**Type:** Documentation · **Severity:** Low

`EthSign: metamask_sign(address, undefined, T3N_API_KEY)` never documents the second positional argument, blocking custom wallet bindings. **Ask:** document its type/values or use a named options object.

## Bug #2 — `kv-store` interface discrepancy (map-name vs. flat keys)
**Type:** Interface · **Severity:** High

WIT declares `get(map-name, key)` but the C ABI is flat `(key_ptr, key_len)`. **Where it bit us:** Visor stores draft applications, template params, and an append-only action log through the flat shape. **Ask:** make the WIT and C ABI agree.

## Bug #3 — Clock API method-name mismatch
**Type:** Interface · **Severity:** High

Docs say `host_clock_now() -> u64`; WIT requires `now-ms() -> result<u64, clock-error>`, breaking `wasm32-wasip2` builds. **Ask:** align docs with WIT and state the target triple per example.

## Bug #4 — Missing `host_signing_issue_vc` in the `signing` WIT
**Type:** Interface · **Severity:** Medium

Templates call `host_signing_issue_vc`, but WIT only exposes raw `sign`. **Where it bit us:** Visor signs a VC receipt per confirmed submission and had to hand-build the W3C envelope over `sign`. **Ask:** add a VC helper or document the recipe.

## Gap #5 — Opaque `loadWasmComponent()` path resolution
**Type:** Documentation · **Severity:** Medium

`loadWasmComponent()` is called with no args and no documented resolution base/override. **Where it bit us:** we resolve the `.wasm` path explicitly. **Ask:** document the base path and an override.

## Gap #6 — Tenant DID hex double-encoding trap
**Type:** Correctness · **Severity:** High

`format!("z:{}:secrets", hex::encode(&tid))` double-encodes when `tenant_did()` returns a string, breaking KV routing. **Ask:** clarify the return type and correct derivation.

## Gap #7 — Public KV route specification
**Type:** Documentation · **Severity:** Low

`/api/dev/public-kv/<tid>/<tail>` is mentioned with no CORS, cache, or pagination spec. **Ask:** publish them.

## Gap #8 — Transaction rollback semantics undocumented
**Type:** Documentation · **Severity:** Medium

It is unspecified what an `Err` return rolls back (KV writes? outbox enqueues?). **Where it bit us:** a failed submission must not leave a draft marked "submitted" or double-enqueue to the outbox; we order writes in guest code. **Ask:** document the rollback boundary.

## Gap #9 — `outbox` idempotency lifecycle undocumented
**Type:** Documentation · **Severity:** Medium

The dedup window/TTL and overflow behavior of the `idk` key are undocumented. **Where it bit us:** Visor pushes submission events to an auditing ledger via the outbox and the correct key strategy depends on the dedup window. **Ask:** document the window/TTL and overflow behavior.

## Gap #10 — `http-with-placeholders` grammar & failure mode undocumented
**Type:** Interface · **Severity:** High

The crown-jewel API substitutes `{{profile.*}}` markers at the egress boundary, but the docs don't specify: (a) the exact placeholder grammar (nested paths like `{{profile.verified_contacts.email.value}}`, arrays, escaping), (b) what happens when a marker has **no** matching profile field (empty string? error? request aborted?), or (c) whether substitution applies to the URL/headers or only the body. **Where it bit us:** Visor builds structural requests full of nested markers; an unresolved marker silently leaving `{{…}}` in the payload would leak the *intent* and break the broker call. We defensively validate every marker resolves before egress. **Ask:** document the placeholder grammar, unmatched-marker behavior, and which request parts are substituted.

## Gap #11 — `authorisation` allowlist matching semantics undocumented
**Type:** Documentation · **Severity:** Medium

`check_authorized` validates a host against an allowlist before egress, but the docs don't define matching rules — exact host vs. wildcard/subdomain, port handling, scheme, or path scope. **Where it bit us:** Visor pre-flights every broker host against the allowlist before issuing the network call; ambiguous matching risks either blocking valid brokers or allowing look-alike hosts. **Ask:** document the matching grammar (wildcards, ports, paths).
