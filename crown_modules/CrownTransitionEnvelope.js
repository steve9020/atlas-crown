'use strict';

const crypto = require('crypto');
const { createCrownPredicateResult } = require('./CrownPredicateResult');

const CROWN_TRANSITION_SCHEMA = 'atlas.crown.transition.v1';
const CROWN_STATES = Object.freeze(['PASS', 'FAIL', 'UNKNOWN', 'CONFLICT', 'FROZEN']);

function stableDigest(value) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
}

function createCrownTransitionEnvelope(input = {}) {
  const sourceText = String(input.source_text || '');
  const sourceDigest = input.source_digest || stableDigest(sourceText);
  const transitionSeed = [sourceDigest, input.target_id || '', input.target_version || '', input.context_id || '', input.context_version || ''].join('|');
  const status = CROWN_STATES.includes(input.status) ? input.status : 'UNKNOWN';

  return Object.freeze({
    schema: CROWN_TRANSITION_SCHEMA,
    transition_id: input.transition_id || `crown:${stableDigest(transitionSeed)}`,
    source_digest: sourceDigest,
    provenance_ref: input.provenance_ref || null,
    target: Object.freeze({ id: input.target_id || null, version: input.target_version || null }),
    context: Object.freeze({ id: input.context_id || null, version: input.context_version || null }),
    predicate_results: Object.freeze(Array.isArray(input.predicate_results) ? input.predicate_results.map(result => createCrownPredicateResult(result)) : []),
    scope: Object.freeze(Array.isArray(input.scope) ? [...input.scope] : []),
    authorization_ref: input.authorization_ref || null,
    authorization_applicability: input.authorization_applicability ? Object.freeze({...input.authorization_applicability}) : null,
    applicability: input.authorization_applicability && input.authorization_applicability.result ? input.authorization_applicability.result : (input.applicability || 'UNKNOWN'),
    validation_snapshot_ref: input.validation_snapshot_ref || null,
    validation: input.validation ? Object.freeze({...input.validation}) : null,
    execution_token_ref: input.execution_token_ref || null,
    execution: input.execution ? Object.freeze({...input.execution}) : null,
    recovery_ref: input.recovery_ref || null,
    recovery: input.recovery ? Object.freeze({...input.recovery}) : null,
    lineage_ref: input.lineage_ref || null,
    lineage: input.lineage ? Object.freeze({...input.lineage}) : null,
    root_epoch_ref: input.root_epoch_ref || null,
    canonical_resolution_ref: input.canonical_resolution_ref || null,
    equivalence_path_refs: Object.freeze(Array.isArray(input.equivalence_path_refs) ? [...input.equivalence_path_refs] : []),
    outside_anchor_ref: input.outside_anchor_ref || null,
    proof_refs: Object.freeze(Array.isArray(input.proof_refs) ? [...input.proof_refs] : []),
    status,
    route_authority: false,
    output_authority: false
  });
}

module.exports = { CROWN_TRANSITION_SCHEMA, CROWN_STATES, stableDigest, createCrownTransitionEnvelope };
