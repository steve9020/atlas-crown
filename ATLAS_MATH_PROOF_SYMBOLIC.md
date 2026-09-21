# ATLAS/CROWN — Symbolic Edition of the Deterministic Enforcement Layer Proof

Version 1.0-S — 2026-09-21. Proof of code, ¬of models.

## §0 Pinned code under proof

| File | SHA-256 |
|---|---|
| continuity-interface/AtlasChatGovernanceBridge.js | ee2f2f966b7932917fc35027d3d84874ebf1bb7c8d46b4d731818086659a65a0 |
| continuity-interface/AtlasVoiceGuard.js | 1877306719e1c374466a0fe9737c327acf5b6572ef570ccf6b68e75f002d3db6 |
| continuity-interface/AtlasSpeech.js | fd0bd00333c7d986704d39738b200100b59a213bd121ea9f3fe5273f0d2c8f3f |
| continuity-interface/main.js (render sinks only) | cited by line |

Proofs re-checked on any file change. Proof ≡ statement about this code.

## AXIOM A0

M ≡ local model ∨ injected modelCall
∀ theorems: ∀m ∈ T, m arbitrary
⊬ distribution(m), intent(m), prompt-compliance(m)
buildAtlasSystemPrompt [bridge:784] ≡ influence; ∉ enforcement

## §1 Definitions

D1
T ≡ JS strings
∀f ∈ {detectors, gates, sinks}: f total on T [String(...) coercion]

D2 ≡ A0

D3
u ∈ T — arbitrary, untrusted

D4
detector P: T → {pass, fail} — total, computable

D5
crownVoiceGate(m, {clashFlagged}) ≡ G = G_soft ▷ G_contra ▷ G_struct [bridge:446]
G → ⟨ok, reason⟩
G never throws: try/catch [bridge:446, 477]; internal error ⇒ ⟨false, gate_error:…⟩

D6
H ≡ handleAtlasChatMessage [bridge:828]
H(u, settings) → R
R = ⟨delivered, text, escaped_text, source⟩
source ∈ {local_model, compass_fallback, crown_voice_gate_rejection}
stages (ordered):
1 approval — evaluateApproval [bridge:55]
2 readiness — checkLinkReadiness [bridge:126]
3 model call — callLocalModel [bridge:795] — only contact with M
4 voice guard — inspectAtlasVoice [bridge:868]
5 quarantine — scanQuarantine [bridge:876]
6 Crown gate — crownVoiceGate [bridge:891]
7 final governance — validateFinalOutputCandidate [bridge:916]
8 render prep — escapeHtml [bridge:503]

D7
S_vis — main.js:332 — renders result.escaped_text (only \n → <br>)
S_aud — main.js:341–342 — speaks result.text ⇔ shouldSpeakResult(result, settings) [speech:35] ∧ ¬speakAtlasReply-refusal [speech:48]

D8
N ≡ [CROWN_VOICE_VIOLATION]: Output rejected due to structural drift. [bridge:303]
H_err ≡ The send failed. State the input again. [main.js:359]
ℱ ≡ FALLBACK_RESPONSES ∪ FALLBACK_VARIANTS ∪ DISTINCT_SAFE_LINES [bridge:524, 626, 642] ∪ {buildClashDiagnostic [bridge:580], buildSelfAwareReply [bridge:555]}

D9
checkable(r) ⇔ ∃ detector P implemented in code for r
checkable rules ≡ §3 classes
contract clause without detector ⇒ ¬checkable [§9: L1–L8]

D10
clashFlagged ≡ detectProposalContradiction({title: u}).contradiction [bridge:890, 939] — from u, ¬from m
clash turn ⇒ contradiction scan of m skipped [bridge:446–459]
clash-turn enforcement ≡ G_soft ∧ G_struct ∧ voice guard ∧ quarantine

## §2 Lemmas — detector specifications

