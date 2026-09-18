'use strict';

const crypto = require('crypto');
const { evaluateCapabilityAction } = require('./AuthorityControlGuard');

const SCHEMA = 'atlas.crown.authorization-applicability.v1';
const STATES = Object.freeze(['PASS', 'FAIL', 'UNKNOWN']);
function digest(v){ return crypto.createHash('sha256').update(String(v == null ? '' : v),'utf8').digest('hex'); }
function same(a,b){ return String(a == null ? '' : a) === String(b == null ? '' : b); }

function evaluateAuthorizationApplicability(input = {}) {
  const capability = evaluateCapabilityAction(input.capability_id, input.action);
  const token = input.authorization || null;
  const violations = [];
  const unknown = [];

  if (!capability.allowed) violations.push(`capability:${capability.reason}`);
  if (!token) unknown.push('authorization_missing');
  else {
    if (token.explicit_human_approval !== true) violations.push('explicit_human_approval_required');
    if (token.inferred === true || token.auto === true || token.system_generated === true || token.self_authorized === true) violations.push('automatic_or_self_authorization_forbidden');
    for (const field of ['authorization_id','target_id','target_version','scope','context_id','context_version','transition_id']) {
      if (!(field in token)) unknown.push(`authorization_${field}_missing`);
    }
    if ('target_id' in token && !same(token.target_id,input.target_id)) violations.push('target_id_mismatch');
    if ('target_version' in token && !same(token.target_version,input.target_version)) violations.push('target_version_mismatch');
    if ('context_id' in token && !same(token.context_id,input.context_id)) violations.push('context_id_mismatch');
    if ('context_version' in token && !same(token.context_version,input.context_version)) violations.push('context_version_mismatch');
    if ('transition_id' in token && !same(token.transition_id,input.transition_id)) violations.push('transition_id_mismatch');

    if (Array.isArray(token.scope)) {
      const requested = Array.isArray(input.scope) ? input.scope : [];
      for (const item of requested) if (!token.scope.includes(item)) violations.push(`scope_not_authorized:${item}`);
    } else if ('scope' in token) unknown.push('authorization_scope_invalid');

    const now = Number.isFinite(input.now_ms) ? input.now_ms : Date.now();
    if (token.effective_from_ms != null && now < Number(token.effective_from_ms)) violations.push('authorization_not_yet_effective');
    if (token.expires_at_ms == null) unknown.push('authorization_expiry_missing');
    else if (now >= Number(token.expires_at_ms)) violations.push('authorization_expired');
    if (token.revoked === true) violations.push('authorization_revoked');
    if (token.consumed === true) violations.push('authorization_replay_or_consumed');
  }

  let result = 'PASS';
  if (violations.length) result = 'FAIL';
  else if (unknown.length) result = 'UNKNOWN';

  const record = {
    schema: SCHEMA,
    result,
    authorization_ref: token && token.authorization_id ? String(token.authorization_id) : null,
    authorization_digest: token ? digest(JSON.stringify(token)) : null,
    capability: Object.freeze({id: input.capability_id || null, action: input.action || null, allowed: capability.allowed === true}),
    target: Object.freeze({id: input.target_id || null, version: input.target_version || null}),
    context: Object.freeze({id: input.context_id || null, version: input.context_version || null}),
    transition_id: input.transition_id || null,
    scope: Object.freeze(Array.isArray(input.scope) ? [...input.scope] : []),
    violations: Object.freeze(violations),
    unknown: Object.freeze(unknown),
    route_authority: false,
    output_authority: false
  };
  return Object.freeze(record);
}

function isApplicable(record){ return !!record && record.schema === SCHEMA && record.result === 'PASS'; }
module.exports = { SCHEMA, STATES, evaluateAuthorizationApplicability, isApplicable };
