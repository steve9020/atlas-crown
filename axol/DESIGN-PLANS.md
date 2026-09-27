# AXOL Design Plans (2026-09-27)

Two candidates from the hunt need design calls, not phrase fixes. These are
the plans. Nothing here is implemented, no registry touched, nothing promoted.
Every open question marked STEVE'S CALL needs his word before it becomes a
distinction.

Background the plans assume (verified in the 2026-09-27 build):
- `evidenceState()` in `Cognition/engine/AxisEngine.js` returns one of three
  values: `asserted`, `negated`, `uncertain`. It looks at a 45-character
  before-window for negators and the whole clause for uncertainty markers.
- Each axis hit carries `{axis, evidence, states[], attributions[]}`.
- Consumers of the state vocabulary: `IndependentExaminer.js` (test specs
  assert `expectState`; one contradiction check: a variant reading `negated`
  against a canonical `asserted` fails), `MultilingualAxolSubstrate.js`
  (defaults every multilingual hit to `asserted`), `SemanticEvidenceObject.js`
  (pass-through). The response pipeline, route scorer, and return engine do
  NOT branch on states. Registry rules do not declare states — states are
  computed, so no rule migration is needed for new states; examiner specs
  are the migration surface.

---

## PLAN A — Mood vocabulary (C5 interrogative + C6 conditional)

**Problem.** Questions and conditionals are labeled `asserted`, which is
wrong in a way that manufactures evidence. "Did she cross the boundary?"
asserts nothing — but the discriminator reports `boundary[asserted]`, and
anyone reading that output believes a crossing was claimed. "If he crossed
the boundary, I will leave" supposes a crossing for the sake of argument —
but it reports `boundary[asserted]` as fact. The state vocabulary
(asserted / negated / uncertain) has no value for "not asserted in this
mood," so both collapse into the wrong bucket. The C5 note in the hunt
showed the acceptable nearby behavior: "I don't know whether she crossed"
maps to `uncertain` via the "whether" marker, and that was judged fine —
but a live question ("Did she...?") and a live supposition ("If he...") are
not uncertainty, and stuffing them into `uncertain` would be the same class
of bug as C2: two meanings, one mapping.

**Proposed new states and what they mean.**

- `interrogative` — the speaker asks whether the proposition holds. Nothing
  is claimed about its truth either way. "Did she cross the boundary?"
- `hypothetical` — the proposition is supposed true only inside a
  supposition ("if / unless / ..."). Outside the supposition, nothing is
  claimed. "If he crossed the boundary, I will leave."

These are different things, and the difference matters downstream: a
question invites an answer; a supposition invites reasoning inside the
"what if" without treating it as fact. Today nothing downstream branches on
states except the examiner — so this is about the honesty of the record and
about every future consumer reading it straight.

**Scoping rules (part of the design, not an afterthought).**

- Mood is clause-level. The whole interrogative clause gets the state, not
  just the matched phrase.
- Embedded / reported questions stay as they are: "I asked whether she
  crossed the boundary" — the asking happened (asserted), the content was
  not asserted. The existing "whether" → `uncertain` mapping is acceptable
  here and does not change.
- Conditionals scope to the subordinate clause only: in "If he crossed the
  boundary, I will leave," the boundary is `hypothetical` but "I will leave"
  is a real commitment and stays `asserted`. This needs the if-clause comma
  as a scope boundary — the same clause-boundary lesson as C4 (where "and"
  is not a boundary and one "maybe" poisoned the whole clause).
- Marker set for hypothetical: if, unless, provided (that), suppose,
  assuming, in case. "When" is ambiguous between temporal and conditional
  ("When he crosses the boundary, I will leave" reads closer to a future
  assertion) — see open questions.

**What breaks per consumer if new states are added.**

- `evidenceState()`: needs mood detection before the negator/uncertainty
  checks (a trailing "?", do-support inversion "did she...", wh-words,
  leading if/unless). The before-window negator check must not override
  mood: "Didn't she cross the boundary?" is still a question.
