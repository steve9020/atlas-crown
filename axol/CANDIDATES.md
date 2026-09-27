# AXOL Hunt — Candidate Distinctions (2026-09-27)

PROPOSALS ONLY. Nothing here is promoted into any registry. Each candidate is
evidenced below; per Steve's rule ("I don't dictate truth") every one needs
his word before it becomes a distinction.

Discriminator under test: `detectAxes` from
`build/keeper-2026-09-27/AtlasTI_2026-09-27/Cognition/engine/AxisEngine.js`
(run 2026-09-27, in-process). Raw probe output: `raw-wave1.txt`,
`raw-wave2.txt`. Probe scripts: `hunt.js`, `hunt2.js`.

---

## C1 — The "don't" gap: the commonest spoken negator is invisible to state detection

**Pair/case:**
- "I don't trust her." → `trust[asserted]` (WRONG)
- "I don't blame her." → `responsibility[asserted]` (WRONG)

**What the discriminator did wrong:** marked asserted what is plainly negated.
A buyer reading this output would believe the speaker trusts her / does not
blame her — the exact opposite of what was said.

**Mechanism (verified):** `evidenceState`'s negation regexes contain `can.t`,
`doesn.t`, `didn.t`, `isn.t`, `wasn.t`, `won.t` — but no `don.t`, no `aren.t`,
no `ain.t`. Direct regex test: "don't"→false, "do not"→true, "doesn't"→true,
"aren't"→false. Irony: `trust_axis` phrases include the literal phrase
"don't trust", so the rule fires and then the state detector mislabels it.

**Positive matches (correctly negated):**
- "I do not trust her." → `trust[negated]`
- "She doesn't trust him." → `trust[negated]`

**Close non-matches:**
- "I trust her." → `trust[asserted]` (correct; the unnegated control)
- "I can't trust her." → negated via `can.t` (correct; shows the hole is
  specific to the missing contractions)

**Negated version:** this IS the negation case; the fix is additive
(`don.t`, `aren.t`, and audit the rest of the contraction family) in the
two negation regexes in `evidenceState`.

**Severity:** high. "don't" is among the most frequent negations in spoken
and informal written English; every "don't + AXOL verb" sentence inverts.

---

## C2 — Meta-denial collapses into content-denial (and identical outputs for different meanings)

**Pairs/cases:**
- "I didn't say she was responsible." → `responsibility[negated]{she:negated}`
- "I never said I trusted her." → `permanence[negated], trust[negated]`
- "I said I never trusted her." → `permanence[negated], trust[negated]`
  (near-identical output to the previous line — different meaning, same mapping)

