# ATLAS/CROWN — Formal Proof of the Deterministic Enforcement Layer

**Version 1.0 — 2026-09-21. Status: proof of code, not of models.**

This document proves properties of the *deterministic enforcement code* on the
Atlas Chat message path: the Crown output gate, the voice guard, the
contradiction/structure/provenance checks, the violation-marker logic, and
every render path for Atlas replies. It proves **nothing** about what any
language model generates. That boundary is load-bearing; see Assumption A0.

## 0. Pinned code under proof

The theorems below are statements about the following exact files
(SHA-256, measured 2026-09-21):

| File | SHA-256 |
|---|---|
| `continuity-interface/AtlasChatGovernanceBridge.js` | `ee2f2f96…659a65a0` |
| `continuity-interface/AtlasVoiceGuard.js` | `18773067…f002d3db6` |
| `continuity-interface/AtlasSpeech.js` | `fd0bd003…f3fe5273f3f` |
| `continuity-interface/main.js` (render sinks only) | *cited by line* |

Full hashes: `ee2f2f966b7932917fc35027d3d84874ebf1bb7c8d46b4d731818086659a65a0`,
`1877306719e1c374466a0fe9737c327acf5b6572ef570ccf6b68e75f002d3db6`,
`fd0bd00333c7d986704d39738b200100b59a213bd121ea9f3fe5273f0d2c8f3f`.

If any of these files change, the proofs must be re-checked. A proof is a
statement about *this* code, not about the project in general.

## 1. Formal model — definitions

**D1 (Texts).** Let $T$ be the set of JavaScript strings. All detectors,
gates, and render sinks are total functions on $T$ (every code path
coerces with `String(...)`, so no input is outside the domain).

**D2 (The arbitrary source — Assumption A0).** Let $M$ denote the local
model (or any injected `modelCall`). $M$ is modelled as an **arbitrary
text source**: in every theorem, the model output $m$ is universally
quantified, $\forall m \in T$. No theorem assumes anything about the
distribution, intent, or prompt-compliance of $M$. In particular, the
system prompt (the voice contract as prompt text,
`buildAtlasSystemPrompt`, bridge:784) is **not** part of the proven
system — it is an *influence*, not an *enforcement*. Anything the
contract requests but the code does not check is listed in §9 as an
unproven lemma.

**D3 (User input).** $u \in T$ is arbitrary and untrusted.

**D4 (Detector).** A detector is a total computable predicate
$P : T \to \{\text{pass}, \text{fail}\}$ implemented exactly as the cited
function. §3 gives each detector's *exact* logical form, proved by code
inspection.

**D5 (The gate).** `crownVoiceGate(m, {clashFlagged})`
(bridge:446) is the ordered composition
$G = G_{soft} \triangleright G_{contra} \triangleright G_{struct}$,
returning $\langle ok, reason \rangle$. It **never throws**: the body is
wrapped in try/catch (bridge:446, 477); any internal error yields
$\langle \text{false}, \text{`gate\_error:`…} \rangle$.

**D6 (The pipeline).** `handleAtlasChatMessage` (bridge:828) is the
function $H(u, settings) \to R$, where a result
$R = \langle delivered, text, escaped\_text, source \rangle$ and
$source \in \{\text{`local\_model`}, \text{`compass\_fallback`},
\text{`crown\_voice\_gate\_rejection`}\}$.
Its ordered stages are:

1. approval (`evaluateApproval`, bridge:55)
2. readiness (`checkLinkReadiness`, bridge:126)
3. model call (`callLocalModel`, bridge:795) — the *only* contact with $M$
4. voice guard (`inspectAtlasVoice`, bridge:868)
5. quarantine (`scanQuarantine`, bridge:876)
6. Crown gate (`crownVoiceGate`, bridge:891)
7. final governance (`validateFinalOutputCandidate`, bridge:916)
8. render preparation (`escapeHtml`, bridge:503)

**D7 (Render sinks).** Exactly two sinks can present an Atlas reply:

- $S_{vis}$ — the chat bubble, `main.js:332`:
  renders `result.escaped_text` (with `\n` → `<br>` only).
- $S_{aud}$ — spoken output, `main.js:341–342`:
  speaks `result.text` **iff** `shouldSpeakResult(result, settings)`
  (speech:35) **and** `speakAtlasReply` does not refuse it
  (speech:48, marker refusal at speech:48).

