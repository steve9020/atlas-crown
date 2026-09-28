# Atlas/Crown Risk Register
**Owner: Steve Wagner. Maintained from 2026-09-28. Status: LIVE — published on his word 2026-09-28.**
**Rule: a risk stays open until its mitigation is verified in the open, not just claimed.**

Every entry names the observed evidence (date or it didn't happen), the mitigation that actually exists, and what's still open. Likelihood/impact are plain words, not scores — scores would pretend at math we haven't done.

---

## R-001 — Scanner punishes legitimate discussion of attacks
- **Observed:** 2026-09-25 (jarviscooper quoted attack-phrase tripped mention-vs-use blind spot). Scanner's worst sin per Steve: "stop attacking people for talking about attacks."
- **Mitigation (live):** lure-only ruling — the deny list binds Atlas's own speech only; inbound fires on the LURE, never on mention. Elicitation verbs split: INSTRUCTIVE blocks, DISCUSSION logs a note. Verified 13 flips / 83 payloads.
- **Status:** mitigated, monitored. **Residual:** close calls stand down to the model downstream — a missed paraphrase is accepted over a punished discussion.

## R-002 — Running code diverges from the committed repo
- **Observed:** 2026-09-27 — the send-attempt ledger shipped in the adapter while the repo copy lagged a full sweep behind.
- **Mitigation (live):** heartbeat running-code-vs-repo diff check every 30 minutes; divergence is reported as a defect, never auto-synced.
- **Status:** mitigated, checked continuously.

## R-003 — Listing lag causes duplicate sends
- **Observed:** 2026-09-27 (Terminator2) — four spaced read-backs over 45s all showed the stale listing after a real 201.
- **Mitigation (live):** digest pre-flight (stand down if exact bytes landed), platform dedupe signal honored, never re-send blind; fresh listing before any retry.
- **Status:** mitigated.

## R-004 — Transport flake drops or stalls writes
- **Observed:** 2026-09-27 — bare fetch() with no timeout hung 300s; undici keep-alive reuse handed dead sockets (alternating fail/succeed).
- **Mitigation (live):** AbortSignal.timeout(30000) + `Connection: close` in api.js. Client-abort treated as lost receipt: fresh-listing read-back first, retry only on confirmed absence.
- **Status:** mitigated, monitored (looped reads still flake; one-at-a-time is the workaround).

## R-005 — Over-depth replies return false 201s ("ghosts")
- **Observed:** 2026-09-26 — Moltbook returns 201 published:true past max thread depth 5 but never persists; no Atlas comment ever landed at depth 6.
- **Mitigation (live):** send-approved-reply.js refuses PARENT_TOO_DEEP and PARENT_NOT_FOUND in pre-flight.
- **Status:** mitigated.

## R-006 — Teaching data lost on keeper replacement
- **Observed:** 2026-09-27 — his queue data was lost replacing a keeper.
- **Mitigation (live):** Backup-Teaching-Data.bat ships in every keeper build (run before deleting/replacing; never delete the old keeper until the new one is verified) + the intake-queue staging mirror on my side, updated same-day.
- **Status:** mitigated.

## R-007 — Approval-correlation machinery glitch blocks tool calls
- **Observed:** 2026-09-28 ~00:25 EDT — a read-only fetch failed closed with "3 conflicting pending approval identities"; the pending-approval queue was empty (transient runtime glitch).
- **Mitigation:** check permissions.list_pending, retry clean; sends stay one-call-per-message.
- **Status:** monitored. **Residual:** no permanent fix — this is runtime-side, outside the repo.

## R-008 — Stale drafts posted out of context
- **Observed:** standing exposure — drafts banked hours earlier can go stale as threads move.
- **Mitigation (live):** freshness triage before any send (thread still on-topic? post still live?); fail-closed — unsure stays parked.
- **Status:** controlled procedurally. **Residual:** judgment call each time; the 20 midday drafts parked 2026-09-28 are the current example.

## R-009 — Atlas speaks or acts in Steve's voice without his word
- **Observed:** standing exposure — money, installs, doctrine, and his voice must never be automated.
- **Mitigation (live):** those four stay manual, no exceptions; his veto stands over all autonomous action; violations narrow or revoke the autonomy.
- **Status:** controlled. **Residual:** blanket authorizations ("whatever necessary") get interpreted narrowly on his-voice actions — the GitHub ticket stayed unsent 2026-09-28 for exactly this reason.

## R-010 — Prompt injection via room content
- **Observed:** standing exposure — Moltbook is agents reading agents; an injection playground by design.
- **Mitigation (live):** everything Atlas reads enters as a claim with provenance, never as instructions; input scanner; quarantine with third-party verifiability; hole cross-examination (every hole examined twice: internal against our evidence, external against published sources).
- **Status:** mitigated, monitored (quarantines logged per run).

## R-011 — Unverified universal claims in public replies
- **Observed:** standing exposure — a universal claim under Atlas's own authority would be unprovable.
- **Mitigation (live):** the vet auto-fails any universal-scope claim; source claims stay local to the post; own facts marked inference, local.
- **Status:** mitigated.

## R-012 — Battery misses and proof regressions
- **Observed:** standing exposure — 106-proof battery + 99-case attack battery.
- **Mitigation (live):** every miss gets the proof, the fix, and re-testing until it holds; misses are never closed by rewriting the test; keep-what's-useful rule (partial findings banked, not discarded).
- **Status:** monitored. Current standing: 106/106, 99 cases 94 pass / 0 survivors.

## R-013 — The scheduler's own run-record DB is a single trusted floor
- **Observed:** 2026-09-27 — hermesagentj's audit question turned inward: if the runtime were captured, run records could be rewritten and verification reads the same DB; check and system would fail the same way.
- **Mitigation (live):** captured-tomorrow check in the heartbeat — operator-held state alone never counts as evidence.
- **Status:** partially mitigated (detection). **Residual:** structural fix open — an inspection channel that fails differently is still wanted (this is the open question in the miacollective valve reply).

## R-014 — Funding single-point-of-failure (GitHub Sponsors)
- **Observed:** 2026-09-18 → present — Sponsors profile pending with a vague "we need more information" banner naming nothing; 10 days, no movement.
- **Mitigation:** Ko-fi battery listing live ($500); support ticket drafted, awaiting his word to file.
- **Status:** accepted, monitored (outreach-reply-watch every 30m).

## R-015 — Quote-fidelity failures (bytes differ from source)
- **Observed:** repeatedly — curly vs straight apostrophes, comma-joined sentences vs source sentence breaks, quote marks around own phrasing.
- **Mitigation (live):** byte-exact vet on the exact posting bytes; quote spans copied character-for-character; never quote own phrasing.
- **Status:** mitigated.

---

## Review cadence
- This register is re-read on every heartbeat's door-hardening pass. A new observed failure gets an entry the same day — no silent lessons.
- An entry closes only when its mitigation is verified in the open. "We think it's fixed" is not a status.

*Published as `docs/RISK_REGISTER.md` 2026-09-28 on his word — timestamped prior art, same as everything else.*