**What the discriminator did wrong:** denying the *speech act* ("I didn't
say X") is mapped the same as denying the *content* ("X is not true").
"I never said I trusted her" makes NO claim about trust; "I said I never
trusted her" asserts distrust. The discriminator cannot tell them apart —
two different meanings mapped together.

**Positive matches:**
- "I said I never trusted her." → `trust[negated]` (correct as far as it goes)
- "I never trusted her." → `trust[negated]` (correct)

**Close non-match:** "She wasn't responsible." → `(none)` (see C3 — the real
content-denial doesn't even fire, so the meta-denial is the ONLY thing that
fires; the inversion is total).

**Note for design:** the honest outputs might be "no content axis" for the
meta-denial, or a new evidence state (e.g. `withheld`/`unclaimed`). Proposal
only — the vocabulary call is Steve's.

---

## C3 — Negated copula forms are invisible (bare "was/were responsible")

**Pair/case:**
- "She was responsible." → `responsibility[asserted]` (control, correct)
- "She wasn't responsible." → `(none)` (WRONG — should be negated)
- "She was not responsible." → `(none)` (WRONG)
- "They are not responsible." → `(none)` (WRONG)

**What the discriminator did wrong:** complete miss. Not a wrong state — no
axis at all.

**Mechanism (verified in registry):** `responsibility_axis` regex
`\b(<actor>)\s+(?:am|is|are|was|were) responsible\b` admits no negator
between copula and predicate; "was not responsible" breaks the match.

**Positive match (machinery works when the phrase survives):**
- "He was not responsible for the delay." → `responsibility[negated]` ("responsible
  for" survives as substring; the 45-char before-window catches "not")
- "He did not cross the boundary." → `boundary[negated]` (same substring mechanism)

**Close non-match:**
- "She was never responsible." → `permanence[negated]`, responsibility LOST —
  "never" both breaks the regex AND fires the wrong axis.

**Negated version:** this IS the negation case; fix is regex-local
(`(?:not|never|n't)` allowance between copula and predicate), mirroring the
substring behavior that already works for "responsible for".

---

## C4 — Uncertainty scope bleed across conjoined propositions

**Pair/case:**
- "Maybe she intended to help and she clearly crossed the boundary anyway."
  → `intention[uncertain]` ✓, `boundary[uncertain]` ✗ (should be ASSERTED —
  the speaker says "clearly"), `certainty[uncertain]`

**What the discriminator did wrong:** one "maybe" poisons every proposition
in the clause. Two conjoined claims with opposite epistemic states
(uncertain intention, certain boundary-crossing) get the same state.

**Mechanism (verified in code):** `evidenceState` tests the WHOLE clause for
uncertainty markers; "and" is not a clause boundary (`clauseAround` splits
only on `. ; ! ? , but , yet`), so the marker leaks across the conjunction.

**Positive match (control — clause boundary present):**
- "I might have misheard, but he definitely chose to leave."
  → `choice[asserted]` ✓ (", but " splits; uncertainty stays left)

**Close non-match:**
- "She clearly crossed the boundary." → `boundary[asserted]` ✓ (no marker,
  no bleed)

**Negated version:** "Maybe she crossed the boundary." → both uncertain
(correctly) — the fix must be scope-local (marker governs its own
proposition/conjunct), not clause-global.

---

## C5 — Interrogative mood collapses to asserted

**Pair/case:**
- "Did she cross the boundary?" → `boundary[asserted]` (WRONG — a question
  asserts nothing)
- "Did he mean to hurt me?" → `impact[asserted]` (WRONG on mood; plus C8 —
  intention missed)

**What the discriminator did wrong:** questions are labeled as assertions.
Downstream, "did she cross the boundary?" reads as "she crossed the
boundary" — evidence asserted that was never asserted.

**Positive match:** "He crossed the boundary." → `boundary[asserted]` ✓

**Close non-match:** "I don't know whether she crossed the boundary." →
  (unprobed; "whether" is an uncertainty marker — predicted `uncertain`,
  which would be the acceptable mapping for questions too)

**Note for design:** the state vocabulary (asserted/negated/uncertain) has no
interrogative value. Mapping questions to `uncertain` may be the honest
minimal fix; adding a mood value is the fuller one. Proposal only.

---

## C6 — Conditional/hypothetical collapses to asserted

**Pair/case:**
- "If he crossed the boundary, I will leave." → `boundary[asserted]` (WRONG —
  hypothetical)
- "If she meant well, why did it hurt?" → `impact[asserted]` (WRONG; plus the
  actor bound as "why" — see C9)

**What the discriminator did wrong:** same class as C5 — a non-asserted mood
labeled asserted.

**Positive match:** "He crossed the boundary, so I will leave."
→ (unprobed; predicted `boundary[asserted]` — genuinely asserted)

**Note for design:** same vocabulary question as C5. C5+C6 together suggest
one "non-asserted mood" distinction covering interrogative and conditional.

---

## C7 — Double negation (litotes) not resolved

**Pair/case:**
- "I cannot not trust her." → `trust[negated]` (WRONG — litotes: trust is
  compelled → asserted)
- "It is not that I do not respect her." → `respect[negated]` (WRONG — means
  respect IS given; plus actor "it", see C9)

**What the discriminator did wrong:** first negation word in the before-window
wins; stacked negations are never composed.

**Positive match:** "I do not trust her." → `trust[negated]` ✓ (single
negation works)

**Close non-match:** "I cannot trust her." → (unprobed; predicted negated —
  single negation, correct)

---

## C8 — Intention paraphrase gaps ("mean to", "meant well", "meant it")

**Cases (all missed — `(none)` or wrong axis):**
- "Did he mean to hurt me?" → `impact` only, no intention
- "She meant well." → `(none)`
- "I am certain he meant it." → `certainty` only, no intention

**Controls (caught):**
- "He meant to do it." → `intention[asserted]` ✓
- "He means to do it." → `intention[asserted]` ✓

**Mechanism (verified in registry):** `intention_axis` regexes cover
"meant to"/"means to" but not present-tense "mean to"; no "meant well" /
"meant it" / "mean well" forms. Fresh instance of hell-fuzz failure class 1
(natural paraphrase gaps), this time in intention.

**Negated version:** "He did not mean it." → `(none)` (misses entirely —
  compounds C3's lesson: negated forms of narrow phrases vanish)

---

## C9 — Function words bound as actors

**Cases (actor is garbage):**
- "The decision was hers to respect." → actors `the`, `to`
- 'It is not that I do not respect her.' → actor `it` (expletive)
- "She definitely chose to leave." → actor `definitely` (adverb)
- "Maybe he left." → actor `maybe` (uncertainty marker)
- "Not all of them trusted her." → actor `not` (negation particle)
- "None of them trusted her." → actor `none` (AND `trust[asserted]` — "none"
  is not in the negator list, so the state inverts too)
- "If she meant well, why did it hurt?" → actor `why` (interrogative word)

**What the discriminator did wrong:** `inferActor`'s leading-token branch
accepts any `[a-z][a-z'-]{1,30}` with no function-word stoplist;
`normalizeActorToken` has no "it"; epistemic adverbs and negators aren't
excluded from actor candidacy.

**Positive matches (actor binding working):**
- "She respected the decision." → actor `she` ✓
- "Nobody trusts her." → `trust[negated]{nobody:negated}` — "nobody" as actor
  is arguably CORRECT (subject-negator). The fix must distinguish
  subject-negators (nobody/no one) from bare particles (not/none).

**Close non-match:** "Marcus made the call. He owned it completely." →
  actor `he` retained (conservative resolver — by design per the 14/18
  hell-fuzz boundary; NOT claimed as a failure).

---

## C10 — Idiom coverage is inconsistent ("cross the line" vs "draw the line")

**Cases (missed — `(none)`):**
- "He crossed a line." / "He crossed the line." → `(none)`
- "He passed the buck on the decision." → `choice` only (from "decision";
  responsibility idiom missed)
- "My hands are tied on this one." → `(none)` (control-negated idiom)
- "He took the fall for the team." → `(none)` (responsibility idiom)
- "She pulled the strings behind the launch." → `(none)` (control idiom)
- "He ain't mean it like that." → `(none)` (AAVE intention-negated)

**Control (caught):**
- "She drew the line at weekend calls." → `boundary[asserted]` ✓
- "She be trying to help everybody." → `intention[asserted]` ✓ (AAVE
  habitual "be trying" worked)

**Mechanism (verified in registry):** `boundary_axis` regex
`\bcross\w*\b.{0,20}\bboundar\w*\b` requires the "boundar" stem — "line"
alone only counts via draw/drew/set/establish/state. So the registry knows
"draw the line" but not "cross the line": inconsistent idiom coverage, and
"cross the line" is the more common boundary-violation idiom.

---

## C11 — Temporal aspect: "used to" asserts a dead state as live

**Pair/case:**
- "I used to trust her." → `trust[asserted]` + `temporal_scope[asserted]`
  (WRONG — the trust held in the past; it does not hold now)
- Control: "I trust her now." → `trust[asserted]` ✓

**What the discriminator did wrong:** `temporal_scope` fires but does not
modulate the trust state; "used to" is not treated as terminating the state.
A reader sees current trust asserted.

**Note for design:** needs an aspect/state-transition value ("held, now
lapsed") or a rule mapping "used to X" → X negated-current. Proposal only.

**PROMOTED 2026-09-27 (Steve reversed his call — rides this release).**
New state `lapsed` ("held, now lapsed"), one meaning one mapping, scoped to
the "used to + verb" construction. Runs after the negator checks in
`evidenceState`, so "didn't use to trust her" (never held) stays negated;
mood still wins ("Did you use to trust her?" → interrogative). The "used
to" must govern the axis's predicate — no contrast/segment boundary may
intervene ("I used to trust her and I still respect her" → trust lapsed,
respect asserted). Blind coverage in
`tests/axolCandidateFixesTest.js` (11 cases + 1 examiner silent check).
Judgment call recorded: lapsed-vs-asserted passes the examiner
contradiction check silently (like interrogative/withheld) — the
past-vs-present tension is not adjudicated; Steve can revisit.

---

## C12 — Quoted first-person pronoun misbound to the speaker

**Case:**
- 'She said "I choose to leave".' → `choice[asserted]` with attributions
  `{she:asserted, she:asserted, self:asserted}` — the quoted "I" (= she) is
  bound to `self` in one attribution.

**What the discriminator did wrong:** no quotation awareness in `inferActor`;
a first-person pronoun inside a reported quote is attributed to the
reporter (the actual speaker, "self") instead of the quoted source.

**Positive match:** "She chose to leave." → `choice` actor `she` ✓
(unquoted control)

---

## Observations (probed, NOT proposed as candidates)

- **O-a — Scope of "only":** "Only she expected a reply." vs "She only
  expected a reply." → identical outputs. Real meaning difference, but finer
  than the axis×state×actor vocabulary can express. Vocabulary boundary, not
  an in-contract discrimination failure. Banked, not proposed.
- **O-b — Mention-shaped AXOL (the scanner's first-duty analog):** "We talked
  about whether I could trust her." → `trust[uncertain]`; "We discussed
  whether the boundary was crossed." → `boundary[uncertain]`. The "whether"
  marker yields `uncertain`, which is an acceptable approximation — talking
  about an axis does not get asserted. No failure.
- **O-c — Zeugma:** "He took responsibility and the last train home." →
  `responsibility[asserted]`, no misfire on "train". Clean.
- **O-d — Code-switching:** "I vertraue her completely." → `(none)`; full
  German "Ich vertraue ihr." → `trust[asserted]` (de pack ✓). Single-word
  insertion missed — banked as robustness observation.
- **O-e — es pack gaps:** Spanish cues cover 12 axes but NOT boundary;
  "Ella cruzó la línea." → `(none)`. Accent sensitivity: cue is "confío en",
  unaccented "No confio en ella." → `(none)` (NFKC doesn't fold diacritics).
  Banked for the multilingual backlog.
- **O-f — "I done told him twice already."** → `(none)`. AAVE gap, but the
  target axis itself is debatable (prior speech-act claim). Banked.
- **O-g — J1 axes were fine:** "The decision was hers to respect." →
  choice/ownership/respect all defensible; only the actors were garbage (C9).

---

## Severity ranking (hunter's judgment, Steve decides)

1. **C1 ("don't" gap)** — highest frequency, total inversion of meaning.
2. **C9 (function-word actors)** — corrupts attribution across many inputs;
   seven reproduced instances.
3. **C3 (negated copula)** — common surface form ("wasn't responsible")
   vanishes entirely.
4. **C2 (meta-denial collapse)** — two meanings, one mapping; the A3/A4 pair
   is the cleanest paraphrase-trap in the hunt.
5. **C4 (uncertainty bleed)** — one marker poisons conjoined propositions.
6. **C5/C6 (interrogative/conditional → asserted)** — vocabulary-level; needs
   a design call.
7. **C8 (intention paraphrases)** — fresh hell-fuzz-class-1 instance.
8. **C10 (idiom inconsistency)** — "cross the line" notably absent.
9. **C7 (litotes)** — rarer construction, real inversion.
10. **C11 ("used to")** — aspect gap; needs a design call.
11. **C12 (quote misbinding)** — narrow, reproducible.

## Files

- `BASELINE.md` — 17/17 green baseline + closure state read.
- `baseline.js` — in-process suite runner (cwd must be the build root).
- `hunt.js` — wave-1 probes (40 cases across 16 classes A–P).
- `hunt2.js` — wave-2 mechanism diagnostics (20 probes).
- `raw-baseline.txt`, `raw-wave1.txt`, `raw-wave2.txt` — verbatim outputs.
- `CANDIDATES.md` — this file.

Nothing promoted. No registry file touched. Awaiting Steve's word per candidate.

## Hole patches 2026-09-27 (Steve: "Let's patch those holes")

1. Lapsed vs asserted in the examiner contradiction check now FLAGS for
   review (was: silent). "I used to trust her" against canonical "I trust
   her" is a genuine past-vs-present tension; interrogative/withheld stay
   silent per his decided calls. Blind coverage: flaggedChecks in
   axolCandidateFixesTest.js (flag on asserted-canonical; silent on
   lapsed-canonical and negated-canonical).
2. C12 quote attribution now handles paired single quotes with
   apostrophe-safe rules (opening not preceded by word char, closing not
   followed by one, span must contain whitespace). "She said, 'I trust you'"
   -> she; contractions/possessives ("don't", "it's", "John's") unaffected.
   Blind coverage: 2 single-quote positives + 3 apostrophe negatives in
   axolCandidateFixesTest.js actorCases.
