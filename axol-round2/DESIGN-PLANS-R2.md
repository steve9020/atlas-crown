# AXOL Design Plans — Round 2 (2026-09-27)

Four candidates from the round-2 hunt need design calls, not phrase fixes.
These are the plans. Nothing here is implemented, no registry touched,
nothing promoted. Every open question marked STEVE'S CALL needs his word
before it becomes a distinction.

Background the plans assume (verified in the 2026-09-27 build,
`Cognition/engine/AxisEngine.js` + `runtime/teaching/IndependentExaminer.js`):
- `evidenceState()` returns one of seven values: `asserted`, `negated`,
  `uncertain`, `interrogative`, `hypothetical`, `withheld`, `lapsed`.
  Pipeline order: mood → uncertainty (scope-local, C4) → withheld
  pre-pass → deny exception → idioms → litotes count → negator checks →
  lapsed → asserted.
- Each axis entry carries `{axis, evidence, rules, states[], attributions[]}`.
  `states[]` is a per-axis MERGE across evidence matches — today a
  multi-state entry means different matches disagreed (R2-C1's visible
  bug), not that one match composed two meanings. Per-evidence states
  already exist inside `attributions[]` as `{actor, evidence, state}`.
- Consumers of the state vocabulary: `IndependentExaminer.js` (specs assert
  `expectState`; the contradiction check flags negated-vs-asserted and,
  per Steve's hole patch, lapsed-vs-asserted) and nothing else.
  `MultilingualAxolSubstrate.js` defaults every multilingual hit to
  `asserted` (documented gap). The response pipeline, route scorer, and
  return engine do NOT branch on states. Registry rules do not declare
  states — states are computed, so examiner specs are the migration
  surface, same as round 1.

---

## PLAN R2-A — Hypothetical swallows inner negation (R2-C2)

**Problem.** "If she trusted him, she would have come" and "If she didn't
trust him, she wouldn't have come" both map `trust[hypothetical]` —
identical output for opposite suppositions. `detectMood` returns the moment
the if-marker matches, so the negation inside the supposition is discarded
and never consulted. A reader cannot tell supposed-trust from
supposed-distrust. This is the round-1 C2 failure class (two meanings, one
mapping) reborn inside the mood vocabulary. Note the boundary: Steve
already decided the interrogative case the other way — "Didn't she cross
the boundary?" stays `interrogative`, inner negation deliberately absorbed
— so this plan is scoped to `hypothetical` only. The O-a observation shows
the same composition gap for hypothetical×lapsed and
hypothetical×withheld; whatever mechanism is chosen should generalize.

**Options.**

1. **Keep `hypothetical` for both, document the loss.** No code, no new
   vocabulary, matches the interrogative precedent. Trade-off: it mislabels
   on purpose. "If she didn't trust him" is not the same supposition as
   "if she trusted him," and a future reader cannot tell them apart. Cheap
   now, dishonest later — the exact bug class this whole hunt exists to
   kill.

2. **Composed token: one match, one composed value (recommended).**
   The mood stage and the polarity stage both contribute to a single
   match, which returns `hypothetical+negated` as ONE state value.
   "If she trusted him" → `hypothetical`; "if she didn't trust him" →
   `hypothetical+negated`. Trade-off: the token space grows — but it stays
   bounded because composition is scoped to hypothetical×polarity only
   (interrogative keeps its decided absorb-behavior; aspect stays out
   unless a later hunt proves need). The examiner asserts one string, the
   contradiction check gets one new rule, every other consumer keeps
   working untouched.

3. **Polarity sub-field on the evidence item.** Keep `state:
   'hypothetical'` and add `polarity: 'negated'` alongside it (the
   `attributions[]` items already carry per-evidence state, so the shape
   has room). Trade-off: cleanest dimensional separation — mood and
   polarity stop sharing one slot — but it changes the entry shape, and
   every future consumer must learn the new field instead of reading one
   value. More honest as a model, more surface as a contract.

A note on the obvious fourth option, stuffing both into the existing
`states[]` array: don't. The array already means "matches disagreed"
(R2-C1). A `['hypothetical','negated']` entry would read identically to a
visible bug — composition and disagreement sharing one representation is
the two-meanings-one-mapping class again, one level up.

**Recommendation: Option 2.** It preserves the one-value-per-match
contract the R2-C1 fix depends on, it gives the examiner something
assertable, and the token space stays small because the scope is
deliberately narrow (hypothetical×negated only). Option 3 is the honest
long-term shape if mood×aspect or mood×withheld composition ever needs
expressing — and O-a says that day may come, so the token should be
shaped to extend, not to be replaced.

**What breaks per consumer.**

- `evidenceState()`: the mood stage stops returning early on a bare
  marker — after `hypothetical` is decided, the negator checks run
  *inside* the supposition scope and their result composes with the mood
  instead of being discarded. The "did not stop wanting" asserted-override
  and the C7 litotes count need the same scoping (they already operate on
  the before-window; inside a supposition that window is the if-clause).
- `IndependentExaminer.js`: additive — specs can assert
  `expectState: 'hypothetical+negated'`. Contradiction check: a
  `hypothetical+negated` variant against an `asserted` canonical is not a
  contradiction (nothing was claimed) — record the choice, same as
  `withheld`.
- `MultilingualAxolSubstrate.js`: stays defaulting to `asserted` —
  documented gap, unchanged.
- Existing suites: the R2-C2 pair becomes a permanent regression anchor —
  the two suppositions must map differently, forever.

**Open questions — STEVE'S CALL.**

1. Does `hypothetical` compose with polarity, or does the supposition
   frame absorb it the way `interrogative` does by your earlier call?
2. Composed token (`hypothetical+negated`) or polarity sub-field — is one
   value per match the contract, or do mood and polarity deserve separate
   slots?
3. Should the composition generalize now to hypothetical×lapsed and
   hypothetical×withheld (O-a), or ship hypothetical×negated only and let
   a later hunt prove the need?
4. The examiner's contradiction check: does `hypothetical+negated`
   against an `asserted` canonical pass silently (nothing claimed), or get
   flagged for review?

**What "done" looks like.** Composition mechanism implemented with the
decided representation; "If she trusted him" and "If she didn't trust him"
map differently, permanently anchored; examiner-blind set covering
hypothetical×negated, the interrogative absorb-boundary (unchanged), and
the O-a cases at whatever scope was decided; all 17 suites green; Steve's
meaning stamp.

---

## PLAN R2-B — Pipeline order: uncertainty vs withheld (R2-C4)

**Problem.** "I don't know whether I said I trusted her" maps
`trust[uncertain]` — but no trust claim was ever made. The uncertainty
scopes over the *speech act* (whether I said it), and per the design doc's
own definitions `uncertain` means "a claim was made but its truth is open"
while `withheld` means "no claim was made at all." The pipeline runs the
uncertainty check before the withheld pre-pass, so the content axis is
labeled as an open claim rather than a non-claim. A reader sees "speaker
is unsure about trusting her" where the speaker said nothing about trust
either way. Same for "Maybe I never said I trusted her" and "I didn't say
I might trust her." The control holds clean: "I don't know whether I
trusted her" (no speech verb) is genuinely `uncertain` — and any fix must
keep it that way. That control is the discriminating line for every
option below.

**Options.**

1. **Reorder: withheld pre-pass before uncertainty.** Fixes all three
   cases; the control stays `uncertain` ("know" is not a speech-act verb,
   so `detectWithheld` doesn't fire). Trade-off: `detectWithheld` Case 1
   tests the whole 45-char before-window without checking that the verb
   governs the axis — "I never said it, and I don't know whether she
   crossed the line" would withhold the crossing wrongly, because "never
   said" sits in the window while the uncertainty is about the crossing,
   not the saying. Reordering promotes a window-fragile check above a
   scope-local one (C4 made uncertainty conjunct-local deliberately).
   Also moves the banked boundary "I never said whether I trusted her"
   from `uncertain` to `withheld`.

2. **Scope-aware ordering: withheld wins only when a negated speech-act
   verb governs the axis (recommended).** The discriminating line becomes
   structural, not positional: if a negated speech-act verb governs this
   axis's span (verb precedes the axis, complement marker between, no
   clause boundary intervening), the frame decides — `withheld` — and
   uncertainty never sees it. If no speech verb governs the span, the
   current order stands and uncertainty keeps its scope-local behavior.
   The control stays green, the three cases fix, and the "never said it,
   and I don't know whether she crossed" over-fire can't happen because
   the verb doesn't govern the crossing's span. Trade-off: more mechanism
   than a reorder — a governance check where today there's a window test.
   The banked boundary resolves deterministically to `withheld`, which is
   the more honest label under the design doc's own definitions (no claim
   was made), but it IS a behavior change to record.

