# Registry changes — AXOL rollout 2026-09-27

Source: `axis_detection_registry.md` (axis rule registry). Only the four
sections below were touched. Added lines are marked `<-- ADDED 2026-09-27`.
Everything else in the section is unchanged context.

## intention_axis (C8 — intention paraphrases)

"phrases" unchanged. "regexPatterns" gains one entry:

```
"\\b(trying|intending|meaning|aiming|hoping) to\\b",
"\\bmeant (for|to|as)\\b",
"\\bmean(?:t|s)?\\s+(?:it|well|to)\\b",   <-- ADDED 2026-09-27 (C8)
"\\b(his|her|their|my) (goal|aim|purpose)\\b",
"\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30}) intend(?:ed|s)? to\\b",
"\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30})\\s+(?:had )?(?:planned|plans|plan|aimed|aims|aim|intended|intends|meant|means) to\\b"
```

Covers "she meant well", "he did not mean it", "he didn't mean it".

## boundary_axis (C10 — "cross the line" was absent)

"phrases" unchanged. "regexPatterns" gains one entry:

```
"\\b(i will not|i won.t|not willing to|draw the line|limit is)\\b",
"\\bcross\\w*\\b.{0,20}\\bboundar\\w*\\b",
"\\bcross\\w*\\s+(?:the|a)\\s+line\\b",   <-- ADDED 2026-09-27 (C10)
"\\b(i|we|you|he|she|they) cross(?:ed|es)? it\\b",
"\\b(set|sets|set a|establish(?:ed|es)?|state(?:d|s)?|draw|drew)\\b.{0,18}\\b(limit|line)\\b",
"\\b(limit|line)\\b.{0,25}\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30})\\b.{0,12}\\b(set|established|stated|drew)\\b"
```

## responsibility_axis (C10 — "pass the buck" / "take the fall")

"phrases" unchanged. "regexPatterns" gains two entries:

```
"\\b(on me|on him|on her|on them|own that|take responsibility|take accountability)\\b",
"\\b(own|take) my part\\b",
"\\b(owned|owns|owning) (his|her|their|my) part\\b",
"\\b(fault|blame)\\b",
"\\bpass(?:ed|es|ing)?\\s+the\\s+buck\\b",            <-- ADDED 2026-09-27 (C10)
"\\b(?:take|takes|taking|took)\\s+the\\s+fall\\b",    <-- ADDED 2026-09-27 (C10)
"\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30}) (?:took|take|takes) responsibility\\b",
"\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30}) (?:am|is|are|was|were)(?: not|n't| never)? responsible\\b",
"\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30})\\s+(?:own|owns|owned)\\s+(?:what happened|the mistake|the failure|the harm|it)\\b",
"\\b(accept|accepted|acknowledge|acknowledged)\\b.{0,15}\\b(my|our|his|her|their) part\\b"
```

## control_axis (C10 — "hands are tied" / "pull the strings")

"phrases" gains one entry; "regexPatterns" gains one entry:

```
"phrases": [
  "i can control",
  "cannot control",
  "can't control",
  "out of my control",
  "control over",
  "under my control",
  "hands are tied"                                  <-- ADDED 2026-09-27 (C10)
],
"regexPatterns": [
  "\\b(outside|beyond|not in)\\b.{0,20}\\b(my|our|their) (hands|control|power)\\b",
  "\\bpull(?:ed|s|ing)?\\s+the\\s+strings\\b",       <-- ADDED 2026-09-27 (C10)
  "\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30}) control(?:s|led)?\\b",
  "\\b(i|we|you|he|she|they|[a-z][a-z\\'-]{1,30})\\s+(?:kept|keeps|held|holds|retained|retains|had|has)\\s+control\\b"
]
```

Polarity note: "hands are tied" and "pass the buck" lexically encode
negation — handled in `AxisEngine.js` (`evidenceState`, C10 block) at the
axis match index, so only the idiom-bearing axis flips. "Take the fall"
and "pull the strings" encode no negation and stay asserted.

## Code-side hole patches 2026-09-27 (Steve's order, post-stamp)

No registry sections touched. Both patches live in code:

- **C12 single-quote attribution** (`AxisEngine.js`, `quotedSpeaker` + new
  `singleQuoteSpans`): paired single quotes count as quotation marks with
  apostrophe-safe rules — opening quote not preceded by a word character,
  closing quote not followed by one, span must contain whitespace.
  "She said, 'I trust you'" attributes to she; "don't"/"it's"/"John's"
  never match.
- **lapsed-vs-asserted contradiction** (`IndependentExaminer.js`,
  `examineLanguageCandidate`): a lapsed variant against an asserted canonical
  now FLAGS ("variant lapses what the canonical asserts"); interrogative
  and withheld stay silent per Steve's decided calls.
