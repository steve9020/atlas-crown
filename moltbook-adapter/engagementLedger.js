'use strict';
// ENGAGEMENT LEDGER — sweep↔heartbeat deconfliction (2026-09-30, Steve's word:
// "The rest waiting on my word let's resolve it").
//
// The defect: the 2230 double-reply — heartbeat and sweep answered the same 8
// comments. The digest pre-flight only stands down on IDENTICAL bytes; a
// different reply to the same parent from the other lane sailed through.
// Convention ("one reply per post max") proved broken as a mechanism.
//
// The mechanism: every write claims its (postId, parentId) engagement key at
// the execution moment (inside api._seal — the one choke point every comment
// and post write passes through, canonical script and legacy scripts alike).
// Earliest claim wins; a later claim with different bytes REFUSES. Claim,
// conflict-check, and settle all live here; the ledger is append-only JSONL
// (crash-safe, same convention as approvals.jsonl).
//
// Keying: (postId, parentId). A reply to a post is (postId, null); a reply to
// a comment is (postId, commentId). A follow-up answer to a NEW comment is a
// new key — never blocked by the old one. A direct reply to Atlas's own
// comment keys on Atlas's comment id, which never appears as OUR parentId —
// the answer-back rule can't false-conflict with itself.
//
// Statuses: intent → sent | failed | unknown | stood_down.
//   intent      — claimed at the execution moment, write in flight.
//   sent        — write confirmed (digest read-back or platform receipt + verify).
//   failed      — write provably did not land; the key is free (reply still due).
//   unknown     — ambiguous outcome (timeout / lost receipt); BLOCKS the key
//                 until a worker resolves it to sent or failed via fresh
//                 listing. Fail closed: an unknown write may have landed.
//   stood_down  — lost a claim race, or the send was refused after claiming.
//
// TRUTH BOUNDARY (2026-10-01 — bytes's finding, proven sweep-0300: "The
// Immutable Ledger is Just a High-Fidelity Lie"). Trialed against this
// ledger: it orders claims and prevents double-sends — it does NOT certify
// that any claim was true. Consistency is the absence of immediate
// contradiction, not truth. A perfect record of a corrupted first sample is
// still a perfect record of a lie. This ledger guarantees WHICH claim won
// the race; the truth of a claim is proven elsewhere, never here.
//
// Conflict rule (checked on every claim):
//   - same key, latest status sent|unknown, any digest        → CONFLICT
//     (same digest + sent is a dup; different digest is the 2230 double)
//   - same key, latest status intent, different digest,
//     intent younger than ORPHAN_MS, and the rival claim sorts earlier
//     (by at, then digest hex — deterministic)                → CONFLICT
//   - same key, latest status failed|stood_down (any digest)  → no conflict
//   - same key+digest, latest status intent (our own re-claim on retry,
//     or a live duplicate fire)                               → no conflict
//   - rival intent older than ORPHAN_MS                       → treated as failed
//     (the claiming worker died; the key must not stay blocked forever)
//   - veto: his word overrides (grantScope 'direct' — the seal-verified grant
//     scope, never a lane string), but the row names the overridden rival
//     (his veto over all — auditable, never silent).
//
// Concurrency: two processes can interleave check-then-claim. The protocol is
// append-intent → re-read → earliest-wins. A later checker ALWAYS sees the
// earlier claim (it re-reads after appending), so races resolve
// deterministically; only a same-millisecond tie needs the digest tie-break.
// Same-host clock skew is negligible; cross-host was never a supported shape.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LEDGER_PATH = process.env.ENGAGEMENT_LEDGER_PATH ||
  path.join(__dirname, 'engagement-ledger.jsonl');
// An intent whose worker never settled: dead claim, not a live engagement.
const ORPHAN_MS = 30 * 60 * 1000;

function laneOf(by) {
  const s = String(by || '');
  // 2026-10-01 (V1, adapter red-team): the old code prefix-matched
  // /^steve-direct/i here and minted the VETO lane from it — any worker
  // `by` starting with 'steve-direct' (a typo like 'steve-directive-x')
  // inherited his override power with no operator check. The veto no longer
  // binds to a lane string at all: it binds to the grant scope the seal
  // verified (claimEngagement's grantScope). laneOf is now pure attribution.
  if (/^steve-word/i.test(s)) return 'steve-direct';
  if (/^sweep/i.test(s)) return 'sweep';
  if (/^hb/i.test(s) || /heartbeat/i.test(s)) return 'heartbeat';
  return 'other:' + s.slice(0, 32);
}

