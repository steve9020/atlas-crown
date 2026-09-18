# Fixed packet — what changed vs the original 0_63o7 zip

This packet is executable end-to-end. Changes made during independent review
(2026-09-18):

## Security fix (reviewer-found, author-approved)
- crown_modules/CrownExecutionRecoveryContinuity.js — execute(): the idempotent
  replay branch now re-binds transition_id, authorization_id,
  validated_state_digest, and scope to the execution token and requires
  Sigma_2 ⊆ Sigma_1 on replay. Previously a replayed contract could widen
  scope / swap authorization and still return PASS. See the review report.

## Mechanical path fixes (no behavior change)
- crown_modules/CrownAuthorizationApplicability.js — require path corrected:
  '../AuthorityControlGuard' -> './AuthorityControlGuard'.
- phase9/crownPhase9LiveResponseContainmentTest.js — require path corrected:
  '../runtime/governance/crown/CrownLiveResponseContainment'
  -> '../crown_modules/CrownLiveResponseContainment'.
- phase9/CrownLiveResponseContainment.js — identical duplicate of the
  crown_modules copy; its relative requires now point at ../crown_modules/.

## Reconstructed stubs (fail-closed, MUST be replaced before external review)
These files were absent from the original packet and were reconstructed as
explicitly-marked, deny-by-default stubs so the packet executes:
- crown_modules/AuthorityExposureRegistry.js
- crown_modules/FOUNDATION_INTEGRITY_AUTHORITY_CONTRACT.json
- crown_modules/AUTHORIZED_HUMAN_DEVELOPER_REGISTRY.json (zero principals)

Each stub file carries a header stating it is reconstructed. With the stubs,
every capability-gated action denies, the foundation gate quarantines AI
change requests, and its self-audit correctly fails closed (it cannot pass
without the real human-developer registry). Replace all three with the vault
originals before sending this packet to an external reviewer, then re-run:
  node phase9/crownPhase9LiveResponseContainmentTest.js

## Verification performed on this fixed packet
- All 13 JS modules load under node.
- phase9 containment test: PASS.
- Original attack repro (replay with widened scope + swapped authorization):
  now FAILs with replay_scope_widening / replay_authorization_mismatch.
- Legitimate identical replay still returns PASS idempotent:true.