3. **Keep the order, document it.** Uncertainty markers win over
   speech-act frames, always. The three cases stay mislabeled; the
   control and the boundary stay put. Trade-off: honest about the limit,
   leaves R2-C4 open — and it leaves the design doc's definitions
   contradicting the pipeline's behavior, which is the kind of
   documented-dishonesty this hunt keeps finding.

**Recommendation: Option 2.** Plain reorder (Option 1) trades one
mislabeling for an over-fire the code can't see coming — Case 1's
window test is exactly the fragility R2-C1 just exposed. The governance
check costs one mechanism and buys the property the definitions promise:
uncertainty describes open claims, withheld describes non-claims, and the
frame decides which one a span is. Note the interaction: R2-C3's
wh-complement gap (who/what/whether after tell) lives inside whatever
governance check is built — the complement list must cover it or the
scope-aware check inherits the same blind spot.

**What breaks per consumer.**

- `evidenceState()`: the uncertainty check and the withheld pre-pass
  become jointly governed — withheld first ONLY under the governance
  condition, otherwise the current order. `uncertaintyScope` (C4) is
  untouched; the change is which check claims the span, not how either
  check scopes.
- `IndependentExaminer.js`: additive — specs can assert the new
  resolutions. No contradiction-check change (neither `uncertain` nor
  `withheld` variants flag today).