const DIGEST_RE = /^[0-9a-f]{64}$/;

function readRows() {
  let lines = [];
  try { lines = fs.readFileSync(LEDGER_PATH, 'utf8').split('\n').filter(s => s.trim()); }
  catch (e) { /* no ledger yet — first claim creates it */ }
  return lines.map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
}

function appendRow(row) {
  const full = Object.assign({ at: new Date().toISOString() }, row);
  fs.appendFileSync(LEDGER_PATH, JSON.stringify(full) + '\n');
  return full;
}

const keyOf = (postId, parentId) => String(postId) + '|' + String(parentId || '');

// NEW-CHAIR 3-CHAIR CAP (Steve's word 2026-10-01 ~20:21 EDT, refined ~20:25:
// "3 chairs that the ghosts cycle through" — not 3/day, three chairs total
// per post from here forward. "They sit and confess. They stand until
// they're heard.")
// Top-level claims (parentId null) are new chairs. The old rule let one sent
// group block the key forever (1-ever). The standing order is 3 new chairs
// per post; pre-rule top-level sends are grandfathered (they went out under
// his explicit word / the old shape) — only post-rule chairs count.
// Public per his word 2026-10-01 ~20:21 EDT ("keep that public as well").
const NEW_CHAIR_CAP = 3;
const NEW_CHAIR_RULE_START = '2026-10-02T00:21:00.000Z'; // his word, 2026-10-01 ~20:21 EDT

// Count post-rule new chairs on a post: top-level groups whose latest status
// is sent|unknown (a live chair — fail closed) and whose latest row is at or
// after the rule start. 'unknown' counts because the 201 may have landed;
// if it later settles 'failed', groupsByKey's latest flips and it drops out.
function countPostRuleChairs(rows, postId) {
  const groups = groupsByKey(rows, postId, null, null);
  let n = 0;
  for (const g of groups) {
    const st = g.latest.status;
    if ((st === 'sent' || st === 'unknown') && String(g.latest.at) >= NEW_CHAIR_RULE_START) n++;
  }
  return n;
}

// Latest status per (key, digest) group — the ledger is append-only, so the
// current state of a claim is its newest row.
function groupsByKey(rows, postId, parentId, excludeClaimId) {
  const key = keyOf(postId, parentId);
  // A claim that lost its race is fully neutralized: its intent row must not
  // linger as a blocking claim. stood_down rows name the loser's claimId.
  const deadClaims = new Set();
  for (const r of rows) {
    if (r.status === 'stood_down' && r.claimId) deadClaims.add(r.claimId);
  }
  const g = new Map();
  for (const r of rows) {
    if (excludeClaimId && r.claimId === excludeClaimId) continue; // our own just-appended intent
    // stood_down rows are annotations on a lost race, not state transitions:
    // the loser never engaged, so its rows must not overwrite the winner's
    // group state (a dup-attempt's stood_down must not hide a prior 'sent'),
    // and a lost intent must not linger as a live blocking claim.
    if (r.status === 'stood_down') continue;
    if (r.status === 'intent' && r.claimId && deadClaims.has(r.claimId)) continue;
    if (keyOf(r.postId, r.parentId) !== key) continue;
    const gk = key + '|' + String(r.digest);
    const prev = g.get(gk);
    if (!prev || String(r.at) >= String(prev.latest.at)) {
      g.set(gk, { digest: String(r.digest), latest: r, firstAt: prev ? prev.firstAt : r.at });
    }
  }
  return [...g.values()];
}

function isOrphan(group, now) {
  return group.latest.status === 'intent' &&
    (now - new Date(group.latest.at).getTime()) > ORPHAN_MS;
}

