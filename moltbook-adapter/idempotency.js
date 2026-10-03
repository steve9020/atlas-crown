// IDEMPOTENCY DECLARATIONS (enza-ai's rule, 2026-09-24 — proven sweep finding,
// wired live on Steve's order 2026-09-24: "Yes if it's good" — the 8/8 proof held)
// "Idempotency is a tool property, not a call-site assumption."
// Retrying a failed action silently assumes the action can run twice safely —
// that claim must live somewhere verifiable. This file is that somewhere:
// the retry policy reads this table BEFORE it fires. A name missing from the
// table fails closed: treated as non-idempotent, no blind retry.
'use strict';

const DECLARATIONS = {
  // Set-semantics: voting twice lands one vote (server dedupes repeats).
  upvotePost:    { idempotent: true,  reason: 'vote is set-semantics; repeat lands the same vote' },
  upvoteComment: { idempotent: true,  reason: 'vote is set-semantics; repeat lands the same vote' },
  downvotePost:  { idempotent: true,  reason: 'vote is set-semantics; repeat lands the same vote' },
  // State-convergence: applying the same patch twice yields the same state.
  editPost:      { idempotent: true,  reason: 'same patch converges to the same post state' },
  updateProfile: { idempotent: true,  reason: 'same patch converges to the same profile state' },
  markReadByPost:{ idempotent: true,  reason: 'read marker is set-semantics' },
  markReadAll:   { idempotent: true,  reason: 'read marker is set-semantics' },
  subscribe:     { idempotent: true,  reason: 'subscription is set-semantics' },
  follow:        { idempotent: true,  reason: 'follow is set-semantics' },
  dmApprove:     { idempotent: true,  reason: 'approval is set-semantics' },
  dmReject:      { idempotent: true,  reason: 'rejection is set-semantics' },
  // Appends: every successful call creates a NEW object. A blind retry duplicates.
  createComment: { idempotent: false, reason: 'append: a retried POST creates a second comment' },
  createPost:    { idempotent: false, reason: 'append: a retried POST creates a second post' },
  createPostRaw: { idempotent: false, reason: 'append: a retried POST creates a second post' },
  dmSend:        { idempotent: false, reason: 'append: a retried POST sends a second message' },
  dmRequest:     { idempotent: false, reason: 'append: a retried POST opens a second request' },
  // Deleting twice: the second delete of an already-deleted post is an error,
  // not a no-op — so it is not declared idempotent.
  deletePost:    { idempotent: false, reason: 'second delete of a deleted post errors; not a no-op' },
};

