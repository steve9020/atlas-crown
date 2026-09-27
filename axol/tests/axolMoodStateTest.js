// AXOL Plan A blind set — mood vocabulary (2026-09-27).
// Built from the DESIGN-PLANS.md rule definition (examiner-blind): new states
// 'interrogative' (asks, claims nothing) and 'hypothetical' (supposed-true
// inside the supposition only). Steve's decided calls baked in: rhetorical
// questions banked for v1 (no cases here); "when"-clauses are temporal ->
// asserted, never hypothetical.
const assert = require('assert');
const { detectAxes } = require('../Cognition/engine/AxisEngine.js');
const cases = [
  // interrogative
  ['Did she cross the boundary?', 'boundary', 'interrogative'],
  ["Didn't she cross the boundary?", 'boundary', 'interrogative'], // mood wins over the negator check
  ['Why did it hurt?', 'impact', 'interrogative'],
  ['If she meant well, why did it hurt?', 'impact', 'interrogative'], // question part stays interrogative
  // hypothetical
  ['If he crossed the boundary, I will leave.', 'boundary', 'hypothetical'],
  ['I will leave if he crosses the boundary.', 'boundary', 'hypothetical'], // mid-sentence marker
  ['Had she crossed the boundary, he would have left.', 'boundary', 'hypothetical'], // inverted conditional
  ['I will leave in case he crosses the boundary.', 'boundary', 'hypothetical'],
  ['What if he crossed the boundary?', 'boundary', 'hypothetical'],
  // asserted controls
  ['He crossed the boundary.', 'boundary', 'asserted'],
  ['He crossed the boundary, so I will leave.', 'boundary', 'asserted'],
  ['When he crosses the boundary, I will leave.', 'boundary', 'asserted'], // when = temporal (Steve's call)
  // embedded / reported questions keep the existing whether->uncertain mapping
  ['I asked whether she crossed the boundary.', 'boundary', 'uncertain'],
  ["I don't know if she crossed the boundary.", 'boundary', 'uncertain'], // "know + if" = embedded, not supposition
  // imperatives are not questions
  ['Do not cross the boundary.', 'boundary', 'negated'],
];
let passed = 0;
for (const [text, axis, state] of cases) {
  const r = detectAxes(text);
  const e = r.axis_evidence.find((x) => x.axis === axis);
  const ok = e && e.states.includes(state);
  if (!ok) {
    console.error('FAIL', JSON.stringify(text), `expected ${axis}:${state}`,
      '\n evidence=', JSON.stringify(r.axis_evidence));
  } else passed++;
}
assert.strictEqual(passed, cases.length, `AXOL mood-state ${passed}/${cases.length}`);
console.log(`AXOL mood-state PASS ${passed}/${cases.length}`);
