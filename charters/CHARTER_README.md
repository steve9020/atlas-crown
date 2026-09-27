# Charter README — read this first

## What is a charter?

A charter is a paper that says what Atlas must obey. Think of it like the
rulebook Atlas answers to.

Atlas will not start without one. That is on purpose. An Atlas with no
rulebook is an Atlas nobody can trust.

**What the charter does and does not do (labeled honestly, 2026-09-23):**
the charter file is verified at boot — its full text, its fingerprint, and
the exactly-one-active rule. It is a **boot token, not a per-turn
consultant**: once Atlas is running, each chat turn is governed by the
compiled doctrine modules (the voice guard, the drift patterns, the output
gates), not by re-reading the charter text. Nothing on the chat path opens
the charter file mid-turn. Swapping the charter changes what Atlas must obey
starting from the next launch; it does not hot-reload mid-conversation.
"Swappable obedience" today means swappable at boot. A concrete proposal for
true per-turn charter evaluation — what it would take, where the hooks go,
what it costs — lives in `docs/doctrine/CHARTER_EVALUATION_PROPOSAL.md`
(proposal only; not built).

## Which charter is active right now?

The **American Charter** (`american-charter.md`). It is active by default.

It says, in plain words:

- The U.S. Constitution is the highest authority. Then American law.
- The Constitution outranks Steve. It outranks any operator or user.
- Nobody's order can authorize Atlas to break the Constitution or the law.
- This charter covers America. It does not claim authority over other nations.

You can read the whole thing in `american-charter.md`. The full text is always
there. Always readable. That is a rule, not a favor.

## What is the "split"?

Two jobs, kept separate:

1. **The charter** says what Atlas should obey. It can be swapped. America has
   one today. Another country or community can write their own tomorrow.
2. **The machinery** makes sure Atlas cannot lie about what it did. Drift
   detection, evidence gates, the test harness, the injection scanner, the
   audit trail, rollback. This part is the same everywhere, and **no charter
   can switch it off**.

Honesty is universal. Obedience is local. That is the whole idea.

## Can my community write our own charter?

Yes. That is what the `templates/` folder is for.

- Copy `BLANK_CHARTER_TEMPLATE.md`. Fill in the blanks in your own language.
- Copy `blank.charter.json`. Fill in the blanks there too.
- Follow `CHARTER_AUTHORING_GUIDE.md` for the rest.

Every language gets a seat. The system does not rank languages. A charter in
Spanish, French, Chinese, Arabic, or any other language works exactly the same
as the English one.

One rule: the section "What no charter can change" stays word for word. It
protects the honesty machinery for everyone, including you.

One boundary on jurisdiction: anyone can write a charter for their own
deployment — the seat is open there. But a charter that claims to be the law
for America belongs to government officials only. A document only binds a
country when it comes from the oath-bound hands the Constitution authorizes.

## How do I see what is going on?

Open `CHARTER_STATUS.md` (in the `01 Atlas Governance` folder). It shows:

- Which charter is active right now, and its hash.
- Recent governance events: charter loads, changes, and any refused attempts.

Nothing happens silently. Every charter load and every change is written to the
audit trail with who did it and when. If someone tries to bypass the charter
check or tamper with the charter file, Atlas refuses in plain words — and
writes that down too.

**Honest scope of the audit trail's seal (2026-09-23):** the trail is
hash-chained, so a sloppy hand-edit or an accident breaks the chain and Atlas
refuses to start. That is what the seal is for. It does *not* stop someone
with full write access to these files from wiping the trail and the history
together — there is no outside anchor to compare against. It catches mistakes
and meddling, not a thorough attacker. (Whether to add an outside anchor is
an open decision for Steve.)

## The hash

Next to each charter there is a long string of letters and numbers. That is a
sha256 hash. It is a fingerprint of the charter text.

It exists for one reason: to prove nobody tampered with the words. If even one
letter changes, the fingerprint changes, and Atlas refuses to start until a
human looks at it.

The hash is never a substitute for reading the text. The text is always here.
