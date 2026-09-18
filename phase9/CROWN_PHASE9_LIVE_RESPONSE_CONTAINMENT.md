# Crown Phase 9 — Live Response Path Authority Containment

## Purpose
Close the gap identified in independent review: the live response path previously used lighter governance than the Crown change-control / proof surface.

## What was added
1. `runtime/governance/crown/CrownLiveResponseContainment.js`
   - Evaluates three live-path predicates (input boundary, governance approval, response quality).
   - Returns PASS → allow, FAIL → contain, UNKNOWN → freeze.
   - Explicitly sets `route_authority: false`, `output_authority: false`, `authority_widened: false`.

2. Wiring in `ResponsePipeline.js`
   - After `validateOutput` and quality check, the containment gate is consulted.
   - On contain/freeze the pipeline returns a bounded message and does not continue with normal output.

3. Test: `tests/crownPhase9LiveResponseContainmentTest.js` (PASS)

## Claim boundary
- No new authority is established.
- No scope widening occurs.
- Public-demo shell and existing Compass synthetic behavior remain unchanged.
- This is a containment gate, not a claim of full τ enforcement on every cognition step.

## Next possible steps
- Expand the predicate set with additional independently qualified live-path checks.
- Add a formal proof report for Phase 9.
- Keep the gate out of the public demo shell (it stays private runtime only).
