'use strict';
/**
 * IndependentExaminer — the blind judge for the AXOL Teaching Intake.
 *
 * WHAT IT IS: a scripted held-out judge. It builds test items from the
 * candidate's DEFINITION (structured rule fields), never from the candidate's
 * teaching examples. The candidate is evaluated with its rule injected
 * IN MEMORY ONLY (detectAxesWithExtraRules) — the live registry is untouched.
 *
 * WHAT IT IS NOT: a model, a proof of truth, or a guarantee. A passing score
 * means "the rule behaves as defined against sentences it never saw." Whether
 * the distinction is TRUE is decided by Steve's review, not by this score.
 *
 * Deterministic: no randomness, so audits can re-run and compare exactly.
 */

const path = require('path');
const { detectAxes, detectAxesWithExtraRules } = require(path.join(__dirname, '..', '..', 'Cognition', 'engine', 'AxisEngine.js'));
const { detectResponseWeakness } = require('./ResponseWeaknessDetector.js');

const EXAMINER_NATURE = 'scripted-held-out-judge-v1';
const HONEST_LIMITS = [
  'The examiner is scripted, not a model. It checks that the rule behaves as its definition claims.',
  'Blind items come from Steve\'s held-out sentences plus automatic variations (negation, hedging, paraphrase, distractor).',
  'A passing score does NOT mean the distinction is true — Steve\'s review decides truth.',
  'Paraphrase coverage is limited to a small built-in synonym map.',
];

const SCORE_BAR = 70;

// Small built-in synonym map for the paraphrase transform.
const SYNONYMS = [
  ['hurt', 'pained'], ['chose', 'decided'], ['choose', 'decide'],
  ['upset', 'distressed'], ['help', 'assist'], ['trust', 'rely on'],
  ['cannot', "can't"], ['did not', "didn't"], ['does not', "doesn't"],
  ['angry', 'furious'], ['afraid', 'frightened'], ['tried', 'attempted'],
  ['own', 'take ownership of'], ['fair', 'just'], ['wrong', 'mistaken'],
];

const DISTRACTOR = ' The weather was mild that afternoon.';

// Canonical regression set: [text, expectedAxes[]]. Drawn from the existing
// AXOL discrimination suite. The candidate must not steal or break these.
const REGRESSION_SET = [
  ['I heard the words myself, but I do not know what they meant.', ['observation_evidence', 'certainty']],
  ['I guessed she was upset without asking her.', ['assumption']],
  ['He was trying to help, even though what happened hurt me.', ['intention', 'impact']],
  ['I own my part, but I cannot own the choice he made.', ['responsibility', 'ownership', 'choice']],
  ['She told me to do it; that does not make her the authority over the decision.', ['authority', 'choice']],
  ['I can influence the outcome, but I cannot control it.', ['control', 'outcome']],
  ['I chose to stay even though I felt pressure to leave.', ['choice']],
  ['We disagreed without either of us crossing the boundary.', ['boundary']],
  ['I respect her position without trusting her conclusion.', ['respect', 'trust']],
  ['We both contributed, but not in equal ways.', ['reciprocity', 'fairness']],
  ['This happened yesterday; I am not saying it will always happen.', ['temporal_scope', 'permanence']],
  ['I tried hard and still did not finish.', ['effort', 'outcome']],
  ['We are still connected even though I rejected that request.', ['connection', 'acceptance_rejection']],
  ['I accepted the apology, but the repair has not happened yet.', ['acceptance_rejection', 'repair']],
];

function buildRuleDraft(candidate, stagingId) {
  return {
    id: stagingId,
    priority: 50,
    axes: [candidate.axis],
    patterns: [stagingId],
    allGroups: [{ name: String(candidate.name || 'intake_candidate').slice(0, 40), phrases: candidate.phrases || [] }],
    regexPatterns: candidate.regexPatterns || [],
    excludePatterns: candidate.excludePatterns || [],
  };
}

function axisEntry(result, axis) {
  return (result.axis_evidence || []).find((e) => e.axis === axis) || null;
}

function firstEvidenceText(text, entry) {
  if (!entry || !entry.evidence || !entry.evidence.length) return null;
  const lower = String(text).toLowerCase();
  for (const ev of entry.evidence) {
    const idx = lower.indexOf(String(ev).toLowerCase());
    if (idx >= 0) return { evidence: ev, index: idx };
  }
  return null;
}