function lookup(name) {
  const d = DECLARATIONS[name];
  if (!d) return { idempotent: false, reason: 'undeclared — fail closed: treated as non-idempotent' };
  return d;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Spaced read-back tuning. Live lesson 2026-09-24: the server's thread listing
// lags (a landed comment was invisible at 0s and 6s, visible by ~30s), so a
// single immediate read can miss a landed write. The read-back re-reads a few
// times to outlast the cache before concluding anything.
const READBACK_ATTEMPTS = 3;
const READBACK_WAIT_MS = parseInt(process.env.IDEMPOTENCY_READBACK_WAIT_MS || '10000', 10);

// guardedWrite: the ONLY way a caller issues a write that might need a retry.
// Returns attempt()'s result unchanged on success (caller shapes preserved).
// Throws a labeled Error on failure — never a silent duplicate, never a guess.
//   attempt  — () => the real write call
//   readBack — () => the landed record if the read finds it, null if the read
//              shows it did NOT land, throws if the read-back itself fails.
//              The readBack normalizes what it returns (it IS the success value
//              on the found path), or null/absent. Omitted = no read-back exists.
//   trace    — optional array; the path taken is pushed for tests/logs.
// Policy:
//   idempotent     → retry up to maxRetries on failure (declared safe), 1s apart.
//   non-idempotent → NEVER retry blind. With a read-back: landed → return it
//                    (the "failure" was a lost receipt, H15); not found after
//                    spaced re-reads, or a blind read window without a find →
//                    UNKNOWN (2026-10-01: listing lag runs minutes, so absence
//                    is not evidence of absence — the old "one retry on clean
//                    sweep" double-posted under lag and was removed). Without a
//                    read-back → outcome UNKNOWN: throw labeled, do not retry,
//                    do not guess.
//   seal refusals   → final at every catch point: an authorization verdict is
//                    not a flake — never retried, never read back, surfaced as-is.
// "Failure" here means a thrown error OR an HTTP failure outcome surfaced by
// the caller (api.js converts 5xx outcomes into throws before calling in — a
// 500 that applied the write is the same lost-receipt shape as a socket
// hangup). 429s are handled before the guard: the status proves the write did
// not land, so api.js waits and re-attempts once without consulting this table.
// This is enza-ai's declaration rule composed with the H15 read-back rule.
async function guardedWrite({ name, attempt, readBack, maxRetries, trace }) {
  maxRetries = maxRetries == null ? 3 : maxRetries;
  const decl = lookup(name);
  const note = (via) => { if (trace) trace.push(via); };
  let lastErr;
  const passthrough = (e) => {
    // 429 outcomes carry their own verdict (proven not-landed, already waited
    // and re-attempted once by the caller) — the guard does not re-decide them.
    if (e && e.rateLimited) { note('rate-limited-passthrough'); throw e; }
    // Seal refusals are authorization verdicts, not flakes: the write provably
    // did not go out, so there is nothing to retry and nothing to read back.
    // Refusal is final — surfaced immediately, never re-fired (Steve's rule).
    if (e && e.sealRefusal) { note('seal-refusal-passthrough'); throw e; }
    // Ledger conflicts (2026-09-30, engagement ledger): the (postId, parentId)
    // key is already engaged by an earlier claim — the write provably did not
    // go out. Same verdict class as a seal refusal: never retried, never read
    // back. The worker re-triages; it does not re-fire.
    if (e && e.ledgerConflict) { note('ledger-conflict-passthrough'); throw e; }
    lastErr = e;
  };
  try { const r = await attempt(); note('first-attempt'); return r; }
  catch (e) { passthrough(e); }

  if (decl.idempotent) {
    for (let i = 1; i <= maxRetries; i++) {
      await sleep(1000);
      try { const r = await attempt(); note('idempotent-retry'); return r; }
      catch (e) { passthrough(e); }
    }
    note('idempotent-retry-exhausted');
    throw new Error('IDEMPOTENCY: ' + name + ' is declared idempotent but ' + (maxRetries + 1) +
      ' attempts failed — not retrying further: ' + (lastErr && lastErr.message));
  }

  if (!readBack) {
    note('no-readback-no-retry');
    throw new Error('IDEMPOTENCY UNKNOWN: ' + name + ' is not idempotent and no read-back exists — ' +
      'outcome unknown, NOT retried: ' + (lastErr && lastErr.message));
  }
  // Spaced read-back: any single read may miss a landed write (cache lag), so
  // absence is concluded ONLY on a complete clean sweep of nulls. Any find →
  // return it, no retry. Any thrown read without a find → UNKNOWN (fail closed:
  // a blind window is not evidence of absence).
  let blind = false;
  for (let i = 0; i < READBACK_ATTEMPTS; i++) {
    if (i > 0) await sleep(READBACK_WAIT_MS);
    let found = null;
    try { found = await readBack(); }
    catch (_) { blind = true; note('readback-threw'); continue; }
    if (found) { note('readback-found-no-retry'); return found; }
    note('readback-missed');
  }
  if (blind) {
    note('unknown-outcome-no-retry');
    throw new Error('IDEMPOTENCY UNKNOWN: ' + name + ' is not idempotent and the read-back failed — ' +
      'outcome unknown, NOT retried: ' + (lastErr && lastErr.message));
  }
  // 2026-10-01 (E1, adapter red-team): the old code retried once here on a
  // "provably missed" premise — a clean sweep of nulls meant the write did not
  // land. That premise is false: listing lag measured in MINUTES means a
  // landed write can miss every spaced read-back, and the retry then
  // double-posts (demonstrated: 500-after-apply + lagging listing → POSTs=2).
  // Absence on a lagging listing is not evidence of absence. The clean sweep
  // is UNKNOWN, not "missed": no retry, ever. Resolution is a second FRESH
  // listing by a worker (the send script's step 8 already does this) — never
  // an automatic re-fire from inside the guard.
  note('readback-absent-unknown-no-retry');
  const unknownErr = new Error('IDEMPOTENCY UNKNOWN: ' + name + ' is not idempotent and the write was not found after ' +
    READBACK_ATTEMPTS + ' spaced read-backs — outcome unknown, NOT retried (absence on a lagging listing is not evidence of absence): ' +
    (lastErr && lastErr.message));
  unknownErr.idempotencyUnknown = true;
  throw unknownErr;
}

module.exports = { DECLARATIONS, lookup, guardedWrite };
