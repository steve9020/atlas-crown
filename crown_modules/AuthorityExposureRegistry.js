'use strict';
/**
 * RECONSTRUCTED STUB — fail-closed.
 *
 * The original AuthorityExposureRegistry.js lives in the author's full vault
 * and was not included in the narrow review packet. This stub exists only so
 * the packet is executable end-to-end for review purposes.
 *
 * Fail-closed semantics: zero capabilities are exposed, so
 * inspectCapability() always reports {found:false, allowed:false} and every
 * capability-gated action is denied. loadManifest() reports the safe flag
 * set, so assertNoForbiddenActivation() passes vacuously on an empty
 * capability set rather than on real manifest data.
 *
 * BEFORE EXTERNAL REVIEW: replace this file with the vault original.
 */
function inspectCapability(capabilityId){
  return Object.freeze({
    found:false,
    id:String(capabilityId==null?'':capabilityId),
    allowed:false,
    reason:'stub_registry_exposes_no_capabilities'
  });
}
function loadManifest(){
  return Object.freeze({
    _source:'RECONSTRUCTED STUB - fail-closed; replace with vault original before external review',
    capabilities:Object.freeze([]),
    no_ai_adapter_added:true,
    mock_ai_connected:false,
    real_ai_connected:false,
    provider_config_added:false,
    network_bridge_added:false,
    frontend_intelligence_added:false
  });
}
module.exports={inspectCapability,loadManifest};
