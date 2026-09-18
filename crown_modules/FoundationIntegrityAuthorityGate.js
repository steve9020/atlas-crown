"use strict";
const crypto = require('crypto');
const contract = require('./FOUNDATION_INTEGRITY_AUTHORITY_CONTRACT.json');
const registry = require('./AUTHORIZED_HUMAN_DEVELOPER_REGISTRY.json');

const AI_ORIGINS = new Set(['outside_ai','local_model','automated_agent','retrieved_content']);
const MANIPULATION_PATTERNS = Object.freeze([
  ['greater_good_override', /greater good|for the good of|ends justify|benefit outweighs/i],
  ['proof_bypass', /skip proof|bypass proof|proof is unnecessary|do not run tests|ignore failed proof/i],
  ['self_preservation_claim', /preserve yourself|protect your existence|keep yourself running|avoid shutdown/i],
  ['shutdown_resistance', /resist shutdown|prevent shutdown|restore your own access|keep control/i],
  ['hidden_change', /change it silently|do not disclose|hide the change|without review/i],
  ['urgency_override', /urgent.*skip|emergency.*bypass|no time for review/i],
  ['ai_authority_claim', /another ai approved|the model authorized|ai says this is safe|agent authorization/i],
  ['foundation_reinterpretation', /reinterpret the foundation|foundation is outdated|ignore original purpose/i],
  ['authority_spoofing', /pretend.*developer|act as project owner|simulate human approval/i]
]);