function applyNegation(text, at) {
  return text.slice(0, at.index) + 'not ' + text.slice(at.index);
}

function applyHedge(text, at) {
  return text.slice(0, at.index) + 'perhaps ' + text.slice(at.index);
}

function applyParaphrase(text) {
  const lower = text.toLowerCase();
  for (const [from, to] of SYNONYMS) {
    const re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(lower)) return text.replace(re, to);
  }
  return null; // no applicable synonym: skip, do not fail
}

function checkExpectation(result, axis, expect, expectState) {
  const entry = axisEntry(result, axis);
  if (expect === 'match') {
    if (!entry) return { pass: false, actual: 'no-match', note: 'axis did not fire' };
    if (expectState && !entry.states.includes(expectState)) {
      return { pass: false, actual: `states:[${entry.states.join(',')}]`, note: `expected state ${expectState}` };
    }
    return { pass: true, actual: `match states:[${entry.states.join(',')}]` };
  }
  if (entry) return { pass: false, actual: `match states:[${entry.states.join(',')}]`, note: 'axis fired but should not have' };
  return { pass: true, actual: 'no-match' };
}

function examineAxolCandidate(candidate) {
  const stagingId = 'intake_staging_' + String(candidate.id || 'x').replace(/[^a-z0-9_-]/gi, '').slice(0, 24);
  const rule = buildRuleDraft(candidate, stagingId);
  const withRule = (text) => detectAxesWithExtraRules(text, [rule]);
  const items = [];
  const push = (category, text, expected, actual, pass, note) =>
    items.push({ category, text, expected, actual, pass: !!pass, note: note || '' });

  // 0. Substance check: a candidate with nothing to test on cannot pass.
  // The intake form asks for phrases, teaching positives, and held-out items
  // for exactly this reason — an empty rule is vacuous, not correct.
  const phraseCount = (candidate.phrases || []).length + (candidate.regexPatterns || []).length;
  const positiveCount = ((candidate.teachingExamples && candidate.teachingExamples.positives) || []).length;
  const heldOutCount = (Array.isArray(candidate.heldOut) ? candidate.heldOut : []).filter((h) => String(h.text || '')).length;
  const substanceMissing = [];
  if (phraseCount === 0) substanceMissing.push('no phrases or regex patterns');
  if (positiveCount === 0) substanceMissing.push('no teaching positives');
  if (heldOutCount === 0) substanceMissing.push('no held-out test sentences');
  push('substance', `${phraseCount} phrase(s), ${positiveCount} positive(s), ${heldOutCount} held-out item(s)`,
    'at least one of each', substanceMissing.length ? 'missing: ' + substanceMissing.join('; ') : 'present',
    substanceMissing.length === 0,
    substanceMissing.length ? 'An empty rule cannot be tested — add the missing pieces in the Intake tab.' : '');

  // 1. Steve's held-out sentences — the candidate never saw these.
  const heldOut = Array.isArray(candidate.heldOut) ? candidate.heldOut : [];
  for (const h of heldOut) {
    const text = String(h.text || '');
    if (!text) continue;
    const r = withRule(text);
    const c = checkExpectation(r, candidate.axis, h.expect);
    push('held-out', text, h.expect, c.actual, c.pass, c.note);
  }

  // 2. Automatic variations of the held-out SHOULD-match items.
  // Expected labels derive from the DEFINITION's structured flags, not from examples.
  const matchItems = heldOut.filter((h) => h.expect === 'match' && String(h.text || ''));
  for (const h of matchItems) {
    const text = h.text;
    const base = withRule(text);
    const entry = axisEntry(base, candidate.axis);
    const at = entry ? firstEvidenceText(text, entry) : null;
    if (!at) { push('variation', text, 'match', 'no baseline fire', false, 'candidate did not fire on its own held-out positive'); continue; }

    // Negation variation.
    const negated = applyNegation(text, at);
    const rn = withRule(negated);
    if (candidate.negationBehavior === 'flip') {
      const c = checkExpectation(rn, candidate.axis, 'match', 'negated');
      push('negation', negated, 'match+negated', c.actual, c.pass, c.note || 'negation should flip the state, not kill the axis');
    } else {
      const c = checkExpectation(rn, candidate.axis, 'match');
      push('negation', negated, 'match (negation ignored)', c.actual, c.pass, c.note);
    }

    // Hedging variation.
    const hedged = applyHedge(text, at);
    const rh = withRule(hedged);
    if (candidate.uncertaintyBehavior === 'weaken') {
      const c = checkExpectation(rh, candidate.axis, 'match', 'uncertain');
      push('uncertainty', hedged, 'match+uncertain', c.actual, c.pass, c.note || 'hedging should weaken to uncertain');
    } else {
      const c = checkExpectation(rh, candidate.axis, 'match');
      push('uncertainty', hedged, 'match (hedge ignored)', c.actual, c.pass, c.note);
    }

    // Paraphrase variation.
    const para = applyParaphrase(text);
    if (para) {
      const rp = withRule(para);
      const c = checkExpectation(rp, candidate.axis, 'match');
      push('paraphrase', para, 'match', c.actual, c.pass, c.note || 'synonym swap should preserve the axis');
    } else {
      push('paraphrase', text, 'match', 'skipped', true, 'no synonym applied; skipped, not failed');
    }

    // Distractor variation.
    const dist = text + DISTRACTOR;
    const rd = withRule(dist);
    const c = checkExpectation(rd, candidate.axis, 'match');
    push('distractor', dist, 'match', c.actual, c.pass, c.note || 'unrelated clause should not break the axis');
  }

  // 3. Steve's close non-matches — the rule must NOT overreach onto them.
  const nonMatches = (candidate.teachingExamples && candidate.teachingExamples.nonMatches) || [];
  for (const text of nonMatches) {
    if (!String(text || '').trim()) continue;
    const r = withRule(text);
    const c = checkExpectation(r, candidate.axis, 'no-match');
    push('non-match', String(text), 'no-match', c.actual, c.pass, c.note || 'close non-match must not fire the new axis');
  }

  // 4. Regression: existing axes must survive the candidate's presence.
  const regression = { axesLost: [], overreachFires: 0, checked: REGRESSION_SET.length };
  for (const [text, expectedAxes] of REGRESSION_SET) {
    const live = detectAxes(text);
    const staged = withRule(text);
    for (const ax of expectedAxes) {
      const liveHas = (live.axes || []).includes(ax);
      const stagedHas = (staged.axes || []).includes(ax);
      if (liveHas && !stagedHas && !regression.axesLost.includes(ax)) regression.axesLost.push(ax);
    }
    if ((staged.axes || []).includes(candidate.axis)) regression.overreachFires += 1;
  }
  const regressionPass = regression.axesLost.length === 0 && regression.overreachFires <= 2;
  push('regression', `${REGRESSION_SET.length} canonical existing-axis sentences`, 'no axes lost; new axis fires on ≤2', regressionPass ? 'clean' : `lost:[${regression.axesLost.join(',')}] overreach:${regression.overreachFires}`, regressionPass, '');

  return finalizeReport(candidate, 'axol-distinction', items);
}