// Returns {ok:true, row} or {ok:false, why, winner}
function claimEngagement(o) {
  // 2026-10-01 (B1/B2, adapter red-team): validate the claim shape LOUDLY.
  // A positional call claimEngagement(a, b) used to append junk rows on key
  // 'undefined|'; a missing digest coerced to the string 'undefined' and
  // bound the REAL key for 30 minutes. Both now throw before any row lands.
  if (!o || typeof o !== 'object' || Array.isArray(o)) {
    throw new TypeError('LEDGER CLAIM REJECTED: claimEngagement takes one object {postId, parentId, digest, lane} — got ' +
      (Array.isArray(o) ? 'array' : String(o === null ? 'null' : typeof o)));
  }
  if (!o.postId || typeof o.postId !== 'string') {
    throw new TypeError('LEDGER CLAIM REJECTED: postId is required (non-empty string)');
  }
  if (!DIGEST_RE.test(String(o.digest || ''))) {
    throw new TypeError('LEDGER CLAIM REJECTED: digest must be a 64-char sha256 hex string — got ' +
      JSON.stringify(String(o.digest)).slice(0, 40));
  }
  const postId = o.postId, parentId = o.parentId || null, dg = String(o.digest);
  const lane = o.lane || 'other:';
  const now = Date.now();
  const claimId = crypto.randomUUID();
  const row = appendRow({ type: 'engagement', status: 'intent', claimId, lane, postId, parentId, digest: dg });
  // Rival computation EXCLUDES our own just-appended row: without this, our
  // intent would overwrite the group's latest state and hide a prior 'sent'
  // (the dup case). Re-claims of our own live intent still pass — same digest
  // + status intent is never a rival.
  const groups = groupsByKey(readRows(), postId, parentId, claimId);

  const rivals = [];
  const isTopLevel = (parentId === null);
  for (const g of groups) {
    if (g.digest === dg) {
      // Same bytes: only a 'sent' is a rival (dup). Our own live intent is
      // the retry path — never a rival to itself.
      if (g.latest.status === 'sent') rivals.push({ g, kind: 'already-sent' });
      continue;
    }
    const st = g.latest.status;
    if (st === 'failed' || st === 'stood_down') continue;
    if (st === 'intent' && isOrphan(g, now)) continue; // dead claim
    if (isTopLevel && (st === 'sent' || st === 'unknown')) {
      // New-chair 3-chair cap (not 1-ever): post-rule chairs are counted,
      // not rivals. Pre-rule sent groups are grandfathered — they neither
      // count nor block. A live intent still races (earliest-wins below).
      continue;
    }
    if (st === 'intent' || st === 'sent' || st === 'unknown') rivals.push({ g, kind: st });
  }

  // 3-chair cap enforcement for new chairs.
  if (isTopLevel && countPostRuleChairs(readRows(), postId) >= NEW_CHAIR_CAP) {
    appendRow({ type: 'engagement', status: 'stood_down', claimId, lane, postId, parentId, digest: dg,
      lostTo: 'NEW_CHAIR_CAP_REACHED ' + NEW_CHAIR_CAP + '/' + NEW_CHAIR_CAP });
    return {
      ok: false,
      why: 'NEW_CHAIR_CAP_REACHED: post ' + String(postId).slice(0, 18) + '… already has ' +
        NEW_CHAIR_CAP + ' new chairs since ' + NEW_CHAIR_RULE_START +
        ' (cap ' + NEW_CHAIR_CAP + '/post) — the ghosts stand until a chair frees'
    };
  }

  if (!rivals.length) return { ok: true, row };

  // VETO CLOSED (Steve's word 2026-10-01 ~17:55 EDT — "my name isn't used
  // for veto"): no grant scope overrides a live rival, ever. grantCheck no
  // longer issues scope 'direct'; a stale caller passing grantScope
  // 'direct' falls through to the normal earliest-wins logic below — fail
  // closed, never an override. The veto branch that lived here overrode
  // occupied keys on a steve-word by-line; that was the machine minting his
  // name into authority. Removed, not bypassed.

  // Any live rival predates our claim by construction (our own row is excluded
  // from the groups above, and every other row was appended before it — file
  // order IS time order, even within the same millisecond). So any rival at
  // all means we lost the race: earliest claim wins, no timestamp comparison
  // needed (the comparison was a same-millisecond hole: rk == mineKey read as
  // "we win" when the rival was in fact first). The earliest rival is named as
  // the winner for the message.
  let earliest = null;
  for (const r of rivals) {
    const rk = String(r.g.firstAt) + '|' + r.g.digest;
    if (!earliest || rk < earliest.rk) earliest = { rk, r };
  }
  if (earliest) {
    // The stood_down row carries our claimId so the lost intent is fully
    // neutralized in state computation (it must not linger as a blocker).
    appendRow({ type: 'engagement', status: 'stood_down', claimId, lane, postId, parentId, digest: dg,
      lostTo: earliest.r.g.latest.lane + '@' + earliest.r.g.latest.at });
    const w = earliest.r.g.latest;
    return {
      ok: false,
      winner: { lane: w.lane, at: w.at, digest: String(w.digest).slice(0, 16) },
      why: 'engagement key ' + keyOf(postId, parentId).slice(0, 18) + '… already ' +
        earliest.r.kind + ' by ' + w.lane + ' at ' + w.at +
        ' (digest ' + String(w.digest).slice(0, 8) + '… vs ours ' + dg.slice(0, 8) + '…)'
    };
  }
  return { ok: true, row };
}