- `IndependentExaminer.js`: additive — specs can newly assert
  `expectState: 'interrogative'`. The contradiction check (line 240) only
  fires on `negated`-vs-`asserted`; an interrogative variant against an
  asserted canonical would NOT flag. That is arguably correct (a question is
  not a contradiction), but it is a deliberate choice to record.
- `MultilingualAxolSubstrate.js`: multilingual hits default to `asserted`
  and have no mood detection. They stay that way under this plan — a
  documented gap, not a silent one.
- The 17 AXOL suites: baseline stays green; specs whose outputs
  intentionally change (questions/conditionals previously asserted) get
  updated expectations, examiner-blind, with Steve's stamp.

**Options.**

1. **Map both to `uncertain` (minimal).** No new states, no consumer
   changes, matches the existing "whether" behavior. Trade-off: it mislabels
   on purpose. "If he crossed the boundary" is not uncertain — it is
   supposed-true-for-argument — and a future reader cannot tell "I don't
   know whether" apart from "suppose that." Cheap now, dishonest later.

2. **One new state, `nonasserted`, covering both.** Captures "not claimed"
   cleanly with half the new surface of two states. Trade-off: questions and
   suppositions still share a bucket. The day something downstream needs to
   answer a question differently from entertaining a supposition, the bucket
   splits anyway — and splitting a shipped state is a migration.

3. **Two new states, `interrogative` + `hypothetical` (recommended).** Most
   precise; each means exactly one thing. Trade-off: twice the vocabulary
   surface, and each needs its own scoping rules and blind-set coverage.
   The cost is contained because both ride one detection mechanism (mood
   detection in `evidenceState`), so it is one mechanism with two labels,
   not two mechanisms.

**Recommendation: Option 3.** The C2 lesson from this same hunt is that two
meanings sharing one mapping is exactly the bug class we are fixing. A
question and a supposition fail differently and want different downstream
handling; giving them one bucket now just schedules the same hunt later.
Option 2 is the honest fallback if Steve wants less surface.

**Open questions — STEVE'S CALL.**

1. One state or two — does the interrogative/hypothetical split earn its
   keep, or is `nonasserted` enough vocabulary?
2. Rhetorical questions ("Who didn't see that coming?" — asserts that
   everyone saw it): in scope for v1, or banked?
3. "When"-clauses ("When he crosses the boundary, I will leave"): temporal
   (closer to asserted future) or conditional (hypothetical)?
4. The examiner's contradiction check: should an `interrogative` variant
   against an `asserted` canonical pass silently (a question is not a
   contradiction), or be flagged for review?

**What "done" looks like.** `interrogative` and `hypothetical` defined with
the semantics above; mood detection implemented with the scoping rules;
examiner specs asserting the new states; all 17 suites green (updated where
behavior intentionally changed); a new examiner-blind set covering
questions, conditionals, embedded questions, and the if-clause comma
boundary; Steve's meaning stamp on the distinction.

---

## PLAN B — Meta-denial (C2, interacts with C3)