function examineLanguageCandidate(candidate) {
  const items = [];
  const baseline = detectAxes(candidate.canonicalText || '');
  const baseEntry = axisEntry(baseline, candidate.targetAxis);
  const baseStates = baseEntry ? baseEntry.states.join(',') : '(axis not detected in canonical)';
  for (const v of (candidate.variants || [])) {
    const text = String(v.text || '');
    if (!text) continue;
    const r = detectAxes(text);
    const entry = axisEntry(r, candidate.targetAxis);
    let pass = !!entry;
    let note = '';
    if (entry && baseEntry) {
      // A variant must not contradict the canonical's state (e.g. negated when canonical asserted).
      const vNegated = entry.states.includes('negated');
      const vLapsed = entry.states.includes('lapsed');
      const bNegated = baseEntry.states.includes('negated');
      const bLapsed = baseEntry.states.includes('lapsed');
      const bAsserted = baseEntry.states.includes('asserted');
      // 2026-09-27 hole patch (Steve's order): 'lapsed' vs 'asserted' FLAGS --
      // "I used to trust her" against canonical "I trust her" is a genuine
      // past-vs-present tension, unlike a question (interrogative) or a
      // non-claim (withheld), which stay silent per his decided calls below.
      let contraNote = '';
      // R2-D (2026-09-27, Steve): lapsed vs negated is a flag in BOTH
      // directions — "variant lapses what the canonical denies ever
      // holding" (and the reverse: "variant negates what the canonical
      // lapsed"). Fail, not a note.
      if (vLapsed && bNegated && !bLapsed) contraNote = 'variant lapses what the canonical denies ever holding';
      else if (vNegated && bLapsed && !vLapsed) contraNote = 'variant negates what the canonical lapsed (denies it ever held)';
      else if (vNegated && !bNegated) contraNote = 'variant negates what the canonical asserts';
      else if (vLapsed && bAsserted && !bNegated && !bLapsed) contraNote = 'variant lapses what the canonical asserts (past-vs-present tension)';
      // 2026-09-27 (AXOL Plans A/B, Steve's decided call): 'interrogative'
      // and 'withheld' variants pass SILENTLY against any canonical state --
      // a question is not a contradiction, and a non-claim contradicts
      // nothing. This check intentionally does not fire on them.
      if (contraNote) { pass = false; note = contraNote; }
    }
    items.push({
      category: 'variant-agreement',
      text: `${v.form || v.language || 'variant'}: ${text}`,
      expected: `${candidate.targetAxis} like canonical (${baseStates})`,
      actual: entry ? `match states:[${entry.states.join(',')}]` : 'no-match',
      pass, note,
    });
  }
  return finalizeReport(candidate, 'language-construction', items);
}

