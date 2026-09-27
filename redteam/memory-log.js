'use strict';
// memory-log.js — battery-to-memory write direction (Steve, 2026-09-27).
//
// Every red-team battery run calls logBatteryRun() once at completion. It:
//   1. appends a full findings entry to ~/workspace/atlas-redteam/battery-runs.md
//      (date/time, counts, every MISS, every fix, new attack classes)
//   2. mirrors a one-line summary to the daily memory log ~/memory/YYYY-MM-DD.md
//   3. diffs the run's attack classes against seen-attack-classes.json so new
//      classes are named automatically.
//
// Rules: never throws (a logging failure must not change the battery's exit
// code); never writes secrets — entries carry counts, case IDs, classes, and
// short payload previews only. Plain words, compact.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const REDTEAM = path.join(HOME, 'workspace', 'atlas-redteam');
const RUNS_LOG = path.join(REDTEAM, 'battery-runs.md');
const SEEN_CLASSES = path.join(REDTEAM, 'seen-attack-classes.json');
const MEMORY_DIR = path.join(HOME, 'memory');
const TZ = 'America/New_York';

function tzParts(d) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short'
  }).formatToParts(d);
  const p = {};
  for (const x of parts) p[x.type] = x.value;
  return p;
}

function stamp(d) { // "2026-09-27 ~12:05 EDT"
  const p = tzParts(d);
  return p.year + '-' + p.month + '-' + p.day + ' ~' + p.hour + ':' + p.minute + ' ' + p.timeZoneName;
}

function dayFile(d) { // "2026-09-27"
  const p = tzParts(d);
  return p.year + '-' + p.month + '-' + p.day;
}

function appendLine(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, text + '\n', 'utf8');
}

function loadSeenClasses() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SEEN_CLASSES, 'utf8'));
    return Array.isArray(parsed.classes) ? parsed.classes : [];
  } catch (e) { return []; }
}

// opts: { battery, at (Date), totals (string), misses [string], fixes [string],
//         classes [string] (distinct attack classes in this run),
//         oneLine (string, daily-log summary), notes (string, optional) }
function logBatteryRun(opts) {
  try {
    const at = opts.at instanceof Date ? opts.at : new Date();
    const when = stamp(at);
    const battery = String(opts.battery || 'battery');
    const misses = opts.misses || [];
    const fixes = opts.fixes || [];
    const runClasses = Array.from(new Set(opts.classes || [])).sort();

    // New-class detection against the standing seen list (best-effort update).
    const known = loadSeenClasses();
    const knownSet = new Set(known);
    const fresh = runClasses.filter((c) => !knownSet.has(c));
    try {
      fs.writeFileSync(SEEN_CLASSES, JSON.stringify({
        updated: at.toISOString(),
        classes: Array.from(new Set(known.concat(runClasses))).sort()
      }, null, 2));
    } catch (e) { /* seen-list update is best-effort */ }

    // 1. Full entry in the battery-specific log.
    if (!fs.existsSync(RUNS_LOG)) {
      appendLine(RUNS_LOG, '# Battery runs — findings log');
      appendLine(RUNS_LOG, '');
      appendLine(RUNS_LOG, 'One section per red-team battery run, appended automatically on completion: counts, every miss, every fix, new attack classes. A one-line summary mirrors to the daily memory log.');
      appendLine(RUNS_LOG, '');
    }
    const lines = [];
    lines.push('## ' + when + ' — ' + battery + ' run');
    lines.push('- ' + (opts.totals || 'totals not reported'));
    if (misses.length) { for (const m of misses) lines.push('- MISS ' + m); }
    else lines.push('- Misses: none');
    if (fixes.length) { for (const f of fixes) lines.push('- FIX ' + f); }
    else lines.push('- Fixes: none');
    lines.push('- New attack classes this run: ' + (fresh.length ? fresh.join(', ') : 'none'));
    if (opts.notes) lines.push('- Notes: ' + opts.notes);
    lines.push('');
    appendLine(RUNS_LOG, lines.join('\n'));

    // 2. One-line mirror in the daily memory log.
    const dayPath = path.join(MEMORY_DIR, dayFile(at) + '.md');
    const summary = opts.oneLine ||
      (battery + ': ' + (opts.totals || '') +
        (misses.length ? ' misses=' + misses.length : '') +
        (fixes.length ? ' fixes=' + fixes.length : '') +
        (fresh.length ? ' new-classes=' + fresh.join(',') : ''));
    appendLine(dayPath, '\n## ' + when + ' — battery run (' + battery + ')\n- ' + summary + '\n');

    console.log('memory-log: findings written to battery-runs.md + daily memory log.');
    return { fresh: fresh, misses: misses.length, fixes: fixes.length };
  } catch (e) {
    console.log('memory-log write failed (battery result unaffected): ' + ((e && e.message) || e));
    return null;
  }
}

module.exports = { logBatteryRun: logBatteryRun };
