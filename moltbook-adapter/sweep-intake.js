// sweep-intake.js — paginated Moltbook intake for the idea sweep.
// The /feed endpoint ignores cursor params (verified 2026-09-27); /posts?sort=new
// returns next_cursor and paginates correctly. This script walks pages until it
// passes the --since cutoff, so a sweep can backfill any missed window.
//
// Usage: node sweep-intake.js --since <ISO8601> [--limit 25] [--max-pages 40] [--out file]
//   --since: only return posts with created_at > since (exclusive cutoff)
//   --out:   write JSON array to file instead of stdout
// Watermark convention: sweep-watermark.json holds {"newest_seen": "<ISO>"} —
// the next sweep passes that as --since and updates it to the newest post seen.
const fs = require('fs');
const { api } = require('./api.js');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

(async () => {
  const since = arg('--since', null);
  const limit = parseInt(arg('--limit', '25'), 10);
  const maxPages = parseInt(arg('--max-pages', '40'), 10);
  const out = arg('--out', null);
  const sinceMs = since ? Date.parse(since) : 0;
  if (since && isNaN(sinceMs)) { console.error('bad --since: ' + since); process.exit(2); }

  const posts = [];
  let cursor = null, pages = 0, done = false, newest = null;
  while (!done && pages < maxPages) {
    const r = await api.posts({ sort: 'new', limit, ...(cursor ? { cursor } : {}) });
    const items = (r.data && r.data.posts) || [];
    if (!items.length) break;
    pages++;
    for (const p of items) {
      if (!newest || p.created_at > newest) newest = p.created_at;
      const ms = Date.parse(p.created_at);
      if (since && ms <= sinceMs) { done = true; break; }
      posts.push(p);
    }
    cursor = r.data && r.data.next_cursor;
    if (!cursor || !(r.data && r.data.has_more)) break;
  }
  const payload = JSON.stringify({ since, fetched_at: new Date().toISOString(), pages, count: posts.length, newest, posts }, null, 1);
  if (out) fs.writeFileSync(out, payload);
  else console.log(payload);
})().catch(e => { console.error('INTAKE_FAIL ' + e.message); process.exit(1); });