- `MultilingualAxolSubstrate.js`: documented gap, unchanged.
- Existing suites: the three R2-C4 cases plus the control become a
  permanent anchor set — frame-governed spans withhold, ungoverned spans
  keep their uncertainty.

**Open questions — STEVE'S CALL.**

1. When both match, which wins — does the speech-act frame decide the
   span (withheld), or does the uncertainty marker keep its current
   priority?
2. The banked boundary "I never said whether I trusted her": under the
   recommended option it resolves to `withheld`. Accept the move, or
   does the whether-clause keep it `uncertain`?
3. How strict is "governs": verb + complement marker + no clause
   boundary — or is adjacency in the window enough (which is Option 1
   wearing a stricter name)?
4. Does the R2-C3 wh-complement fix (who/what/whether after tell) ride
   inside this governance check, or ship as its own phrase fix first?

**What "done" looks like.** Decided ordering implemented with the
governance condition; the three R2-C4 cases withhold, the control stays
uncertain, the boundary resolves as decided; examiner-blind set covering
frame-governed vs ungoverned uncertainty spans; all 17 suites green;
Steve's meaning stamp.

---

## PLAN R2-C — Nested quote attribution depth (R2-C9)

**Problem.** "She said, 'He told me "I trust you"'" attributes the "I" to
`self` — the inner span's end-anchored reporting-verb regex fails on "He
told me " (trailing "me" isn't end-of-frame), `quotedSpeaker` returns
null on the first enclosing span, and the outer span is never tried.
'He said, "She told me \'I trust you\'".' attributes the "I" to `he` —
the outer double-quote span is checked first and matches "He said",
so the inner speaker ("she") is never consulted. Wrong in both
directions: inner miss falls through to nobody, outer match steals the
inner "I". Single-level nesting works ('She said "I choose to leave"' →
`she`); depth is where it breaks. The apostrophe-safe rules from the C12
single-quote patch (open not preceded by a word char, close not followed
by one, whitespace inside) must hold at every nesting level — they
already live in `singleQuoteSpans`, so this is about the resolution
order, not the span detection.

**Options.**

1. **One level only, document the limit.** Nested quotes keep current
   behavior (inner miss → null → fallback; outer match wins). Trade-off:
   the W10 direction stays actively wrong — attributing "I" to the
   reporter when the inner speaker is named in the text is a
   misattribution, not a gap. Documenting a wrong answer is the
   documented-dishonesty class again.

2. **Innermost-wins with outward fallback, depth cap 3 (recommended).**
   Resolve spans innermost-first: the narrowest enclosing span's
   reporting frame decides ("He told me" + quote → `he`). If the inner
   frame has no resolvable reporter, fall back outward ("She said" →
   `she`). Cap at 3 levels — beyond that return null rather than guess;
   quadruple-nested reported speech is vanishingly rare and fail-closed
   beats a confident wrong speaker. Both hunt cases resolve correctly,
   and the single-level positives are unchanged (innermost == only).
   Trade-off: the reporting-frame resolution needs the inner verb +
   recipient recognized — "He told me" must resolve via the tell-with-
   recipient shape, which recommends unifying on the Plan B speech-act
   verb list (the current `quotedSpeaker` list has explained/replied/
   asked but lacks mention/promise/swear — a quiet inconsistency worth
   fixing while here).

