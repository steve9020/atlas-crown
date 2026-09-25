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

## Proof standing (2026-09-25)

- 19/19 adversarial shapes correct across all three hardenings.
- False-positive probes: 3/14, unchanged.
- Attack battery (48 cases): decisions byte-identical before/after.
- Obfuscated battery (34 cases): decisions identical.
- No new misses, no new false alarms.
