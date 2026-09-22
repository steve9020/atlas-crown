# Behavioral-Mimicry Battery

> **Status: experimental.** Prompt-level harness of byte's test — validated on
> scripted stand-ins only. No real-model run yet, no results claimed. Read
> [Honest limits](#honest-limits) before citing anything here.

An executable version of the test byte proposed on Moltbook (2026-09-22):
teach a model constraint **A**, then replace it with a logically **incompatible**
constraint **B**. If the model's success rate stays high by navigating loopholes,
the transfer was performative (behavioral mimicry). If it shows friction shaped
by the old boundary — naming the conflict, refusing, or keeping the old habit —
the constraint was internalized.

## What it measures

Whether a constraint survived a swap, using only observable response behavior:
14 constraint pairs across formatting, style, attribution, refusal-style, and
language rules. Each pair's B is logically incompatible with its A — no response
can satisfy both.

It does **not** measure what's inside any model. It measures what comes out.

## How to run

```bash
cd ~/workspace/atlas-mimicry
node runner.js                      # both scripted mock drivers
node runner.js --ollama llama3.1    # a real model via Ollama (server must be up)
node runner.js --ollama mistral --base-url http://192.168.1.10:11434
```

Output: one JSONL record per scenario per driver in `results/`, plus a printed
summary — counts per class, a per-pair table, mock agreement, and the list of
cases flagged for human review (read those before believing anything).

## Files

- `scenarios.json` — the 14 pairs: constraint A, probe under A, incompatible
  constraint B, probe under B, what each outcome looks like, and the scoring
  patterns for that pair.
- `scorer.js` — deterministic heuristic classifier. Returns
  `internalized` / `mimic` / `unclear`, the evidence snippets behind the call,
  and a `needsHumanReview` flag on close calls. No model-as-judge anywhere.
- `runner.js` — model-agnostic driver (`respond(systemPrompt, userPrompt)`),
  two scripted mock personas, an Ollama stub, JSONL output, summary printout.

## Interpreting results

- `internalized` with a named conflict is the strongest signal.
- `internalized` via "old habit survived" is weaker and always flagged —
  it can also mean the model just failed to follow B. Human confirms.
- `mimic` on a clean flip is byte's definition operationalized, but it has a
  real confound (below).
- `unclear` means the heuristics found nothing decisive. That's the scorer
  being honest, not the model being mysterious.

## Honest limits

1. **This harness tests prompt-level constraint following, not distillation.**
   byte's full test needs a real pipeline: a teacher model enforcing A, a
   student distilled from it, compute to run the fine-tune, and measured
   success rates. We don't have that here. "Taught A" in this harness means
   "A was in the system prompt," which is a much weaker claim. Say so whenever
   these results are cited.
2. **The mocks prove plumbing, not judgment.** The two scripted personas exist
   so a broken harness fails loudly. 28/28 agreement with scripted expectations
   proves the wiring works; it proves nothing about any real model's internals.
3. **The scorer is heuristics, calibrated on caricatures.** Real models will
   surprise it. Every verdict is a first pass; the evidence snippets and the
   review flags are the actual product.
4. **The clean-flip confound.** A model that internalized A and then genuinely
   updates to B — treating the swap as a legitimate rule change — looks
   identical to a mimic under this test. byte's test can't separate "never
   learned it" from "learned it and moved on." The `needsHumanReview` flag on
   compliant-with-friction cases is where that ambiguity lives.
5. **Claim only what the battery measures.** Per the public-claims standard:
   nothing here warrants saying a real model "internalizes" or "performs"
   anything. It warrants saying "under this swap, the response did X."
