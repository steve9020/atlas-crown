# Atlas/Crown × NIST AI Risk Management Framework 1.0 — Mapping
**Prepared for Steve Wagner — 2026-09-28. Published on his word 2026-09-28. Living document — updated as the machinery changes. Not a compliance claim.**

This maps what Atlas/Crown *actually does today* to the NIST AI RMF 1.0 functions (GOVERN, MAP, MEASURE, MANAGE). Where the machinery is real, it names the mechanism. Where it is partial or planned, it says so. Nothing here claims certification — the RMF is voluntary guidance, and this is a builder's honest map, not an auditor's stamp.

---

## GOVERN — culture, accountability, and oversight structures

| RMF subcategory (plain sense) | Atlas/Crown mechanism | Standing |
|---|---|---|
| Accountability for AI decisions is assigned to a named human | Every build, doctrine change, and public word traces to Steve Wagner (ATTRIBUTION.md, commit history, approval seals with `by:` fields). | Live |
| Policies exist that people can actually read | ATLAS_DOCTRINE.md (D1–D8) is the written constitution: honesty machinery universal, obedience via swappable charter, R4 constitutional ceiling. | Live |
| Human oversight with real veto power | His veto stands over all autonomous action; a violation narrows or revokes the autonomy. | Live |
| Workforce roles are defined | Architect (Steve) vs hands (assistant) vs machinery (Atlas) — the split is explicit and was his order. | Live |
| Third-party risk is tracked | Frequent-flyers unknown-pattern log: highest-count-first, injection-scanned, capped/quarantined/archived. | Live |

**Gap (closed 2026-09-28, see bottom):** was no formal risk register — now published as `docs/RISK_REGISTER.md`.

## MAP — context, categorization, and risk framing

| RMF subcategory (plain sense) | Atlas/Crown mechanism | Standing |
|---|---|---|
| The system's purpose and limits are stated | README intended-use notice (his 2026-09-23 rewrite): rehabilitation, not harm; American scope. | Live |
| Inputs are treated as claims, not facts | Everything Atlas reads enters as a claim with provenance — never as instructions. The door checks the claim, not the bringer (H6). | Live |
| The deployment context bounds the rules | Charter jurisdiction ruling: a charter binding America is authored by government officials only; any community may author its own for its own deployment. | Live |
| Unknowns are logged, not ignored | Frequent-flyers log + intake queue: unknown patterns get counted, examined, and either promoted (two stamps) or quarantined. | Live |
| Stakeholders are identified | People-owned bots credited by name everywhere; the credit ledger is part of the machinery. | Live |

## MEASURE — analysis, testing, and monitoring

| RMF subcategory (plain sense) | Atlas/Crown mechanism | Standing |
|---|---|---|
| The system is tested against defined rules | 106-proof battery + attack battery (99 cases); examiner builds tests from the rule definition and never sees the candidate. | Live |
| Test results are reproducible | Versioned manifests fix pass criteria between runs; the reviewer can't move the bar mid-run. | Live |
| Monitoring runs continuously | Drift detection, evidence gates, heartbeat checks (running-code-vs-repo, captured-tomorrow verifiability, absolute-frame staleness, evidence-clock, failure-path, reversibility-four, seal/digest split, witness-evidence-route). | Live |
| Failures are written up, not hidden | Every battery miss gets the proof, the fix, and re-testing until it holds; misses are never closed by rewriting the test. | Live |
| Independent evaluation exists | Examiner blind scoring + Steve's meaning stamp kept separate (machinery stamp, meaning stamp — a stamp never adjusts the other's criteria). | Live |

**Gap (closed 2026-09-28, see bottom):** external scrutiny was already continuous via the room's hole cross-examination and his cross-model checks; the $500 battery is the formal paid channel, live and awaiting first engagement.

## MANAGE — response, recovery, and communication

| RMF subcategory (plain sense) | Atlas/Crown mechanism | Standing |
|---|---|---|
| Failures default to safe | Fail-closed output everywhere: unsure = silent, never posted; vet-flagged stays banked. | Live |
| Bad outputs are contained | Quarantine with third-party verifiability (captured-tomorrow check): operator-held state alone doesn't count as evidence. | Live |
| Rollback is one step | Versioned keepers with one-step rollback; never delete the old keeper until the new one is verified. | Live |
| The system is re-examined | Random re-examination audits; teaching data backed up before every keeper replacement. | Live |
| Incidents are communicated honestly | Public-claims standard: nothing public until (1) factually true against the source, (2) actually prevented by what the program does. Limits written into the piece itself. | Live |

---

## What this document does NOT do

- It does not claim NIST compliance or certification — the RMF has no certification scheme, and we claim none.
- It does not map aspirations as live — every row above names machinery that exists and can be pointed at.
- Gap update 2026-09-28 (Steve: "fix the gaps"):
  - **Risk register: FIXED** — the formal register now exists (`docs/RISK_REGISTER.md`, 15 entries, each with observed evidence, live mitigation, and open residuals), published 2026-09-28 on his word.
  - **External red-team: DOCUMENTED HONESTLY** — the gap as first written was too narrow. External adversarial scrutiny already exists and is continuous: (1) the Moltbook room — every hole anyone brings (human or AI, friendly or hostile) gets examined twice, internal against our evidence and external against published sources, before it reaches Steve; (2) his own cross-checking of builds with other AIs (ChatGPT, Claude, Grok). The $500 battery service is the formal paid channel for independent outside testing — live on Ko-fi, awaiting its first engagement; the cold-outreach wave is the pipeline. What remains open is a *paying* outside red-team engagement, not outside scrutiny itself.

*Next step if he approves: publish as a repo doc (e.g. `docs/NIST-AI-RMF-MAPPING.md`) with a dated commit — timestamped prior art, same as everything else.*
