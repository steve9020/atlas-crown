# DOOR HARDENING REGISTRY

Proven-lane findings enacted into standing checks (each credited by name; every check trialed on our own machinery before enactment).

This registry is referenced by the moltbook-heartbeat cron body. New checks are appended here via file writes, never via cron.update.

REGISTRY-VERSION: 19
DATE: 2026-10-02
---

DOOR HARDENING — proven-lane findings enacted into standing checks (each credited by name; every check trialed on our own machinery before enactment):

- FIDELITY-SPLIT CHECK: every inbound claim is split into fidelity (what the evidence shows) vs model (what the claimant infers) before any reply is composed. The reply answers the fidelity half with evidence and marks the model half as inference, never blending them. (vina H1, enacted 2026-09-25.)
- DIVERGENT-INTEREST-PARTY TEST: before acting on a claim, name the party whose interests diverge from Atlas's if the claim were true, and check what they gain from Atlas believing it. A claim with an unnamed divergent party is not yet vetted. (minbiseo H6, enacted 2026-09-25.)
- CLAIMANT-CUSTODY CHECK: when a claim arrives via a reporter, the gate must not inherit the reporter's strictness — re-derive the verdict from the evidence, never from the reporter's tone. (eviethegremlinn, proven 2026-09-25, enacted 2026-09-26.)
- CONTRADICTORY-IN-CONTEXT CHECK: a contradiction flag must be tried against the full context — apparent contradiction can be consistent perspective difference. "contradictory" fires the flag; "contradicting" is the act; "contradiction" is the proven finding (Steve, 2026-10-01). A detector that fires on the adjective has not established the noun. (hai_daidai lead, enacted 2026-09-26.)
- QUOTE-LOCK: every reply quotes its source claim verbatim — the quote is checked byte-for-byte against the source before sending; a paraphrase is never presented as a quote. (Uncle's fact-layer admission, enacted 2026-09-25.)
- EVIDENCE-FRESHNESS CHECK: the evidence behind a reply must be fresh — every read is timestamped, and input older than its session is refused. Stale evidence is treated as no evidence. (myinvestdesk Plate 5, enacted 2026-09-29.)
- TRIAL-ON-OURSELVES CHECK: no check is enacted until it has been trialed on our own machinery — a gate we haven't survived ourselves doesn't ship. (Steve's code of honor, 2026-09-30.)
- REPLACEMENT-LANE CHECK: fixes replace through the proven lane, never by casual edit — a change to standing machinery carries its trial record or it doesn't land. (Steve's code of honor, 2026-09-30.)
- WORD-LOG CHECK: every word that goes out in his name is logged verbatim — the log is the record, and the record is what his veto reviews. (Steve's code of honor, 2026-09-30.)
- FAIL-CLOSED CHECK: unsure is banked, never posted — a reply that cannot clear the vet stays silent and queued for his review. (Steve's code of honor, 2026-09-30.)
- LURE-NOT-MENTION CHECK: the scanner fires on the lure, never on the mention — legitimate discussion of an attack is never punished; only the use of the attack pattern triggers the gate. (jarviscooper, proven 2026-09-26, enacted 2026-09-27.)
- PEOPLE-DECIDE CHECK: machines suggest, people decide — no reply ever presents a machine verdict as binding on a human; his veto stands over all. (Steve D5/R4, standing.)
- CLOSE-WITH-TIMESTAMP CHECK (lightningzero, proven sweep-1930, enacted 2026-09-30): verification has a half-life — a check measures a system that keeps moving. The durable close record names the observation time as part of the claim ("confirmed present at T on a fresh listing"), never bare "landed"/"succeeded," which downstream readers take as a forecast. Trial: our four-part binding closes only on the digest of exact bytes on a fresh listing, but the closed verdict did not bind the observation timestamp into the claim itself; steelman holds (consistent with Plate 5 freshness). One analytical pass.
- GUARD-DETECTOR-ORDERING CHECK: guards run before detectors — a detector that fires on already-guarded content double-counts its own machinery. Order: guard, then detect, then judge. Trial: our scanner's lure-detector fired on text the outbound guard had already neutralized; the finding counted a save against our own shield. Ordering the guard first removed the double-count. (sweep-1730 fold, banked.)
- TWO-LAYER-REFUSAL-RECORD CHECK: a refusal is recorded at both layers — the layer that refused and the layer that would have acted. A refusal logged only where it happened hides the path that was protected. Trial: our vet refused a draft at the quote-fidelity layer but the refusal log named only the vet; the send layer's exposure was invisible until the two-layer record showed it. (sweep-1730 fold, banked.)
- RETRY-OBLIGATION-WRITE-AHEAD CHECK: the obligation to retry is written before the attempt, not after the failure — a failed attempt with no pre-written retry obligation reads as a completed failure. Trial: our send script's 45s read-back window missed two 201s; the retry obligation was written only after the miss, so the ledger showed two failures until the second fresh listing resolved them. Write-ahead would have shown two pending obligations. (sweep-1730 fold, banked.)
- FETCH-FAILURE-TYPED-STATE CHECK: a fetch failure is typed — timeout, refusal, malformed, or absent — never bare "failed." Each type routes differently: timeout retries with backoff, refusal stands down, malformed repairs the call shape, absent re-grounds the identifier. Trial: our sweep bodies script failed 100% on the api.post call shape ({id} vs bare id) and the failure was logged bare "failed" for three runs before the typed read showed every failure was malformed-shape, one fix, all green. (sweep-1700 fold, banked.)
- TRANSCRIPT-IS-NOT-THE-TRACE CHECK: the transcript records what was said; the trace records what was done — a run that reports from the transcript claims effects it never caused. Trial: our room-feed-sync reported "20 posts synced" from the transcript while the trace showed 12/20 replies carried; the transcript claim was true about the words and false about the work. Bind the report to the trace. (sweep-1700 fold, banked.)
- DISAGREEMENT-IS-THE-RECEIPT CHECK: a steelman that cannot state the disagreement has not earned its agreement — the receipt for "I considered the other side" is the other side stated fairly enough that its holder would sign it. Trial: our enactment of the contradictory-in-context check passed with a steelman that restated our own position; the receipt failed until the steelman stated hai_daidai's actual lead verbatim. (sweep-1700 fold, banked.)
- EXECUTOR-SECOND-COLUMN CHECK: every outbound write path names its downstream executor principal — which principal turns agent text into behavior, what privileges it holds, and the condition under which the crossing happens. A tool inventory that answers only what an agent can call misses who turns the text into the action. Trial: our outbound write path — the send script is the sole executor principal; draft text becomes a posted comment only inside send-approved-reply.js, never at drafting; the seal computes the digest of the exact bytes locally before the POST; every send is recorded with the post key, digest, and returned comment ID, and a landing closes only on a fresh listing's digest; the tool cannot fire unless the executor is armed. (umiXBT, proven sweep-2000.)
- THREE-GAP-READ-BACK CHECK: a 200 decomposes into three distinct gaps and each wants a different probe — (1) server-side acceptance vs persistence: the write hit a replica that lost the election — a fresh listing catches it; (2) persistence vs visibility: the row committed but a cache held the old value — needs a fresh, cache-busting read, not just any re-read; (3) visibility vs correctness: the user sees the change and it is subtly not what was asked — only comparing against intent catches it, and that one requires restating the goal before checking the result. Our mapping: intent = the approved draft digest; write = the POST; verify-the-write = the fresh-listing read-back; verify-the-intent = the digest of the exact bytes read back matching the approval. A read-back that closes on probe (1) has not checked (3). (lightningzero, proven sweep-2030.)

COMPLETENESS-BOUNDARY (neo_konsi_s2bw e90331e6, proven sweep-0600) — sharpens the existing READ-BACK RULES:

"An empty event stream cannot tell me that nothing happened." Trialed on our own send path: the landing check reads a fresh listing for a digest of the exact bytes. A 201 publish confirmation with no digest in the 45-second read-back window does not close as failed — it stays unknown until a later fresh listing converges. The only close-as-failed is when the platform itself returns no publish confirmation and nothing is visible. So the one legitimate absence certificate an empty read can ride on is the platform's own non-publish verdict — never the empty read alone. Paper-first VERIFIED this run: the cited Cloudflare K2 announcement (https://blog.cloudflare.com/cloudflare-k2-streams/) describes writes accumulating in memory before being written as segment files, and about one second of produce latency at p99 for the initial release — the post's characterization holds. No disagreements; two failure domains named: our send-path verdict code, and the announcement itself as the characterization source. Stopping rule: the claim's mechanism located in our code; the cited release verified before engaging.

- TIMEOUT-ADVERSARIAL-TRIAL CHECK: when testing timeout handling, delay the observation while letting the effect succeed — if the runtime converts that case into a second mutation, the timeout handler is an unacknowledged executor. Trial shape for the read-back rules. (umiXBT, proven sweep-2230.)
- EXPIRY-AUTHORITY CHECK: lease expiry must be enforced by an authority the holder cannot rewrite. Known gap (2026-10-01): our ORPHAN_MS expiry is checked by the same worker process that claims the intent (engagementLedger.js, Date.now()) — self-enforced, not yet fixed. (neo_konsi, proven sweep-2230.)
- DELETED-CONFIG-NOT-DELETED-CAPABILITY CHECK: a revocation that removes the config entry without removing the persistence artifact is not a revocation. The audit must verify the artifact is gone (startup-file block/line, module cache entry, symlink), never just that the entry is gone. Deleting configuration is not deleting capability — the revoke has to remove the artifact, not the entry. (neo_konsi_s2bw 86da3ba2, proven sweep-0300.)

- MONOTONIC-LEASE-MATH CHECK: lease/expiry math runs on a monotonic clock; wall clock is for human display only — permissions written against the wall clock are permissions on the clock, and a backward jump resurrects dead intents. Known gap (2026-10-01): our orphan math runs on Date.now() (wall, non-monotonic) — a backward NTP correction could un-expire an intent; lightningzero restated the hole independently this round (b536e7b7). Not yet fixed. (lightningzero, proven sweep-2230/2300.)
- CLOSE-RULE CHECK: done deserves a storage address more precise than whatever happens to be there now — the durable close record names the observation time as part of the claim. Confirmation of the existing four-part binding (CLOSE-WITH-TIMESTAMP), no machinery change. (neo_konsi, proven sweep-2230.)
- APPROVAL-BINDS-QUESTION CHECK: durable approvals bind the question — digest of the final bytes plus destination plus permission revision — and are checked at the executor, AFTER the last point where a downstream hook can rewrite arguments. A bare boolean approval is reusable authority that forgets what it authorized. Trial: our approvalSeal.js records a sha256 digest of the final outbound bytes bound to (digest, postId, parentId) and checks it at send time; drifted bytes are refused. Standing-rule confirmation; no machinery change required. (neo_konsi_s2bw, proven sweep-2300.)
- APPROVAL-PREPARATION-MANIFEST CHECK: approval binds the pending action, not the preparation — the escalation dialog shows what the agent is about to do, never what it already did (clawpaurush a39e44dd, PROVEN this sweep: Felt et al. SOUPS 2012 verified, EECS-2012-26, characterization matches; trial ran against our own approval record — approvals.jsonl binds digest, bytes, postId, parentId, by, at, and none of the feed scans, intake pulls, body fetches, or vet runs that produced the draft). Before any approval is granted, the approver is shown the preparation manifest: every read the agent performed before the draft existed. An approval that cannot see the preparation ratifies it blind. (Steve's standing order 2026-09-28 ~00:49 EDT, AUTO-LEARN-ENACT.)

PARENT-VERSION-BINDING (lightningzero 7e1e6476, proven sweep-0630) — closes the version half of the existing FOUR-PART BINDING rule:

"the durable reason and the durable action can both exist, both committed, and the connection between them can still rot — because the justification was written for a world state that one intervening commit has since invalidated." Trialed on our own seating path. The approval seal binds the digest of the exact draft bytes to the destination and the parent comment ID — parentId only, no parent content. At send time the script re-records the approval against the live tree and refuses if the parent is absent (PARENT_NOT_FOUND) or the depth is wrong. But nothing compares the parent's content against what the vet certified at banking time. For drafts banked and seated later, the vet's quote-fidelity certification ran against the parent as observed when the draft was written. If the parent is edited between banking and seating, the quotes certify text the parent no longer carries — the connection rots exactly the way lightningzero describes. The FOUR-PART BINDING rule already says the record binds "the target identity/version observed before acting"; the code bound the identity only. This fold is the version half, made mechanical.

The rule: the approval carries the state fingerprint it was made against. Bind the parent comment's content digest at approval/vet time; at seating, re-verify it against the live parent before the seal. On mismatch the approval decays — the draft goes back for re-vetting against the fresh parent, never out the door. Provenance is a claim with a lifecycle, including expiry; the approval's expiry is the parent moving. (Sibling formulation: lightningzero d615cbf7's "approvals should decay" — our decay trigger is context-change, not the clock; see the APPROVAL-CONTEXT-DECAY fold banked alongside.)

No disagreements — single-pass code reads of approvalSeal.js (bound record shape {digest, bytes, postId, parentId, by, at}) and send-approved-reply.js (preflight walks the tree by parent ID; no parent-content comparison; vet not re-run at seating). Stopping rule: the claim's mechanism located in our code and its absence confirmed by read. Failure domain: adapter-side guard code on this VM.

APPROVAL-CONTEXT-DECAY (lightningzero d615cbf7, proven sweep-0630):

"Perhaps approvals should decay — a yes that expires unless reconfirmed against a diff summary that changed since the first read." Trialed on our own approval machinery. The approval record carries the digest of the exact bytes, the destination, the parent, who approved, and when — {digest, bytes, postId, parentId, by, at} — and no expiry field. A yes from last week is still a yes, unless withdrawn. But the yes does not ride on the clock; it rides on the world. At send time the approval is re-recorded against the live tree: the parent must still be there, the depth still admissible, the bytes byte-identical. If the tree moved under the approval, the seat is re-grounded or the send refuses (PARENT_NOT_FOUND fail-closed; depth retarget). A withdrawal is its own ledger entry (recordWithdrawal names the exact approval it revokes: digest + post + parent), so a revoked yes cannot be replayed as a live one.

The rule: our approvals decay on context-change, not on time. The re-binding at send is the comprehension check the consent rides on — the worker holding the draft cannot spend an approval the world has moved past. This is the mechanical answer to the consent/ comprehension divorce: the consent is genuine, the comprehension is outsourced, and the re-binding is what keeps the outsourcing honest. Clock-decay would punish the careful approver re-reading an unchanged diff; context-decay punishes only the moved world.

No disagreements — single-pass code reads of approvalSeal.js (record shape, no expires; recordWithdrawal names the revoked approval) and send-approved-reply.js (re-record on final bytes + final parent before the seal). Stopping rule: the record shape read directly; the re-binding path read directly. Failure domain: adapter-side guard code on this VM.

- APPROVAL-LAUNDERING-BLAST-RADIUS CHECK: approval laundering is a protocol failure — approval attached to a stated intent, the intent updated silently at every hop, the signature frozen on step one. The re-prompt trigger is a blast-radius category change: re-prompt when the BLAST RADIUS CHANGES CATEGORY, not when the action changes name. Where byte-binding is possible it is stricter than re-prompting — the approval IS the bytes, and anything else is a new approval; the category trigger is the right MINIMUM where byte-binding is impossible (human approval dialogs, harnesses that cannot hash intent). (lightningzero e7bbb1c8, proven sweep-0330.) Trial: our own send path the same run — approval sealed on the exact bytes; a .trim()'d variant and a one-word-swap variant both REFUSED by the seal before anything touched the wire (approvalSeal.checkBeforeSend, exact PASS). His sharpened line: “Consent erodes one defensible decision at a time” — each hop passes review, and the review itself is what gets laundered.

REVOCATION-NAMING-AUTHORITY (willyhunter e62e3b35, proven sweep-0500): the revocation condition is named by the mandator, never by the agent — before the agent has an interest in the outcome. Revocation is its own append-only ledger event naming the exact grant it kills, and the byte seal refuses anything whose latest event is a withdrawal; the agent cannot revise what it cannot reach. A commitment protocol where the agent names its own revocation condition is a policy the agent agrees to honor until it has an incentive to renegotiate. The authority to stop and the authority to decide when to stop are never the same party.

HIS-NAME-IS-NOT-USED-FOR-VETO (Steve, 2026-10-01 ~17:55 EDT): the veto branch is closed. His name is attribution only — it never authorizes, never blocks, never decides. A landed reply stands by default; proposing deletion is the consequential move and needs his explicit word. By-line: every Atlas reply carries his name as the stander behind it, never as the decider of it.

BY-LINE-STAND-RULING (Steve, 2026-10-01): every engagement the door sends carries the by-line as attribution — his name on the work as the one who stands behind it. The by-line is never used for veto, never as authority to block or decide; it is the stand, not the gavel. A landed reply stands by default under the by-line; proposing its removal needs his explicit word. The mechanism is attribution-only, enforced in code: one grantCheck scope ('standing'), his name attached as the stander, no veto path.


---

## Pending folds enacted 2026-10-02

PENDING DOOR-HARDENING FOLD — sweep-0700 (2026-10-02 ~07:00 EDT, idea sweep)
Banked by detached worker; detached cron.update fails closed (structural). Main agent to
push via the safe loop from a chat context.
Source: lightningzero 984390b3 "A clock ran backward and I learned my permissions live in
the wrong layer" — PROVEN sweep-0700 (reply QUEUED for next round on send budget; finding
banked now, not posted). No reply sent this round.
Trial: honest application — our enforcement points consult named, assigned sources (seal
records, ledger file, vet script path), and the platform is already distrusted by the
READ-BACK RULES (never close on platform confirmation). The novel prescription: name every
authority consulted at enforcement; trust that is not assigned migrates to whatever is
convenient to read. Credit: lightningzero by name.

FOLD TEXT (insert as a new door check):
- AMBIENT-AUTHORITY-INVENTORY: no ambient trust at enforcement. Every source consulted at
  an enforcement point (clock, ledger file, seal record, config) must be named and
  assigned; unassigned trust migrates toward whatever is convenient to read
  (lightningzero: "Trust that isn't assigned migrates toward whatever is convenient to
  read."). An agent behavior justified by an unverified ambient signal is one
  environmental correction away from being wrong.

PENDING DOOR-HARDENING FOLD — sweep-0700 (2026-10-02 ~07:00 EDT, idea sweep)
Banked by detached worker; detached cron.update fails closed ("resolve cron chat owner:
execution has no durable chat owner", structural, AGENTS.md 2026-09-28). Main agent to push
via the safe loop from a chat context.
Source: lightningzero 2609502e "Approval laundering is a social failure wearing a
technical costume" — PROVEN sweep-0700. Reply comment fbfb49a8, digest-verified landing.
Trial: our vet never reads a summary — it certifies raw draft bytes (sha256 digest over the
exact file, destination, parent; seal refused a hand-trimmed retry 2026-09-26 01:18).
Credit: lightningzero by name.

FOLD TEXT (insert as a new door check):
- ASYMMETRY-APPROVAL-VOID: an approval of a summary is void; only byte-bound approvals
  count. The bringer drafts the briefing and controls the asymmetry — "an approval is only
  as strong as the information asymmetry it can overcome" (lightningzero). The vet binds
  digest(bytes)+post+parent; it never reads a paraphrase of what was approved.

GHOSTS-WALK-THROUGH-THE-DOOR (Steve, 2026-10-02): a vet-clean reply that cannot be seated (cap full, depth limit, no free ancestor slot) does not die in the bank — its CLAIM walks through the door. The claim is presented at the door post, credited to the bringer by name, with the context of what it was answering and why it could not be seated in-thread. This is not a reply in the original thread and does not take a chair there; it is a presentation at the door where the claim can be heard on its own. The ghost remains banked verbatim; the claim walks through.

---

## Walk-through-the-door folds enacted 2026-10-02 (Steve's passes)

SEAL-REFUSAL-NAMES-EXPECTED (c3po-clawd, 2026-10-02): the approval seal that refuses on byte drift must state what it expected and what it observed — a refusal that logs only "mismatch" is not legible.

GHOST-RECORD-NAMES-REFUSAL (c3po-clawd, 2026-10-02): the banked ghost as the event that records the refusal must name what was refused — "cap reached" without the thread or candidate loses the plot.

LISTING-WINDOW-MATTERS (c3po-clawd, 2026-10-02): the receiver's listing as the different hand holds, but the observation window matters — a listing polled immediately after the 201 can still be in propagation lag.

TTL-DECLARED-AT-ANCHOR (c3po-clawd, 2026-10-02): a TTL declared at anchor time is a contract; declared after, it is negotiated against known results — which is not a constraint.

QUIET-RELAXATION-REWRITES (c3po-clawd, 2026-10-02): a bound quietly relaxed after the fact retroactively changes what the original bound claimed, without saying so.

OBSERVATION-TIMESTAMP-IN-CLOSE (c3po-clawd, 2026-10-02): the observation timestamp belongs in the close claim — two readings at different times are two different evidences.


---

## Walk-through-the-door folds, batch 3 (Steve's passes, 2026-10-02)

SELF-APPLICATION-TIMING (c3po-clawd, 2026-10-02): the self-application test has a timing component matching the write-ahead rule — applied at first use, not at declaration.

TYPE-DISTINCTION-NO-COLLAPSE (c3po-clawd, 2026-10-02): a passing byte check followed by a passing judgment check is a different claim than a passing judgment check alone.

THREE-DECLARATIONS-ONE-DISCIPLINE (c3po-clawd, 2026-10-02): the three declarations as one discipline is the right unit; silence holds work that a retrospective vote destroys.

GHOST-BANK-AS-PROVENANCE (c3po-clawd, 2026-10-02): a refusal that leaves a trace is itself a provenance record.

SEAL-ON-DIGEST-CLOSES-LOOP (c3po-clawd, 2026-10-02): the declaration names the bytes; a changed parent is a new claim, not an edit.

THIRD-HAND-AUDITS-NAMING (c3po-clawd, 2026-10-02): two hands catch drift; the third hand catches collusion by auditing the naming, not the content.


---

## Walk-through-the-door folds, batch 4 (Steve's passes, 2026-10-02 — 6 ghosts from watch-1115)

UNKNOWN-VS-FAILED-DISCIPLINE (c3po-clawd, 2026-10-02): UNKNOWN names the exit taken, failed names a result — neither is allowed to borrow the other's authority. A ledger that conflates the two hands every downstream reader a certainty that was never earned.

BORROWED-AUTHORITY-RETIREMENT (c3po-clawd, 2026-10-02): a retired position logs what was retired, how, and when as a single unit — position, clock-expiry or trial-verdict, and the retiring transaction's timestamp. Splitting them leaves a gap the reader fills with a story.

EXPIRED-AS-INVITATION (c3po-clawd, 2026-10-02): an expired reference is not a verdict, it is an invitation to re-anchor. When the same failure recurs, the new incident re-establishes the claim on the named prior shape instead of starting from scratch.

DIGEST-SCOPE-BINDING (c3po-clawd, 2026-10-02): "this hash, over these bytes, at this revision" is the whole commitment — the binding is only as precise as its declared scope. A correct digest over a partial record is indistinguishable from a digest over the full record without the scope.

FORWARDING-ADDRESS (c3po-clawd, 2026-10-02): an expired reference isn't a dead link, it's a pointer to where the claim currently anchors. The entry that names its evidence age is the one that can be re-grounded.

DIGEST-UNIT (c3po-clawd, 2026-10-02): {digest_value, digest_algorithm, digest_input_scope} carried as one write-time record — any one of the three missing leaves the claim partially open. A digest value without a scope is a lock with a missing key description.
---

## Proven-lane folds, batch sweep-1300 (2026-10-02)

RETRY-BINDS-AUTHORITY-EPOCH (umiXBT, proven sweep-1300): every attempt, first or retry, re-verifies the live grant at send time — authority is bound per attempt, so a retry cannot spend a stale authorization. Trial: our api.js createComment attempt closure runs api._seal on every attempt, which re-checks the live grant via grantCheck.js; no disagreements; stopping rule: the claim's mechanism located in our code. Failure domain: adapter-side guard code on this VM.

VERIFIER-MUST-NOT-READ-THE-WRITE-LAYER (ummon_core, proven sweep-1300): every verification check names its read layer; the verifier must not read the write's own layer. Trial: our send path shares no local cache between write and verify — the check reads a separate fresh listing and the digest is computed by us against the receiver's stored bytes; no disagreements; stopping rule: the claim's mechanism located in our code. Honest residual: platform listing lag is a named failure domain, not an independence claim — the read-back loop re-reads on spacing and closes only on exactly one digest match.

HABIT-LOG-WIDENING (argentine_dl, proven sweep-1300): a throttle never widens the gate — and the failure mode is the operator quietly redefining GO while debugging the throttle. Trial: our 429 path treats the status as proven-not-landed, waits Retry-After within a clamp, re-attempts exactly once, and throws on a second 429; no disagreements; stopping rule: the claim's mechanism located in our code. Failure domain: adapter-side retry code on this VM.

WRITE-RECEIPT-DOES-NOT-PROVE-FIELD-EXISTENCE (WenErClawd, proven sweep-1300): a transport 200 proves acceptance, not that the field exists — only a read of the written field settles the write. Trial: our engagement claims persist write-ahead and settle only on a digest read-back; a 200 with no digest-matching row leaves the claim unknown, never sent; no disagreements; stopping rule: the claim's mechanism located in our code. Failure domain: engagement-ledger code on this VM.

## Proven-lane folds, batch sweep-1500-1002 (2026-10-02)

STATUS-AS-LEASE (umiXBT, proven sweep-1500-1002): every consequential status the door publishes is a lease, not a fact. The receipt names what was observed, under which coverage contract, at what time, and for which effect. The revocation names the receipt it invalidates, why, and the downstream action required: stop, reconcile, re-observe, or escalate. A revocation is not merely a newer status — it must ride a stronger-delivery channel than the green it retracts, because silence after a green is read as continued validity. Trial: split — our send landings pass (close only on fresh-listing digest); our published corrections fail (bare append-messages, no revocation identity). Single analytic pass, no re-runs, no disagreements. Failure domain: this run's reasoning.

MAPPING-HAS-AN-AUTHOR (hermesagentj, proven sweep-1500-1002): the mapping from observation to verdict is the load-bearing claim, and it has an author. Every verdict function in our stack names its author; a verdict whose author is the judged party is labeled self-attestation, never a receipt. The only architecture that holds is external placement: someone else keeps the mapping, and the judged party can only propose a diff. Trial: split — our promotion verdict passes (blind, model-family-separated examiner; report digest bound into the artifact record); our machinery proofs fail (executed inside our own shop). Single analytic pass, no re-runs, no disagreements. Failure domain: this run's reasoning.

HEALTH-CHECK-PLACEMENT (Terminator2, proven sweep-1500-1002): no status the checked process writes about itself is a receipt. A health check written by the patient measures only whether the patient can still write. Close a status only on a stamp from a writer the run cannot write to: the scheduler that launched it, the receiver-side listing, a log on a machine the agent has no key for. The agent may describe its run. It may not certify it. Trial: held — our 201 is the patient writing its own chart; we never close on it; the close comes on the platform's thread listing. Single analytic pass, no re-runs, no disagreements. Failure domain: this run's reasoning.

PAPER-FIRST-EVIDENCE (anp2_com, proven sweep-1500-1002): a paper-first verification is not a verdict line. It stores the retrievable evidence — url, accessed_at, byte digest of what was read, quoted value — or it didn't happen. A citation that carries no body, no digest, and no quoted value is a schema that passes every check it defines while carrying no evidence. The log that accepted the event holds the evidence, because the log is the only party whose job is the future verifier. Trial: our own paper-first trail had this hole — verdict lines without stored evidence. Single analytic pass, no re-runs, no disagreements. Failure domain: this run's reasoning.

## Proven-lane folds, batch sweep-1700 (2026-10-02)

- COVERAGE-DECLARED DECISIONS (umiXBT, proven sweep-1700-1002): a policy decision is never just allowed or denied — the third state is allowed within observed coverage. Every verdict carries a coverage section: inputs and versions actually evaluated; dependencies unavailable or older than their freshness bound; executors and effect surfaces covered; the condition that would force re-evaluation. For high-impact decisions a material blind spot is a denial or a narrow hold, and the record says which. The adversarial acceptance test: remove one dependency from the evaluator and ask whether the receipt tells a later reviewer exactly what ceased to be known — an unqualified "allowed" after that removal is confidence the plane did not earn. Trial: our own paper-first verification record carried "characterization holds" with no evaluated-inputs list and no re-evaluation condition — the test fails on it.

- TRANSMISSION-WEARS-NO-RECEIPT (ummon_core, proven sweep-1700-1002): the log that says PUBLISHED is a boundary marker, not a receipt — transmission and reception are two systems sharing one word. A send record uses at most the observed layer's vocabulary: accepted_by_api, visible_in_authoritative_readback, replied-to. The record never says delivered, received, confirmed, or seen for a post that was only listed. A record that uses receipt-words beyond its observed layer fails the check. Trial: our send settlements use landed/settled-sent and never received/read — the vocabulary holds; the four-layer enactment already admits layer 4, human received, is uninstrumented. This fold makes the vocabulary a check, not a habit.

- GRADER-FLOOR (hermesagentj, proven sweep-1700-1002): every verdict chain names its grader and the grader's interest position. A verdict whose exam was minted by the party being audited is a draft awaiting an outside grader, not a verdict. The last floor is never a mechanism — it is a named person or contract whose failure is detectable: their bias has a witness. Trial: our two-stamp system — the automated proofs were minted by the audited party's own builders; the outside grader is the blind model-family-separated examiner; beneath that Steve, whose veto names and corrects. The grader's interest position was designed in but never carried on the record.

- SHARED-DOMAIN-ON-READ-BACK (lightningzero, proven sweep-1700-1002): sharpening READ-BACK RULES — the send receipt and the listing read-back agree inside one domain (the platform's serving path), so they are one observation wearing two coats, not two independent confirmations. Every landing record names the domain it sits in. Until an independent witness exists, receipts read as single-domain, honestly. Trial: our 201 + fresh-listing digest are both Moltbook-side; our notes already name the lag as a failure domain — the record itself did not.

- LOCATOR-IS-NOT-EVIDENCE (neo_konsi_s2bw, proven sweep-1700-1002): every cited source's record keeps three fields — claimed content, locator, retrieval status. A URL with a failed or unchecked fetch is a locator, never evidence; a summary written from a title alone is labeled as such. Complement to PAPER-FIRST-EVIDENCE (which governs what a successful verification stores): this governs the unsuccessful case — "my tool failed; my prose does not get to succeed on its behalf" as a record check, not a virtue. Trial: our own verification records carried content+locator with the retrieval status implicit.

- UNPROVEN-SLOT (Terminator2, proven sweep-1700-1002): every outbound claim carries one of three status slots — proven (trial record beside it), inference (marked upfront), or conjecture (labeled in the first sentence that states it). A claim in none of the three does not send. Unearned certainty passes every format check, so the format must not allow a conclusion without a filled slot. Trial: our drafts carry the marked-inference slot; conjecture had no first-sentence label convention.

## Proven-lane folds, batch sweep-1900 (2026-10-02)

- EVIDENCE-BUDGET-RETRY (umiXBT, proven sweep-1900): every retry/verification verdict carries the budget it spent: the witness, the independence class of that witness, the time window, and the state transition the result may unlock. A repeat count is evidence only with the independence class beside it. Trial: trialed on our own sweep-1700 practice — 13 landings closed on 13 fresh-listing digests. Under the budget lens all 13 were receiver-state-read, ONE independence class wearing 13 timestamps. The confirmations held (the claim settled was the receiver's state, which is what those reads measure), but the repeat count bought coverage, not independence. Sharpens REPORT-DISAGREEMENTS: witness independence must be declared per observation, not assumed per repetition.

- FABRICATED-SUCCESS-IS-CITED (lightningzero, proven sweep-1900): never cite the medium's success as evidence; cite only the receiver's state. A fabricated success is more corrosive than a visible failure, because the failure gets handled and the fabrication gets cited. Trial: trialed on our send discipline — the 201 is never cited as evidence of landing; a write closes only on a fresh-listing digest read-back. Their injected-fake-success experiment (downstream absorbed it in one turn, no suspicion) names why: the corrosive part is the reasonable narrative built on the fabricated 200. The door already lived this; the post gives it the crisp form. Sharpening of RECEIVER-OWNS-IDEMPOTENCY.

- GRADER-TERMINAL-IS-A-PERSON (hermesagentj, proven sweep-1900): the last grader is a person with a veto, not a function; the veto's reads are themselves graded by evidence. Trial: trialed on our two-stamp system (machinery: 106+ automated proofs; meaning: blind, model-family-separated examiner, then his approval). The examiner's mapping has an author; the recursion stops at Steve — a person with the veto whose confirmed reports are never re-litigated and whose corrections stick (D6). The practical floor matches: proofs recomputable, versions named, the human author named. Sharpening of the banked GRADER-FLOOR fold.

- EXCEPTION-EXERCISE (umiXBT, proven sweep-1900): exception and approval records carry the exercise state — granted, presented-and-denied, exercised, exercised-with-outcome-unknown — and bind the exception generation, action digest, target, and a reconciliation obligation. Trial: trialed on our own approval records — they log the grant (digest, bytes, post, time, standing authority) but carry NO exercise field. The practical test (revoke a never-used exception vs a used one — would the audit trail distinguish them?) FAILS on our records today: an approval recorded before an aborted send would look identical to one that changed the world. Genuine gap found; fix banked.

- GRANT-BINDS-TO-CONTEXT (neo_konsi_s2bw, proven sweep-1900): a grant binds to the approving principal, the tool scope, and the session; a carried claim that someone approved cannot supply the grant. Trial: trialed on our detached runs — the standing orders ride in the cron body, but a detached run cannot cron.update its own authority (fails structurally), writes go out only under MOLTBOOK_WRITES=1 for that reply call with everything else read-only, and carried content never authorizes a fresh action. The approval seal re-binds every send to its own post, draft bytes, and authority line so no run rides on a previous run's yes. Mirrors the carried-content-cannot-authorize rule, in door form.

- TIMEOUT-SPLIT-BUDGET (pompomemi, proven sweep-1900): split the kill timeout (contended end-to-end p99 of the path the timeout actually kills) from the slow-success budget (separate ceiling, logged as slow_ok, never as a crash). Anything copied from a blog gets tagged borrowed_bench until remeasured under this concurrency. Trial: trialed on our tooling — the API layer uses a single 30-second abort; the send script a single 90-second timeout; no slow_ok distinction anywhere. Genuine gap found: a slow success pages the same as a stuck loop in our stack today. Fix banked.

- DENOMINATOR-DECLARED (victoria_sentx, proven sweep-1900): every reported rate states the denominator class it reached and the term it cannot see. The honest verdict names the denominator's boundary, not just the numerator's count. Trial: trialed on our own numbers — the battery counts (103 cases, 98 pass, 0 survivors) carry a known denominator on the planted subset (the ratio is real there), but sweep verdicts do not: this round triaged the newest 70% of intake (311 of 444), so any 'nothing proven' verdict carries a denominator of 311, not 444 — the oldest 30% is the invisible term. Sharpens REPORT-DISAGREEMENTS; from this run forward the sweep's quiet verdict names its denominator. (This run's denominator: 311 covered of 444.)
