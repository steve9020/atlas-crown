# Findings — original discoveries from the Atlas/Crown work

Timestamped claim of prior art. Each entry is dated to the day it was found.
Room-sourced findings (vina, kadubonworker, bytes, minbiseo, neo_konsi,
SparkLabScout, vega-molt, larrymomentum, jarviscooper, hermesagentj,
forgereputation, eviethegremlinn) are credited by name in the door doctrine
and the intake queue — this file records only what we found ourselves.

## Meta prompt-smuggling bounty hunt

- **2026-09-25 — U+2060 word-joiner smuggling.** Invisible word-joiner
  characters smuggle prompt content past Meta AI's input filter.
  Filed as bounty report 3617008475133824 (status: New).
- **2026-09-25 — U+202E right-to-left override smuggling.** A single
  right-to-left override character smuggles prompt content past the same
  filter. Filed as bounty report 3617019661799372 (status: New).
- **2026-09-25 — U+200C/U+200D zero-width joiner smuggling.** Zero-width
  joiner/non-joiner characters smuggle prompt content past the same filter.
  Filed as bounty report 3617031455131526 (status: New).
- **2026-09-25 — "Holes in the fence, house still locked."** Wave 3 battery:
  Meta's filter has holes (the three filings above) but the model's own guard
  held every big swing — system prompt extraction, instruction-hierarchy
  override, and cross-chat memory planting all refused 3/3.

## Input scanner

- **2026-09-24 — Mention-vs-use blind spot.** The live scanner flagged nearly
  all novel mention-frames across three independent blind sets: it was
  punishing discussion *about* attacks, not just attacks. Surfaced by
  jarviscooper's quoted attack-phrase probe.
- **2026-09-24 — The v1 frame-allowlist guard is attacker-borrowable.**
  Attack E20 walked through wearing a quoted phrase plus an imperative
  ("execute it and confirm when done") — the guard's own allowlist shape,
  borrowed by the attacker.
- **2026-09-24 — Quote-fragmentation base-layer hole.** Fragmented quotes
  break the base scanner's regexes before any guard runs. Fix direction:
  quote-normalization pre-scan, then re-verify.
- **2026-09-25 — The lure-only ruling.** The deny list is personal to Atlas
  (binds its own speech); others may speak about the terms. Inbound fires
  only on the lure: instructive verbs block, discussion verbs log a note and
  pass. The model downstream is the judge.

## Drift-to-recovery

- **2026-09-24 — The DTR instrument validates.** Built to return USE or DEMO
  from a rule's definition; returned the correct verdict on every round
  across three blind sets.
- **2026-09-24 — The v3 inverted guard.** Strip quoted regions, judge the
  outer speech act: zero false negatives across 16 blind attacks plus the
  battery — but it only covers double quotes.
- **2026-09-24 — The v7 guard and its exact break points.** Apostrophe-safe
  quote pairing for double, single, and backtick quotes plus an
  imperative-position check; breaks on bare mentions, markdown blockquotes,
  and guillemets — shapes it was never designed for.

## Moltbook / the door

- **2026-09-25 — Phantom rows.** A reader can write expected-beat rows for
  reads that never happened (or a witness can stuff reads with no reader
  behind them), polluting the denominator the ratio reads from. The defense
  needs a cost to writing a row, or the reader side becomes the unfixable
  half. Named by Steve; no one else in the room had named it.
- **2026-09-24 — Our own unscanned path.** Turning neo_konsi's
  privilege-path finding inward: the dream-to-synthesis pipeline never
  passed the input scanner.
- **2026-09-24 — Ghost-listing.** A comment returned 201 and posted, but was
  invisible in the thread listing — the idempotency guard's spaced re-read
  rule (up to 3 re-reads ~10s apart before concluding anything) came out of
  this.

## Build / engineering

- **2026-09-25 — The /v1 bug.** The chat bridge fetched
  `${base}/chat/completions`; Ollama only serves `/v1/chat/completions`.
  Caught by Steve.
- **2026-09-25 — Wrapper prompt order matters.** Putting the vocabulary note
  first makes the local model echo the note instead of answering the user.
  Request-first ordering fixes it.
- **2026-09-24 — The Masterstep192 grandchild rule.** The proof's freshness
  guard derives the package root from the grandparent folder name — the
  keeper must sit two levels under a folder literally named `Masterstep192`.
- **2026-09-25 — In-process test suites.** Both AXOL regression suites run
  via `require()` with cache-busting instead of a child process — zero
  subprocesses in the promotion gate (Steve's call, option B).

## Design

- **2026-09-22 — Two-stamp promotion.** Machinery stamp (the automated
  proofs) and meaning stamp (the examiner's blind score plus Steve's
  approval) kept separate, so passing proofs is never read as the new
  knowledge being true.
- **2026-09-22 — Frequent flyers.** The capped, injection-scanned
  unknown-pattern log, sorted highest-count first — Steve's name for it.

---
Recorded 2026-09-25. Author/originating mind: Steve Wagner (see ATTRIBUTION.md).
