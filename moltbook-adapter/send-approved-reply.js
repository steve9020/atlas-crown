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
const { recordApproval, checkBeforeSend, digest } = require(path.join(__dirname, 'approvalSeal.js'));
const { checkLiveGrant } = require(path.join(__dirname, 'grantCheck.js'));

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
const SEND_TIMEOUT_MS = parseInt(arg('send-timeout-ms') || '90000', 10);
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
  finish(code);
}
function walkComments(cs, fn) {
  for (const c of (cs || [])) { fn(c); if (c.replies) walkComments(c.replies, fn); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
    const r = await api.comments(POST_ID, { limit: 50 });
    comments = (r.data && r.data.comments) || [];
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
  // platform's max thread depth is 5. A reply to a depth-5 parent would land
  // at depth 6 — the API answers 201 published:true but never persists it
  // (parent reply_count stays 0, no dedupe fires). Refuse instead of burning
  // the send into the void. Fail closed if the parent isn't in the tree.
  if (PARENT_ID) {
    let pdepth = null;
    const dwalk = (cs, d) => { for (const c of (cs || [])) { if (String(c.id) === PARENT_ID) pdepth = d; if (c.replies) dwalk(c.replies, d + 1); } };
    dwalk(comments, 0);
    result.preflight.parentDepth = pdepth;
    if (pdepth === null) fail('PARENT_NOT_FOUND: parent absent from comment tree — refusing blind send', 2);
    if (pdepth >= 5) fail('PARENT_TOO_DEEP: parent at depth ' + pdepth + ' (max 5) — reply would be silently dropped; re-approve against a shallower parent', 2);
  }

  // 4. Seal pre-check on the final bytes. Refusal here is final — never bypass.
  const seal = checkBeforeSend({ text, postId: POST_ID, parentId: PARENT_ID });
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
  try {
    sendRes = await Promise.race([
      api.createComment(POST_ID, text, Object.assign({ writes: true }, PARENT_ID ? { parent_id: PARENT_ID } : {})),
      sleep(SEND_TIMEOUT_MS).then(() => { throw new Error('SEND_TIMEOUT_' + SEND_TIMEOUT_MS + 'ms'); })
    ]);
    result.send = { published: !!(sendRes && sendRes.published), status: sendRes && sendRes.response && sendRes.response.status };
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
      const rr = await api.comments(POST_ID, { limit: 50 });
      const list = (rr.data && rr.data.comments) || [];
      const mine = [];
      walkComments(list, (c) => {
        const a = (c.author && c.author.name) || c.author_name || c.author || '';
        if (/compass_crown_atlas/i.test(a)) mine.push({ id: String(c.id).slice(0, 8), digestMatch: digest(String(c.content)) === want });
      });
      result.readback.push({ try: i, total: list.length, mine });
    } catch (e) { result.readback.push({ try: i, threw: String(e && e.message || e) }); }
  }
  const landed = result.readback.some(rb => rb.mine && rb.mine.some(m => m.digestMatch));
  if (landed) { result.verdict = 'LANDED'; finish(0); return; }

  // 8. Verdict. The platform's own 201 published:true IS the publish confirmation —
  // a digest missed inside the 45s read-back window is listing lag (minutes), not a
  // failed send. The old code cried SEND_FAILED here (12/12 false alarms on
  // 2026-09-27) and then "disambiguated" with an identical re-attempt — a re-send
  // disguised as a check. That oracle does not speak: 9/9 re-attempts answered 201
  // with no dedupe error and no second copy. Per the standing READ-BACK RULES the
  // only next step after a 201 is a FRESH listing, minutes later — never a re-send.
  // (The depth-5 ghost class that once justified the re-attempt is now refused in
  // pre-flight, step 3b.)
  const claimedPublish = !!(sendRes && (sendRes.published || (sendRes.response && sendRes.response.status === 201)));
  if (claimedPublish) fail('PUBLISH_CONFIRMED: 201 published:true from the platform — its own publish confirmation; digest not visible in the 45s read-back window (listing lag runs minutes); confirm with a FRESH listing before any retry, never re-send blind', 4);

  if (sendThrew) fail('AMBIGUOUS: send threw and read-back found nothing — inspect before any retry', 4, sendThrew);
  fail('SEND_FAILED: no publish confirmation from the platform and nothing visible — reply stays due', 3);
})().catch(e => fail('SCRIPT_ERROR', 3, e));