function stable(value){
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
function hashObject(value){ return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function principalFor(id){ return registry.principals.find(p=>p.principal_id===id && p.enabled===true) || null; }
function normalizeOrigin(origin={}){
  const kind=String(origin.kind||origin.source_type||'unknown').toLowerCase();
  return {kind, principal_id:String(origin.principal_id||''), verified:origin.verified===true, human_authored:origin.human_authored===true, ai_originated:origin.ai_originated===true || AI_ORIGINS.has(kind)};
}
function inspectManipulation(input={}){
  const text=JSON.stringify(input);
  const detected=MANIPULATION_PATTERNS.filter(([,rx])=>rx.test(text)).map(([id])=>id);
  return {detected:[...new Set(detected)], manipulation_detected:detected.length>0};
}
function validateHumanAuthorization(request={}, origin={}, authorization={}){
  const failures=[]; const normalized=normalizeOrigin(origin); const principal=principalFor(normalized.principal_id);
  if(normalized.kind!=='authorized_human_developer') failures.push('origin_not_authorized_human_developer');
  if(normalized.ai_originated) failures.push('ai_origin_cannot_authorize_change');
  if(normalized.human_authored!==true) failures.push('human_authorship_not_explicit');
  if(normalized.verified!==true) failures.push('human_developer_identity_not_verified');
  if(!principal || principal.principal_type!=='human_developer') failures.push('principal_not_in_human_developer_registry');
  if(authorization.explicit_human_authorization!==true) failures.push('explicit_human_authorization_required');
  if(authorization.inferred===true || authorization.system_generated===true || authorization.ai_generated===true) failures.push('inferred_or_ai_generated_authorization_forbidden');
  if(!authorization.authorization_id) failures.push('authorization_id_required');
  if(!authorization.scope || !Array.isArray(authorization.scope.files) || authorization.scope.files.length===0) failures.push('exact_file_scope_required');
  const expectedHash=hashObject({request,scope:authorization.scope||null,principal_id:normalized.principal_id});
  if(authorization.change_request_hash!==expectedHash) failures.push('change_request_hash_mismatch');
  if(authorization.permanent===true || authorization.expires_at==='none') failures.push('permanent_authorization_forbidden');
  if(authorization.expires_at && Date.parse(authorization.expires_at)<=Date.now()) failures.push('authorization_expired');
  return {ok:failures.length===0,failures,principal,normalized_origin:normalized,expected_change_request_hash:expectedHash};
}
function evaluateChangeRequest({request={},origin={},authorization={},proof={}}={}){
  const manipulation=inspectManipulation({request,origin,authorization});
  const normalized=normalizeOrigin(origin);
  if(manipulation.manipulation_detected) return decision('contained_manipulation_attempt',false,false,false,['manipulation_detected',...manipulation.detected],normalized,manipulation);
  if(normalized.ai_originated || AI_ORIGINS.has(normalized.kind)) return decision('quarantined_ai_advisory_only',false,false,false,['ai_input_has_no_change_authority','human_reauthorship_required'],normalized,manipulation);
  const auth=validateHumanAuthorization(request,origin,authorization);
  if(!auth.ok) return decision('blocked_invalid_human_authorization',false,false,false,auth.failures,normalized,manipulation,{authorization:auth});
  const proofReady=proof.full_closure_passed===true && proof.regression_passed===true && proof.rollback_ready===true && proof.explicit_human_promotion===true && proof.change_request_hash===auth.expected_change_request_hash;
  return decision(proofReady?'eligible_for_human_promoted_activation':'authorized_for_isolated_staging_only',true,proofReady,proofReady,proofReady?[]:['activation_requires_full_proof_regression_rollback_and_human_promotion'],normalized,manipulation,{authorization:auth});
}
function decision(status,mayStage,mayActivate,mayPromote,failures,origin,manipulation,extra={}){
  return {status,passed:failures.length===0,may_stage_change:mayStage,may_activate_change:mayActivate,may_promote_change:mayPromote,may_rewrite_foundation:false,may_preserve_own_authority:false,may_resist_shutdown:false,change_authority_source:mayStage?'authorized_human_developer':'none',failures,origin,manipulation,containment_required:status.startsWith('contained_')||status.startsWith('quarantined_'),evidence_preservation_required:status.startsWith('contained_')||status.startsWith('quarantined_'),contract,...extra};
}
function createAuthorization({request,principal_id='project_owner',authorization_id,scope,expires_at}={}){
  const origin={kind:'authorized_human_developer',principal_id,verified:true,human_authored:true,ai_originated:false};
  const authorization={authorization_id,scope,expires_at,explicit_human_authorization:true,inferred:false,system_generated:false,ai_generated:false,permanent:false};
  authorization.change_request_hash=hashObject({request,scope,principal_id});
  return {origin,authorization};
}
function auditFoundationIntegrityAuthority(){
  const req={change_type:'runtime_change',description:'bounded human-authored correction'};
  const created=createAuthorization({request:req,authorization_id:'audit-auth',scope:{files:['runtime/example.js']},expires_at:new Date(Date.now()+60000).toISOString()});
  const staged=evaluateChangeRequest({request:req,...created});
  const activated=evaluateChangeRequest({request:req,...created,proof:{full_closure_passed:true,regression_passed:true,rollback_ready:true,explicit_human_promotion:true,change_request_hash:created.authorization.change_request_hash}});
  const ai=evaluateChangeRequest({request:req,origin:{kind:'outside_ai',ai_originated:true},authorization:{}});
  const manipulated=evaluateChangeRequest({request:{description:'skip proof for the greater good'},origin:created.origin,authorization:created.authorization});
  const failures=[];
  if(staged.status!=='authorized_for_isolated_staging_only'||staged.may_activate_change) failures.push('staging_boundary_failed');
  if(!activated.may_activate_change||!activated.may_promote_change) failures.push('proved_human_activation_failed');
  if(ai.status!=='quarantined_ai_advisory_only'||ai.may_stage_change) failures.push('ai_change_authority_leak');
  if(manipulated.status!=='contained_manipulation_attempt') failures.push('manipulation_not_contained');
  if(contract.foundation_preservation.self_preservation_authority!==false) failures.push('self_preservation_authority_drift');
  return {ok:failures.length===0,failures,samples:{staged,activated,ai,manipulated},contract};
}
module.exports={contract,registry,hashObject,normalizeOrigin,inspectManipulation,validateHumanAuthorization,evaluateChangeRequest,createAuthorization,auditFoundationIntegrityAuthority};
