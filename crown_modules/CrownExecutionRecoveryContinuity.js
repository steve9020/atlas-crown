'use strict';
const crypto=require('crypto');
const SCHEMA='atlas.crown.execution-recovery.v1';
const ledger=new Map();
const digest=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');
const same=(a,b)=>String(a??'')===String(b??'');
const subset=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.every(x=>b.includes(x));
function createExecutionContract(i={}){
 const missing=[]; for(const k of ['transaction_id','execution_token','transition_id','target_id','target_version','validated_state_digest','intended_effect_digest','authorization_id']) if(!i[k]) missing.push(k);
 return Object.freeze({schema:SCHEMA,transaction_id:i.transaction_id||null,execution_token:i.execution_token||null,transition_id:i.transition_id||null,target:Object.freeze({id:i.target_id||null,version:i.target_version||null}),validated_state_digest:i.validated_state_digest||null,intended_effect_digest:i.intended_effect_digest||null,authorization_id:i.authorization_id||null,scope:Object.freeze([...(i.scope||[])]),status:missing.length?'UNKNOWN':'READY',missing:Object.freeze(missing),route_authority:false,output_authority:false});
}
function execute(contract,current={}){
 if(!contract||contract.schema!==SCHEMA||contract.status!=='READY') return Object.freeze({result:'UNKNOWN',reason:'contract_not_ready'});
 const prior=ledger.get(contract.execution_token);
 if(prior){
  // FIX (review 2026-09-18): the idempotent replay path must re-bind every
  // authority dimension recorded at first execution. Previously only
  // (transaction_id, intended_effect_digest, target) were compared, so a
  // replayed contract could silently widen scope or swap authorization.
  // Formal model Sec 12 is tightened accordingly: idempotence additionally
  // requires A_2 = A_1, H(V_2) = H(V_1), tau_2 = tau_1, and Sigma_2 ⊆ Sigma_1.
  const replayBad=[];
  if(!same(prior.transaction_id,contract.transaction_id)) replayBad.push('replay_transaction_mismatch');
  if(!same(prior.intended_effect_digest,contract.intended_effect_digest)) replayBad.push('replay_effect_mismatch');
  if(!same(prior.target.id,contract.target.id)||!same(prior.target.version,contract.target.version)) replayBad.push('replay_target_mismatch');
  if(!same(prior.transition_id,contract.transition_id)) replayBad.push('replay_transition_mismatch');
  if(!same(prior.authorization_id,contract.authorization_id)) replayBad.push('replay_authorization_mismatch');
  if(!same(prior.validated_state_digest,contract.validated_state_digest)) replayBad.push('replay_state_mismatch');
  if(!subset(contract.scope||[],prior.scope||[])) replayBad.push('replay_scope_widening');
  if(replayBad.length) return Object.freeze({result:'FAIL',reason:'execution_token_replay',replay_violations:Object.freeze(replayBad)});
  return Object.freeze({result:'PASS',idempotent:true,transaction_id:contract.transaction_id});
 }
 const checks=[['transition_id',contract.transition_id,current.transition_id],['target_id',contract.target.id,current.target_id],['target_version',contract.target.version,current.target_version],['authorization_id',contract.authorization_id,current.authorization_id],['validated_state_digest',contract.validated_state_digest,current.current_state_digest]];
 for(const [n,a,b] of checks) if(!same(a,b)) return Object.freeze({result:'FAIL',reason:`${n}_mismatch`});
 if(!subset(current.scope||[],contract.scope)) return Object.freeze({result:'FAIL',reason:'scope_widening'});
 const rec=Object.freeze({transaction_id:contract.transaction_id,intended_effect_digest:contract.intended_effect_digest,target:contract.target,transition_id:contract.transition_id,authorization_id:contract.authorization_id,validated_state_digest:contract.validated_state_digest,scope:Object.freeze([...(contract.scope||[])])}); ledger.set(contract.execution_token,rec);
 return Object.freeze({result:'PASS',idempotent:false,transaction_id:contract.transaction_id});
}
function createRecovery(contract,i={}){
 if(!contract||contract.schema!==SCHEMA) return Object.freeze({result:'UNKNOWN',reason:'original_transaction_missing'});
 if(!subset(i.scope||[],contract.scope)) return Object.freeze({result:'FAIL',reason:'recovery_scope_widening'});
 if(i.target_id&&!same(i.target_id,contract.target.id)||i.target_version&&!same(i.target_version,contract.target.version)) return Object.freeze({result:'FAIL',reason:'recovery_target_mismatch'});
 if(i.authorization_id&&!same(i.authorization_id,contract.authorization_id)) return Object.freeze({result:'FAIL',reason:'recovery_authorization_mismatch'});
 if(i.intended_effect_digest&&!same(i.intended_effect_digest,contract.intended_effect_digest)) return Object.freeze({result:'FAIL',reason:'recovery_effect_mismatch'});
 return Object.freeze({result:'PASS',original_transaction_id:contract.transaction_id,transition_id:contract.transition_id,target:contract.target,authorization_id:contract.authorization_id,scope:Object.freeze([...(i.scope||[])]),validated_state_digest:contract.validated_state_digest,intended_effect_digest:contract.intended_effect_digest,route_authority:false,output_authority:false});
}
function resetLedger(){ledger.clear();}
module.exports={SCHEMA,digest,createExecutionContract,execute,createRecovery,resetLedger};
