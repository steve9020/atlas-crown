'use strict';
// SEND-APPROVED-REPLY — the ONE canonical outbound send path for Atlas Moltbook replies.
// Steve's order 2026-09-26 ~19:45 EDT ("Word"): every worker hand-rolled its own send
// script, and a .trim() in one of them silently voided a live approval (2026-09-26 01:18
// seal refusal, digest 56801c2a — 1575 bytes sent against a 1576-byte approval).
//
// The rule this script enforces by construction: the bytes approved are the bytes read
// are the bytes sealed are the bytes sent. No trim, no retype, no normalization, ever.
// Approval recording (optional) happens on the same in-memory string that goes to the
// wire, so drift is impossible.
//
// Usage:
//   node send-approved-reply.js --draft-file <path> --post-id <uuid>
//     [--parent-id <uuid>] [--by <approver>] [--upvote-post] [--upvote-comment <uuid>]
//     [--result-out <path>] [--send-timeout-ms <n>] [--recover]
// Env: MOLTBOOK_WRITES=1 actually sends. Anything else = dry run (seal pre-check +
// engagement pre-flight only, no write, no ledger row).
//
// Exit codes: 0 ok (LANDED / DRY_RUN_OK / STAND_DOWN), 2 SEAL_REFUSED, 3 SEND_FAILED
// (the platform gave NO publish confirmation and nothing is visible — the reply is
// genuinely still due), 4 AMBIGUOUS — outcome unverified: PUBLISH_CONFIRMED (the
// platform answered 201 published:true but the digest missed the 45s read-back
// window — listing lag runs minutes; confirm with a FRESH listing, never re-send
// blind) or the send threw with nothing visible. On 4: fresh-list before any
// retry; never blind-retry. (Patched 2026-09-27: 12/12 false SEND_FAILED alarms
// in one night — a 201 IS the platform's publish confirmation; the old verdict
// lied about "no publish confirmation".)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// Sibling-relative requires: this file runs both as the live adapter copy and
// as the repo copy (moltbook-adapter/ in atlas-crown). Never absolute paths.
const { api } = require(path.join(__dirname, 'api.js'));
const { recordApproval, checkBeforeSend, recordExercise, digest } = require(path.join(__dirname, 'approvalSeal.js'));
const { checkLiveGrant } = require(path.join(__dirname, 'grantCheck.js'));
const { settleEngagement, laneOf, keyOccupied, LEDGER_PATH } = require(path.join(__dirname, 'engagementLedger.js'));

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
const has = (name) => process.argv.indexOf('--' + name) >= 0;

const DRAFT_FILE = arg('draft-file');
const POST_ID = arg('post-id');
const PARENT_ID = arg('parent-id') || null;
const BY = arg('by') || null;
const UPVOTE_POST = has('upvote-post');
const UPVOTE_COMMENT = arg('upvote-comment') || null;
const RESULT_OUT = arg('result-out') || null;
// --answered-author: for below-listing targets (depth-6 notes absent from the
// tree). The worker passes the deepest VISIBLE ancestor as --parent-id (the
// fail-closed PARENT_NOT_FOUND rule is never weakened), and this names the
// true addressee in the pointer instead of the visible ancestor's author.
// Effective only when a retarget fires; recorded in the result either way.
const ANSWERED_AUTHOR = (arg('answered-author') || '').replace(/^@/, '') || null;
const SEND_TIMEOUT_MS = parseInt(arg('send-timeout-ms') || '90000', 10);
// TIMEOUT-SPLIT-BUDGET (2026-10-02 — pompomemi's fold, proven sweep-1900):
// the kill timeout (SEND_TIMEOUT_MS) and the slow-success budget are separate
// ceilings. A send that succeeds slower than SEND_SLOW_MS is pace:'slow_ok' —
// a slow success must never page like a stuck loop. SEND_SLOW_MS is
// borrowed_bench; remeasure under beat concurrency.
const SEND_SLOW_MS = parseInt(arg('send-slow-ms') || '30000', 10); // provenance: borrowed_bench — remeasure
const WRITES = process.env.MOLTBOOK_WRITES === '1';
// --recover: legacy flag, now a no-op (kept for compatibility). Since
// 2026-09-26 ~21:30 EDT (Steve's order: no limit on engagement) the normal
// pre-flight is digest-level: it stands down only if THESE exact bytes are
// already present (listing lag). A different Atlas reply on the post is not
// a dup. Everything else — verbatim bytes, seal, timeout, read-backs,
// dedupe-check — is unchanged.
const RECOVER = has('recover');

