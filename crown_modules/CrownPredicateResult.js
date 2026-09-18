'use strict';

const crypto = require('crypto');

const CROWN_PREDICATE_SCHEMA = 'atlas.crown.predicate-result.v1';
const PREDICATE_STATES = Object.freeze(['PASS', 'FAIL', 'UNKNOWN']);

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableSerialize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableSerialize(value[k])).join(',') + '}';
}

function inputDigest(value) {
  return crypto.createHash('sha256').update(stableSerialize(value), 'utf8').digest('hex');
}

function createCrownPredicateResult(input = {}) {
  if (!input.predicate_id || !input.predicate_version) throw new Error('CROWN_PREDICATE_ID_VERSION_REQUIRED');
  const result = PREDICATE_STATES.includes(input.result) ? input.result : 'UNKNOWN';
  const digest = input.input_digest || inputDigest(input.input);
  return Object.freeze({
    schema: CROWN_PREDICATE_SCHEMA,
    predicate_id: String(input.predicate_id),
    predicate_version: String(input.predicate_version),
    input_digest: digest,
    result,
    evaluator_id: input.evaluator_id || null,
    context_ref: input.context_ref || null,
    evidence_refs: Object.freeze(Array.isArray(input.evidence_refs) ? [...input.evidence_refs] : [])
  });
}

function satisfiesPredicate(result, requirement = {}) {
  if (!result || result.schema !== CROWN_PREDICATE_SCHEMA) return false;
  if (result.result !== 'PASS') return false;
  if (String(result.predicate_id) !== String(requirement.predicate_id || '')) return false;
  if (String(result.predicate_version) !== String(requirement.predicate_version || '')) return false;
  if (requirement.input_digest && result.input_digest !== requirement.input_digest) return false;
  return true;
}

module.exports = {
  CROWN_PREDICATE_SCHEMA,
  PREDICATE_STATES,
  stableSerialize,
  inputDigest,
  createCrownPredicateResult,
  satisfiesPredicate
};