**Problem.** Denying the *speech act* is mapped the same as denying the
*content*, and right now the inversion is total. "I never said I trusted
her" makes NO claim about trust — but it fires `trust[negated]`. "I said I
never trusted her" asserts distrust — and it fires the near-identical
`trust[negated]`. Two different meanings, one mapping. Worse, the genuine
content-denial "She wasn't responsible" fires nothing at all (C3 — the
negated copula is invisible), while the meta-denial "I didn't say she was
responsible" fires `responsibility[negated]`. So today the sentence that
claims nothing registers as a denial, and the sentence that denies
registers as nothing. The mechanism: `evidenceState` sees "didn't"/"never"
in the 45-char before-window and flips the state, never noticing the
negator belongs to the speech verb ("say"), not the content ("she was
responsible").

**Proposed mechanism: scope the negation to what it actually negates.**

English puts the negator on the verb it belongs to. In "I **didn't say**
[she was responsible]", the negator scopes over the speech act. In "I said
I **never trusted** her", it scopes over the content. The design: when a
negator's nearest verb to its right (inside the detection window) is a
speech-act verb — say/said/tell/told/claim/mention/state — and the axis
phrase sits in that verb's complement clause, the negation does NOT touch
the content's state. The content was mentioned but not claimed.

Two honest outputs are possible for the mentioned-but-not-claimed content,
and that is the central design call:

- **Suppress the axis** — "I never said I trusted her" produces no trust
  axis at all. Cleanest record: no claim, no entry.
- **New state `withheld`** — the axis fires with state `withheld`, meaning
  "mentioned but not claimed — neither asserted nor denied." Preserves the
  information that trust came up, which the O-b observation showed matters
  (mention-shaped input mapping to `uncertain` was judged acceptable
  precisely because it kept the mention visible instead of dropping it).

Note the difference from `uncertain`: uncertain = a claim was made but its
truth is open ("whether she crossed"). Withheld = no claim was made at all.
"I never said I trusted her" is not uncertainty about trust; it is the
absence of a trust claim.

**Both directions must be fixed together (the C3 interaction).** Plan B is
only half the repair. The other half is C3's regex-local fix: allow a
negator between copula and predicate so "She was **not** responsible"
fires `responsibility[negated]`. The two compose cleanly if ordered right:
speech-act scoping runs FIRST ("I didn't say she was responsible" →
withheld/suppressed, never reaching content state), then copula-negation
("She was not responsible" → negated). Check the ordering against the
nasty case: "I didn't say she was not responsible" — meta-denial of a
negated content. Speech-act scoping catches it first: withheld, not
double-negated. If the order were reversed, the copula slot would fire
`negated` on content the speaker never claimed — the exact bug again.

**What breaks per consumer.**

- `evidenceState()`: needs the speech-act scoping pre-pass before the
  before-window negator check. The speech-act verb list is registry-grade
  vocabulary — it needs Steve's sign-off, because verbs are tricky: "deny"
  ("I deny she was responsible") is a CONTENT denial → `negated`, not
  withheld. "Admit" ("I don't admit she was responsible") withholds
  admission — arguably `withheld`. "Promise"/"swear" similar.
- `IndependentExaminer.js`: additive — specs can assert
  `expectState: 'withheld'`. Contradiction check: `withheld` vs canonical
  `asserted` is not a contradiction (nothing was claimed), so the check
  stays as-is; record the choice.
- `MultilingualAxolSubstrate.js`: same documented gap as Plan A — no
  speech-act scoping for multilingual hits.
- Existing suites: the C2 pair ("I never said I trusted her" vs "I said I
  never trusted her") becomes the regression anchor — the two must map
  differently, permanently.

**Options.**

1. **Suppress the axis on meta-denial.** Simplest. "I never said I trusted
   her" → no trust axis. Trade-off: the mention vanishes from the record.
   A later "but I do now" has no earlier mention to attach to, and the
   O-b lesson (keep mentions visible) is lost.

2. **New state `withheld` (recommended).** The axis fires, the state says
   "mentioned, not claimed." Preserves the mention, gives the examiner
   something to assert, keeps the vocabulary honest: asserted / negated /
   uncertain / withheld are four different things and now each means one.
   Trade-off: one more state for every consumer to be aware of — though in
   practice only the examiner branches on states, and there it is additive.

3. **Full syntactic scope tree.** Negation attaches to its syntactic head
   via real parsing; compositional, handles stacked and nested cases
   ("I didn't say she wasn't responsible") by construction. Trade-off: this
   is a parser, not a regex pass — an order of magnitude more machinery, new
   failure modes of its own, and the current regex architecture has carried
   17 green suites. Revisit if Option 2's verb-list approach shows strain.

**Recommendation: Option 2, with the C3 copula fix ordered after the
speech-act scoping.** It fixes both directions of the inversion with the
least new machinery, it keeps the mention visible (the O-b lesson), and the
verb list is auditable — every verb on it is a deliberate choice Steve can
read, unlike a parser's emergent behavior. Option 3 is the honest
long-term answer if the verb list starts accumulating exceptions.

**Open questions — STEVE'S CALL.**

1. Suppress the axis or carry `withheld` — is "mentioned but not claimed"
   worth a state, or should meta-denial leave no trace?
2. The speech-act verb list: say/said, tell/told, claim, mention, state are
   the clear cases. Where do admit, deny, promise, swear, insist fall?
   ("I deny she was responsible" reads as content-denial to me — but it is
   your call.)
3. "I never said I trusted her" often *implies* distrust in real
   conversation. Does Atlas record the implicature anywhere, or is no-claim
   the whole honest story? (Evidence, not implicature, is the current
   contract — confirming, not assuming.)
4. C11 ("used to") also wants a new state ("held, now lapsed"). If
   `withheld` ships, does the aspect state ride the same release or wait?

**What "done" looks like.** `withheld` defined as "mentioned but not
claimed"; speech-act scoping implemented with a signed-off verb list; C3's
copula-negation slot in place AFTER the scoping pass; both directions
verified ("I didn't say she was responsible" no longer registers as
content-denial AND "She was not responsible" now registers as negated);
the C2 pair locked in as a permanent regression anchor; examiner-blind set
for meta-denial incl. the "deny"/"admit" edge verbs; all 17 suites green;
Steve's meaning stamp.

---

## After the design calls

The remaining candidates (C1, C3, C4, C7, C8, C9, C10, C11, C12) are
phrase/regex fixes — no design needed — and roll out after these two plans
are decided. C3's copula fix is specified inside Plan B because it composes
with the meta-denial scoping; it can ship with Plan B or just ahead of it,
never after the scoping pass is live without it (the inversion would
otherwise stand: meta-denials firing while genuine denials stay silent).

---

## STAMPED — 2026-09-27

Steve's meaning stamp, his word: "Stamp it and move on" (2026-09-27).
Machinery stamp already held at implementation time: 17/17 AXOL suites
green, 33/33 new blind cases (15 mood + 18 meta-denial), C2 pair locked as
a permanent regression anchor ("I never said I trusted her" → withheld vs
"I said I never trusted her" → negated).

Plan A STAMPED: two-state mood vocabulary — `interrogative` + `hypothetical`.
Plan B STAMPED: `withheld` state + speech-act scoping pre-pass, C3 copula
fix ordered AFTER the scoping pass ("I didn't say she was not responsible"
→ withheld, never double-negated).

Steve's six decided calls (as built):
1. Rhetorical questions banked for v1 — no special handling in code.
2. "When"-clauses are temporal → asserted, never hypothetical (verified:
   "When he crosses the boundary, I will leave" → asserted).
3. Interrogative-vs-asserted and withheld-vs-asserted pass the examiner's
   contradiction check silently — recorded in-code, covered by two
   examiner-level checks in the blind set.
4. Speech-act verb list: deny = content-denial → negated ("I deny she was
   responsible" → negated); admit/promise/swear/insist +
   say/said/tell/told/claim/mention/state → withheld. Refinement baked in:
   tell/told/telling counts only with a propositional complement (keeps
   "that alone does not tell me whose fault it was" negated; existing
   suite forced it).
5. No implicature recorded — "I never said I trusted her" implying distrust
   stays out of the record; the evidence-only contract stands.
6. C11 "used to" aspect state waits for its own release — not implemented.
   [REVERSED 2026-09-27: Steve ordered it in — `lapsed` state implemented,
   blind-covered, all suites green. See CANDIDATES.md C11 promotion note.]

Multilingual substrate untouched (still defaults to asserted — documented
gap, per plan). Nothing promoted to Steve's installed keeper; the stamped
package ships as a build another day.
