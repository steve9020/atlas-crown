'use strict';

const crypto = require('crypto');

const PROVENANCE_SCHEMA = 'atlas.crown.provenance.v1';

function digest(value) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
}

function createSourceProvenance(sourceText, input = {}) {
  const text = String(sourceText || '');
  const sourceDigest = digest(text);
  return Object.freeze({
    schema: PROVENANCE_SCHEMA,
    provenance_id: input.provenance_id || `source:${sourceDigest}`,
    kind: 'source',
    source_digest: sourceDigest,
    parent_ids: Object.freeze([]),
    derivation_type: null,
    evidence_refs: Object.freeze([]),
    authority: 'SOURCE_ONLY',
    route_authority: false,
    output_authority: false
  });
}

function createDerivedProvenance(input = {}) {
  if (!Array.isArray(input.parent_ids) || input.parent_ids.length === 0) {
    throw new Error('CROWN_PROVENANCE_PARENT_REQUIRED');
  }
  const contentDigest = digest(input.content || '');
  const identitySeed = [contentDigest, input.derivation_type || 'unspecified', ...input.parent_ids].join('|');
  return Object.freeze({
    schema: PROVENANCE_SCHEMA,
    provenance_id: input.provenance_id || `derived:${digest(identitySeed)}`,
    kind: 'derived',
    source_digest: input.source_digest || null,
    parent_ids: Object.freeze([...input.parent_ids]),
    derivation_type: input.derivation_type || 'unspecified',
    evidence_refs: Object.freeze(Array.isArray(input.evidence_refs) ? [...input.evidence_refs] : []),
    content_digest: contentDigest,
    authority: 'NONE',
    route_authority: false,
    output_authority: false
  });
}

module.exports = { PROVENANCE_SCHEMA, createSourceProvenance, createDerivedProvenance };
