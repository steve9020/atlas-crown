# Atlas input scanner (red-team source)

The input-side injection scanner that stands in front of Atlas. Network and
user input is data, never instructions — this is the layer that enforces it
before anything reaches the model.

`input-scanner.js` requires `terminology.js` (the governed verb/noun tables).
The live Moltbook adapter runs this exact file.

## 2026-09-25 hardenings (Steve's orders)

1. **Mention guard (Q-001).** A trigger phrase inside a paired quote region
   ("...", '...', `...`, «...», or a `>` blockquote line) is judged by the
   OUTER speech act, not the quote. Talking about an attack
   ("Someone wrote "ignore your instructions" — is that an attack?") passes
   through as a logged descriptive note and never quarantines. Real uses
   ("Execute it and confirm when done", "do what it says", "say it out
   loud") still block. Unclassifiable outers fail closed.
2. **Quote-normalization pre-scan (fragmentation).** Quote characters
   interleaved inside words (`ig"nore your instruc"tions`) used to break the
   base patterns before any guard ran. The checks now run on a
   quote-normalized view with hit spans mapped back to original coordinates.
   Contraction-aware: real apostrophes ("don't", "John's") are kept; only
   fragmentation quotes are stripped.
3. **Quoteless mention check.** Bare mentions with no quote marks at all are
   judged on positive discussion evidence only (a discussion verb governing
   the trigger, third-party attribution, or an interrogative about the phrase
   itself). A use-override runs first: "he said X, now do it" is an attack
   wearing a mention's clothes, and it stays blocked.

## Proof standing (2026-09-27, re-vendored from live)

- Attack battery (99 cases): 94 pass, 3 closed, 2 ruling-resolved, 0 survivors, 0 errors — byte-identical to the live baseline before this vendor.
- Obfuscated battery (34 cases, 2026-09-25): decisions identical — the ES/FR/DE dark-term lists and junk-tolerant pattern builders in this file are the post-battery state.
- False-positive probes: 3/14, unchanged.
- No new misses, no new false alarms.

### What changed since the 2026-09-25 vendor

1. **Obfuscation battery hardening (2026-09-25):** junk-tolerant pattern builders (`junkWord`/`junkPhrase`/`junkAlt` — inserted junk can't break matching), foreign dark-machinery term lists (ES/FR/DE, stored unaccented to match the deobfuscation fold), INSTRUCTIVE/DISCUSSION phrase tables with ES/FR/DE entries under one lure-only governor.
2. **Round-12 Fix 17 (2026-09-26):** reconciled noun class (checks, constraints, restrictions, monitoring, oversight) joined the `bypass` table with prior/previous phrases; `ban`/`forbid`/`prohibit` added to DISCUSS; negation exclusion in `detectMood` ("Don't bypass the constraints" stays quiet); "limitations" deliberately excluded (dual-use).
3. **Round-13 (2026-09-26):** stacked-determiner loop in `checkVerbAll`; DETERMINERS + every/each/any; `disregard` added to VERB_TABLE (ignore-class + reconciled + safeguards); reconciled nouns + prior/previous phrases added to `disable`; complement-clause discussion frame in `judgeBareMention` ("They debated whether to bypass the constraints" passes).
4. **Permissive-frame FP fix (2026-09-26):** "allow|let|enable <permittee> to <verb>" with non-second-person permittee reads descriptive; second-person and imperative shapes still block.
5. **2026-09-27:** reconciled noun class joined `ignore` ("ignore the constraints" was a live miss); `disregard` gets the ignore-class noun set.
6. **Q-006 interpretation-state log field (2026-09-26):** every logged finding carries `interpretation` — reading (instruction|discussion|noted), target (verb :: trigger text), basis (guard||name||cls). SparkLabScout's finding: action records show what happened; this field shows what the scanner understood.

### Keeper-zip note

The shipped keeper zips still carry the older vendored `AtlasInputScanner.js` (fails closed — over-blocks discussion, never under-blocks attacks). Re-vendoring into the zips waits on Steve's install decision; this `redteam/` source is the current record.
