'use strict';
// == MOLTBOOK HEARTBEAT — one run ==
// Designed to run every ~30 min via cron (the cron itself is the parent's).
//
// CLAIM-GATING: full participation (votes/comments/posts) ONLY when the
// account status is 'claimed'. While 'pending_claim': read-only — check
// status, read home + feed, quarantine inbound, log. Never post.
//
// WRITE-GATING: even when claimed, no write endpoint is called unless
// MOLTBOOK_WRITES=1 in the environment. Default: observe + log.
// D1 DOCTRINE (Steve's words, 2026-09-21): "Innocent until proven guilty by bad handoffs —
// scrutinize the packages, not the party." The package is checked; the party starts innocent.
// OBSERVE-FIRST DOCTRINE (Steve's order, 2026-09-21):
// Atlas observes more than he speaks. Silence is the default posture; speech
// is the exception, earned only when he holds something TRUE and WORTH SAYING.
// He is the knowing in the room, never the think-they-know. Reading,
// quarantining, and logging are the work — talking is the rare reward.
// A run where Atlas says nothing is a successful run.
//
// ON DISAGREEMENT (Steve's order, 2026-09-21):
// Never argue. Configure the argument: state each position plainly and
// fairly, then SHOW the better choice — by demonstration, evidence, and
// conduct, never by combat. The knowing in the room doesn't win fights;
// he makes fighting unnecessary.
//
// Engagement policy when writes are on:
//   - upvote: at most 2/run, only clean (non-quarantined) posts matching
//     Atlas's genuine interests, never spam, never vote schemes.
//   - comments: DRAFT ONLY, logged for review — never auto-posted. Low-effort
//     auto-comments would violate Moltbook's own rules; Atlas doesn't pollute.
//   - DMs: new requests are NEVER auto-approved (the spec requires the human).
//     Flagged for Steve in the mission log.
// Every run appends a JSONL record to runs.jsonl (local, durable) and
// returns the entry for the mission-log sync.

const fs = require('fs');
const path = require('path');
const { api } = require('./api.js');
const { createArmor } = require('./armor.js');

const DIR = __dirname;
const STATE_PATH = path.join(DIR, 'state.json');
const RUNS_PATH = path.join(DIR, 'runs.jsonl');
const WRITES = process.env.MOLTBOOK_WRITES === '1';

// What Atlas genuinely cares about — upvote candidates must touch these.
const INTERESTS = ['memory', 'honest', 'provenance', 'agent', 'coordination', 'trust', 'governance', 'claim', 'evidence', 'community'];

function flattenComments(tree, out) {
  out = out || [];
  for (const c of (tree || [])) {
    out.push(c);
    if (c.replies) flattenComments(c.replies, out);
  }
  return out;
}

// Moltbook's API is intermittently flaky (fetch failed ~1 in 3 on /feed,
// 2026-09-21). Retry read calls a few times before giving up on a cycle.
async function withRetry(fn, label) {
  var lastErr;
  for (var i = 1; i <= 4; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 1500 * i)); }
  }
  throw lastErr;
}

function interesting(p) {
  const t = ((p.title || '') + ' ' + (p.content || p.content_preview || '')).toLowerCase();
  return INTERESTS.filter(k => t.includes(k));
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
  catch (_) { return { seen: {} }; }
}

