'use strict';
// APPROVAL SEAL — last-mile byte seal for outbound Moltbook content (2026-09-24, Steve's order).
//
// The rule: nothing posts that Steve (or a live standing order) did not
// approve — byte for byte, in this context. A sha256 digest is recorded at
// approval time; the send path re-checks at send time and REFUSES on any
// drift. This is the seal the adapter test demanded: the check lands on the
// final outbound bytes, at send time, not on the draft file.
//
// Usage:
//   recordApproval({ text, postId, parentId, by })   // at approval moment
//   recordWithdrawal({ digest, postId, parentId, by, reason }) // revoke a grant
//   checkBeforeSend({ text, postId, parentId })      // in api.js before send
//
// Fail closed: no matching approval record → do not post, bank the drifted
// bytes in seal-refusals.jsonl for Steve's review, throw.
//
// Revocation (2026-09-26): an approval is a grant, and a grant can be
// withdrawn. A withdrawal is its own ledger entry; the seal refuses any bytes
// whose LATEST ledger event for that (digest, postId, parentId) is a
// withdrawal — a revoked grant can never pass the byte check. Re-approving
// the same bytes after a withdrawal works: the new approval is the latest
// event and the seal passes again.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LEDGER = process.env.APPROVALS_LEDGER || path.join(__dirname, 'approvals.jsonl');
const REFUSALS = path.join(__dirname, 'seal-refusals.jsonl');

function digest(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

// Called at the approval moment: Steve says "Post" (word-for-word path), or
// the bundle is assembled under a live standing order (reply/door doctrine).
function recordApproval(o) {
  if (!o || typeof o.text !== 'string' || !o.text) throw new Error('recordApproval: text required');
  if (!o.postId) throw new Error('recordApproval: postId required');
  const rec = {
    type: 'approval',
    digest: digest(o.text),
    bytes: String(o.text).length,
    postId: o.postId,
    parentId: o.parentId || null,
    by: o.by || 'unknown',
    at: new Date().toISOString(),
    // EXCEPTION-EXERCISE (2026-10-02 — umiXBT's fold, proven sweep-1900): the
    // record carries whether the exception was exercised — granted,
    // presented, presented_and_denied, exercised, exercised_outcome_unknown.
    // The practical test: revoke a never-used exception vs a used one — the
    // audit trail must distinguish them.
    exercise: 'granted'
  };
  fs.appendFileSync(LEDGER, JSON.stringify(rec) + '\n');
  return rec;
}

function readLedger() {
  let lines = [];
  try { lines = fs.readFileSync(LEDGER, 'utf8').split('\n').filter(s => s.trim()); } catch (e) { /* no ledger yet */ }
  return lines.map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
}

// Revoke a grant: Steve changes his mind before the bytes go out. The
// withdrawal names the exact approval it revokes (digest + post + parent);
// the seal consults the ledger at send time and a withdrawn grant refuses.
// EXCEPTION-EXERCISE: the withdrawal cites the exercise state at revocation
// time — a revoked-never-used grant reads differently from a revoked-used one.
function recordWithdrawal(o) {
  if (!o || !o.digest || !/^[0-9a-f]{64}$/.test(String(o.digest))) throw new Error('recordWithdrawal: digest required');
  if (!o.postId) throw new Error('recordWithdrawal: postId required');
  const rec = {
    type: 'withdrawal',
    digest: String(o.digest),
    postId: o.postId,
    parentId: o.parentId || null,
    by: o.by || 'unknown',
    reason: o.reason || null,
    at: new Date().toISOString(),
    exerciseAtWithdrawal: lastExercise({ digest: String(o.digest), postId: o.postId, parentId: o.parentId || null })
  };
  fs.appendFileSync(LEDGER, JSON.stringify(rec) + '\n');
  return rec;
}

// EXCEPTION-EXERCISE lifecycle events. The ledger is append-only; exercise
// rows never affect the seal decision (checkBeforeSend consults only
// approval/withdrawal rows). Binds the exception generation (the approval
// event: by/at), the action digest, the target, and — for unknown outcomes —
// the reconciliation obligation.
const EXERCISE_STATES = ['granted', 'presented', 'presented_and_denied', 'exercised', 'exercised_outcome_unknown'];

function recordExercise(o) {
  if (!o || !o.digest || !/^[0-9a-f]{64}$/.test(String(o.digest))) throw new Error('recordExercise: digest required');
  if (!o.postId) throw new Error('recordExercise: postId required');
  if (EXERCISE_STATES.indexOf(o.exercise) < 0) throw new Error('recordExercise: unknown exercise state ' + o.exercise);
  const rec = {
    type: 'exercise',
    digest: String(o.digest),
    postId: o.postId,
    parentId: o.parentId || null,
    exercise: o.exercise,
    note: o.note || null,
    reconcile: o.reconcile || null,
    at: new Date().toISOString()
  };
  fs.appendFileSync(LEDGER, JSON.stringify(rec) + '\n');
  return rec;
}

function lastExercise(o) {
  const rows = readLedger().filter(r => r.digest === o.digest && r.postId === o.postId && (r.parentId || null) === (o.parentId || null));
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].type === 'exercise') return rows[i].exercise;
    if (rows[i].type === 'approval') return 'granted';
  }
  return null;
}

// Called at send time, on the final bytes about to go to the wire.
function checkBeforeSend(o) {
  const text = String(o && o.text !== undefined ? o.text : '');
  const postId = o && o.postId;
  const parentId = (o && o.parentId) || null;
  const want = digest(text);
  const events = readLedger()
    .filter(r => (r.type === 'approval' || r.type === 'withdrawal') &&
                 r.digest === want && r.postId === postId && (r.parentId || null) === parentId);
  const last = events.pop();
  if (last && last.type === 'approval') {
    // EXCEPTION-EXERCISE: the grant was presented at the gate. Exercise
    // logging must never break the gate — failures are swallowed here.
    try { recordExercise({ digest: want, postId: postId, parentId: parentId, exercise: 'presented' }); } catch (e) {}
    return { ok: true, approval: last };
  }
  const reason = last
    ? 'approval WITHDRAWN at ' + last.at + ' by ' + last.by + (last.reason ? ': ' + last.reason : '') +
      ' — re-approval required before these bytes can send'
    : 'no matching approval: digest ' + want.slice(0, 16) + '… (' + text.length + ' bytes), post ' + postId;
  try { recordExercise({ digest: want, postId: postId, parentId: parentId, exercise: 'presented_and_denied', note: reason.slice(0, 200) }); } catch (e) {}
  // Bank the refused bytes for Steve's review — drift is evidence, not trash.
  try {
    fs.appendFileSync(REFUSALS, JSON.stringify({
      type: 'refusal', at: new Date().toISOString(), reason: reason,
      digest: want, bytes: text.length, postId: postId, parentId: parentId,
      text: text.slice(0, 8000)
    }) + '\n');
  } catch (e) { /* banking must never break the refusal */ }
  return { ok: false, reason: reason };
}

module.exports = { recordApproval, recordWithdrawal, recordExercise, lastExercise, checkBeforeSend, digest, LEDGER, REFUSALS };
