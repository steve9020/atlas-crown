# AXOL Hunt Round 2 — Candidate Distinctions (2026-09-27)

PROPOSALS ONLY. Nothing here is promoted into any registry. Each candidate is
evidenced below; per Steve's rule ("I don't dictate truth") every one needs
his word before it becomes a distinction.

Discriminator under test: `detectAxes` from
`build/keeper-2026-09-27/AtlasTI_2026-09-27/Cognition/engine/AxisEngine.js`
plus `examineLanguageCandidate` from `runtime/teaching/IndependentExaminer.js`
(run 2026-09-27, in-process). Raw probe output: `raw-wave1.txt`,
`raw-wave2.txt`. Probe scripts: `hunt3.js`, `hunt4.js`.

Round 1's 12 candidates are all fixed and hold on re-probe (R1–R15 all map
as designed). The failures below live at the seams of the NEW 7-state
machinery.

Each candidate is tagged **phrase fix** (lists/scopes, no new vocabulary)
or **design call** (needs Steve's judgment on the vocabulary or the rule).

---

## R2-C1 — One axis, two contradictory states in a single entry (withheld window-fragility)

**Case:**
- "I didn't tell her I trusted her." → `trust[negated|withheld]`
  `{self:negated, self:withheld, self:withheld}` (WRONG — internally
  inconsistent)

**What the discriminator did wrong:** three overlapping matches fire for one
token ("i trust" phrase at index 18, "trusted" phrase and `\btrust\w*\b`
regex at index 20). The at-18 match's 45-char before-window is cut exactly
at the complement boundary — `before` = "i didn't tell her ", ending before
the complement pronoun "I" — so `TELL_META_VERB` (`tell + recipient +
that/i/you/...`) cannot match, `detectWithheld` returns false, and the
negator falls through to the generic C1 check → **negated**. The at-20
matches see "i didn't tell her i " → **withheld**. The entries merge into
one axis with states `[negated, withheld]`.

**Mechanism (verified):** the withheld pre-pass is window-fragile — its
verdict depends on whether the match index lands one token left or right of
the complement word. Same sentence, same axis, opposite states.

**Positive matches (withheld working):**
- "I didn't tell them that I trusted her." → `trust[withheld]` (complement
  "that" sits inside every match's window)

**Severity:** high. The output contract promises one meaning one mapping;
a merged `[negated|withheld]` entry breaks it visibly.

**Fix shape:** phrase/mechanism fix — the complement check must not depend
on the exact cut (e.g. test withheld against the clause, or extend the
window for the meta-verb match). No new vocabulary.

---

## R2-C2 — Hypothetical swallows inner negation (two meanings, one mapping)

**Pair:**
- "If she trusted him, she would have come." → `trust[hypothetical]`
- "If she didn't trust him, she wouldn't have come." → `trust[hypothetical]`
  (IDENTICAL — WRONG)

**What the discriminator did wrong:** mood runs first and returns, so the
negation inside the supposition is discarded. Opposite suppositions map
identically — the round-1 C2 failure class (two meanings, one mapping),
now in the mood vocabulary.

**Close non-match:** "Didn't she cross the boundary?" → interrogative is the
decided behavior (Steve's call stands); the issue here is specifically the
*loss* of inner negation, not the mood label.

**Severity:** high. A reader cannot tell supposed-trust from
supposed-distrust.

**Fix shape:** **design call** — the state vocabulary has no
hypothetical-negated composition. Options: compose states
(`hypothetical|negated`), or record the inner negation separately. Steve
decides whether the vocabulary grows.

---

## R2-C3 — Negator on a speech verb leaks onto the content axis

**Cases:**
- "She never told me who crossed the line." → `boundary[negated]` (WRONG —
  nothing about the crossing is denied; the "who" presupposes it happened)
- "He didn't tell the truth about the decision." → `choice[negated]` (WRONG —
  the decision is presupposed; the negation scopes over "tell")

**What the discriminator did wrong:** the Plan B withheld pre-pass only
fires when the tell-complement pattern matches. "who crossed the line" is
a wh-complement (not in the `that/i/you/he/...` list — the refinement was
built for "whose", and "who"/"what"/"whether" fall through too), and "tell
the truth about" has no complement at all. The negator then falls through
to the generic C1 check and mislabels the *content* axis — a full
inversion, the exact failure Plan B was built to prevent.

**Positive matches (leak correctly stopped):**
- "She told me who crossed the line." → `boundary[asserted]` (no negator,
  no leak)
- "He told the truth about the decision." → `choice[asserted]`

**Severity:** high. Negated where nothing was denied.

**Fix shape:** scoping fix with a phrase component — (a) recognize
wh-complements (`who`/`what`/`whether`) after tell/say as propositional;
(b) when the negator's nearest verb is a speech verb but no complement
matched, the negator must still not leak onto downstream content axes.
(b) is the harder half.

---

## R2-C4 — Uncertainty is checked before withheld, mislabeling content inside speech-act frames

**Cases (all map the *content* axis `uncertain`; all should be `withheld`):**
- "I don't know whether I said I trusted her." → `trust[uncertain]`
- "Maybe I never said I trusted her." → `trust[uncertain]`
- "I didn't say I might trust her." → `trust[uncertain]`

**What the discriminator did wrong:** per the design doc, `uncertain` = "a
claim was made but its truth is open", `withheld` = "no claim was made at
all". In all three, the uncertainty marker scopes over the *speech act*
(whether I said it / maybe I said it), and no trust claim was ever made —
but the pipeline runs the uncertainty check before the withheld pre-pass,
so the content axis is labeled as an open claim rather than a non-claim.
A reader sees "speaker is unsure about trusting her" where the speaker
said nothing about trust either way.

**Control (uncertain correct, no speech verb):**
- "I don't know whether I trusted her." → `trust[uncertain]` ✓

**Close non-match (weakest instance):** "I never said whether I trusted
her." → `trust[uncertain]` — defensible either way ("whether" makes the
open-question reading honest); banked as the boundary.

**Severity:** medium-high. Silent misdescription of what was claimed.

**Fix shape:** **design call** — pipeline order is a judgment call. Running
withheld before uncertainty fixes P1/P3/P4 and keeps the control green,
but Steve should confirm the order, since it changes what "uncertain"
is allowed to claim.

---

## R2-C5 — "and I still do" continuation lapses a current claim

**Cases:**
- "I used to trust her and I still do." → `trust[lapsed]` (WRONG)
- "I used to trust her, and I still do." → `trust[lapsed]` (WRONG)

**What the discriminator did wrong:** the sentence explicitly continues the
trust into the present ("still do"), but `usedToGoverns` only checks for
boundaries *between* "used to" and the axis — "still" sits after the axis,
so the lapse fires. A reader sees past trust where current trust is
asserted.

**Note:** the build's own comment says the boundary list exists so "a later
current-tense conjunct does not inherit the lapse" — the mechanism's intent
already covers this case; the check just looks in only one direction.

**Severity:** medium. Inverts current to past.

**Fix shape:** scoping fix — a "still do/does" (or present-tense
continuation) after the axis cancels the lapse. No new vocabulary.

---

## R2-C6 — Parenthetical commas block the lapse (and split the output)

**Case:**
- "I used to, back in those days, really trust her." →
  `trust[asserted]` + `temporal_scope[lapsed]` (WRONG — and internally
  inconsistent: the trust is asserted-current while its own time frame is
  marked lapsed)

**What the discriminator did wrong:** the commas are parenthetical — a
careful reader hears past trust — but `usedToGoverns` treats every comma
as a segment boundary, so governance fails and trust falls through to
asserted. Meanwhile `temporal_scope` fires on "used to" directly and lapses.

**Severity:** medium. The asserted+lapsed split is self-contradictory
output.

**Fix shape:** scoping fix, harder half — distinguishing parenthetical
commas from clause-structural ones is genuinely tricky. May need Steve's
call on how smart the boundary detection should get.

---

## R2-C7 — Adverbial "and" blocks the lapse; adverb binds as actor

**Case:**
- "I used to really and truly trust her." → `trust[asserted]{truly:asserted}`
  + `temporal_scope[lapsed]` (WRONG twice)

**What the discriminator did wrong:** (a) the "and" in "really and truly"
is adverbial, not clausal, but the boundary list treats it as a segment
break — trust falls through to asserted. (b) "truly" binds as the actor —
the C9 stoplist has "really/very/quite" but not "truly".

**Severity:** medium. Same inconsistent asserted+lapsed split as R2-C6,
plus a garbage actor.

**Fix shape:** phrase fix for (b) ("truly" → FUNCTION_WORDS); scoping fix
for (a) — phrasal "and" (between adverbs/adjectives) vs clausal "and"
needs a shape rule.

---

## R2-C8 — C9 remnant: contracted auxiliaries and "used" bind as actors

**Cases (actor is garbage):**
- "Didn't I say I trusted her?" → actor `didn't` (should be `self`)
- "Don't you trust her?" → actor `don't` (should be `you`)
- "Used to trust her, I did." → actor `used` (should be `self`)

**What the discriminator did wrong:** the C9 FUNCTION_WORDS stoplist has
"do/does/did" but not their n't-contractions, and "used" was never listed.
The leading-token branch binds them as named subjects.

**Positive match:** "Can't she cross the line?" → actor `she` ✓ (the
nearby-pronoun branch happened to win there — fragile, same family).

**Severity:** medium. Corrupts attribution on common interrogative shapes.

**Fix shape:** phrase fix — add n't-contractions (`don't/doesn't/didn't/
can't/won't/isn't/...`), "truly", "used" to FUNCTION_WORDS. Audit the rest
of the adverb/auxiliary family while there.

---

## R2-C9 — Nested quotation misattributes the inner speaker

**Cases:**
- "She said, 'He told me \"I trust you\"'." → `trust[asserted]{self}`
  (WRONG — the "I" is **he**)
- 'He said, "She told me \'I trust you\'".' → `trust[asserted]{he}`
  (WRONG — the "I" is **she**)

**What the discriminator did wrong:** `quotedSpeaker` takes the first
enclosing span and returns null when its end-anchored reporting-verb regex
fails — it never tries the outer span, and it has no inner-frame
resolution. Q1's inner span ends mid-sentence ("He told me ") so the
anchored match fails → null → "self". W10's inner span resolves to the
*outer* reporter ("he") instead of the inner speaker ("she"). Wrong in
both directions.

**Positive matches (single-level nesting works):**
- 'She said "I choose to leave".' → `she` ✓
- "She said, 'I don't trust him'." → `she`, negated ✓ (contraction inside
  quotes survives)

**Severity:** medium-low. Rare construction, real misattribution.

**Fix shape:** **design call** — how deep should quote attribution nest?
Options: fall through to outer spans on inner miss (gives the reporter,
still wrong for W10), or resolve the inner reporting frame ("He told me"
+ quote → he). Steve decides the depth.

---

## R2-C10 — Contracted "n't sure" inverts to negated ("not sure" stays uncertain)

**Pair:**
- "She was not sure if he crossed the boundary." → `certainty[uncertain]`
- "She wasn't sure if he crossed the boundary." → `certainty[negated]`
  (WRONG — same meaning, different mapping)
- "She isn't sure if he crossed the boundary." → `certainty[negated]`
  (WRONG)

**What the discriminator did wrong:** the uncertainty marker list has "not
sure" but not the contracted copula forms, so "wasn't/isn't sure" falls
through to the C1 negator check. "Not sure" and "n't sure" are the same
claim about certainty — the contraction must not flip the state.

**Severity:** medium. Common spoken form, total state flip on the
certainty axis.

**Fix shape:** phrase fix — add `wasn't/weren't/isn't/aren't sure` (and
audit `n't certain`) to the uncertainty markers.

---

## R2-C11 — "sure/certain + if" misread as hypothetical

**Pair:**
- "She is not sure whether he crossed the boundary." →
  `boundary[uncertain]` ✓
- "She was not sure if he crossed the boundary." →
  `boundary[hypothetical]` (WRONG)

**What the discriminator did wrong:** the "if" after a cognition adjective
("sure/certain") is an embedded question (= "whether"), not a supposition —
but `EMBEDDING_VERB_SRC` only lists verbs (know/ask/wonder/doubt), so the
hypothetical marker fires. She isn't supposing the crossing; she's unsure
about it. Same meaning as the whether-version, different mapping.

**Severity:** medium-low. Mislabels the epistemic stance.

**Fix shape:** phrase fix — extend the embedded-question recognition to
cognition adjectives ("sure/certain/unclear" + "if" → whether-reading).

---

## R2-C12 — Examiner stays silent on lapsed-vs-negated (genuine contradiction missed)

**Case (via `examineLanguageCandidate`):**
- canonical "I never trusted her." (negated) vs variant "I used to trust
  her." (lapsed) → **pass: true, silent** (WRONG)

**What the discriminator did wrong:** "used to trust" entails the trust
*held* at some point; "never trusted" denies it *ever* held. That is a
genuine contradiction — the mirror image of the hole Steve just patched
(lapsed-vs-asserted now flags). The examiner's own comment calls
lapsed-vs-negated "compatible past-vs-present"; it isn't.

**Controls (silence correct):**
- lapsed vs lapsed-canonical → silent ✓
- asserted ("I trust her.") vs lapsed-canonical → silent ✓ (trust then and
  now are compatible)
- negated vs asserted-canonical → flags ✓

**Severity:** medium. The contradiction check now catches lapsed-vs-asserted
but misses the entailment in the other direction.

**Fix shape:** **design call** — the mirror of Steve's hole patch. Flagging
"variant lapses what the canonical denies ever holding" needs his word,
since it extends the check he just ordered.

---

## R2-C13 — "I used to wonder whether I trusted her": uncertainty leaks onto the temporal frame

**Case:**
- "I used to wonder whether I trusted her." → `trust[uncertain]` ✓ but
  `temporal_scope[uncertain]` (WRONG — the past wondering is stated as
  fact; only the trust is open)

**What the discriminator did wrong:** the C4 conjunct-local scope puts the
"whether" marker and the "used to" frame in one conjunct, so the marker
governs both. The uncertainty belongs to the complement ("I trusted her"),
not to the matrix frame ("I used to wonder").

**Severity:** low. The primary axis (trust) is right; the secondary
temporal axis is mislabeled.

**Fix shape:** scoping fix — uncertainty markers inside a cognition/speech
frame should not govern the frame's own axes. Same family as R2-C4's scope
problem, on a different axis.

---

## Observations (probed, NOT proposed as candidates)

- **O-a — Hypothetical swallows the lapsed aspect:** "If I used to trust
  her, why did I stay?" → `trust[hypothetical]`; the lapse inside the
  supposition is lost. Not *wrong* (the mood label is defensible) — but
  mood × aspect composition isn't expressible. Vocabulary boundary; needs a
  design call if Steve wants it. Same for hypothetical × withheld ("If I
  never said I trusted her..." → hypothetical).
- **O-b — Withheld × lapsed is clean:** "I never said I used to trust her."
  → withheld on all axes. Nothing claimed, lapse moot. Correct.
- **O-c — Unmatched quote, correct by proximity:** "She said 'I trust you."
  → actor `she` — via the nearby-pronoun branch, not quote logic. Right
  answer, fragile mechanism; no failure to report.
- **O-d — Elliptical backward governance:** "I trusted her — I used to."
  → `trust[asserted]` + `temporal_scope[lapsed]`. The "used to" follows the
  axis and governs an elided predicate — forward-only governance can't see
  it. Genuinely hard (ellipsis); banked, not proposed.
- **O-e — Archaic leading apostrophe:** "'Twas the night she crossed the
  line." → no quote span formed, `boundary[asserted]{she}` ✓. The
  apostrophe-safe rules hold.
- **O-f — "I used to distrust her but now I trust her."** → asserted +
  lapsed temporal, both correct. Good control: "distrust" doesn't false-fire
  the trust regex.
- **O-g — Interrogative × lapsed holds:** "Did you use to trust her?" →
  interrogative per the build decision ✓.
- **O-h — T6 boundary:** "She never tells me whether she trusts him." →
  `trust[uncertain]` — acceptable (the whether-clause genuinely leaves it
  open); the wh-complement gap (R2-C3) bites on *who/what*, "whether"
  already reads as uncertainty.

---

## Severity ranking (hunter's judgment, Steve decides)

1. **R2-C1** (one entry, two contradictory states) — breaks the output contract.
2. **R2-C2** (hypothetical × negated collapse) — two meanings, one mapping.
3. **R2-C3** (negator leak onto content) — inversion, defeats Plan B's purpose.
4. **R2-C4** (uncertainty-before-withheld order) — misdescribes what was claimed.
5. **R2-C5** ("still do" continuation) — current trust marked past.
6. **R2-C12** (examiner lapsed-vs-negated silence) — missed contradiction.
7. **R2-C6** (parenthetical commas) — self-contradictory asserted+lapsed split.
8. **R2-C7** (adverbial "and" + "truly" actor) — same split plus garbage actor.
9. **R2-C8** (contracted-auxiliary actors) — C9 remnant, common shapes.
10. **R2-C10** ("n't sure" inversion) — common spoken form flips certainty.
11. **R2-C9** (nested quotes) — rare, wrong both directions.
12. **R2-C11** ("sure + if") — mislabeled epistemic stance.
13. **R2-C13** (uncertainty onto temporal frame) — secondary axis only.

## Fix-shape summary

- **Phrase fixes (no design call needed):** R2-C8 (stoplist), R2-C10
  (marker list), R2-C11 (embedding verbs), R2-C7b ("truly").
- **Scoping/mechanism fixes (judgment-adjacent, propose shape first):**
  R2-C1 (window-robust withheld), R2-C3 (negator containment),
  R2-C5 ("still do" cancellation), R2-C6 (parenthetical commas),
  R2-C7a (phrasal vs clausal "and"), R2-C13 (frame-local uncertainty).
- **Design calls (Steve's word required):** R2-C2 (state composition),
  R2-C4 (pipeline order), R2-C9 (nesting depth), R2-C12 (examiner mirror
  of his hole patch).

## Files

- `BASELINE.md` — 20/20 green baseline.
- `hunt3.js` — wave-1 probes (58 cases).
- `hunt4.js` — wave-2 pairs + diagnostics.
- `raw-wave1.txt`, `raw-wave2.txt` — verbatim outputs.
- `CANDIDATES.md` — this file.

Nothing promoted. No registry file touched. Awaiting Steve's word per candidate.
