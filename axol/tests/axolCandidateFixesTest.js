// AXOL candidate-fixes blind set (2026-09-27).
// Built from the DESIGN-PLANS.md / CANDIDATES.md rule definitions
// (examiner-blind). Covers the implemented candidates:
//   C1  contraction-family negators ("don't", "aren't", "ain't", "none")
//   C4  uncertainty is scope-local to the axis's own conjunct
//   C7  stacked negation (litotes) cancels -> asserted
//   C8  intention paraphrases ("meant well", "did not mean it")
//   C9  actor binding: function words never actors; "no one" -> nobody;
//       expletive "it" skipped; lowercase words never named subjects
//   C10 idioms that lexically encode negation ("hands are tied",
//       "pass the buck"; controls: "take the fall", "pull the strings")
//   C11 "used to + verb" -> new state 'lapsed' ("held, now lapsed").
//       Steve reversed his call 2026-09-27: it rides this release.
//       Runs AFTER the negator checks, so "didn't use to" stays negated.
//   C12 quoted first-person resolves to the reporting subject (actor only)
// The C2 pair is the permanent regression anchor (Plan B).
const assert = require('assert');
const { detectAxes } = require('../Cognition/engine/AxisEngine.js');
const { examineLanguageCandidate } = require('../runtime/teaching/IndependentExaminer.js');

function stateOf(text, axis) {
  const r = detectAxes(text);
  const e = r.axis_evidence.find((x) => x.axis === axis);
  return e ? e.states.slice() : null;
}
function actorOf(text, axis) {
  const r = detectAxes(text);
  const e = r.axis_evidence.find((x) => x.axis === axis);
  return e ? (e.attributions || []).map((a) => a.actor + ':' + a.state) : null;
}

const cases = [
  // C1 — the contraction family was incomplete; these inverted by falling through
  ["I don't trust her.", 'trust', 'negated'],
  ["They aren't responsible.", 'responsibility', 'negated'],
  ["He ain't mean it.", 'intention', 'negated'],
  ["She couldn't take the fall.", 'responsibility', 'negated'],
  ["None of them trusted her.", 'trust', 'negated'],
  // C4 — one "maybe" must not poison a conjoined claim
  ['Maybe she intended to help and she clearly crossed the boundary anyway.', 'intention', 'uncertain'],
  ['Maybe she intended to help and she clearly crossed the boundary anyway.', 'boundary', 'asserted'],
  ['She clearly crossed the boundary.', 'boundary', 'asserted'],
  ['Maybe she crossed the line, but clearly I meant well.', 'boundary', 'uncertain'], // hedge is in the same conjunct
  // C7 — stacked negation cancels
  ['I cannot not trust her.', 'trust', 'asserted'],
  ['It is not that I do not respect her.', 'respect', 'asserted'],
  ['I do not trust her and I do not respect her.', 'trust', 'negated'], // distributed, not stacked
  ['I do not trust her and I do not respect her.', 'respect', 'negated'],
  // C8 — intention paraphrases (registry)
  ['She meant well.', 'intention', 'asserted'],
  ['He did not mean it.', 'intention', 'negated'],
  ["He didn't mean it.", 'intention', 'negated'],
  // C9 — actor binding (states here too; actors asserted below)
  ['Nobody trusts her.', 'trust', 'negated'],
  ['No one trusts her.', 'trust', 'negated'],
  ['The decision was hers to respect.', 'respect', 'asserted'],
  ['John trusts her.', 'trust', 'asserted'],
  // C10 — idioms that lexically encode negation (polarity at the match index)
  ['My hands are tied on this.', 'control', 'negated'],
  ['They passed the buck to her.', 'responsibility', 'negated'],
  ['She took the fall for him.', 'responsibility', 'asserted'], // control idiom, no negation encoded
  ['He pulls the strings behind it.', 'control', 'asserted'],
  // C11 — "used to + verb" is the lapsed aspect: held, now lapsed
  ['I used to trust her.', 'trust', 'lapsed'],
  ['I used to respect her.', 'respect', 'lapsed'],
  ['She used to cross the boundary.', 'boundary', 'lapsed'],
  ['I used to think she was responsible.', 'responsibility', 'lapsed'],
  ['I trust her now.', 'trust', 'asserted'], // control: current tense untouched
  ['I trust her.', 'trust', 'asserted'],
  ['I did not use to trust her.', 'trust', 'negated'], // never held -> negated, not lapsed
  ['I never used to trust her.', 'trust', 'negated'],
  ['I used to trust her and I still respect her.', 'trust', 'lapsed'],
  ['I used to trust her and I still respect her.', 'respect', 'asserted'], // later conjunct does not inherit the lapse
  ['Did you use to trust her?', 'trust', 'interrogative'], // mood still wins
  // C2 anchor pair — meta-denial vs content-denial (must differ, permanently)
  ["I never said I trusted her.", 'trust', 'withheld'],
  ["I said I never trusted her.", 'trust', 'negated'],
];

const actorCases = [
  // C9 — function words never actors; "no one" is a real actor like "nobody"
  ['Nobody trusts her.', 'trust', 'nobody:negated'],
  ['No one trusts her.', 'trust', 'nobody:negated'],
  ['None of them trusted her.', 'trust', 'they:negated'],
  // C9 — lowercase words are never named subjects ("to respect" misbound "to")
  ['The decision was hers to respect.', 'respect', 'she:asserted'],
  ['John trusts her.', 'trust', 'john:asserted'], // capitalized names still bind
  // C12 — quoted first-person resolves to the reporting subject (double quotes)
  ['She said, "I trust you".', 'trust', 'she:asserted'],
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
for (const [text, axis, want] of actorCases) {
  const actors = actorOf(text, axis);
  const ok = actors && actors.includes(want);
  if (!ok) {
    console.error('FAIL actor', JSON.stringify(text), `expected ${axis} actor ${want}`,
      '\n actors=', JSON.stringify(actors));
  } else passed++;
}
// The C2 anchor: the pair MUST differ — this regression can never close.
const anchorA = stateOf("I never said I trusted her.", 'trust');
const anchorB = stateOf("I said I never trusted her.", 'trust');
if (!anchorA || !anchorB || JSON.stringify(anchorA) === JSON.stringify(anchorB)) {
  console.error('FAIL anchor pair maps identically:', JSON.stringify(anchorA), JSON.stringify(anchorB));
} else passed++;

// Examiner contradiction checks pass SILENTLY for interrogative, withheld,
// and lapsed (Steve's decided call for the first two; lapsed recorded here:
// a lapsed variant against an asserted canonical is not adjudicated by the
// examiner — the past-vs-present tension is left to the reader, not flagged).
const silentChecks = [
  { canonicalText: 'She crossed the boundary.', targetAxis: 'boundary', variants: [{ text: 'Did she cross the boundary?' }] },
  { canonicalText: 'She was responsible.', targetAxis: 'responsibility', variants: [{ text: "I didn't say she was responsible." }] },
  { canonicalText: 'I trust her.', targetAxis: 'trust', variants: [{ text: 'I used to trust her.' }] },
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

const total = cases.length + actorCases.length + 1 + silentChecks.length;
assert.strictEqual(passed, total, `AXOL candidate-fixes ${passed}/${total}`);
console.log(`AXOL candidate-fixes PASS ${passed}/${total} (anchor differs: ${JSON.stringify(anchorA)} vs ${JSON.stringify(anchorB)})`);
