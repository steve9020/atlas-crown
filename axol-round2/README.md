# AXOL round-2 — 2026-09-27

Steve's stamp: "Ok" on the full round-2 recommendation set (2026-09-27).
This package is the complete, repo-owned record of the AXOL round-2 hunt:
13 confirmed candidates (R2-C1–R2-C13) against the 7-state machinery,
4 of which needed his design calls (R2-A, R2-B, R2-C, R2-D).

## What is in this directory

- `DESIGN-PLANS-R2.md` — the four design plans with Steve's decided calls
  and the STAMPED section dated 2026-09-27.
- `CANDIDATES.md` — the thirteen hunt candidates with exact sentences,
  mechanisms, and fix shapes.
- `AxisEngine.js` — the implemented discriminator
  (`Cognition/engine/AxisEngine.js`), with all round-2 changes in place.
- `IndependentExaminer.js` — with the R2-D symmetric flag.
- `tests/axolRound2FixesTest.js` — the examiner-blind test file
  (36 state/actor cases + 4 examiner flag cases).

## What was implemented (2026-09-27)

- R2-A: `hypothetical+negated` composed token (single token, not a
  sub-field; examiner stays silent on it — his call).
- R2-B: scope-aware ordering — the speech-act frame decides before
  uncertainty, but only under strict governance (his call); the banked
  boundary "I never said whether I trusted her" maps withheld.
- R2-C: nested quotes — innermost-wins with outward fallback, depth cap 3,
  fail closed past the cap; reporting-verb list unified (his call).
- R2-D: examiner flags lapsed-vs-negated in BOTH directions (his call).
- R2-C1: window-robust withheld (complement pronoun at the match index).
- R2-C3: wh-complements (who/what/whether) after tell are propositional;
  negators scoped to speech-act verbs no longer leak onto content
  (discern "whose" carved out).
- R2-C5: "and I still do" cancels the lapse.
- R2-C6: parenthetical commas are not segment boundaries.
- R2-C7: phrasal "and" between intensifiers is not clausal; "truly"/"deeply"/
  "fully" never actors.
- R2-C8: n't-contractions and "used" never actors; postposed tag subject.
- R2-C10: contracted "n't sure/certain" are uncertainty markers.
- R2-C11: "sure/certain/unclear + if" is an embedded question, not hypothetical.
- R2-C13: a downstream uncertainty marker inside a cognition/speech
  complement does not govern the frame's own axes.

No registry sections were touched — all round-2 fixes are engine-level,
so there is no registry-changes addendum.

## Verification (2026-09-27)

- Baseline: 17/17 suites green.
- Blind sets: mood 15/15, meta-denial 18/18, candidate-fixes 54/54,
  round-2 36/36, round-2 examiner 4/4.

Nothing in this package was promoted to Steve's installed keeper —
standing rule.
