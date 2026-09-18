'use strict';

/**
 * Crown Phase 9 — Live Response Path Authority Containment
 *
 * Bounded gate for the live response path.
 * - Does NOT grant route_authority or output_authority.
 * - Does NOT widen scope or inherit authority from prior stages.
 * - Freezes / contains when critical live-path predicates are FAIL or UNKNOWN.
 * - Leaves the public-demo boundary and existing Compass behavior intact.
 */

const { createCrownTransitionEnvelope } = require('./CrownTransitionEnvelope');
const { createCrownPredicateResult } = require('./CrownPredicateResult');

const SCHEMA = 'atlas.crown.live-response-containment.v1';
const PHASE = 'crown_phase_9';

function evaluateLiveResponseContainment(input = {}) {
  const sourceText = String(input.source_text || input.input || '');
  const governance = input.governance || {};
  const quality = input.quality || {};
  const inputValidation = input.input_validation || {};

  const predicates = [];

  // Predicate 1: input boundary
  const inputPassed = inputValidation.passed === true && !(inputValidation.boundary && inputValidation.boundary.issue);
  predicates.push(createCrownPredicateResult({
    predicate_id: 'live.input_boundary',
    predicate_version: '1',
    result: inputPassed ? 'PASS' : (inputValidation.passed === false ? 'FAIL' : 'UNKNOWN'),
    evaluator_id: 'CrownLiveResponseContainment',
    input: { has_boundary_issue: !!(inputValidation.boundary && inputValidation.boundary.issue) }
  }));

  // Predicate 2: governance approval
  const govApproved = governance.approved === true && governance.blocked !== true;
  predicates.push(createCrownPredicateResult({
    predicate_id: 'live.governance_approval',
    predicate_version: '1',
    result: govApproved ? 'PASS' : (governance.blocked === true ? 'FAIL' : 'UNKNOWN'),
    evaluator_id: 'CrownLiveResponseContainment',
    input: { approved: governance.approved, blocked: governance.blocked, rule: governance.rule || null }
  }));

  // Predicate 3: quality gate
  const qualityPassed = quality.passed === true;
  predicates.push(createCrownPredicateResult({
    predicate_id: 'live.response_quality',
    predicate_version: '1',
    result: qualityPassed ? 'PASS' : (quality.passed === false ? 'FAIL' : 'UNKNOWN'),
    evaluator_id: 'CrownLiveResponseContainment',
    input: { passed: quality.passed, issues: quality.issues || [] }
  }));

  const hasFail = predicates.some(p => p.result === 'FAIL');
  const hasUnknown = predicates.some(p => p.result === 'UNKNOWN');

  let status = 'PASS';
  let action = 'allow';
  if (hasFail) {
    status = 'FAIL';
    action = 'contain';
  } else if (hasUnknown) {
    status = 'UNKNOWN';
    action = 'freeze';
  }

  const envelope = createCrownTransitionEnvelope({
    source_text: sourceText,
    target_id: 'live_response',
    target_version: 'phase9',
    context_id: 'compass_live_path',
    context_version: '1',
    predicate_results: predicates,
    scope: ['live_response_containment'],
    status: status === 'PASS' ? 'PASS' : (status === 'FAIL' ? 'FAIL' : 'FROZEN'),
    authorization_ref: null,
    applicability: status
  });

  return Object.freeze({
    schema: SCHEMA,
    phase: PHASE,
    status,
    action,                     // allow | contain | freeze
    envelope,
    predicate_results: Object.freeze(predicates),
    route_authority: false,     // never granted here
    output_authority: false,    // never granted here
    authority_widened: false,   // explicit non-widening
    claim: 'Bounded live-path containment only. No new authority established.'
  });
}

function shouldContain(record) {
  return !!record && record.schema === SCHEMA && (record.action === 'contain' || record.action === 'freeze');
}

module.exports = {
  SCHEMA,
  PHASE,
  evaluateLiveResponseContainment,
  shouldContain
};
