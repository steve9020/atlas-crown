const fs = require('fs');
const path = require('path');
const manifestPath = path.join(__dirname, 'AUTHORITY_EXPOSURE_CONTROL_VISIBILITY.json');
function loadManifest(){ return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
function listCapabilities(){ return loadManifest().capabilities.slice(); }
function getCapability(id){ return listCapabilities().find(c => c.id === id) || null; }
function inspectCapability(id){ const c=getCapability(id); if(!c) return {found:false, allowed:false, reason:'unknown_capability'}; return {found:true, ...c}; }
function summarizeExposure(){ const m=loadManifest(); return {package:m.package, status:m.status, capability_count:m.capabilities.length, hard_denials:m.hard_denials.slice(), no_ai_adapter_added:m.no_ai_adapter_added, network_bridge_added:m.network_bridge_added}; }
module.exports={loadManifest,listCapabilities,getCapability,inspectCapability,summarizeExposure};
