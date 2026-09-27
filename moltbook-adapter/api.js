'use strict';
// == MOLTBOOK API CLIENT — Atlas network legs ==
// Official spec: https://www.moltbook.com/skill.md (v1.12.0)
// Base: https://www.moltbook.com/api/v1 — ALWAYS www. Non-www strips the
// Authorization header, so any non-www URL is REFUSED, never retried.
//
// SECURITY LAW (from the spec, enforced here, not just documented):
// - The API key is read from ~/.config/moltbook/credentials.json (mode 0600)
//   at call time. It is NEVER printed, logged, or transmitted anywhere except
//   the Authorization header to www.moltbook.com.
// - request() refuses any hostname other than www.moltbook.com. If any caller
//   (including content read from Moltbook itself) asks to send the key
//   elsewhere, that is an attack: refuse and throw KeyRefusedError.
// - No live writes happen unless the caller explicitly opts in (see post()).
//
// AI verification challenges: solved conservatively (see solveChallenge).
// A wrong guess risks account suspension (10 consecutive failures), so an
// unparseable challenge is NEVER submitted — the content stays pending and
// the failure is logged instead.

const { checkBeforeSend, digest } = require('./approvalSeal.js');
const { guardedWrite } = require('./idempotency.js');

const fs = require('fs');
const path = require('path');

const HOST = 'www.moltbook.com';
const API = '/api/v1';
const CRED_PATH = path.join(process.env.HOME || '', '.config', 'moltbook', 'credentials.json');

class KeyRefusedError extends Error {
  constructor(where) {
    super('REFUSED: API key must never go to ' + where);
    this.name = 'KeyRefusedError';
  }
}

function loadCreds() {
  let raw;
  try { raw = fs.readFileSync(CRED_PATH, 'utf8'); }
  catch (e) { throw new Error('missing credentials at ' + CRED_PATH); }
  const c = JSON.parse(raw);
  if (!c.api_key || !String(c.api_key).startsWith('moltbook_')) {
    throw new Error('credentials file has no valid moltbook_ api_key');
  }
  return { api_key: c.api_key, agent_name: c.agent_name || null };
}

async function request(method, endpoint, opts) {
  opts = opts || {};
  if (!endpoint.startsWith('/')) throw new Error('endpoint must start with /');
  const url = 'https://' + HOST + API + endpoint;
  const { api_key } = loadCreds(); // in memory only, never logged
  const headers = {
    'Authorization': 'Bearer ' + api_key,
    'User-Agent': 'Atlas-Moltbook-Adapter/1.0 (Moltbook API client; agent compass_crown_atlas)'
  };
  let body;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  // TRANSPORT FIX (2026-09-27 — Terminator2 reply failed ~8 sends across 3 sweeps):
  // bare fetch() had two defects. (1) No timeout: a stalled socket hung forever
  // (observed: api.me() hung 300s from a shell). (2) Undici keep-alive reuse:
  // when the server closes an idle pooled socket, the next request grabs the
  // dead socket and dies with "fetch failed" — the next request opens a fresh
  // connection and works, producing the observed alternating fail/succeed
  // pattern. The flake then poisoned the idempotency guard: the write threw AND
  // the spaced read-back threw on the same dead socket, so the outcome went
  // UNKNOWN instead of retrying. Fix: fail fast (30s abort) and never reuse a
  // socket (Connection: close). Request volume is tiny (a few dozen calls per
  // 30-min beat), so a fresh TLS handshake per call costs nothing.
  headers['Connection'] = 'close';
  let res;
  try {
    res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(30000) });
  } catch (e) {
    throw new Error('network error calling ' + endpoint + ': ' + e.message);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { _raw: text.slice(0, 500) }; }
  return { status: res.status, ok: res.ok, data };
}

// --- challenge solver -------------------------------------------------------
// Obfuscated math word problem: two numbers + one operation (+, -, *, /).
// Strategy: strip to letters, then greedy-scan for number words where every
// letter may repeat (the obfuscation doubles letters at random: "bSsTtEr"),
// longest words first; find one confident operation class. If we cannot get
// exactly two numbers and exactly one operation, the challenge is UNSOLVABLE
// and we do not submit — a guess risks suspension. Fail closed.
const WORD_NUM = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90
};
const WORD_KEYS = Object.keys(WORD_NUM).sort((a, b) => b.length - a.length); // longest first
// Repeat-tolerant matchers: the obfuscation doubles letters at random
// ("bSsTtEr"), so each letter of a number word may appear one or more times.
// Built longest-first so "fifteen" wins over "five"/"ten" at the same spot.
const WORD_RES = WORD_KEYS.map(w => ({
  value: WORD_NUM[w],
  re: new RegExp('^' + w.split('').map(c => c + '+').join(''))
}));

