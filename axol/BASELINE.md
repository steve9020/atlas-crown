# AXOL Hunt — Baseline (2026-09-27)

Build: `~/workspace/build/keeper-2026-09-27/AtlasTI_2026-09-27/`
Method: all 17 AXOL suites run in-process via `require()` with per-suite
`require.cache` busting, zero child processes, cwd = build root (four suites
use `require(process.cwd() + '/Cognition/...')`, so a wrong cwd fails them
on module resolution — not a product defect).

## Result: 17/17 suites green

| Suite | Result |
|---|---|
| axolDiscriminationTest.js | PASS |
| axolBlindFuzzTest.js | PASS |
| axolHellFuzzTest.js | PASS |
| axolAttributionNeutralTest.js | PASS |
| axolCollisionNeutralAdversarialTest.js | PASS |
| axolRandomizedCompositionalFuzzTest.js | PASS |
| axolAttributionCrossBindingTest.js | PASS |
| axolAttributionCrossBindingUnseenTest.js | PASS |
| axolAttributionHellBlindTest.js | PASS |
| axolAttributionTest.js | PASS |
| axolAttributionUnseenTest.js | PASS |
| axolCollisionCompositionTest.js | PASS |
| axolCollisionUnseenTest.js | PASS |
| axolReferenceResolutionNeutralTest.js | PASS |
| axolReferenceResolutionTest.js | PASS |
| axolReferenceResolutionUnseenTest.js | PASS |
| axolSemanticFuzzTest.js | PASS |

Raw output: `raw-baseline.txt`. Runner: `baseline.js`.

## Closure state read before hunting (prior reports)

- AXOL_DISCRIMINATION_REPORT: state-aware corpus 20/20, unseen 12/12 after repair.
- AXOL_HELL_FUZZ_REPORT: baseline 72/97 detections, 13/18 attribution, 7/12 neutral FP.
- AXOL_HELL_FUZZ_REPAIR_REPORT: after repair 97/97, 0/12 neutral FP, 14/18 attribution
  (4 remaining: conservative pronoun/name continuity — by design).
- AXOL_RANDOMIZED_COMPOSITION_REPORT: 500/500 + blind-seed 500/500 fully correct.
- MASTERSTEP192 multilingual: 14 language packs (es fr de pt it nl pl tr ru ar hi ja ko zh).
- Known open boundary: conservative reference resolver (14/18); interrogative/
  conditional/hypothetical mood not in the state vocabulary.

The hunt below deliberately probes outside the closed corpora.
