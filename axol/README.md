# AXOL rollout — 2026-09-27

Steve's stamp: "Stamp it and move on." This package is the complete,
repo-owned record of the AXOL discriminator rollout (Plans A + B and
candidates C1, C4, C7, C8, C9, C10, C11, C12).

## What is in this directory

- `DESIGN-PLANS.md` — the two stamped design plans. Plan A: interrogative
  and hypothetical mood states. Plan B: the `withheld` state (speech-act
  scoping) plus the C3 copula-negation fix ordered after it. Includes
  Steve's six decided calls and the STAMPED section dated 2026-09-27.
- `CANDIDATES.md` — the twelve hunt candidates with mechanism notes and
  per-candidate status (implemented / banked / waiting).
- `BASELINE.md` — the 17/17 green baseline the rollout started from.
- `AxisEngine.js` — the implemented discriminator
  (`Cognition/engine/AxisEngine.js`), with all AXOL changes in place.
- `registry-changes.md` — the four registry sections touched
  (intention, boundary, responsibility, control), additions marked.
- `tests/` — the three examiner-blind test files:
  `axolMoodStateTest.js` (15 cases), `axolMetaDenialStateTest.js`
  (18 cases), `axolCandidateFixesTest.js` (47 cases).

## What was implemented (2026-09-27)

New states: `interrogative` (asks, claims nothing), `hypothetical`
(supposed-true inside a supposition only), `withheld` (mentioned but not
claimed), `lapsed` ("used to + verb" — held, now lapsed; Steve reversed
his call and ordered it into this release).

Candidate fixes: C1 (full negator family incl. don't/aren't/ain't/none),
C4 (uncertainty scoped to the axis's own conjunct), C7 (stacked negation
cancels — litotes), C8 (intention paraphrases), C9 (actor binding:
function words never actors, "no one" -> nobody, quoted-speaker fix,
lowercase words never named subjects), C10 (idiom polarity at the match
index), C12 (quoted first-person resolves to the reporting subject).
C3 and C11 were in the original stamp scope; C3 stays banked for its own
release, C11 rode this release on Steve's reversal. Rhetorical questions
banked for v1.

## Verification (2026-09-27)

- 17/17 AXOL suites green (`baseline.js`, cwd = keeper root).
- Mood blind set 15/15, meta-denial blind set 18/18, candidate-fixes
  blind set 47/47.
- C2 regression anchor holds permanently: "I never said I trusted her"
  -> withheld vs "I said I never trusted her" -> negated.
- Examiner contradiction check: negated-vs-asserted fires; interrogative,
  withheld, and lapsed variants pass silently (Steve's decided call for
  the first two; lapsed recorded as a judgment call he can revisit).

## Status

Shipped as a build artifact only. Nothing in this package is promoted to
Steve's installed keeper — that ships as a build another day.