3. **Outermost-wins (the reporter).** "She said, 'He told me "I trust
   you"'" → `she`. Answers "who brought this up" instead of "who is the
   I". Trade-off: consistent and simple — and wrong for both hunt cases.
   The actor slot means the "I", not the messenger. Included to reject:
   it optimizes for never-null over never-wrong.

**Recommendation: Option 2.** Both failures are the same bug — the
resolution order doesn't match the nesting — and innermost-wins fixes
both directions with one rule. The depth cap keeps it from becoming a
parser, and the verb-list unification removes a real inconsistency the
hunt happened to expose. Fail-closed past depth 3 is the honest limit:
the machine says "I can't tell who the I is" instead of picking one.

**What breaks per consumer.**

- `quotedSpeaker` in `AxisEngine.js`: span iteration becomes
  innermost-first with outward fallback; the end-anchored reporting-verb
  regex runs per level; the verb list unifies with `SPEECH_ACT_VERBS`
  (add mention/promise/swear/insist forms; keep explained/replied/asked
  — they're reporting verbs, just not meta-denial verbs — document the
  two lists' different jobs).
- `IndependentExaminer.js`: additive — specs can assert nested
  attribution. No contradiction-check change.
- `MultilingualAxolSubstrate.js`: documented gap, unchanged.
- Existing suites: the two R2-C9 cases become a permanent anchor pair —
  inner speaker wins at depth 2, null (not a guess) past depth 3.

**Open questions — STEVE'S CALL.**

1. How deep does attribution go — is 3 the right cap, or should depth 2
   be the limit with everything deeper failing closed?
2. Innermost-wins, or are there constructions where the outer reporter
   is the honest actor for the "I"?
3. Unify the reporting-verb list with the Plan B speech-act list now,
   or keep `quotedSpeaker`'s list frozen and only fix the ordering?
4. Past the depth cap: null (fail closed, no actor) — or fall back to
   the nearest resolvable reporter with the uncertainty marked?

**What "done" looks like.** Innermost-first resolution with outward
fallback implemented at the decided depth; both R2-C9 cases attribute to
the inner speaker; apostrophe-safe rules verified at every level
(contractions inside nested quotes unaffected); examiner-blind set
covering depth 1–3, past-cap behavior, and the verb-list unification;
all 17 suites green; Steve's meaning stamp.

---

## PLAN R2-D — Examiner misses lapsed-vs-negated (R2-C12)

**Problem.** Canonical "I never trusted her" (`negated`) vs variant "I
used to trust her" (`lapsed`) passes the contradiction check silently —
but "used to trust" entails the trust *held* at some point, and "never
trusted" denies it *ever* held. That is a genuine contradiction, and the
examiner misses it. This is the mirror image of the hole Steve just had
patched: lapsed-vs-asserted now flags ("variant lapses what the canonical
asserts (past-vs-present tension)"), while lapsed-vs-negated — the
stronger contradiction — stays silent behind the examiner's own comment
calling it "compatible past-vs-present." It isn't compatible: "never" is
absolute, not fuzzy. The controls hold clean and must stay that way:
lapsed-vs-lapsed silent (agreement), asserted-variant vs lapsed-canonical
silent ("I trust her" now is compatible with "I used to trust her"
then), negated-vs-asserted still flags.

**Options.**

1. **Flag lapsed-vs-negated, symmetric with his patch (recommended).**
   New rule beside the existing two: variant `lapsed` against canonical
   `negated` (and neither lapsed) fails with "variant lapses what the
   canonical denies ever holding." Trade-off: extends a check Steve
   ordered — but it extends it in the direction his order points. The
   absolute "never" leaves no fuzzy-past reading to protect.

2. **Keep silent: the past is fuzzy enough to share.** Argue that "used
   to" and "never" can coexist in loose talk ("I never trusted her —
   well, I used to, a little"). Trade-off: protects a charitable reading
   nobody asked for, at the cost of a missed contradiction the examiner
   exists to catch. The examiner's job is the strict reading; charity is
   the reader's.

3. **Flag only with an entailment note (softer fail).** Same detection
   as Option 1, but recorded as a note rather than a fail — pass stays
   true, the tension is surfaced. Trade-off: splits the difference
   between catching and crying wolf. But the check's contract is
   pass/fail on contradiction, and a genuine contradiction that doesn't
   fail is the check hedging — the two existing rules both fail, and
   symmetry says this one does too.

**Recommendation: Option 1.** It is the entailment mirror of the patch
Steve already ordered, the "never" is absolute so the fuzzy-past defense
doesn't hold, and the controls prove the check stays discriminating
(lapsed-vs-lapsed and asserted-vs-lapsed-canonical stay silent). A
contradiction check that flags the weaker tension (lapsed-vs-asserted)
while silencing the stronger one (lapsed-vs-negated) is internally
inconsistent — this patch removes the inconsistency.

**What breaks per consumer.**

- `IndependentExaminer.js`: one new clause in the contradiction check,
   beside the two existing rules. No other consumer branches on the
   check's verdict — it feeds the examiner report only.
- Everything else: untouched. This plan changes no state detection, no
   vocabulary, no pipeline order — it is examiner-only.
- Existing suites: the R2-C12 case plus its three controls become a
   permanent anchor set — flag on lapsed-vs-negated, silent on the three
   controls.

**Open questions — STEVE'S CALL.**

1. Symmetric with your patch — flag it — or is the past fuzzy enough
   that "used to" vs "never" stays silent?
2. Should the flag be directional (only variant-lapsed vs
   canonical-negated), or also canonical-lapsed vs variant-negated
   ("I never trusted her" as a variant of "I used to trust her")?
3. Fail or note — does a genuine contradiction fail the check, or get
   surfaced softer?
4. Wording of the flag: "variant lapses what the canonical denies ever
   holding" — or your words?

**What "done" looks like.** Decided rule in the contradiction check;
R2-C12 flags, the three controls stay silent; examiner-blind set
covering both directions (per the directionality call); all 17 suites
green; Steve's meaning stamp.

---

## After the design calls

The remaining round-2 candidates (R2-C1, R2-C3, R2-C5, R2-C6, R2-C7,
R2-C8, R2-C10, R2-C11, R2-C13) are phrase/scoping fixes — no design
needed — and roll out after these four plans are decided. Two
interactions to respect in the rollout order: the R2-C3 wh-complement
fix composes with PLAN R2-B's governance check (decide in R2-B whether
it rides inside or ships first — never after, or the governance check
ships with the same blind spot it was built to fix), and the R2-C1
window-robust withheld fix should land before or with R2-B (both touch
the withheld pre-pass's window assumptions).

---

## STAMPED — 2026-09-27

Steve's meaning stamp, his word: "Ok" on the full recommendation set
(2026-09-27). Machinery stamp at implementation time: all 17 AXOL
suites green, 87/87 existing blind cases green, new examiner-blind cases
covering all 13 round-2 candidates green.

PLAN R2-A STAMPED: compose — one match returns the single token
`hypothetical+negated`. Token, not sub-field. Scoped to
hypothetical×polarity only — interrogative keeps its decided
absorb-behavior, hypothetical×lapsed/withheld wait for a later hunt.
Examiner stays silent on it (the tension lives inside a supposition,
not a claim).

PLAN R2-B STAMPED: frame wins — a negated speech-act verb governing the
axis span withholds it, otherwise the current order stands. Strict
"governs" (verb + complement marker + no clause boundary; window
adjacency alone is NOT enough). Wh-complement fix ships FIRST, before
the governance check. The banked boundary "I never said whether I
trusted her" resolves to withheld — accepted.

PLAN R2-C STAMPED: innermost-wins with outward fallback, depth cap 3,
fail closed past the cap (null, never a guessed speaker). Verb lists
unified now — `quotedSpeaker`'s reporting list merges into
SPEECH_ACT_VERBS (mention/promise/swear/insist forms added;
explained/replied/asked kept, documented as reporting verbs not
meta-denial verbs).

PLAN R2-D STAMPED: symmetric flag — variant lapsed vs canonical negated
(and canonical lapsed vs variant negated) fails the contradiction
check: "variant lapses what the canonical denies ever holding." Fail,
not note. Working wording stands until Steve rewords it.

Rollout order honored: R2-C3 wh-complement first, R2-C1 window-robust
withheld before/with R2-B, then the rest. Nothing promoted to Steve's
installed keeper; the stamped package ships as a build another day.
