// AXOL round-2 fixes blind set (2026-09-27).
// Built from the round-2 DESIGN-PLANS-R2.md / CANDIDATES.md rule definitions
// (examiner-blind). Covers the implemented round-2 candidates:
//   R2-C1 window-robust withheld ("didn't tell her [i] trusted her")
//   R2-A  composed hypothetical+negated (Steve: single token, silent examiner)
//   R2-C3 wh-complements after tell are propositional; negator containment
//         (discern "whose" carved out)
//   R2-B  scope-aware ordering: speech-act frame before uncertainty (Steve)
//   R2-C5 "and I still do" cancels the lapse
//   R2-C6 parenthetical commas are not segment boundaries
//   R2-C7 phrasal "and" between intensifiers; "truly" never an actor
//   R2-C8 contracted auxiliaries and "used" never actors; postposed tag subject
//   R2-C9 nested quotes: innermost-wins with outward fallback, cap 3 (Steve)
//   R2-C10 contracted "n't sure/certain" are uncertainty markers
//   R2-C11 "sure/certain/unclear + if" is an embedded question, not hypothetical
//   R2-C12 examiner: lapsed-vs-negated flags in BOTH directions (Steve)
//   R2-C13 downstream uncertainty marker inside a complement does not govern
//         the frame's own axes
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

let passed = 0;
function checkState(text, axis, want) {
  const got = stateOf(text, axis);
  const ok = got && got.length === want.length && want.every((s) => got.includes(s));
  if (!ok) console.error(`FAIL state: ${JSON.stringify(text)} axis=${axis} want=${JSON.stringify(want)} got=${JSON.stringify(got)}`);
  else passed++;
}
function checkActor(text, axis, wantActor) {
  const got = actorOf(text, axis);
  const ok = got && got.some((a) => a.split(':')[0] === wantActor);
  if (!ok) console.error(`FAIL actor: ${JSON.stringify(text)} axis=${axis} want actor=${wantActor} got=${JSON.stringify(got)}`);
  else passed++;
}

// R2-C1 — the complement pronoun at the match index must not hide the telling
checkState("I didn't tell her I trusted her.", 'trust', ['withheld']);
checkState('I never told her I trusted her.', 'trust', ['withheld']); // regression guard

// R2-A — one match, one composed token; the pair must differ
checkState('If she trusted him, she would have come.', 'trust', ['hypothetical']);
checkState("If she didn't trust him, she wouldn't have come.", 'trust', ['hypothetical+negated']);
checkState('Had she trusted him, he would have left.', 'trust', ['hypothetical']);
checkState('Had she not trusted him, he would have left.', 'trust', ['hypothetical+negated']);
checkState("Didn't she cross the boundary?", 'boundary', ['interrogative']); // absorb boundary unchanged

// R2-C3 — wh-complements after tell are propositional; negator containment
checkState('She never told me who crossed the line.', 'boundary', ['withheld']);
checkState("He didn't tell the truth about the decision.", 'choice', ['asserted']);
checkState('She told me who crossed the line.', 'boundary', ['asserted']); // positive control
checkState('It hurt, but that alone does not tell me whose fault it was.', 'responsibility', ['negated']); // discern control

// R2-B — the speech-act frame decides before uncertainty, when it governs
checkState("I don't know whether I said I trusted her.", 'trust', ['withheld']);
checkState('Maybe I never said I trusted her.', 'trust', ['withheld']);
checkState("I didn't say I might trust her.", 'trust', ['withheld']);
checkState('I never said whether I trusted her.', 'trust', ['withheld']); // banked boundary
checkState("I don't know whether I trusted her.", 'trust', ['uncertain']); // no speech verb: control
checkState('Maybe she said I trusted her.', 'trust', ['uncertain']); // bare maybe: control

// R2-C5 — present-tense continuation cancels the lapse
checkState('I used to trust her and I still do.', 'trust', ['asserted']);
checkState('I used to trust her, and I still do.', 'trust', ['asserted']);

// R2-C6 — parenthetical commas are not segment boundaries
checkState('I used to, back in those days, really trust her.', 'trust', ['lapsed']);

// R2-C7 — phrasal "and" is not clausal; "truly" is never an actor
checkState('I used to really and truly trust her.', 'trust', ['lapsed']);
checkState('I used to really and truly trust her.', 'temporal_scope', ['lapsed']);
checkActor('I used to really and truly trust her.', 'trust', 'self');

// R2-C8 — contracted auxiliaries and "used" never bind as actors
checkActor("Didn't I say I trusted her?", 'trust', 'self');
checkActor("Don't you trust her?", 'trust', 'you');
checkActor('Used to trust her, I did.', 'trust', 'self');
checkState('Used to trust her, I did.', 'trust', ['lapsed']);

// R2-C9 — nested quotes: innermost-wins, "He told me" frame resolves
checkActor('She said, \'He told me "I trust you"\'.', 'trust', 'he');
checkActor('He said, "She told me \'I trust you\'".', 'trust', 'she');
checkState('She said, \'He told me "I trust you"\'.', 'trust', ['asserted']);

// R2-C10 — contracted "n't sure/certain" are uncertainty markers
checkState("She wasn't sure if he crossed the boundary.", 'boundary', ['uncertain']);
checkState("She isn't sure if he crossed the boundary.", 'boundary', ['uncertain']);
checkState('She was not sure if he crossed the boundary.', 'boundary', ['uncertain']); // control

// R2-C11 — "sure/certain + if" is an embedded question (= whether)
checkState('She is not sure whether he crossed the boundary.', 'boundary', ['uncertain']); // control

// R2-C13 — downstream marker inside a complement does not govern the frame
checkState('I used to wonder whether I trusted her.', 'trust', ['uncertain']);
checkState('I used to wonder whether I trusted her.', 'temporal_scope', ['lapsed']);

const total = 36;
assert.strictEqual(passed, total, `AXOL round-2 fixes ${passed}/${total}`);
console.log(`AXOL round-2 fixes PASS ${passed}/${total}`);

// R2-C12 — examiner: lapsed-vs-negated flags in BOTH directions (Steve)
let examPassed = 0;
const examTotal = 4;
function checkExam(canonicalText, variantText, wantFlag, wantNoteRe) {
  const rep = examineLanguageCandidate({ canonicalText, targetAxis: 'trust', variants: [{ text: variantText }] });
  const items = (rep.items || []).filter((i) => i.category === 'variant-agreement');
  const flagged = items.length > 0 && items.every((i) => !i.pass);
  const noteOk = !wantFlag || !wantNoteRe || items.every((i) => wantNoteRe.test(i.note || ''));
  const ok = wantFlag ? (flagged && noteOk) : (items.length > 0 && items.every((i) => i.pass));
  if (!ok) console.error(`FAIL examiner: canonical=${JSON.stringify(canonicalText)} variant=${JSON.stringify(variantText)} wantFlag=${wantFlag} got=${JSON.stringify(items.map((i) => ({ pass: i.pass, note: i.note })))}`);
  else examPassed++;
}
checkExam('I never trusted her.', 'I used to trust her.', true, /lapses what the canonical denies ever holding/);
checkExam('I used to trust her.', 'I never trusted her.', true, /negates what the canonical lapsed/);
checkExam('I used to trust her.', 'I used to trust her.', false);
checkExam('I used to trust her.', 'I trust her.', false);
assert.strictEqual(examPassed, examTotal, `AXOL round-2 examiner ${examPassed}/${examTotal}`);
console.log(`AXOL round-2 examiner PASS ${examPassed}/${examTotal}`);