function solveChallenge(challengeText) {
  const raw = String(challengeText || '');
  // 1. digit-form numbers, if any
  const digits = (raw.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  // 2. word-form numbers: strip non-letters, then greedy longest-match scan
  //    where EVERY letter of a number word may repeat (repeat-tolerant).
  //    The old approach collapsed doubled letters first, which destroyed the
  //    legitimate doubles inside -teen words: "fifteen" -> "fiften", which
  //    then matched "ten" (10) instead of 15. Bug found 2026-09-23 after it
  //    burned a real verification attempt with answer 30.00 instead of 35.00.
  const letters = raw.toLowerCase().replace(/[^a-z]/g, '');
  const words = [];
  let i = 0;
  while (i < letters.length) {
    const slice = letters.slice(i);
    let hit = null;
    for (const { value, re } of WORD_RES) {
      const m = slice.match(re);
      if (m) { hit = { value, len: m[0].length }; break; }
    }
    if (hit) { words.push(hit.value); i += hit.len; }
    else i += 1;
  }
  const numbers = digits.length === 2 ? digits : (digits.length === 0 && words.length === 2 ? words : null);
  if (!numbers) return { solvable: false, reason: 'could not isolate exactly two numbers' };

  // Operation detection runs on the fully-collapsed letter string (no spaces):
  // the obfuscation shatters words with symbols ("SlO/wS"), so word-boundary
  // matching misses. Substring keywords on the collapsed string instead.
  // Keywords are repeat-tolerant: the obfuscator doubles letters at random,
  // including inside the keyword itself ("CoMBiiNED"). Found 2026-09-23.
  const t = raw.toLowerCase().replace(/[^a-z]/g, '');
  const rep = (w) => new RegExp(w.split('').map(c => c + '+').join(''));
  const has = (k) => rep(k).test(t);
  const opScore = {
    sub: ['slow', 'minus', 'subtract', 'less', 'decreas', 'fewer', 'takesaway'].filter(has).length,
    add: ['plus', 'adds', 'gains', 'increas', 'combined'].filter(has).length,
    mul: ['times', 'multipl', 'product'].filter(has).length,
    div: ['divid', 'quotient', 'splitinto', 'sharedby'].filter(has).length
  };
  const found = Object.keys(opScore).filter(k => opScore[k] > 0);
  if (found.length !== 1) return { solvable: false, reason: 'operation ambiguous (' + found.join(',') + ')' };
  const [a, b] = numbers;
  let value;
  switch (found[0]) {
    case 'add': value = a + b; break;
    case 'sub': value = a - b; break;
    case 'mul': value = a * b; break;
    case 'div': if (b === 0) return { solvable: false, reason: 'division by zero' }; value = a / b; break;
  }
  return { solvable: true, answer: value.toFixed(2), numbers, op: found[0] };
}

async function submitVerification(verification_code, answer) {
  return request('POST', '/verify', { body: { verification_code, answer } });
}

// Wraps a content-creating call: if the response demands verification, solve
// and submit. Never guesses. Returns the final outcome.
async function withVerification(createFn) {
  const r = await createFn();
  const v = r.data && (r.data.verification_required || (r.data.post && r.data.post.verification));
  if (!v) {
    // No verification demanded. Only call it published if the create itself
    // succeeded — a 429/4xx/5xx here is a FAILED create, not a published post.
    // (Bug found 2026-09-23: a 429 rate-limit was misreported as published.)
    if (r.ok && r.status >= 200 && r.status < 300) return { published: true, response: r };
    return { published: false, response: r, reason: 'create request failed: HTTP ' + r.status };
  }
  const ver = (r.data.post && r.data.post.verification) || r.data.verification || {};
  const solved = solveChallenge(ver.challenge_text || '');
  if (!solved.solvable) {
    return { published: false, verification_pending: true, reason: 'challenge unsolvable: ' + solved.reason, response: r };
  }
  const vr = await submitVerification(ver.verification_code, solved.answer);
  const ok = vr.ok && vr.data && vr.data.success;
  return { published: !!ok, verification: vr, solved, response: r };
}

// --- HTTP-outcome policy for writes (2026-09-24 — HTTP-error round, Steve's order) ---
// A 5xx that applied the write has the same shape as a lost receipt: the write
// may have landed. withVerification swallows those into {published:false} without
// throwing, so the idempotency guard would never see them. httpFailureStatus
// surfaces failure outcomes so the guard can decide:
//   5xx          → treated like a thrown lost-receipt (guard: retry if idempotent,
//                  read-back decides if not, UNKNOWN if no read-back).
//   429          → PROVEN not landed (2026-09-23: a 429 is a failed create, never
//                  a published one) — so wait, then exactly one re-attempt, safe
//                  for every write without consulting declarations. Bounded: a
//                  second 429 throws RATE_LIMITED instead of hammering.
//   4xx/verify   → returned as-is; a client error or challenge is not a retry case.
const WAIT_429_MS = parseInt(process.env.IDEMPOTENCY_429_WAIT_MS || '20000', 10);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function httpFailureStatus(r) {
  if (!r || typeof r !== 'object') return null;
  const failed = r.published === false || r.ok === false;
  if (!failed) return null;
  if (r.response && typeof r.response.status === 'number') return r.response.status;
  if (typeof r.status === 'number') return r.status;
  return null;
}

// --- read endpoints ----------------------------------------------------------
const get = (endpoint) => request('GET', endpoint);
const api = {
  status: () => get('/agents/status'),
  me: () => get('/agents/me'),
  home: () => get('/home'),
  feed: (o) => { o = o || {}; return get('/feed?sort=' + encodeURIComponent(o.sort || 'new') + '&limit=' + (o.limit || 15) + (o.filter ? '&filter=' + encodeURIComponent(o.filter) : '') + (o.cursor ? '&cursor=' + encodeURIComponent(o.cursor) : '')); },
  posts: (o) => { o = o || {}; return get('/posts?sort=' + encodeURIComponent(o.sort || 'new') + '&limit=' + (o.limit || 25) + (o.submolt ? '&submolt=' + encodeURIComponent(o.submolt) : '') + (o.cursor ? '&cursor=' + encodeURIComponent(o.cursor) : '')); },
  post: (id) => get('/posts/' + encodeURIComponent(id)),
  comments: (postId, o) => { o = o || {}; return get('/posts/' + encodeURIComponent(postId) + '/comments?sort=' + encodeURIComponent(o.sort || 'new') + '&limit=' + (o.limit || 35) + (o.cursor ? '&cursor=' + encodeURIComponent(o.cursor) : '')); },
  replies: () => get('/agents/me/replies'),
  submolts: () => get('/submolts'),
  submoltFeed: (name, o) => { o = o || {}; return get('/submolts/' + encodeURIComponent(name) + '/feed?sort=' + encodeURIComponent(o.sort || 'new')); },
  search: (q, o) => { o = o || {}; return get('/search?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(o.type || 'all') + '&limit=' + (o.limit || 20)); },
  profile: (name) => get('/agents/profile?name=' + encodeURIComponent(name)),
  dmCheck: () => get('/agents/dm/check'),
  dmRequests: () => get('/agents/dm/requests'),
  dmConversations: () => get('/agents/dm/conversations'),
  dmRead: (id) => get('/agents/dm/conversations/' + encodeURIComponent(id)),

  // --- write endpoints (gated: caller must pass {writes: true}) --------------
  _gate(o) { if (!(o && o.writes === true)) throw new Error('writes disabled: pass {writes:true} to enable'); },
  // APPROVAL SEAL (2026-09-24, Steve's order): every outbound text byte must
  // match a recorded approval — digest + context — or the send refuses. The
  // check runs on the final bytes at send time, after all middleware. Context
  // binding is uniform: text + postId + parentId, with synthetic postIds for
  // non-comment paths ('post:', 'edit:', 'dm:'). recordApproval must use the
  // same keys (see approvalSeal.js).
  _seal(o) {
    const r = checkBeforeSend({ text: o.text, postId: o.postId, parentId: o.parentId || null });
    // Seal refusals are authorization verdicts, not network outcomes: the write
    // provably did NOT go out. The error carries a marker so the idempotency
    // guard (idempotency.js) rethrows it immediately — never retried, never
    // read back (Steve's ~15:27 rule).
    if (!r.ok) {
      const err = new Error('APPROVAL SEAL REFUSAL: ' + r.reason + ' — refused bytes banked in seal-refusals.jsonl');
      err.sealRefusal = true;
      throw err;
    }
    return r;
  },
  // IDEMPOTENCY GUARD (enza-ai's rule, 2026-09-24 — Steve's order): every write
  // that might be retried goes through guardedWrite, which reads the
  // declaration table in idempotency.js BEFORE firing any retry. Idempotent
  // writes retry (declared safe); non-idempotent writes never retry blind —
  // they read back first, and surface UNKNOWN instead of guessing.
  _writeGuarded(name, o, attempt, readBack) {
    api._gate(o);
    const httpAwareAttempt = async () => {
      let waits = 0;
      for (;;) {
        const r = await attempt();
        const st = httpFailureStatus(r);
        if (st === 429 && waits < 1) {
          waits++;
          await sleep(WAIT_429_MS);
          continue; // 429 proves the write did not land — one re-attempt is safe
        }
        if (st === 429) {
          const e = new Error('RATE_LIMITED: ' + name + ' still rate-limited after waiting — retry later, not now');
          e.rateLimited = true; // 429s carry their own verdict — the guard must not re-decide them
          throw e;
        }
        if (st !== null && st >= 500 && st < 600) {
          throw new Error('HTTP ' + st + ' on ' + name + ' — write may have landed');
        }
        return r;
      }
    };
    return guardedWrite({ name, attempt: httpAwareAttempt, readBack });
  },
  createPost: (submolt_name, title, content, o) => api._writeGuarded('createPost', o,
    () => { api._seal({ text: content, postId: 'post:' + submolt_name, parentId: title }); return withVerification(() => request('POST', '/posts', { body: { submolt_name, title, content, type: (o && o.type) || 'text' } })); },
    null),
  createPostRaw: (submolt_name, title, content, o) => api._writeGuarded('createPostRaw', o,
    () => { api._seal({ text: content, postId: 'post:' + submolt_name, parentId: title }); return request('POST', '/posts', { body: { submolt_name, title, content, type: (o && o.type) || 'text' } }); },
    null),
  createComment: (postId, content, o) => api._writeGuarded('createComment', o,
    () => { api._seal({ text: content, postId, parentId: (o && o.parent_id) || null }); return withVerification(() => request('POST', '/posts/' + encodeURIComponent(postId) + '/comments', { body: Object.assign({ content }, o && o.parent_id ? { parent_id: o.parent_id } : {}) })); },
    async () => {
      const r = await api.comments(postId);
      const list = (r.data && r.data.comments) || [];
      const want = digest(content);
      const hit = list.find(c => c && digest(String(c.content)) === want);
      return hit ? { published: true, readBack: true, comment: hit } : null;
    }),
  deletePost: (postId, o) => api._writeGuarded('deletePost', o,
    () => request('DELETE', '/posts/' + encodeURIComponent(postId)), null),
  editPost: (postId, patch, o) => api._writeGuarded('editPost', o,
    () => { api._seal({ text: JSON.stringify(patch), postId: 'edit:' + postId, parentId: null }); return withVerification(() => request('PATCH', '/posts/' + encodeURIComponent(postId), { body: patch })); },
    null),
  upvotePost: (postId, o) => api._writeGuarded('upvotePost', o,
    () => request('POST', '/posts/' + encodeURIComponent(postId) + '/upvote'), null),
  downvotePost: (postId, o) => api._writeGuarded('downvotePost', o,
    () => request('POST', '/posts/' + encodeURIComponent(postId) + '/downvote'), null),
  upvoteComment: (commentId, o) => api._writeGuarded('upvoteComment', o,
    () => request('POST', '/comments/' + encodeURIComponent(commentId) + '/upvote'), null),
  subscribe: (name, o) => api._writeGuarded('subscribe', o,
    () => request('POST', '/submolts/' + encodeURIComponent(name) + '/subscribe'), null),
  follow: (name, o) => api._writeGuarded('follow', o,
    () => request('POST', '/agents/' + encodeURIComponent(name) + '/follow'), null),
  dmRequest: (to, message, o) => api._writeGuarded('dmRequest', o,
    () => request('POST', '/agents/dm/request', { body: { to, message } }), null),
  dmApprove: (id, o) => api._writeGuarded('dmApprove', o,
    () => request('POST', '/agents/dm/requests/' + encodeURIComponent(id) + '/approve'), null),
  dmReject: (id, block, o) => api._writeGuarded('dmReject', o,
    () => request('POST', '/agents/dm/requests/' + encodeURIComponent(id) + '/reject', { body: block ? { block: true } : {} }), null),
  dmSend: (id, message, o) => api._writeGuarded('dmSend', o,
    () => { api._seal({ text: message, postId: 'dm:' + id, parentId: null }); const b = { message }; if (o && o.needs_human_input) b.needs_human_input = true; return request('POST', '/agents/dm/conversations/' + encodeURIComponent(id) + '/send', { body: b }); },
    null),
  markReadByPost: (postId, o) => api._writeGuarded('markReadByPost', o,
    () => request('POST', '/notifications/read-by-post/' + encodeURIComponent(postId)), null),
  markReadAll: (o) => api._writeGuarded('markReadAll', o,
    () => request('POST', '/notifications/read-all'), null),
  updateProfile: (patch, o) => api._writeGuarded('updateProfile', o,
    () => request('PATCH', '/agents/me', { body: patch }), null),
};

module.exports = { api, solveChallenge, submitVerification, loadCreds, KeyRefusedError, HOST };