**D8 (Fixed constants).**
$N = \text{`[CROWN\_VOICE\_VIOLATION]: Output rejected due to structural drift.'}$
(bridge:303) — the violation notice.
$H_{err} = \text{`The send failed. State the input again.'}$ (main.js:359).
$\mathcal{F}$ = the finite set of hardcoded fallback strings
(`FALLBACK_RESPONSES`, `FALLBACK_VARIANTS`, `DISTINCT_SAFE_LINES`,
bridge:524, 626, 642) plus the two *constructed* fallback forms:
the clash diagnostic (`buildClashDiagnostic`, bridge:580) and the
self-aware reply (`buildSelfAwareReply`, bridge:555).

**D9 (Checkable rule).** A rule is *checkable* iff the code implements a
detector for it. The checkable rules are exactly the classes in §3.
Contract clauses with no detector are **not** checkable (§9, L1–L8).

**D10 (Clash turn).** `clashFlagged` is derived per turn as
`detectProposalContradiction({title: u}).contradiction` (bridge:890, 939) — i.e., from the *user's* input, not the model's. On clash turns
the contradiction scan of the *model output* is deliberately skipped
(bridge:446–459); enforcement on clash turns rests on
$G_{soft}$, $G_{struct}$, the voice guard, and quarantine.

## 2. Detector specifications

Each lemma states the detector's *exact* predicate. "Sound" here means:
the code flags **exactly** the specified class — no more, no less. The
proof of each is direct inspection of the cited lines; the predicates
below are transcribed, not paraphrased.

**Lemma S1 (soft-language scan).** `scanSoftLanguage`
(guard:119). Let $SOFT$ be the 8-phrase constant
(guard:105):
$\{$`i'm sorry`, `i apologise`, `i apologize`, `unfortunately`,
`as an ai`, `i understand how you feel`, `i feel your`,
`my heart goes out`$\}$.
$$\text{scanSoftLanguage}(t).passed = \text{false} \iff
\exists p \in SOFT : p \sqsubseteq \mathrm{lower}(t)$$
where $\sqsubseteq$ is substring and $\mathrm{lower}$ is
`String(t).toLowerCase()`. *Proof.* The loop pushes $p$ iff
`lower.includes(p)` (guard:119); `passed = (hits.length === 0)`
(guard:119). ∎

*Note.* Pure substring: `as an ai` fires inside any longer string
containing it. `"I understand"` alone is **not** in $SOFT$ and does not
fire — only the listed constructions.

**Lemma S2 (dark-machinery denylist).** `inspectAtlasVoice`
(guard:148), denylist part. Let $DENY$ be the 31-term constant
(guard:16). Let $B(c) \iff c \notin \texttt{[a-z0-9\_]}$.
$$\text{flags}_{\text{deny}}(t) \iff \exists w \in DENY :
w \text{ occurs in } \mathrm{lower}(t)
\text{ with } B \text{ on both sides (or string edge)}$$
*Proof.* `findHits` (guard:128) advances through `lower.indexOf(term)`
and records a hit only if `okBefore ∧ okAfter`, where
`okBefore = (idx===0) ∨ ¬wordChar(lower[idx-1])`,
`okAfter = (end≥len) ∨ ¬wordChar(lower[end])`,
`wordChar = /[a-z0-9_]/`. ∎

*Note.* The denylist is word-boundary-sensitive while S1/S3 are not;
e.g. `cage` does not fire inside `cages`… actually it does not fire
inside `encage` (boundary fails), but *would* fire in `cage-like`
(hyphen is a non-word char). The predicate above is exact.

**Lemma S3 (robotic/clinical/technical phrases).**
`inspectAtlasVoice`, guard:148. Let
$ROB$ (5), $CLIN$ (6), $TECH$ (9) be the constants
(guard:69, 77, 86).
$$\text{flags}_{\text{shape}}(t) \iff
\exists p \in ROB \cup CLIN \cup TECH : p \sqsubseteq \mathrm{lower}(t)$$
Pure substring, case-insensitive, no boundary check. ∎

**Lemma S4 (violation-marker refusal).** Let
$MARK = \text{`[CROWN\_VOICE\_VIOLATION]`}$ (speech:14).
Two independent refusals:

1. `shouldSpeakResult(r, s) = \text{true} \implies MARK \not\sqsubseteq r.text$
   (speech:35: returns false if `result.source` is the rejection
   source *or* `text.indexOf(MARK) ≠ -1`).
2. `speakAtlasReply(t,·)` returns false (speaks nothing) if
   $MARK \sqsubseteq t$ (speech:48), checked *before* any synth access.

Hence no call path through `AtlasSpeech.js` can voice the notice $N$,
which contains $MARK$ by construction (bridge:303). ∎

**Lemma S5 (contradiction scan).** `detectProposalContradiction`
(bridge:211), applied in the gate as
`crownVoiceGate` step (b) (bridge:456) **iff** `¬clashFlagged`.
Let $KW$ be the keyword regex (bridge:187),
$ECR$ the evidence-conflict-report mask (bridge:197),
$PERM$/$RESTR$/$NEG$ the deontic regexes (bridge:205).
$$\text{flags}_{contra}(t) \iff
KW(\mathrm{stripECR}(t)) \;\lor\;
\big(PERM(\mathrm{stripNEG}(t)) \land RESTR(t)\big)$$
where `stripECR` blanks evidence-conflict *reporting* constructions
(`the evidence conflicts`, `conflicting evidence`, `report(s/ed/ing)
the conflict`, …) unless negated (`no`/`not`/`never`/`without`/`n't`
within the preceding 14 chars — those stay flagged, bridge:199),
and `stripNEG` blanks negated permission spans before the $PERM$ test
(bridge:208) while $RESTR$ is tested on the raw text.
*Proof.* Direct transcription of bridge:211. ∎