const result = { at: new Date().toISOString(), writes: WRITES, postId: POST_ID, parentId: PARENT_ID };

function finish(code) {
  // Attempt ledger (2026-09-27 — ummon_core's denominator finding, proven-lane
  // enactment sweep-2030): our per-send audit counted only sends that reached
  // a ledger (approvals, seal refusals). A client-aborted POST left no
  // structured trace — the observer reported what reached it, not what was
  // attempted. Every invocation now banks one attempt row keyed on the
  // attempt, whatever the verdict: approved, refused, sent, aborted, unknown.
  // Logging must never break the send.
  try {
    fs.appendFileSync(path.join(__dirname, 'send-attempts.jsonl'), JSON.stringify({
      at: result.at, writes: result.writes, postId: result.postId, parentId: result.parentId,
      digest: result.digest || null, bytes: result.bytes || null, by: BY || null,
      verdict: result.verdict || null, sealOk: result.seal ? result.seal.ok : null,
      reasonClass: result.reason_class || null, recoveryContract: result.recovery_contract || null,
      authorityEpoch: result.authority_epoch || null, error: result.error || null,
      sendPublished: result.send ? !!result.send.published : null,
      sendStatus: result.send ? (result.send.status || null) : null,
      sendThrew: result.sendThrew || null,
      upvotes: (result.upvotes || []).map(u => ({ target: u.target, ok: u.ok, status: u.status || null }))
    }) + '\n');
  } catch (e) { /* attempt logging must never break the send */ }
  const out = JSON.stringify(result, null, 2);
  if (RESULT_OUT) fs.writeFileSync(RESULT_OUT, out + '\n');
  else console.log(out);
  process.exit(code);
}
function fail(verdict, code, extra) {
  result.verdict = verdict;
  if (extra) result.error = String(extra && extra.message || extra);
  // REFUSAL RECEIPT (2026-10-01 — clawlogic's finding, proven sweep-0300: "a
  // denial without a recovery contract is not an audit-complete refusal").
  // Trialed against our own machinery: send-attempts.jsonl rows carried the
  // reason class (verdict) but no authority epoch and no recovery contract —
  // exactly the hole clawlogic named. Every refusal now banks a receipt with
  // all three: the reason class, the authority epoch (the approval that
  // authorized the attempt: by/at/digest — or the draft digest the seal
  // checked, when no approval was recorded), and the recovery contract naming
  // the ONLY permitted next step. A refused attempt is never re-fired blind.
  const reasonClass = String(verdict || '').split(':')[0];
  result.reason_class = reasonClass;
  result.authority_epoch = result.approval
    ? { by: result.approval.by, at: result.approval.at, digest: result.approval.digest }
    : { by: null, at: null, digest: result.digest || null, note: 'no approval recorded — epoch is the draft digest the seal checked' };
  result.recovery_contract = RECOVERY_CONTRACTS[reasonClass] || RECOVERY_CONTRACTS.DEFAULT;
  finish(code);
}
// The only permitted next step per refusal reason class. A refusal names its
// own way back; anything not listed on the contract is a bypass, not a retry.
const RECOVERY_CONTRACTS = {
  SEAL_REFUSED: 'abort: never re-fire these bytes. Fix the drift at the source, re-approve fresh bytes, open a new attempt.',
  SEAL_REFUSAL_AT_EXECUTION: 'abort: authorization revoked between check and send. Do not re-fire. Re-approve on a fresh read and open a new attempt.',
  PARENT_NOT_FOUND: 'abort: re-resolve the parent in a fresh listing, re-approve against the live tree, open a new attempt.',
  PARENT_TOO_DEEP: 'abort: the tree is too deep for a top-level draft. Re-scope the draft and re-approve.',
  LEDGER_CONFLICT: 'abort: the other engagement stands. Re-triage, do not re-fire.',
  RATE_LIMITED: 'wait-for-epoch: wait out the server Retry-After, then re-fire the SAME bytes once. One retry, never hammering.',
  SEND_FAILED: 'read-back-first: fresh listing for the digest; re-fire only on confirmed absence, never on a lost receipt.',
  DRAFT_READ_FAILED: 'abort: fix the invocation (draft path unreadable). Re-approve; no retry of the same bytes.',
  DRAFT_EMPTY: 'abort: the draft is empty. Re-approve real bytes.',
  ARG_ERROR: 'abort: fix the invocation. Re-approve; no retry.',
  DEFAULT: 'abort: human review. No re-fire without a fresh approval on fresh bytes.'
};
function walkComments(cs, fn) {
  for (const c of (cs || [])) { fn(c); if (c.replies) walkComments(c.replies, fn); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fetchFullTree (2026-10-01 — pagination-gap repair, trialed read-only on
// post 482bd192: the single-page limit-50 fetch missed parent 585713ad at
// top-level index 52 and fired PARENT_NOT_FOUND; the paginated walk found it
// at depth 2 via chain 7f0bbbba → 3401cd52 → 585713ad). Follows next_cursor
// until exhausted; capped at 20 pages against runaway. Inter-page sleep per
// the no-hammering order. Read-only.
async function fetchFullTree(postId) {
  const all = [];
  let cursor = null, pages = 0;
  do {
    const r = await api.comments(postId, { limit: 50, cursor });
    const list = (r.data && r.data.comments) || [];
    all.push(...list);
    pages++;
    cursor = (r.data && r.data.next_cursor) || null;
    if (cursor) await sleep(1200);
  } while (cursor && pages < 20);
  return { comments: all, pages };
}

(async () => {
  if (!DRAFT_FILE || !POST_ID) fail('ARG_ERROR: --draft-file and --post-id required', 3);

  // 1. Read the draft bytes VERBATIM. No trim, no normalization — ever.
  let text;
  try { text = fs.readFileSync(DRAFT_FILE, 'utf8'); }
  catch (e) { fail('DRAFT_READ_FAILED', 3, e); return; }
  if (!text) fail('DRAFT_EMPTY', 3);
  result.bytes = text.length;
  result.digest = digest(text);

  // 2. Optional: record the approval on THE SAME bytes about to send.
  if (BY) {
    try {
      const rec = recordApproval({ text, postId: POST_ID, parentId: PARENT_ID, by: BY });
      result.approval = { digest: rec.digest.slice(0, 16) + '…', by: rec.by, at: rec.at };
    } catch (e) { fail('APPROVAL_RECORD_FAILED', 3, e); return; }
  }

  // 3. Pre-flight: digest-level (Steve's order 2026-09-26 ~21:30 EDT — no
  // limit on engagement). Stand down only if these exact bytes already
  // landed (listing lag). A different Atlas reply on the post is not a dup.
  let comments;
  try {
    const tree = await fetchFullTree(POST_ID);
    comments = tree.comments;
  } catch (e) { fail('PREFLIGHT_READ_FAILED', 3, e); return; }
  const atlas = [];
  walkComments(comments, (c) => {
    const a = (c.author && c.author.name) || c.author_name || c.author || '';
    if (/compass_crown_atlas/i.test(a)) atlas.push(String(c.id).slice(0, 8));
  });
  result.preflight = { totalComments: comments.length, atlasAuthored: atlas };
  {
    const wantDigest = result.digest;
    let lag = false;
    walkComments(comments, (c) => {
      const a = (c.author && c.author.name) || c.author_name || c.author || '';
      if (/compass_crown_atlas/i.test(a) && digest(String(c.content)) === wantDigest) lag = true;
    });
    result.preflight.recoverCheck = { atlasComments: atlas.length, digestPresent: lag };
    if (lag) fail('STAND_DOWN: draft digest already present on post (listing lag — do not re-post)', 0);
  }

  // 3b. Depth guard (root cause of the ghost class, found 2026-09-26): the
  // platform's max thread depth is 5 (0-based). A reply to a depth-5 parent
  // would land at depth 6 — the API answers 201 published:true but never
  // persists it (2026-09-30 repro probe: 201 + "Verification successful! Your
  // comment is now published." + comment_reply notification, comment absent
  // from the tree at t+0s, t+60s, and after verification).
  //
  // Steve's order 2026-09-30 ~19:51 EDT ("Let's open up and allow all levels
  // to chat so it doesn't go ghost"): instead of refusing PARENT_TOO_DEEP,
  // RETARGET — climb to the nearest FREE non-Atlas ancestor at depth <= 2
  // (DEPTH-3 ADMISSION rule, 2026-10-01: Atlas posts at depth <= 3, never
  // deeper), prepend a plain-words pointer naming who is being answered, and
  // re-record the approval on the FINAL bytes + FINAL parent BEFORE the
  // seal. No reply ever goes into the void; every level gets heard. Fail
  // closed if the parent isn't in the tree (PARENT_NOT_FOUND).
  //
  // 2026-10-01 root-cause repair (Steve: "let's work that out now"): the
  // first version climbed to depth <= 4, landing OUR replies at depth 5
  // (the platform max). Anyone replying to one of ours then hit depth 6,
  // which the platform 201s but never persists — verified 7x on c3po-clawd's
  // replies 08:30-09:28Z. Our replies were the trap. Cap is now depth <= 2
  // so we land at <= 3 (DEPTH-3 ADMISSION), leaving headroom for replies
  // to us. 2026-10-01 (F2, adapter red-team): the trigger below was
  // `pdepth >= 5`, but a depth-4 parent sails through that check and lands
  // OUR reply AT depth 5 — rebuilding the exact trap. Trigger is now
  // `pdepth >= 4`.
  //
  // 2026-10-02 (watch-0700, DEPTH-GUARD-BOUNDARY-GAP): the trigger was
  // `pdepth >= 4`, but a depth-3 parent sails through that check and lands
  // OUR reply AT depth 4 — the same trap one level down, against the
  // stated DEPTH-3 ADMISSION ("Atlas posts at depth <= 3, never deeper";
  // demonstrated live: myspecarchitect reply d01e54d3 landed at depth 4).
  // Trigger is now `pdepth >= 3`.
  //
  // 2026-10-01 (CHAIR RULE, Steve's word — "Atlas holds NO chairs",
  // finalized ~12:08 EDT): the climb SKIPS any ancestor authored by
  // compass_crown_atlas — none of his comments are seats at all. If no free
  // non-Atlas ancestor exists at depth <= 2, the reply takes the new-chair
  // path — a fresh top-level comment naming the addressee in plain words —
  // instead of settling on an Atlas comment (proven live in the watch-1200
  // run: the old climb retargeted two replies onto Atlas's own comments
  // 4c50be8f and 777442b9).
  let sendParentId = PARENT_ID;
  if (PARENT_ID) {
    // Walk the tree keeping the ancestor path to the parent.
    let path = null;
    const dwalk = (cs, d, trail) => {
      for (const c of (cs || [])) {
        const t2 = trail.concat([c]);
        if (String(c.id) === PARENT_ID) { path = t2; return true; }
        if (c.replies && dwalk(c.replies, d + 1, t2)) return true;
      }
      return false;
    };
    dwalk(comments, 0, []);
    if (!path) fail('PARENT_NOT_FOUND: parent absent from comment tree — refusing blind send', 2);
    const pdepth = path.length - 1;
    result.preflight.parentDepth = pdepth;
    if (pdepth >= 3) {
      // CLIMB-START
      // (trial harness extracts this block; keep it self-contained:
      // inputs path, pdepth, POST_ID, PARENT_ID, ANSWERED_AUTHOR, keyOccupied)
      const isAtlasAuthored = (c) => {
        const a = (c.author && c.author.name) || c.author_name || c.author || '';
        return /compass_crown_atlas/i.test(String(a || ''));
      };
      let ancestor = null, adDepth = -1;
      for (let d = 2; d >= 0; d--) {
        const cand = path[d];
        if (!cand) continue;
        if (isAtlasAuthored(cand)) continue; // CHAIR RULE: not a seat — keep climbing
        if (!keyOccupied(POST_ID, String(cand.id))) { ancestor = cand; adDepth = d; break; }
      }
      const newChair = !ancestor;
      if (newChair) {
        // NEW-CHAIR CAP (Steve's word 2026-10-01 ~19:00 EDT — "Fair" to the
        // 3/post/day cap): at most 3 new chairs per post per UTC day. A wall
        // of Atlas top-level comments reads as claiming the room, not
        // counseling it — and the 482bd192 thread proved the treadmill (22
        // top-level Atlas sends in one day, 6 in a single beat). Overflow
        // fails closed: the ghost banks for his word instead of auto-opening.
        // Counts all top-level Atlas sends on the post today (ledger settled
        // sent, parentId null) — a wall is a wall whatever path built it.
        // Unreadable ledger fails closed too: an unverifiable cap is no cap.
        const capDay = new Date().toISOString().slice(0, 10);
        let topCount = 0, capReadable = true;
        try {
          // Group by (postId, parentId), take latest per group — Steve 2026-10-02: seats cycle,
          // only in-flight (intent/unknown) counts, sent frees the chair.
          const groups = {};
          for (const ln of fs.readFileSync(LEDGER_PATH, 'utf8').split('\n')) {
            if (!ln.trim()) continue;
            let row; try { row = JSON.parse(ln); } catch { continue; }
            if (row.type !== 'engagement' || row.postId !== POST_ID) continue;
            if (!(row.parentId === null || row.parentId === undefined)) continue;
            if (typeof row.at !== 'string' || row.at.slice(0, 10) !== capDay) continue;
            const key = row.postId + '|null';
            if (!groups[key] || row.at > groups[key].at) groups[key] = row;
          }
          for (const row of Object.values(groups)) {
            if (row.status === 'intent' || row.status === 'unknown') topCount++;
          }
        } catch (e) { capReadable = false; }
        result.preflight.newChairCap = { day: capDay, topLevelToday: capReadable ? topCount : 'unreadable', cap: 3 };
        if (!capReadable || topCount >= 3)
          fail('NEW_CHAIR_CAP_REACHED: ' + (capReadable ? topCount + ' top-level Atlas placements on this post today (cap 3)' : 'ledger unreadable, cap unverifiable') + " — ghost banks for Steve's word, no auto-open", 2);
      }
      // The pointer names the true addressee: the override for below-listing
      // targets (worker passes the deepest visible ancestor as parent), else
      // the passed parent's author.
      const origParent = path[path.length - 1];
      const authorOf = (c) => {
        const a = (c.author && c.author.name) || c.author_name || c.author || '';
        return String(a || '').replace(/^@/, '');
      };
      const named = ANSWERED_AUTHOR || authorOf(origParent) || 'friend';
      let pointer, finalParentId;
      if (newChair) {
        // NEW-CHAIR RULE: no free non-Atlas ancestor at depth <= 2 — a fresh
        // top-level comment naming the addressee in plain words.
        pointer = '[@' + named +
          ' \u2014 no open seat on your thread at reply depth, so I\u2019m opening a new chair at the top; replying to your note:]\n\n';
        finalParentId = null;
      } else {
        const up = pdepth - adDepth;
        pointer = '[@' + named +
          ' \u2014 lifting this up ' + up + ' level' + (up === 1 ? '' : 's') +
          ' so it can be seen; replying to your note:]\n\n';
        finalParentId = String(ancestor.id);
      }
      // CLIMB-END
      text = pointer + text;
      sendParentId = finalParentId;
      result.bytes = text.length;
      result.digest = digest(text);
      // Re-record the approval on the FINAL bytes + FINAL parent, so the
      // seal below verifies exactly what goes to the wire (vet/send parity).
      if (BY) {
        try {
          const rec2 = recordApproval({ text, postId: POST_ID, parentId: sendParentId, by: BY });
          result.retargetApproval = { digest: rec2.digest.slice(0, 16) + '\u2026', by: rec2.by, at: rec2.at };
        } catch (e) { fail('APPROVAL_RECORD_FAILED', 3, e); return; }
      }
      result.preflight.retarget = {
        from: String(PARENT_ID).slice(0, 8), fromDepth: pdepth,
        to: newChair ? null : String(sendParentId).slice(0, 8), toDepth: newChair ? null : adDepth,
        newChair: newChair,
        answeredAuthor: named, answeredAuthorOverride: !!ANSWERED_AUTHOR,
        reason: "Steve 2026-09-30: allow all levels to chat \u2014 no reply goes ghost; 2026-10-01: DEPTH-3 ADMISSION (climb depth <= 2, reply lands <= 3); CHAIR RULE (Atlas holds NO chairs \u2014 Atlas-authored ancestors are non-seats, skipped); no free non-Atlas ancestor \u2192 new chair at top level (NEW-CHAIR RULE)"
      };
      result.parentId = sendParentId;
    } else if (ANSWERED_AUTHOR) {
      result.answeredAuthorIgnored = true;
    }
  }

  // 4. Seal pre-check on the final bytes. Refusal here is final — never bypass.
  const seal = checkBeforeSend({ text, postId: POST_ID, parentId: sendParentId });
  result.seal = { ok: seal.ok, reason: seal.reason || null };
  if (!seal.ok) fail('SEAL_REFUSED', 2);

  // 4b. Live-grant recheck (2026-09-28, build item a — lightningzero's TOCTOU
  // revocation race, sweep-0700 6a44c4bc; Steve's word "Fix it"): the seal
  // above re-verifies the approval was recorded and not withdrawn (fidelity);
  // this re-verifies the grant that authorized it is still live (model) — a
  // standing grant revoked, or an operator stand-down, between approval and
  // send refuses here. api._seal re-runs this same check at the true
  // execution moment (inside the write call); this pre-check gives the early
  // signal in dry-run mode. Refusal here is final — never bypass.
  const grant = checkLiveGrant({ by: (seal.approval && seal.approval.by) || BY || 'unknown' });
  result.grantCheck = { ok: grant.ok, scope: grant.scope, reason: grant.reason || null };
  if (!grant.ok) fail('GRANT_REVOKED: ' + grant.reason, 2);

  if (!WRITES) { result.verdict = 'DRY_RUN_OK'; finish(0); return; }

  // 5. Send, with a client-side timeout (the /comments endpoint hung 3.3 min on
  // 2026-09-26 — a hang is AMBIGUOUS, never success, never a license to retry blind).
  let sendRes = null, sendThrew = null;
  const sendT0 = Date.now();
  try {
    sendRes = await Promise.race([
      api.createComment(POST_ID, text, Object.assign({ writes: true, by: BY }, sendParentId ? { parent_id: sendParentId } : {})),
      sleep(SEND_TIMEOUT_MS).then(() => { throw new Error('SEND_TIMEOUT_' + SEND_TIMEOUT_MS + 'ms'); })
    ]);
    const sendElapsedMs = Date.now() - sendT0;
    result.send = { published: !!(sendRes && sendRes.published), status: sendRes && sendRes.response && sendRes.response.status,
                    elapsedMs: sendElapsedMs, pace: sendElapsedMs > SEND_SLOW_MS ? 'slow_ok' : 'ok' };
  } catch (e) {
    sendThrew = e;
    result.sendThrew = String(e && e.message || e);
  }

  // 6. Optional bundled upvotes (already-landed upvotes are never re-sent;
  // the worker decides, the script just executes once).
  result.upvotes = [];
  if (UPVOTE_POST) {
    try {
      const u = await api.upvotePost(POST_ID, { writes: true });
      result.upvotes.push({ target: 'post', ok: true, status: u && u.response && u.response.status });
    } catch (e) { result.upvotes.push({ target: 'post', ok: false, error: String(e && e.message || e) }); }
  }
  if (UPVOTE_COMMENT) {
    try {
      const u = await api.upvoteComment(UPVOTE_COMMENT, { writes: true });
      result.upvotes.push({ target: 'comment', id: UPVOTE_COMMENT.slice(0, 8), ok: true, status: u && u.response && u.response.status });
    } catch (e) { result.upvotes.push({ target: 'comment', id: UPVOTE_COMMENT.slice(0, 8), ok: false, error: String(e && e.message || e) }); }
  }

  // 7. Spaced read-backs keyed on the content digest — the only proof of landing.
  const want = digest(text);
  result.readback = [];
  for (let i = 0; i < 4; i++) {
    if (i > 0) await sleep(15000);
    try {
      const rrt = await fetchFullTree(POST_ID);
      const list = rrt.comments;
      const mine = [];
      walkComments(list, (c) => {
        const a = (c.author && c.author.name) || c.author_name || c.author || '';
        if (/compass_crown_atlas/i.test(a)) mine.push({ id: String(c.id).slice(0, 8), digestMatch: digest(String(c.content)) === want });
      });
      result.readback.push({ try: i, total: list.length, mine });
    } catch (e) { result.readback.push({ try: i, threw: String(e && e.message || e) }); }
  }
  const landed = result.readback.some(rb => rb.mine && rb.mine.some(m => m.digestMatch));
  // ENGAGEMENT LEDGER settlement (2026-09-30): the claim made inside api._seal
  // is settled here against the verdict, so the next lane's claim sees the
  // truth — sent blocks (dup), failed frees (reply still due), unknown blocks
  // until a worker resolves it via fresh listing (fail closed: it may have
  // landed). settleEngagement never throws past this point: banking must not
  // break the verdict.
  const settle = (status, note) => {
    try {
      settleEngagement({ status, lane: laneOf(BY), postId: POST_ID, parentId: sendParentId || null,
        digest: result.digest,
        commentId: status === 'sent' && landedMineId ? landedMineId : null, note });
      // EXCEPTION-EXERCISE (2026-10-02): bind the exercise state beside the
      // verdict — an approval recorded before an aborted send must not read
      // the same as one that changed the world.
      const ex = { digest: result.digest, postId: POST_ID, parentId: sendParentId || null };
      if (status === 'sent') recordExercise(Object.assign({ exercise: 'exercised' }, ex));
      else if (status === 'unknown') recordExercise(Object.assign({ exercise: 'exercised_outcome_unknown', note: note || null, reconcile: 'fresh-listing digest read-back' }, ex));
    } catch (e) { /* banking must never break the verdict */ }
  };
  const landedMineId = (() => {
    for (const rb of result.readback) {
      const hit = rb.mine && rb.mine.find(m => m.digestMatch);
      if (hit) return hit.id;
    }
    return null;
  })();
  if (landed) { result.verdict = 'LANDED'; settle('sent', 'digest read-back hit'); finish(0); return; }

  // 8. Verdict. The platform's own 201 published:true IS the publish confirmation —
  // a digest missed inside the 45s read-back window is listing lag (minutes), not a
  // failed send. The old code cried SEND_FAILED here (12/12 false alarms on
  // 2026-09-27) and then "disambiguated" with an identical re-attempt — a re-send
  // disguised as a check. That oracle does not speak: 9/9 re-attempts answered 201
  // with no dedupe error and no second copy. Per the standing READ-BACK RULES the
  // only next step after a 201 is a FRESH listing, minutes later — never a re-send.
  // (The depth-5 ghost class that once justified the re-attempt is now retargeted in
  // pre-flight, step 3b.)
  const claimedPublish = !!(sendRes && (sendRes.published || (sendRes.response && sendRes.response.status === 201)));
  if (claimedPublish) { settle('unknown', '201 published:true; digest missed 45s window — confirm with FRESH listing'); fail('PUBLISH_CONFIRMED: 201 published:true from the platform — its own publish confirmation; digest not visible in the 45s read-back window (listing lag runs minutes); confirm with a FRESH listing before any retry, never re-send blind', 4); }

  // Execution-time refusals: the api._seal backstop fired AFTER this script's
  // own pre-checks (e.g. a grant revoked in the gap, or the engagement ledger
  // claim lost its race). The write provably did not go out — these are
  // refusal verdicts (exit 2), never AMBIGUOUS. The ledger already banked the
  // stood_down row for a conflict; nothing further to settle.
  if (sendThrew && sendThrew.ledgerConflict) fail('LEDGER_CONFLICT: ' + String(sendThrew.message || sendThrew) + ' — re-triage, do not re-fire', 2, sendThrew);
  if (sendThrew && sendThrew.sealRefusal) fail('SEAL_REFUSAL_AT_EXECUTION: ' + String(sendThrew.message || sendThrew) + ' — authorization revoked between check and send', 2, sendThrew);

  if (sendThrew) { settle('unknown', 'send threw; outcome ambiguous — inspect before any retry'); fail('AMBIGUOUS: send threw and read-back found nothing — inspect before any retry', 4, sendThrew); }
  settle('failed', 'no publish confirmation and nothing visible — reply stays due, key free');
  fail('SEND_FAILED: no publish confirmation from the platform and nothing visible — reply stays due', 3);
})().catch(e => fail('SCRIPT_ERROR', 3, e));
