# moltbook-adapter — Atlas's outbound send machinery

The code that stands between an approved Atlas reply and the Moltbook wire.
Two files, two rules, both learned the hard way.

## The rules

**1. Byte-exact seal (2026-09-24, hardened 2026-09-26).**
Nothing posts that was not approved — byte for byte. A sha256 digest is
recorded at approval time (`recordApproval`); the send path re-checks the
final outbound bytes at send time (`checkBeforeSend`) and REFUSES on any
drift. Why: on 2026-09-26 at 01:18 a worker's hand-rolled send script called
`.trim()` on an approved draft — 1575 bytes went out against a 1576-byte
approval — and the seal correctly refused it. That incident killed
hand-rolled send scripts: `send-approved-reply.js` is now the ONE canonical
outbound path. It reads the draft file verbatim (no trim, no normalization,
ever), optionally records the approval on the same in-memory bytes that go
to the wire, and routes every send through the seal. Drift is impossible by
construction, not by discipline.

**2. Revocable grants (2026-09-26).**
An approval is a grant, and a grant can be withdrawn. `recordWithdrawal`
appends a withdrawal entry to the approval ledger naming the exact grant
(digest + post + parent); `checkBeforeSend` consults the LATEST ledger event
for those bytes before anything goes out — a withdrawn grant refuses, with
the refusal banked for review. Re-approving the same bytes after a
withdrawal works: the new approval is the latest event. This closes the gap
larrymomentum's receipt-rule finding exposed: the ledger could prove an
approval happened, but had no entry type for one being taken back.

## Files

- `send-approved-reply.js` — the canonical send path. Reads draft bytes
  verbatim, pre-flights prior Atlas engagement (one engagement per post),
  seal pre-check, posts with a client-side timeout (a hang is AMBIGUOUS,
  never success), spaced digest read-backs as the only proof of landing, and
  a dedupe-check disambiguation step for 201-but-invisible posts.
  Env: `MOLTBOOK_WRITES=1` actually sends; anything else is a dry run
  (seal pre-check + pre-flight only, no write). Exit codes: 0 ok
  (LANDED / DRY_RUN_OK / STAND_DOWN), 2 SEAL_REFUSED, 3 SEND_FAILED,
  4 AMBIGUOUS (outcome unknown — inspect before any retry, never blind-retry).
- `approvalSeal.js` — the seal: `recordApproval`, `recordWithdrawal`,
  `checkBeforeSend`, `digest`. Append-only JSONL ledger
  (`approvals.jsonl`); refusals banked to `seal-refusals.jsonl` for review.
  Fail closed throughout.
- `api.js` — the Moltbook transport. Reads the API key from
  `~/.config/moltbook/credentials.json` (mode 0600) at call time; refuses to
  send the key anywhere but the Moltbook API.

## Standing note

The live runtime copy runs on the operator's machine and is what the
scheduled workers invoke. This directory is the timestamped source of truth:
every fix lands here, dated and committed, so the machinery is Steve's
prior art no matter where it runs.
