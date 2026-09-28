'use strict';
// GRANT CHECK — send-time re-verification of the LIVE grant (2026-09-28).
// Closes the TOCTOU revocation race lightningzero proved against our own
// pipeline (sweep-0700 6a44c4bc, banked as build item a; Steve's word
// "Fix it" 2026-09-28 ~08:09 EDT): the send path verified bytes and depth
// at send time but never re-verified the grant between approval and send.
// The approval seal answers "was this exact approval recorded" (fidelity);
// this answers "is the grant that authorized it still live" (model).
//
// Authority lives OUTSIDE the agent-writable tree:
//   ~/.config/moltbook/authority.json   (operator-held, mode 0600 dir)
// The worker reads it; only Steve's word (via the main turn) writes it.
// Absent / unreadable / malformed → REFUSE (fail closed). A grant that
// cannot be verified live is not a live grant.
//
// Scopes:
//   'direct'   — by starts with 'steve-word': his direct word in the
//                session. Always live; its revocation path is the approval
//                ledger's recordWithdrawal (per-bytes), which the seal
//                already honors at send time.
//   'standing' — everything else (sweep-proven, heartbeat, auto, unknown):
//                requires standing_grants.autonomous_posting.state 'live'.
// A global stand_down:true refuses every scope. Case record: the 2026-09-27
// disconnect order — approvals recorded before a stand-down must not
// execute after it.
//
// Sibling-relative require: required from api.js via
// path.join(__dirname, 'grantCheck.js'). Never absolute paths for the
// module itself; the AUTHORITY path is intentionally absolute — it is
// operator-held state, not tree state (same pattern as api.js CRED_PATH).
const fs = require('fs');
const path = require('path');

function authorityPath() {
  // GRANT_AUTHORITY_PATH is a TEST-ONLY seam (lets the refusal path be
  // exercised without touching the live operator file). Production code
  // never sets it.
  if (process.env.GRANT_AUTHORITY_PATH) return process.env.GRANT_AUTHORITY_PATH;
  return path.join(process.env.HOME || '', '.config', 'moltbook', 'authority.json');
}

function readAuthority() {
  const p = authorityPath();
  const raw = fs.readFileSync(p, 'utf8');
  const j = JSON.parse(raw);
  if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('authority.json is not an object');
  return { path: p, doc: j };
}

function scopeFor(by) {
  return (/^steve-word/.test(String(by || ''))) ? 'direct' : 'standing';
}

// checkLiveGrant({ by }) -> { ok:true, scope, grant } | { ok:false, reason }
function checkLiveGrant(o) {
  const by = (o && o.by) || 'unknown';
  const scope = scopeFor(by);
  let auth;
  try {
    auth = readAuthority();
  } catch (e) {
    return { ok: false, scope: scope, reason: 'GRANT_STATE_UNREADABLE: ' + e.message + ' — refusing (fail closed: an unverifiable grant is not a live grant)' };
  }
  const doc = auth.doc;
  if (doc.stand_down === true) {
    return { ok: false, scope: scope, reason: 'STAND_DOWN: operator stand-down is live — no send executes on a stale grant (case: 2026-09-27 disconnect order)' };
  }
  if (scope === 'standing') {
    const g = doc.standing_grants && doc.standing_grants.autonomous_posting;
    const state = g && g.state;
    if (state !== 'live') {
      return { ok: false, scope: scope, reason: 'GRANT_NOT_LIVE: standing grant autonomous_posting is ' + JSON.stringify(state) + ' — re-grant required before standing sends execute' };
    }
    return { ok: true, scope: scope, grant: { state: state, since: g.since || null } };
  }
  return { ok: true, scope: scope, grant: { state: 'direct-word' } };
}

module.exports = { checkLiveGrant, readAuthority, scopeFor, authorityPath };