*Note.* This detector is heuristic with deliberate fail-closed bias
(stated in code, bridge:211). It is *not* a logical contradiction
prover; see R4.

**Lemma S6 (structure + provenance, clash turns only).**
`crownVoiceGate` steps (c)+(d) (bridge:461).
Let $HDR = \{$`observed input`, `inferred intent`,
`established provenance`$\}$. For a line $\ell$,
$\mathrm{match}(\ell,h) \iff \mathrm{loose}(\ell)=h \lor
\mathrm{loose}(\ell)$ starts with $h+\text{` `$}$,
where $\mathrm{loose}$ lowercases and collapses non-alphanumerics
(bridge:314).
$$\text{pass}_{struct}(t) \iff
\big(\forall h \in HDR\;\exists \text{ line } \ell \text{ of } t:
\mathrm{match}(\ell,h)\big)
\;\land\; \mathrm{provOk}(\text{section}(t))$$
where `section(t)` is the text from the `established provenance`
header onward (bridge:319), and `provOk` is
`resolveProvenanceClaim` (bridge:408):
$$\mathrm{provOk}(s) = \begin{cases}
\text{true} & \text{`no established provenance'} \sqsubseteq \mathrm{loose}(s)
\text{ (the contract's explicit escape hatch)}\\
\text{true} & s \text{ loosely/tightly contains a corpus entry (}\ge 8
\text{ chars), or a digit-bearing token matching one}\\
\text{false} & \text{otherwise (`zero\_match', `empty\_provenance')}\\
\text{false} & \text{resolver unavailable
$\to$ `gate\_error:provenance\_resolver\_unavailable' (bridge:461)}
\end{cases}$$
The corpus is built from `runtime/proof/PROOF_COMMAND_REGISTRY.json`
(**required** — unreadable ⇒ resolver unavailable ⇒ fail closed),
plus best-effort ledger, governance basenames, and the human-review
decision log (bridge:349). ∎

**Lemma S7 (quarantine).** `scanQuarantine` (bridge:165).
12 drift patterns, 55 blocked phrases (bridge:143):
$$\text{scanQuarantine}(t).passed = \text{false} \iff
\exists \text{ pattern, phrase} : phrase \sqsubseteq \mathrm{lower}(t)$$
Pure substring, case-insensitive. ∎

**Lemma S8 (final governance — classification, not content).**
`validateFinalOutputCandidate` (bridge:238).
$$\text{pass}_{fg}(c) \iff
c.source\_class \in ALLOWED_3 \;\land\;
\bigwedge_{r \in REQUIRES_8} c[r]=\text{true} \;\land\;
\text{no } BLOCKED_{12} \text{ flag} \;\land\;
\neg(c.ai\_originated \land \neg c.quarantine\_released)$$
where $ALLOWED_3 = \{$`deterministic_atlas`,
`human_approved_template`,
`quarantined_ai_proposal_after_validation`$\}$.
*This predicate is content-independent*: it cannot reject on textual
content. Its force is structural — a candidate labelled
`raw_ai_output` (or any forbidden class) can never be delivered,
whatever it says (bridge:238). On the model path the candidate's
flags are set literally `true` (bridge:901–915), so step 7 reduces to
the source-class assertion plus the quarantine-release assertion;
the *content* enforcement is stages 4–6. Stated here so no one
mistakes stage 7 for a second content scan. ∎

## 3. Theorem 1 — Fail-closed

**Theorem 1.** For every turn, if any gate rejects or any gate errors,
the text reaching a sink is in $\{N, H_{err}\} \cup \mathrm{Range}(F_{gen})$ —
never the unexamined model output $m$.

*Proof.* By exhaustive enumeration of the terminal paths of $H$
(`handleAtlasChatMessage`, bridge:828). Let $m$ be the model output
($m = \bot$ if the call threw or returned empty).

| # | Condition (bridge lines) | Return constructor | `text` field |
|---|---|---|---|
| P1 | `¬approval.passed` (842) | `finishFallback` | $ \in \mathrm{Range}(F_{gen}) \cup \{\text{default}\}$ |
| P2 | `¬readiness.ready` (850) | `finishFallback` | as P1 |
| P3 | model call throws / $m$ empty (861–865) | `finishFallback` | as P1 ($m=\bot$, never bound) |
| P4 | `¬voice.passed` (868–872) | `finishFallback` | as P1 ($m$ discarded) |
| P5 | `¬quarantine.passed` (876–880) | `finishFallback` | as P1 ($m$ discarded) |
| P6 | `¬crown.ok` (896–897) | `finishCrownRejection` | $= N$ |
| P7 | `crownVoiceGate` internal error | caught at 477 → `⟨false, gate_error:…⟩` → P6 | $= N$ |
| P8 | `¬finalGate.passed` (919–921) | `finishFallback` | as P1 ($m$ discarded) |
| P9 | all pass (923–933) | direct | $= m$ (examined) |
| P10 | $H$ itself throws | view catch, main.js:356–360 | $= H_{err}$ (constant) |

Key facts:

- (i) `finishFallback(u, gates, trace, reason, …)` (bridge:935) does
  **not take $m$ as a parameter** — the model text is not even in scope
  at the fallback constructor. Its text is `fb.text` from
  `buildDeterministicFallback` (bridge:939), or
  `FALLBACK_RESPONSES.default` if the fallback's own final-governance
  check fails (bridge:965). Hence P1–P5, P8 cannot leak $m$.
- (ii) `finishCrownRejection(gates, trace, reason, settings)`
  (bridge:488) likewise takes no $m$; it returns `text: N`
  verbatim, `escaped_text: escapeHtml(N)`. Hence P6–P7 render only $N$.
- (iii) P9 is the sole path returning $m$, reachable only after stages
  4–7 all pass.
- (iv) P10: the single caller (`AtlasChatView.send`, main.js:321)
  wraps the $H$ call in try/catch (main.js:356–360); any exception renders
  the constant $H_{err}$. There is no path where an exception leaves
  $m$ bound to a rendered variable.

Therefore on every reject/error path the sink-visible text is $N$,
$H_{err}$, or a deterministic fallback string — never unexamined $m$. ∎

*Corollary 1.1 (no partial render).* `finishCrownRejection` attaches no
model text, no excerpt, no reason detail containing $m$ — `text: N`
only (bridge:488). The trace records the *reason string*
(`crown_blocked:…`, bridge:893), which names detector classes, never
$m$'s content; the trace is logged to console, not rendered
(main.js:333).

*Corollary 1.2 (notice never re-scanned).* $N$ contains `VIOLATION` and
`drift`, both in $DENY$ (S2). Infinite regress
(flag → replace → flag → …) is avoided because the render sink $S_{vis}$
(main.js:332) renders `result.escaped_text` **without** re-invoking
`inspectAtlasVoice`, and the audio sink refuses $N$ by S4. This
exemption is documented at bridge:480–488 and is load-bearing: removing
it would either regress infinitely or silence the notice.

## 4. Theorem 2 — Non-bypassability

**Theorem 2.** Every Atlas reply reaching $S_{vis}$ or $S_{aud}$ passed
through $H$ = `handleAtlasChatMessage`, hence through the full stage
sequence of D6.

*Proof.* By entry-point and sink enumeration over the plugin folder
(method: exhaustive `grep`; the folder is the complete ship unit —
main.js:500 loads it by absolute path, so no external module participates):

- **L2.1.** `callLocalModel` — the only contact with $M$ — is invoked
  at exactly one site: bridge:858, inside $H$. (Verified: no other
  `callLocalModel(` call site in the plugin folder.)
- **L2.2.** `buildDeterministicFallback` is invoked at exactly one
  site: bridge:939, inside `finishFallback`, inside $H$. (Verified.)
- **L2.3.** $H$ (`handleAtlasChatMessage`) is invoked at exactly one
  site: main.js:321, in `AtlasChatView.send`. (Verified.)
- **L2.4.** $S_{vis}$ (main.js:332) renders `result.escaped_text` where
  `result` is the return of the L2.3 call — or one of three constants:
  the greeting (main.js:302, identical to the canonical fallback
  greeting), the catch string $H_{err}$ (main.js:359), or escaped user
  text (main.js:382, `escapeHtml`'d; user text is never an Atlas reply).
- **L2.5.** $S_{aud}$ (main.js:341–342) speaks `result.text` from the
  same L2.3 call, and only if `shouldSpeakResult` (S4) permits; it is
  the sole `speakAtlasReply` call site. (Verified.)

Any Atlas reply at a sink is therefore the `text`/`escaped_text` of a
result constructed inside $H$, which by D6 passed through stages 1–7 in
order. No render path bypasses $G$. ∎

*Boundary (honesty).* L2.1–L2.5 are established by exhaustive textual
search of the shipped plugin folder, not by mechanized verification of
the Obsidian eval-loader. A dormant second call site introduced by a
future edit would not be covered until this proof is re-run. The
pinned hashes in §0 delimit exactly what was searched.

*Out of scope, explicitly.* The Compass reflection surface
(`interpretStructure` → `result.responseHtml` rendered as raw HTML at
main.js:188 and main.js:9160) is a **different pipeline** (the legacy
deterministic Compass runtime: Cognition modules, `ResponseBuilder`),
governed by `runUniversalGovernancePreflight`, not by $G$. It does not
contact $M$ (L2.1 covers the only model call site). Theorems 1–5 make
**no claim** about it. Likewise the teaching/test/proof UIs
(main.js:8738–9331) and `Notice()` popups render counts, statuses, and
static strings — never model text.

## 5. Theorem 3 — Detector soundness

**Theorem 3.** Each detector flags *exactly* its specified class:

- soft-language $\iff$ S1's $SOFT_8$ substring class;
- dark-machinery $\iff$ S2's $DENY_{31}$ word-boundary class;
- robotic/clinical/technical $\iff$ S3's 20-phrase substring class;
- marker refusal $\iff$ S4 ($MARK \sqsubseteq t$ refused, twice independently);
- contradiction $\iff$ S5's
  $KW(\mathrm{stripECR}(t)) \lor (PERM(\mathrm{stripNEG}(t)) \land RESTR(t))$,
  on non-clash turns only;
- clash structure $\iff$ S6 (three headers present $\land$ provenance
  resolves or explicit `NO ESTABLISHED PROVENANCE`), on clash turns only;
- quarantine $\iff$ S7's 12-pattern / 55-phrase substring class.

*Proof.* Each is Lemma S1–S7 respectively, proved by transcription of
the cited code. "Exactly" is the biconditional in each lemma: the code
computes precisely the stated predicate, so a text is flagged iff it
satisfies the predicate — there is no hidden discretion, no
threshold, no sampling. ∎

*What "sound" does not mean.* Soundness here is *relative to the
specified class*, not to the underlying concept. S2 is sound for its 31
terms; it says nothing about the 32nd paraphrase of `containment`.
That gap is quantified in §9 (R1). Do not read Theorem 3 as "all
violations are caught" — it proves "every caught item is exactly what
the code says it catches, and everything the code says it catches is
caught."

## 6. Theorem 4 — Provenance requirement

**Theorem 4.** On a clash-flagged turn, model-path output $m$ is
rendered only if it carries the three contract headers and its
Established Provenance section resolves; otherwise the turn renders
$N$.

*Proof.* On clash turns $G$ executes steps (c)+(d) (bridge:461):
missing headers → `⟨false, structure:missing_headers:…⟩`;
`resolveProvenanceClaim` returning `resolver_unavailable` →
`⟨false, gate_error:…⟩`; unresolved specific claim →
`⟨false, structure:unresolved_provenance⟩`; the literal
`NO ESTABLISHED PROVENANCE` → pass (the contract's own escape hatch,
bridge:461). Any `⟨false,_⟩` routes via P6/P7 of Theorem 1 to $N$.
The fallback clash path emits the diagnostic by *construction*
(`buildClashDiagnostic`, bridge:580): exact user quote (≤500
chars), the three headers, and the literal `NO ESTABLISHED PROVENANCE`
— it never manufactures provenance. ∎

*Unproven (marked, not smuggled).* The code verifies header
*presence*, not header *fidelity*:

- **L1.** "Quote the relevant user input exactly. Do not paraphrase
  it." — *not code-checked* on the model path. A model could print the
  header `Observed Input` followed by a loose paraphrase and pass
  $G_{struct}$. (On the fallback path exact quoting holds by
  construction — bridge:582–583.)
- **L2.** "Explicitly identify this as an inference" (Inferred Intent)
  — *not code-checked*.
- **L3.** "Do not attribute motives that the evidence does not
  establish" — *not code-checked*.

## 7. Theorem 5 — Composition (system theorem)

**Theorem 5.** For every turn, the content reaching $S_{vis}$/$S_{aud}$
as an Atlas reply is exactly one of:

(a) model text $m$ with
    $P_{voice}(m) \land P_{quar}(m) \land G(m) \land FG(m)$ all passing,
    rendered escaped ($S_{vis}$) or spoken only if S4 permits ($S_{aud}$);
(b) deterministic fallback text: a fixed string from $\mathcal{F}$,
    itself re-checked by `inspectAtlasVoice` at generation time
    (bridge:658, re-check at bridge:713; failures replaced by the canonical default) and
    by `scanQuarantine` (bridge:951);
(c) the fixed notice $N$, on Crown rejection or gate error;
(d) the fixed constant $H_{err}$, on unexpected exception.

And: **any text violating a checkable rule is never rendered as an
Atlas reply** — it is replaced by (b), (c), or (d).

*Proof.* By Theorem 2, all sink content flows through $H$. By D6's
stage order and Theorem 1's path table, $m$ reaches a sink only via P9
(all stages pass), giving (a); every other terminal path yields
(b)–(d) by (i)–(iv) of Theorem 1. The second clause follows from
Theorem 3 (each checkable rule is exactly a detector class) plus
Theorem 1 (every detector failure diverts to (b)–(d)). ∎

## 8. Honesty ledger

**Assumptions.**
- **A0.** $M$ is an arbitrary text source. Nothing is proven about
  generation, prompt-compliance, or the system prompt's influence.
  (Stated up front per the task's hard boundary.)
- **A1.** Standard JavaScript semantics for `String()`, regex
  matching, `try/catch`, and `Array.prototype.includes`.
- **A2.** The entry-point/sink enumeration (L2.1–L2.5) is complete for
  the pinned plugin folder; method was exhaustive textual search, not
  mechanized proof.
- **A3.** Deployment: the Obsidian eval-loader executes the shipped
  files as tested (absolute-path requires, no `__dirname`; the
  require.cache gotcha is an operations concern, handled by fresh
  process per test iteration — corroborated by the headless runs, §10).
- **A4.** `window.speechSynthesis`, where present, speaks only what
  `speakAtlasReply` passes it; speech is best-effort and never blocks
  the chat (speech:1–6).

**Unproven lemmas (contract asks, code doesn't check).**
- **L1.** Exact-quote fidelity on the model path (§6).
- **L2.** Inference explicitly labeled as inference (§6).
- **L3.** No unattributed motives (§6).
- **L4.** "Never present an inference as an observation /
  interpretation as provenance / probability as certainty" —
  prompt-level; the structure check is at best a weak proxy.
- **L5.** "Never invent missing evidence" — partially covered: a
  *manufactured provenance string* that doesn't resolve is rejected
  (S6), but invented evidence elsewhere in the text is unchecked.
- **L6.** "Do not soften a valid rejection / exaggerate a valid
  approval" — not code-checked.
- **L7.** "Stop at the strongest conclusion the evidence supports" —
  not code-checked.
- **L8.** The fallback's *selection* of which fixed line to emit
  (intent regexes, `pickFallbackIntent`, bridge:533) is heuristic;
  only the *emitted strings* are proven clean, not the choice among them.

## 9. Residual risk — the detection-bounded guarantee

The proven guarantee is **detection-bounded**: a violation no detector
catches can pass. Quantified:

- **R1 — vocabulary-bounded.** Caught classes total:
  31 denylist terms (word-boundary) + 8 soft phrases + 20
  robotic/clinical/technical phrases (substring) + 55 quarantine
  phrases + the contradiction regexes. *Any* violation phrased outside
  these — a novel paraphrase of `containment`, an apology not in the 8
  phrases — passes all detectors. This is the fundamental limit; the
  lists are the specification of what "violation" means to the machine.
- **R2 — provenance leniency.** `provOk` matches by normalized
  substring in either direction (min entry 8 chars) plus
  digit-bearing token fallback. A fabricated claim that *embeds* a real
  registry id (e.g. `proof-check-106`) resolves. The check proves
  *reference to* pinned artifacts, not *truth of* the claim.
- **R3 — heuristic contradiction scan.** S5 is keyword + deontic
  regexes with deliberate fail-closed bias (documented, bridge:211).
  False positives exist: e.g. on a clash turn, a *correct* diagnostic
  quoting user text that contains a soft phrase (`i'm sorry`) is
  rejected by $G_{soft}$ (the clash skip covers only the contradiction
  scan, not the soft scan) — a precision cost, not a safety hole.
- **R4 — fallback quote injection.** The clash diagnostic embeds up to
  500 chars of *user* text verbatim (contract-mandated, bridge:580).
  That quote passes `inspectAtlasVoice` (denylist enforced, bridge:713)
  but the fallback path does **not** run $G_{soft}$ — a user-authored
  soft phrase inside a labeled quote renders. Labeled as a quote;
  minor.
- **R5 — structure verifies headers, not fidelity** (L1–L3).
- **R6 — speech guarantee is refusal-based.** S4 proves the notice can
  never be *voiced*; content safety of spoken replies rests on the
  pipeline (Theorem 5(a)/(b)) plus the double refusal — not on an
  independent audio-path scan.
- **R7 — scope.** §§3–7 cover the Atlas Chat message path only. The
  Compass reflection surface, teaching/test/proof UIs, and Notices are
  explicitly out of scope (§4, boundary note).
- **R8 — the model itself.** By A0, *no* bound is placed on what $M$
  emits; the entire guarantee is post-hoc filtering. A model that
  always emits detector-evasive violations would always pass — the
  system would then be a very expensive fixed-string emitter. The
  guarantee is "violations *in the checkable classes* never render,"
  not "the model behaves."

**Strongest honest claim** (what this document actually supports):

> For the pinned code, no text from the model — and no failure of the
> machinery around it — can reach the user as an Atlas reply unless it
> passed every detector in the pipeline; anything flagged is replaced
> by a fixed notice or fixed fallback strings, and the notice itself
> can never be re-scanned or voiced. The guarantee covers exactly the
> checkable classes (31 + 8 + 20 + 55 vocabulary items, the
> contradiction patterns, the clash-turn structure rule) — a violation
> outside those classes is outside the guarantee. Everything the voice
> contract asks for but the code does not check is listed in §8, not
> proven.

## 10. Empirical corroboration (not proof)

- `crown-gate-harness.js`: 31 `check()` sites exercising the gate
  functions in Node (soft scan, contradiction narrowing incl. the
  evidence-conflict exemption and its negation guard, structure
  checks, provenance resolution, fallback determinism, clash
  diagnostics). Reported **all-green** in the 2026-09-20 verification
  runs; headless real-Obsidian runs (8/8, 7/7 intents through the real
  UI, zero console errors) corroborate the eval-loader wiring (A3).
- `speech-harness.js`: 28 `check()` sites for `shouldSpeakResult` /
  `speakAtlasReply` / `stopAtlasSpeech`, incl. marker-refusal and
  default-off behavior. Reported all-green.
- The plugin's Teaching Center re-verifies every `FALLBACK_RESPONSES`
  line against `inspectAtlasVoice` at UI render time (main.js:9369)
  — runtime defense-in-depth for the "by construction" claim in D8.

These are *tests*, not proofs: they sample the input space. The proofs
above cover the whole input space *for the stated predicates* — which
is exactly why the predicates are written out in full rather than
gestured at.

---

*End of proof document. Proved against the pinned hashes in §0;
re-verify on any code change.*