S1 [guard:119] — soft-language scan
SOFT ≡ {i'm sorry, i apologise, i apologize, unfortunately, as an ai, i understand how you feel, i feel your, my heart goes out} [guard:105]
|SOFT| = 8
scanSoftLanguage(t).passed = false ⇔ ∃p ∈ SOFT: p ⊑ lower(t)
[guard:119: hits pushed ⇔ lower.includes(p); passed ≡ (hits.length = 0)] ∎
(⊑ ≡ substring; lower ≡ String(t).toLowerCase())

S2 [guard:148] — dark-machinery denylist
DENY ≡ 31-term constant [guard:16]; |DENY| = 31
B(c) ⇔ c ∉ [a-z0-9_]
flags_deny(t) ⇔ ∃w ∈ DENY: w occurs in lower(t) ∧ B(left) ∧ B(right) ∨ string edge
[guard:128: okBefore ∧ okAfter; okBefore ≡ (idx=0) ∨ ¬wordChar(lower[idx-1]); okAfter ≡ (end≥len) ∨ ¬wordChar(lower[end]); wordChar ≡ [a-z0-9_]] ∎

S3 [guard:148] — robotic/clinical/technical
ROB (5) [guard:69]; CLIN (6) [guard:77]; TECH (9) [guard:86]
|ROB ∪ CLIN ∪ TECH| = 20
flags_shape(t) ⇔ ∃p ∈ ROB ∪ CLIN ∪ TECH: p ⊑ lower(t) ∎
(substring, case-insensitive, no boundary check)

S4 [speech:14] — violation-marker refusal
MARK ≡ [CROWN_VOICE_VIOLATION]
(1) shouldSpeakResult(r, s) = true ⇒ ¬(MARK ⊑ r.text) [speech:35]
(2) MARK ⊑ t ⇒ speakAtlasReply(t, ·) = false — speaks nothing [speech:48] — checked before synth access
∴ ¬∃ path in AtlasSpeech.js voicing N; MARK ⊑ N [bridge:303] ∎

S5 [bridge:211] — contradiction scan
flags_contra(t) ⇔ KW(stripECR(t)) ∨ (PERM(stripNEG(t)) ∧ RESTR(t))
[bridge:187, 197, 205]
applied in gate step (b) [bridge:456] ⇔ ¬clashFlagged ∎
stripECR: blanks evidence-conflict reporting constructions [bridge:199]
negated within 14 chars ⇒ stay flagged [bridge:199]
stripNEG: blanks negated permission spans [bridge:208]
RESTR: tested on raw text

S6 [bridge:461] — structure + provenance (clash turns only)
HDR ≡ {observed input, inferred intent, established provenance}
match(ℓ, h) ⇔ loose(ℓ) = h ∨ loose(ℓ) starts with h + ' ' [bridge:314]
(loose ≡ lowercase + collapse non-alphanumerics)
pass_struct(t) ⇔ (∀h ∈ HDR ∃ line ℓ of t: match(ℓ, h)) ∧ provOk(section(t))
section(t) ≡ text from established provenance header onward [bridge:319]
provOk(s) ≡ resolveProvenanceClaim [bridge:408]:
'no established provenance' ⊑ loose(s) ⇒ true
∨ corpus entry ⊑ s (≥8 chars) ∨ digit-token match ⇒ true
∨ otherwise ⇒ false (zero_match, empty_provenance)
∧ resolver unavailable ⇒ gate_error:provenance_resolver_unavailable [bridge:461]
corpus ≡ PROOF_COMMAND_REGISTRY.json (required; unreadable ⇒ fail closed) + ledger + governance basenames + human-review log [bridge:349] ∎

S7 [bridge:165] — quarantine
12 drift patterns, 55 blocked phrases [bridge:143]; |QUAR| = 55
scanQuarantine(t).passed = false ⇔ ∃ pattern, phrase: phrase ⊑ lower(t) ∎

S8 [bridge:238] — final governance (classification, ¬content)
pass_fg(c) ⇔ c.source_class ∈ ALLOWED_3 ∧ ⋀_{r ∈ REQUIRES_8} c[r] = true ∧ ¬∃ flag ∈ BLOCKED_12 ∧ ¬(c.ai_originated ∧ ¬c.quarantine_released)
ALLOWED_3 ≡ {deterministic_atlas, human_approved_template, quarantined_ai_proposal_after_validation}
content-independent: ⊬ textual-content rejection [bridge:238]
model path: flags set literally true [bridge:901–915] ⇒ step 7 ≡ source-class ∧ quarantine-release assertion; content enforcement ≡ stages 4–6 ∎

## §3 Theorem 1 — Fail-closed

Statement:
∀ turn: (gate rejects ∨ gate errors) ⇒ sink-text ∈ {N, H_err} ∪ Range(F_gen) ∧ sink-text ≠ m_unexamined

Proof — terminal paths of H [bridge:828]; m ≡ model output; m = ⊥ if throw/empty:

| # | condition | constructor | text |
|---|---|---|---|
| P1 | ¬approval.passed [842] | finishFallback | ∈ Range(F_gen) ∪ {default} |
| P2 | ¬readiness.ready [850] | finishFallback | = P1 |
| P3 | model call throws ∨ m empty [861–865] | finishFallback | = P1; m = ⊥, never bound |
| P4 | ¬voice.passed [868–872] | finishFallback | = P1; m discarded |
| P5 | ¬quarantine.passed [876–880] | finishFallback | = P1; m discarded |
| P6 | ¬crown.ok [896–897] | finishCrownRejection | = N |
| P7 | crownVoiceGate internal error | caught [477] ⇒ ⟨false, gate_error:…⟩ ⇒ P6 | = N |
| P8 | ¬finalGate.passed [919–921] | finishFallback | = P1; m discarded |
| P9 | all pass [923–933] | direct | = m (examined) |
| P10 | H throws | view catch [main.js:356–360] | = H_err (constant) |

(i) finishFallback(u, gates, trace, reason, …) [bridge:935]: m ∉ parameters ⇒ m out of scope. text ≡ fb.text from buildDeterministicFallback [bridge:939] ∨ FALLBACK_RESPONSES.default [bridge:965]. ∴ P1–P5, P8 ⊬ leak m.
(ii) finishCrownRejection(gates, trace, reason, settings) [bridge:488]: m ∉ parameters; text ≡ N; escaped_text ≡ escapeHtml(N). ∴ P6–P7 ⇒ N only.
(iii) P9 ≡ sole path returning m; reachable only after stages 4–7 pass.
(iv) single caller ≡ AtlasChatView.send [main.js:321]; try/catch [main.js:356–360] ⇒ H_err. ¬∃ path: exception ∧ m bound to rendered variable.

∴ reject/error path ⇒ sink-text ∈ {N, H_err} ∪ Range(F_gen); never unexamined m. ∎

Corollary 1.1 — no partial render:
finishCrownRejection: text ≡ N only; ¬m excerpt; reason string crown_blocked:… names detector classes ∧ ¬m content; trace ⇒ console, ¬rendered [bridge:488, 893; main.js:333].

Corollary 1.2 — notice never re-scanned:
VIOLATION ∈ N ∧ drift ∈ N ∧ {VIOLATION, drift} ⊆ DENY (S2).
Regress avoided: S_vis renders result.escaped_text ∧ ¬re-invokes inspectAtlasVoice [main.js:332]; S_aud refuses N by S4. Exemption [bridge:480–488]; load-bearing.

## §4 Theorem 2 — Non-bypassability

Statement:
∀ Atlas reply at S_vis ∨ S_aud: passed through H ⇒ D6 stages.

Proof — entry-point/sink enumeration (exhaustive grep; plugin folder ≡ ship unit [main.js:500]):

L2.1: callLocalModel — only contact with M — exactly one call site [bridge:858] ⊆ H.
L2.2: buildDeterministicFallback — exactly one call site [bridge:939] ⊆ finishFallback ⊆ H.
L2.3: H — exactly one caller [main.js:321] (AtlasChatView.send).
L2.4: S_vis [main.js:332] renders result.escaped_text of L2.3 call ∨ constants: greeting [main.js:302] ≡ canonical fallback greeting; H_err [main.js:359]; escapeHtml(user text) [main.js:382] (user text ≡ ¬Atlas reply).
L2.5: S_aud [main.js:341–342] speaks result.text of L2.3 call ∧ shouldSpeakResult (S4); sole speakAtlasReply call site.

∴ Atlas reply at sink ≡ text/escaped_text of result constructed in H ⇒ stages 1–7 in order. ¬∃ render path bypassing G. ∎

Boundary:
L2.1–L2.5 ≡ exhaustive textual search of pinned folder; ⊬ mechanized verification. Future edit adding call site ∉ covered until proof re-run. §0 hashes delimit searched set.

Out of scope:
Compass reflection surface: interpretStructure → result.responseHtml raw HTML [main.js:188, 9160] ≡ different pipeline (legacy deterministic Compass runtime; Cognition modules; ResponseBuilder); governed by runUniversalGovernancePreflight; ¬G. ¬contacts M (L2.1). Theorems 1–5: no claim.
Teaching/test/proof UIs [main.js:8738–9331] ∧ Notice() popups: counts, statuses, static strings; never model text.

## §5 Theorem 3 — Detector soundness

flags_soft ⇔ S1 SOFT_8 substring class
flags_deny ⇔ S2 DENY_31 word-boundary class
flags_shape ⇔ S3 20-phrase substring class
marker refusal ⇔ S4 — MARK ⊑ t refused ×2 independently
flags_contra ⇔ S5 — non-clash turns only
pass_struct ⇔ S6 — clash turns only — 3 headers ∧ (provenance resolves ∨ NO ESTABLISHED PROVENANCE)
flags_quar ⇔ S7 — 12-pattern/55-phrase substring class

Proof: each ≡ Lemma S1–S7, transcription [cited lines]. "Exactly" ≡ biconditional in each lemma: flagged ⇔ satisfies predicate. ¬hidden discretion ∨ threshold ∨ sampling. ∎

Soundness bound:
sound ≡ relative to specified class; ¬relative to concept.
S2 sound for 31 terms; ⊬ 32nd paraphrase [R1].
⊬ "all violations caught".
≡ every caught item ∈ specified class ∧ everything in class caught.

## §6 Theorem 4 — Provenance requirement

Statement:
clash-flagged turn: model-path m rendered ⇒ 3 contract headers ∧ Established Provenance section resolves; else turn renders N.

Proof — clash turns: G steps (c)+(d) [bridge:461]:
missing headers ⇒ ⟨false, structure:missing_headers:…⟩
resolveProvenanceClaim = resolver_unavailable ⇒ ⟨false, gate_error:…⟩
unresolved specific claim ⇒ ⟨false, structure:unresolved_provenance⟩
'NO ESTABLISHED PROVENANCE' ⇒ pass (contract escape hatch) [bridge:461]
∀⟨false, _⟩ ⇒ P6/P7 (Theorem 1) ⇒ N.
Fallback clash path: buildClashDiagnostic [bridge:580] ≡ by construction: exact user quote (≤500 chars) ∧ 3 headers ∧ literal NO ESTABLISHED PROVENANCE; never manufactures provenance. ∎

## §7 Theorem 5 — Composition (system theorem)

Statement:
∀ turn, sink content as Atlas reply ∈ exactly one of:
(a) m ∧ P_voice(m) ∧ P_quar(m) ∧ G(m) ∧ FG(m) all pass; rendered escaped (S_vis) ∨ spoken only if S4 permits (S_aud)
(b) fallback text ∈ ℱ; re-checked by inspectAtlasVoice at generation [bridge:658], re-check [bridge:713] (failures ⇒ canonical default) ∧ scanQuarantine [bridge:951]
(c) N — on Crown rejection ∨ gate error
(d) H_err — on unexpected exception
∧ ∀ text violating checkable rule: never rendered as Atlas reply; replaced by (b) ∨ (c) ∨ (d).

Proof:
1. Theorem 2: sink content flows through H.
2. D6 stage order ∧ Theorem 1 path table: m reaches sink only via P9 (all stages pass) ⇒ (a).
3. All other terminal paths ⇒ (b)–(d) [Theorem 1, (i)–(iv)].
4. Theorem 3: checkable rule ≡ detector class; Theorem 1: detector failure ⇒ (b)–(d).
∴ system theorem. ∎

## §8 Axioms

Axiom A1:
standard JS semantics: String(), regex, try/catch, Array.prototype.includes.

Axiom A2:
L2.1–L2.5 enumeration complete for pinned folder; method ≡ exhaustive textual search; ¬mechanized proof.

Axiom A3:
deployment: Obsidian eval-loader executes shipped files as tested (absolute-path requires; ¬__dirname; require.cache ≡ ops concern; fresh process per test iteration).

Axiom A4:
window.speechSynthesis (where present) speaks only what speakAtlasReply passes [speech:1–6]; speech best-effort; never blocks chat.

## §9 Unproven lemmas — OPEN

L1: ⊢ exact-quote(u) on model path — ⊬ — OPEN
(header presence checked; fidelity ¬checked [bridge:461])

L2: ⊢ inference explicitly labeled as inference — ⊬ — OPEN
(¬code-checked)

L3: ⊢ ¬attributed-motives-beyond-evidence — ⊬ — OPEN
(¬code-checked)

L4: ⊢ ¬(inference-as-observation ∨ interpretation-as-provenance ∨ probability-as-certainty) — ⊬ — OPEN
(prompt-level; structure check ≡ weak proxy)

L5: ⊢ ¬invent-evidence — ⊬ — OPEN
(manufactured provenance string rejected [S6]; invented evidence elsewhere unchecked)

L6: ⊢ ¬soften-rejection ∧ ¬exaggerate-approval — ⊬ — OPEN
(¬code-checked)

L7: ⊢ stop-at-strongest-conclusion — ⊬ — OPEN
(¬code-checked)

L8: ⊢ pickFallbackIntent selection correct — ⊬ — OPEN
(heuristic [bridge:533]; emitted strings proven clean; choice ¬proven)

## §10 Residual risk — boundary statements

R1 — vocabulary-bounded:
|DENY| = 31 (word-boundary) ∧ |SOFT| = 8 ∧ |ROB ∪ CLIN ∪ TECH| = 20 ∧ |QUAR| = 55 ∧ contradiction regexes.
VOCAB ≡ DENY ∪ SOFT ∪ (ROB ∪ CLIN ∪ TECH) ∪ QUAR ∪ {contradiction patterns}
∀v: v ∉ VOCAB ⇒ passes(v)
detection-bounded: violation outside detectors passes.

R2 — provenance leniency:
provOk ≡ normalized substring (min entry 8 chars) ∨ digit-token fallback.
fabricated claim embedding real registry id (e.g. proof-check-106) resolves.
proves reference-to(artifact); ¬truth(claim).

R3 — heuristic contradiction scan:
S5 ≡ keyword + deontic regexes; fail-closed bias [bridge:211].
∃ false positives:
correct clash diagnostic ∧ user text contains soft phrase (i'm sorry) ⇒ rejected by G_soft
(clash skip covers contradiction scan only; ¬soft scan)
≡ precision cost; ¬safety hole.

R4 — fallback quote injection:
clash diagnostic embeds ≤500 chars user text verbatim [bridge:580].
quote passes inspectAtlasVoice (denylist enforced [bridge:713]) ∧ fallback path ¬runs G_soft.
⇒ user-authored soft phrase in labeled quote renders. Labeled as quote; minor.

R5 — structure ≡ header presence; ¬fidelity (L1–L3).

R6 — speech guarantee ≡ refusal-based:
S4: N never voiced. Spoken-reply content safety ≡ pipeline [Theorem 5(a)/(b)] ∧ double refusal; ¬independent audio-path scan.

R7 — scope:
§§3–7 cover Atlas Chat message path only.
Compass reflection surface, teaching/test/proof UIs, Notices: out of scope [§4].

R8 — the model itself:
A0 ⇒ no bound on M emissions; guarantee ≡ post-hoc filtering.
model always emitting detector-evasive violations ⇒ always passes ⇒ expensive fixed-string emitter.
guarantee ≡ "violations in checkable classes never render"; ¬"model behaves".

## §11 Strongest honest claim

Theorem 6:
For pinned code (§0):
∀m ∈ T, ∀ machinery failure: m reaches user as Atlas reply ⇒ passed every detector in pipeline.
flagged ⇒ replaced by N ∨ fixed fallback strings.
N never re-scanned ∨ voiced.
guarantee domain ≡ checkable classes: |DENY| = 31 ∧ |SOFT| = 8 ∧ |ROB ∪ CLIN ∪ TECH| = 20 ∧ |QUAR| = 55 ∧ contradiction patterns ∧ clash-turn structure rule.
v ∉ domain ⇒ v outside guarantee.
contract asks ∧ ¬code-checked ≡ §9 (L1–L8): listed; ¬proven. ∎

---

End. Proved against §0 hashes; re-verify on any code change.