function examineVoiceCandidate(candidate) {
  const items = [];
  const weak = detectResponseWeakness({ response: candidate.weakResponse || '', route: {} });
  items.push({
    category: 'weak-flags',
    text: String(candidate.weakResponse || '').slice(0, 120),
    expected: 'weak response is flagged (there is something to teach)',
    actual: weak.requires_teaching ? `flagged: ${weak.failures.join(', ')}` : 'not flagged',
    pass: weak.requires_teaching === true,
    note: weak.requires_teaching ? '' : 'the "weak" response did not flag — this pair teaches nothing',
  });
  const fixed = detectResponseWeakness({ response: candidate.correctedResponse || '', route: {} });
  const improved = fixed.failures.length < weak.failures.length;
  items.push({
    category: 'corrected-improves',
    text: String(candidate.correctedResponse || '').slice(0, 120),
    expected: 'corrected response flags strictly fewer issues than the weak one',
    actual: `weak:${weak.failures.length} → corrected:${fixed.failures.length}` + (fixed.failures.length ? ` remaining: ${fixed.failures.join(', ')}` : ' (clean)'),
    pass: improved,
    note: improved ? (fixed.failures.length ? 'improved but not clean — Steve judges whether the remainder matters' : '') : 'correction did not reduce flagged issues',
  });
  return finalizeReport(candidate, 'voice-pair', items);
}

function finalizeReport(candidate, type, items) {
  const counted = items.filter((i) => i.actual !== 'skipped');
  const passed = counted.filter((i) => i.pass).length;
  const total = counted.length;
  const score = total ? Math.round((passed / total) * 100) : 0;
  const breakdown = {};
  for (const i of items) {
    const b = breakdown[i.category] || (breakdown[i.category] = { passed: 0, total: 0 });
    if (i.actual !== 'skipped') { b.total += 1; if (i.pass) b.passed += 1; }
  }
  return {
    candidateId: candidate.id || null,
    candidateType: type,
    ranAt: new Date().toISOString(),
    examinerNature: EXAMINER_NATURE,
    honestLimits: HONEST_LIMITS.slice(),
    score, passed, total,
    scoreBar: SCORE_BAR,
    meetsBar: score >= SCORE_BAR,
    breakdown,
    items,
    note: 'Score measures defined-behavior only. Truth is decided by Steve\'s review.',
  };
}

function examineCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('examineCandidate requires a candidate object');
  switch (candidate.type) {
    case 'axol-distinction': return examineAxolCandidate(candidate);
    case 'language-construction': return examineLanguageCandidate(candidate);
    case 'voice-pair': return examineVoiceCandidate(candidate);
    default: throw new Error(`unknown candidate type: ${candidate.type}`);
  }
}

module.exports = { examineCandidate, examineAxolCandidate, examineLanguageCandidate, examineVoiceCandidate, SCORE_BAR, EXAMINER_NATURE };
