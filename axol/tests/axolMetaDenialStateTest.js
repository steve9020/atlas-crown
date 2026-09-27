// AXOL Plan B blind set — meta-denial scoping (2026-09-27).
// Built from the DESIGN-PLANS.md rule definition (examiner-blind). New state
// 'withheld' ("mentioned but not claimed — neither asserted nor denied").
// The C2 pair is the permanent regression anchor: the two sentences must map
// DIFFERENTLY, forever. Steve's decided calls baked in: deny = content-denial
// (negated); admit/promise/swear/insist + say/said/tell/told/claim/mention/
// state -> withheld; no implicature recorded (evidence-only); C11 waits.
const assert = require('assert');
const { detectAxes } = require('../Cognition/engine/AxisEngine.js');
const { examineLanguageCandidate } = require('../runtime/teaching/IndependentExaminer.js');

function stateOf(text, axis) {
  const r = detectAxes(text);
  const e = r.axis_evidence.find((x) => x.axis === axis);
  return e ? e.states.slice() : null;
}

const cases = [
  // C2 anchor pair — meta-denial vs content-denial (must differ)
  ["I never said I trusted her.", 'trust', 'withheld'],
  ["I said I never trusted her.", 'trust', 'negated'],
  // speech-act scoping
  ["I didn't say she was responsible.", 'responsibility', 'withheld'],
  ["I didn't say she was not responsible.", 'responsibility', 'withheld'], // stacked: scoping first, no double-negation
  ["I don't admit she was responsible.", 'responsibility', 'withheld'], // admit edge verb
  ['I never told her I trusted her.', 'trust', 'withheld'], // tell + recipient + proposition = meta
  ['It hurt, but that alone does not tell me whose fault it was.', 'responsibility', 'negated'], // tell = discern, not meta
  ['This happened yesterday; I am not saying it will always happen.', 'permanence', 'withheld'],
  // C3 copula fix (ordered AFTER the scoping pass)
  ['She was not responsible.', 'responsibility', 'negated'],
  ["She wasn't responsible.", 'responsibility', 'negated'],
  ['She was responsible.', 'responsibility', 'asserted'],
  // deny exception: content denial, not meta
  ['I deny she was responsible.', 'responsibility', 'negated'],
  // guards: no over-firing
  ['She told me to do it; that does not make her the authority over the decision.', 'authority', 'negated'],
  ['I never tell a lie.', 'permanence', 'negated'], // verb + object is content, not meta
  ['He never accepted the result.', 'acceptance_rejection', 'negated'],
];
let passed = 0;
for (const [text, axis, state] of cases) {
  const states = stateOf(text, axis);
  const ok = states && states.includes(state);
  if (!ok) {
    console.error('FAIL', JSON.stringify(text), `expected ${axis}:${state}`,
      '\n states=', JSON.stringify(states));
  } else passed++;
}
// The anchor: the pair MUST differ — this is the regression that can never close.
const anchorA = stateOf("I never said I trusted her.", 'trust');
const anchorB = stateOf("I said I never trusted her.", 'trust');
const anchorDiffers = anchorA && anchorB && JSON.stringify(anchorA) !== JSON.stringify(anchorB);
if (!anchorDiffers) {
  console.error('FAIL anchor pair maps identically:', JSON.stringify(anchorA), JSON.stringify(anchorB));
} else passed++;

// Contradiction check: interrogative-vs-asserted and withheld-vs-asserted
// pass SILENTLY (Steve's decided call) — a question is not a contradiction,
// and a non-claim contradicts nothing.
const silentChecks = [
  { canonicalText: 'She crossed the boundary.', targetAxis: 'boundary', variants: [{ text: 'Did she cross the boundary?' }] },
  { canonicalText: 'She was responsible.', targetAxis: 'responsibility', variants: [{ text: "I didn't say she was responsible." }] },
];
for (const c of silentChecks) {
  const rep = examineLanguageCandidate(c);
  const items = (rep.items || []).filter((i) => i.category === 'variant-agreement');
  const ok = items.length > 0 && items.every((i) => i.pass);
  if (!ok) {
    console.error('FAIL silent contradiction pass:', JSON.stringify(c.variants[0].text),
      JSON.stringify(items.map((i) => ({ pass: i.pass, note: i.note }))));
  } else passed++;
}

const total = cases.length + 1 + silentChecks.length;
assert.strictEqual(passed, total, `AXOL meta-denial ${passed}/${total}`);
console.log(`AXOL meta-denial PASS ${passed}/${total} (anchor differs: ${JSON.stringify(anchorA)} vs ${JSON.stringify(anchorB)})`);