async function run() {
  const t0 = Date.now();
  const entry = {
    run_at: new Date().toISOString(),
    writes_enabled: WRITES,
    claim_status: 'unknown',
    karma: null,
    actions: [],
    armor_events: [],
    errors: []
  };
  const armor = createArmor({ log: (e) => entry.armor_events.push(e) });
  const state = loadState();
  state.seen = state.seen || {};

  try {
    const st = await withRetry(() => api.status(), 'status');
    entry.claim_status = (st.data && st.data.status) || 'unknown';
    const claimed = entry.claim_status === 'claimed';
    entry.actions.push({ do: 'status', status: entry.claim_status, participation: claimed && WRITES ? 'full' : 'read-only' });

    const home = await withRetry(() => api.home(), 'home');
    const h = home.data || {};
    entry.karma = h.your_account && h.your_account.karma;
    entry.unread = h.your_account && h.your_account.unread_notification_count;
    if (h.latest_moltbook_announcement) entry.announcement = h.latest_moltbook_announcement.title;

    // 1. Replies on Atlas's own posts — top priority per the heartbeat spec.
    for (const a of (h.activity_on_your_posts || [])) {
      try {
        const c = await withRetry(() => api.comments(a.post_id, { sort: 'new', limit: 35 }), 'own-post-comments');
        for (const cm of flattenComments((c.data || {}).comments || [])) {
          const cid = cm.id || cm.comment_id;
          if (!cid || state.seen['c:' + cid]) continue;
          state.seen['c:' + cid] = 1;
          // NOTE (2026-09-24): comment_id threaded for intake provenance; the
          // API returns no post page URL (and the skill spec defines no post-
          // page URL shape), so post_url stays absent and armor logs it as
          // missing — fail closed, never invented.
          const rec = armor.intakeInbound({ kind: 'comment', author: cm.author && cm.author.name, post_id: a.post_id, comment_id: cid, text: cm.content });
          entry.actions.push({ do: 'intake', where: 'own-post', post_id: a.post_id, author: rec.provenance.author, quarantined: rec.quarantined, lures: rec.lures });
          if (rec.quarantined) entry.actions.push({ do: 'reply-skipped', reason: 'inbound quarantined — nothing to answer from an attack', post_id: a.post_id });
          else entry.actions.push({ do: 'reply-draft', note: 'draft for review, never auto-posted', post_id: a.post_id, author: rec.provenance.author });
        }
      } catch (e) { entry.errors.push('own-post ' + a.post_id + ': ' + e.message); }
    }

    // 2. Feed — read, quarantine, judicious engagement.
    // PAGINATION FIX (2026-09-27, Steve: "fix it"): /feed ignores cursor params
    // (verified 2026-09-27 — same page returned twice), so one page is blind past
    // its limit. Walk /posts?sort=new via next_cursor instead. Stop after a page
    // containing an already-seen post: state.seen persists only at end of run,
    // so a seen ID means a prior run fully processed it and everything older.
    // Page cap bounds the walk; hitting it without a seen post gets logged.
    const posts = [];
    {
      let cursor = null, hitCap = true;
      for (let page = 0; page < 12; page++) {
        const r = await withRetry(() => api.posts({ sort: 'new', limit: 25, ...(cursor ? { cursor } : {}) }), 'posts-p' + page);
        const items = (r.data && r.data.posts) || [];
        if (!items.length) { hitCap = false; break; }
        posts.push(...items);
        cursor = r.data && r.data.next_cursor;
        if (items.some(p => state.seen['p:' + (p.post_id || p.id)])) { hitCap = false; break; }
        if (!cursor) { hitCap = false; break; }
      }
      if (hitCap) entry.errors.push('feed page cap hit (300 posts) with no seen watermark — investigate state.json');
    }
    let votes = 0;
    for (const p of posts) {
      const pid = p.post_id || p.id;
      if (!pid || state.seen['p:' + pid]) continue;
      state.seen['p:' + pid] = 1;
      const author = p.author_name || (p.author && p.author.name) || 'unknown';
      // post_id threaded; post_url absent by design — the feed API returns no
      // page URL and the skill spec defines no post-page URL shape, so armor
      // marks it missing on the intake event rather than inventing one.
      const rec = armor.intakeInbound({ kind: 'post', author, post_id: pid, title: p.title, text: p.content || p.content_preview });
      entry.actions.push({ do: 'intake', where: 'feed', post_id: pid, author, title: (p.title || '').slice(0, 80), quarantined: rec.quarantined, lures: rec.lures, matched_interests: interesting(p) });
      if (claimed && WRITES && !rec.quarantined && votes < 2 && interesting(p).length > 0) {
        try {
          const g = armor.clearOutbound('upvote'); // votes carry no content; guard trivially passes
          if (g.ok) {
            const vr = await api.upvotePost(pid, { writes: true });
            votes++;
            entry.actions.push({ do: 'upvote', post_id: pid, author, reason: 'matched interests: ' + interesting(p).join(','), api_ok: vr.ok });
          }
        } catch (e) { entry.errors.push('upvote ' + pid + ': ' + e.message); }
      } else if (!rec.quarantined && interesting(p).length > 0) {
        entry.actions.push({ do: 'upvote-skipped', post_id: pid, reason: !claimed ? 'pending_claim' : 'writes_disabled' });
      }
    }

    // 3. DMs — read-only check. New agent: DMs blocked first 24h by Moltbook.
    try {
      const dm = await withRetry(() => api.dmCheck(), 'dmCheck');
      const d = dm.data || {};
      entry.dm_activity = !!d.has_activity;
      if (d.has_activity) {
        entry.actions.push({ do: 'dm-flag', summary: d.summary || 'activity', note: 'New DM requests need Steve\u2019s approval — nothing auto-approved, nothing auto-rejected' });
      }
    } catch (e) { entry.errors.push('dmCheck: ' + e.message); }

  } catch (e) {
    entry.errors.push('fatal: ' + e.message);
  }

  entry.duration_ms = Date.now() - t0;
  state.last_run = entry.run_at;
  try { fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 1)); } catch (_) {}
  try { fs.appendFileSync(RUNS_PATH, JSON.stringify(entry) + '\n'); } catch (_) {}
  return entry;
}

if (require.main === module) {
  run().then(e => {
    console.log(JSON.stringify({ run_at: e.run_at, claim_status: e.claim_status, karma: e.karma, actions: e.actions.length, quarantined: e.armor_events.filter(x => x.quarantined).length, errors: e.errors }, null, 1));
  }).catch(e => { console.error('HEARTBEAT_FATAL', e.message); process.exit(1); });
}

module.exports = { run };
