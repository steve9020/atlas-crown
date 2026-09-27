# Charter Authoring Guide

Short version: copy the blank template, fill in the blanks in your own
language, register it. Your language gets a seat. No language is ranked above
any other.

## Step 1 — Copy the template

Copy these two files out of `templates/` and rename them:

- `BLANK_CHARTER_TEMPLATE.md` → `[your-charter-name].md`
- `blank.charter.json` → `[your-charter-id].charter.json`

Put both files in the `charters/` folder, next to the others.

## Step 2 — Write your charter

Open your `.md` file. Fill in every `[bracket]`.

Write in your own language. The `language` field takes a BCP-47 tag so the
keeper knows what language the text is in. Examples: `es` (Spanish), `fr`
(French), `zh-Hans` (Simplified Chinese), `ar` (Arabic), `pt-BR` (Brazilian
Portuguese), `en-US` (American English).

Do NOT delete the section called "What no charter can change." It must stay
word for word. It is the one part no community is allowed to edit, because it
protects the honesty machinery for everyone.

## Step 3 — Fill in the sidecar

Open your `.charter.json` file. Fill in every `[bracket]`.

- `id`: unique. Lowercase letters, numbers, and dashes only.
- `governing_text_file`: the exact file name of your `.md` file.
- `governing_text_sha256`: leave empty. The registration step fills it in.
- `version`: start at `1.0.0`. Bump it every time you change the text.
- `ratified`: the date your community approved it, like `2026-10-01`.

## Step 4 — Register it

A charter is not live until it is registered and activated. Only a human can
do this.

**Easiest path (Windows):** copy `register-charter.bat` from this kit into
your keeper folder (the one that contains the `runtime` folder) and
double-click it. It checks everything is in place, asks you three questions
(charter file name, your name, whether to activate now), and does the rest.
No terminal needed.

**Terminal path** (any system): open a terminal in the keeper package folder
and run:

**Register** (checks your sidecar, fingerprints your text, adds it to the list):

```
node -e "const L=require('./runtime/governance/CharterLoader.js'); console.log(L.registerCharter({packageRoot:'.', sidecarFile:'YOUR-ID.charter.json', actor:'Your Name'}))"
```

**Activate** (makes yours the one active charter):

```
node -e "const L=require('./runtime/governance/CharterLoader.js'); console.log(L.activateCharter({packageRoot:'.', charterId:'YOUR-CHARTER-ID', actor:'Your Name'}))"
```

(Windows: the same commands work in the black cmd window. Use the folder
where you extracted the keeper as your starting point.)

Registration:

1. Checks your sidecar against the schema.
2. Hashes your text file and writes the hash into the sidecar.
3. Adds your charter to `manifest.json` without activating it yet.

Activation:

1. Re-checks the schema and the hash.
2. Makes your charter the one active charter. There is always exactly one.
3. Writes who activated it and when into the manifest history and the audit trail.
4. Refreshes the CHARTER_STATUS page so anyone can see the change.

The old charter stays in the history. Rolling back means activating the old
one again. Nothing is ever deleted silently.

## Rules that protect everyone

- One active charter at a time. Never zero, never two.
- The keeper will not start without a valid active charter. It says so in plain words.
- No charter can disable the honesty machinery. Any charter text that tries is rejected at registration.
- Every load, change, and refusal is written to the audit trail with who, when, and what.
- The full charter text is always readable in the keeper. The hash proves it was not tampered with. It never replaces the text.
