const { inspectCapability, loadManifest } = require('./AuthorityExposureRegistry');
const ACTION_FIELDS = { read:'can_read', write:'can_write', mutate:'can_mutate', execute:'can_execute', network:'can_access_network', ai:'can_access_ai', governance:'can_touch_governance', proof:'can_touch_proof' };
function evaluateCapabilityAction(capabilityId, action){
  const cap = inspectCapability(capabilityId);
  if(!cap.found) return {allowed:false, reason:'unknown_capability'};
  if(cap.allowed !== true) return {allowed:false, reason:'capability_not_allowed', capability:capabilityId, action};
  const field = ACTION_FIELDS[action];
  if(!field) return {allowed:false, reason:'unknown_action', capability:capabilityId, action};
  if(cap[field] !== true) return {allowed:false, reason:'action_not_allowed', capability:capabilityId, action};
  return {allowed:true, reason:'declared_allowed', capability:capabilityId, action, approval_required:cap.approval_required};
}
function assertNoForbiddenActivation(){
  const m=loadManifest();
  const failures=[];
  for(const cap of m.capabilities){
    if(cap.id.includes('ai') && (cap.can_access_ai || cap.can_access_network || cap.can_write || cap.can_mutate)) failures.push(cap.id+':ai_boundary_overreach');
    if(cap.id==='network_access' && cap.allowed) failures.push('network_access_allowed');
    if(cap.id==='file_mutation' && cap.allowed) failures.push('file_mutation_allowed');
    if(cap.id==='governance_files' && (cap.can_write || cap.can_mutate)) failures.push('governance_mutation_allowed');
  }
  for(const flag of ['no_ai_adapter_added']) if(m[flag] !== true) failures.push(flag+'_not_true');
  for(const flag of ['mock_ai_connected','real_ai_connected','provider_config_added','network_bridge_added','frontend_intelligence_added']) if(m[flag] !== false) failures.push(flag+'_not_false');
  return {safe:failures.length===0, failures};
}
module.exports={evaluateCapabilityAction,assertNoForbiddenActivation};
