# Atlas/Crown

A governed reasoning system designed to help a person examine complicated thoughts
without the system silently changing what the person originally said.

**Atlas** is the backend. It preserves the source statement, separates observations
from interpretations and assumptions, tracks where conclusions came from, tests
competing interpretations, detects contradictions and recursive reasoning failures,
and prevents later interpretations from quietly becoming treated as original facts.

**Compass** is the user-facing side. It takes that structured reasoning and returns
it in understandable language so the person can see what they said, what was
inferred, what remains uncertain, where different ideas became mixed together, and
what conclusions are actually supported.

Governance is the core: no component gets to declare something true simply because
another component passed it along. Evidence, confidence, provenance, validity,
context, authorization, and interpretation remain separate. Unknown or conflicting
information is preserved as unresolved instead of being converted into certainty.

The purpose isn't for Atlas to tell anyone what to believe. It's to create a
traceable path — what was originally expressed → what was interpreted → what was
tested → what survived → what remains uncertain — while keeping the original
source intact.

## What's in this repo

This is the narrow technical review packet: the core Crown governance modules,
the formal model, and the Phase 9 live-response containment gate.

- `crown_modules/` — core executable governance modules (provenance, predicates,
  transitions, lineage, proof qualification, authorization, execution/recovery)
- `phase9/` — live-response containment gate + test
- `formal/` — full formal model
- `instructions/` — the original independent review request
- `FIXES.md` — changes made during review (one security fix, path corrections,
  reconstructed stubs)

## Independent review

Reviewed executable-first on 2026-09-18. One executable counterexample was found
and fixed: the idempotent replay path in `CrownExecutionRecoveryContinuity`
allowed scope widening / authorization swap on replay. The ledger now binds every
authority dimension to the execution token. See `FIXES.md`.

Note: three support files (`AuthorityExposureRegistry`,
`FOUNDATION_INTEGRITY_AUTHORITY_CONTRACT`, `AUTHORIZED_HUMAN_DEVELOPER_REGISTRY`)
ship here as explicitly-marked, fail-closed reconstructed stubs so the packet
executes end-to-end. They deny everything by default.

## Run the test

```sh
node phase9/crownPhase9LiveResponseContainmentTest.js
```

## License

Apache 2.0 — see `LICENSE`. (Replace `[YOUR FULL NAME]` in the copyright line
with the author's legal name.)

## Support this work

If Atlas/Crown matters to you: [ko-fi.com/CenteredTravler](https://ko-fi.com/CenteredTravler)