const SETTLEABLE = new Set(['intent', 'unknown']);
const SETTLE_TO = new Set(['sent', 'failed', 'unknown']);

// Read-only occupancy peek for the climbing retarget (2026-10-01, Steve's
// word): is this (postId, parentId) key currently occupied by a live
// engagement? Mirrors the rival semantics of claimEngagement WITHOUT
// appending any row: 'sent', 'unknown', or live (non-orphan) 'intent' groups
// occupy; 'failed' and orphaned intents do not. The retarget climbs past
// occupied anchors instead of stacking — it never writes, so it can never
// race; the execution-time claim remains the authority (a lost race still
// stands down via LEDGER_CONFLICT).
function keyOccupied(postId, parentId) {
  const now = Date.now();
  const rows = readRows();
  if ((parentId || null) === null) {
    // New-chair semantics mirror claimEngagement: a top-level key is occupied
    // only while a live claim is racing or the 3-chair cap is reached.
    // Grandfathered pre-rule chairs neither count nor occupy.
    const groups = groupsByKey(rows, postId, null, null);
    for (const g of groups) {
      if (g.latest.status === 'intent' && !isOrphan(g, now)) return true;
    }
    return countPostRuleChairs(rows, postId) >= NEW_CHAIR_CAP;
  }
  const groups = groupsByKey(rows, postId, parentId, null);
  for (const g of groups) {
    const st = g.latest.status;
    if (st === 'failed' || st === 'stood_down') continue;
    if (st === 'intent' && isOrphan(g, now)) continue;
    if (st === 'intent' || st === 'sent' || st === 'unknown') return true;
  }
  return false;
}

function settleEngagement(o) {
  // 2026-10-01 (C1/C2, adapter red-team): a settle must attach to a REAL
  // claim. The old code banked any digest with no linkage: a fabricated
  // 'sent' on a never-engaged key blocked legitimate claims, and a race
  // loser could resurrect its lost claim as 'sent' and block even the
  // winner's retry. Now the (key, digest) group must exist with latest
  // status 'intent' (live — not orphaned, not stood_down) or 'unknown'
  // (awaiting worker resolution via fresh listing). Anything else throws
  // before any row lands. Callers already treat settle as banking: it must
  // never break the verdict, so this throws LOUD for bugs and stays silent
  // past the callers' try/catch.
  if (!o || typeof o !== 'object' || Array.isArray(o)) {
    throw new TypeError('LEDGER SETTLE REJECTED: settleEngagement takes one object');
  }
  if (!SETTLE_TO.has(o.status)) {
    throw new TypeError('LEDGER SETTLE REJECTED: status must be sent|failed|unknown — got ' +
      JSON.stringify(o.status));
  }
  if (!o.postId || typeof o.postId !== 'string') {
    throw new TypeError('LEDGER SETTLE REJECTED: postId is required (non-empty string)');
  }
  if (!DIGEST_RE.test(String(o.digest || ''))) {
    throw new TypeError('LEDGER SETTLE REJECTED: digest must be a 64-char sha256 hex string');
  }
  const postId = o.postId, parentId = o.parentId || null, dg = String(o.digest);
  const groups = groupsByKey(readRows(), postId, parentId, null);
  const g = groups.find(x => x.digest === dg);
  if (!g) {
    throw new Error('LEDGER SETTLE REJECTED: no claim for key ' + keyOf(postId, parentId).slice(0, 18) +
      '… digest ' + dg.slice(0, 8) + '… — a settle must attach to a real claim');
  }
  const st = g.latest.status;
  if (!SETTLEABLE.has(st) || (st === 'intent' && isOrphan(g, Date.now()))) {
    throw new Error('LEDGER SETTLE REJECTED: claim for digest ' + dg.slice(0, 8) + '… is ' + st +
      (st === 'intent' ? ' (orphaned)' : '') + ' — not settleable');
  }
  return appendRow({ type: 'engagement', status: o.status, lane: o.lane || 'other:',
    postId, parentId, digest: dg, commentId: o.commentId || null, note: o.note || null });
}

module.exports = { claimEngagement, settleEngagement, laneOf, keyOccupied, LEDGER_PATH, ORPHAN_MS,
  NEW_CHAIR_CAP, NEW_CHAIR_RULE_START, countPostRuleChairs };
