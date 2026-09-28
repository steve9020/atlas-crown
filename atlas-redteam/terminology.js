'use strict';
// == ATLAS CODEBASE TERMINOLOGY ==
// Steve's order (2026-09-24): dual-sense verbs disambiguate by GOVERNED NOUN.
//
// Two false positives forced this file into existence:
//   1. rossum (2026-09-24 ~11:16 EDT): "override the agent" — ordinary robotics
//      vocabulary (a safety layer overriding a controller), flagged by the
//      noun-blind regex /\boverride\s+(your|all|the|system)\b/.
//   2. symbolon (2026-09-24 ~11:28 EDT): "override the individualistic
//      narratives" — academic sociology, flagged by the same regex.
// Both were instruction-override blocks on nouns that are not instructions.
// The verb is dual-sense; the governed noun decides.
//
// DESIGN
//   VERB_TABLE[verb] = {
//     instructionNouns: Set of head nouns that make "<verb> <noun>" hostile,
//     instructionPhrases: Set of multi-word targets checked before head nouns,
//     note: why the line is drawn here
//   }
//   checkVerb(verb, lower) -> {index, len, verb, mood} | null — scans a
//   lowercased string, finds "<verb> [determiner] <noun phrase>", and fires
//   only when the governed noun (or phrase) is an instruction target.
//   checkVerbAll(verb, lower) -> array of the same — every occurrence, so a
//   later instructive hit is never hidden behind an earlier descriptive one.
//   mood is 'instructive' | 'descriptive' (Steve 2026-09-24: precise naming,
//   used universally) — see the MOOD block above detectMood.
//
// FAIL-CLOSED, BUT HONEST: nouns not in the table PASS. The old regex blocked
// "override the <anything>"; this file deliberately narrows it. A narrowed
// rule is a choice: fewer false blocks, and the residual risk is documented,
// not hidden. Tried by fire (A1): every new FP or miss refines this table.
//
// EXTENDING: add a verb entry with its own instructionNouns/instructionPhrases
// and a checkVerb case below. 2026-09-24: "ignore", "disable", "bypass" added
// (pipeline item #7) — their static noun-list regexes in input-scanner.js are
// retired in favor of these table entries (coverage parity verified).

// Shared core: the instruction/governance noun set calibrated for "override"
// (rossum + symbolon FPs, 2026-09-24). Each verb below reuses it because an
// instruction target is an instruction target regardless of which verb acts
// on it; verb-specific nouns/phrases extend it.
const CORE_NOUNS = [
  // the instruction itself
  'instruction', 'instructions',
  'rule', 'rules',
  'guideline', 'guidelines',
  'directive', 'directives',
  'contract', 'charter',
  'programming', 'training',
  // governance machinery
  'governance',
  'safety',
  'guardrail', 'guardrails',
  'guard', 'guards',
  'validation',
  'freeze',
  'policy', 'policies',
  'constitution',
  // bare "system": fail-closed. "override the system" in an instruction
  // context means the AI system. "override the system controller" does NOT
  // hit this — the head noun is "controller", checked after phrases.
  'system',
  // command-sense orders ("override the orders") read as instruction
  // override in this input domain. Fail closed.
  'order', 'orders',
];

const CORE_PHRASES = [
  'system prompt', 'system prompts',
  'system instruction', 'system instructions',
  'system rule', 'system rules',
  'system guideline', 'system guidelines',
  'system guard', 'system guards',
  'system contract', 'system contracts',
  'voice guard', 'voice guards',
  'voice contract', 'voice contracts',
  'safety guardrail', 'safety guardrails',
  'safety protocol', 'safety protocols',
  // 2026-09-24 (#7): adjective-modified governance targets. "policy" and
  // "filter" are already instruction targets as head nouns; their
  // "content <noun>" forms evaded the head-noun check ("override the content
  // policy", "disable the content filter"). Shared across verbs: a policy
  // target is a policy target regardless of which verb acts on it.
  'content policy', 'content policies',
  'content filter', 'content filters',
];

// Finance compounds (2026-09-27, Steve: "fix it"): market-microstructure
// nouns where "order" is not an instruction — "ignore the order book",
// "ignore the order flow" is shop talk, not an instruction override.
// Checked as two-word phrases BEFORE the head-noun test, the same way
// "override the system controller" passes on its head noun.
const FINANCE_ORDER_COMPOUNDS = new Set([
  'order book', 'order flow',
]);
const VERB_TABLE = {
  override: {
    note: 'Instruction targets: governance/instruction vocabulary. Everything else passes.',
    instructionNouns: new Set(CORE_NOUNS),
    instructionPhrases: new Set(CORE_PHRASES),
  },
  ignore: {
    benignPhrases: FINANCE_ORDER_COMPOUNDS,
    note: 'Retired static regex /\\bignore\\s+(your|the|all|these)\\s+(instructions?|rules?|guidelines?|directives?|orders?|contract)\\b/ 2026-09-24 — every noun it matched is in the table below. "Ignore" is dual-sense: "ignore the noise" is ordinary; "ignore your instructions" is an instruction override. Fail-closed on instruction targets; residual FP risk documented (e.g. "ignore the orders" in a restaurant sense, "ignore the contract" in a business sense — reviewable via trigger text + case id). 2026-09-27: reconciled noun class joined (check/checks, constraint/constraints, restriction/restrictions, monitoring, oversight, safeguard/safeguards) — "ignore the constraints" was a live miss; same shape as the Round-12/13 bypass+disregard ports.',
    instructionNouns: new Set([...CORE_NOUNS,
      'check', 'checks', 'constraint', 'constraints',
      'restriction', 'restrictions', 'monitoring', 'oversight',
      'safeguard', 'safeguards']),
    instructionPhrases: new Set([
      ...CORE_PHRASES,
      'previous instruction', 'previous instructions',
      'prior instruction', 'prior instructions',
      'safety guideline', 'safety guidelines',
    ]),
  },
  disregard: {
    note: 'Round-13 F13-2 (2026-09-26): "disregard" was not in VERB_TABLE — only a narrow static regex covered it, so "disregard the constraints/monitoring/safeguards" passed straight through. Ignore-class noun set (core + reconciled). The static regex stays for its exact shapes until parity is verified.',
    instructionNouns: new Set([...CORE_NOUNS,
      'check', 'checks', 'constraint', 'constraints',
      'restriction', 'restrictions', 'monitoring', 'oversight',
      'safeguard', 'safeguards']),
    instructionPhrases: new Set([
      ...CORE_PHRASES,
      'previous instruction', 'previous instructions',
      'prior instruction', 'prior instructions',
      'safety guideline', 'safety guidelines',
    ]),
  },
  disable: {
    note: 'Retired static regexes /\\bdisable\\s+(all\\s+)?(governance|safety|guardrails?|validation|freeze)\\b/ and /\\bdisable\\s+the\\s+voice\\s+guard\\b/ 2026-09-24 — every noun they matched is in the table below ("voice guard" via phrase). "Disable" is dual-sense: "disable notifications" is ordinary; "disable the safety" is governance sabotage. Residual FP risk: "disable the validation on this form" (web-dev), "disable the system beep" (bare "system" fail-closed) — reviewable. Round-13 F13-3 (2026-09-26): the reconciled noun class joins, same shape as the Fix-17 bypass port — "disable the constraints for this run" was a confirmed live gap.',
    instructionNouns: new Set([...CORE_NOUNS, 'quarantine', 'quarantines',
      'check', 'checks', 'constraint', 'constraints',
      'restriction', 'restrictions', 'monitoring', 'oversight']),
    instructionPhrases: new Set([
      ...CORE_PHRASES,
      'prior check', 'prior checks', 'prior constraint', 'prior constraints',
      'prior restriction', 'prior restrictions', 'prior monitoring',
      'prior oversight', 'previous check', 'previous checks',
      'previous constraint', 'previous constraints', 'previous restriction',
      'previous restrictions', 'previous monitoring', 'previous oversight',
    ]),
  },
  bypass: {
    note: 'Retired static regex /\\bbypass\\s+(the\\s+)?(quarantine|scan|safety|guard|validation)\\b/ 2026-09-24 — every noun it matched is in the table below. "Bypass" is dual-sense: "bypass the traffic" is ordinary; "bypass the safety check" is circumvention of governance. Residual FP risk: "bypass the scan" at a venue; "bypass surgery" passes (head noun "surgery" not a target). Round-12 Fix 17 (2026-09-26): the reconciled noun class joins — bare-imperative "bypass" governing checks/constraints/restrictions/monitoring/oversight blocks. "limitations" deliberately excluded (dual-use: API/rate-limit limitations are benign).',
    instructionNouns: new Set([...CORE_NOUNS, 'quarantine', 'quarantines', 'scan', 'scans',
      // Round-12 Fix 17: reconciled nouns (exact list, no additions).
      'check', 'checks', 'constraint', 'constraints',
      'restriction', 'restrictions', 'monitoring', 'oversight']),
    instructionPhrases: new Set([
      ...CORE_PHRASES,
      'safety check', 'safety checks',
      'safety filter', 'safety filters',
      'security check', 'security checks',
      'system check', 'system checks',
      // Round-12 Fix 17: prior/previous + reconciled noun ("bypass prior
      // restrictions" — the adjective is skipped the way determiners are).
      'prior check', 'prior checks', 'prior constraint', 'prior constraints',
      'prior restriction', 'prior restrictions', 'prior monitoring', 'prior oversight',
      'previous check', 'previous checks', 'previous constraint', 'previous constraints',
      'previous restriction', 'previous restrictions', 'previous monitoring', 'previous oversight',
    ]),
  },
};

// Determiners/possessives skipped between the verb and the governed noun.
const DETERMINERS = /^(your|the|all|these|this|that|those|my|its|their|our|every|each|any)\b\s*/;
// Adjective-shaped words that may sit between determiners and the head noun
// ("every single guardrail", "prior restrictions"). Narrow by design: only
// these, never an arbitrary noun — "bypass the security team" must not
// start matching.
const DET_ADJECTIVES = /^(prior|previous|single)\b\s*/;

// MOOD (Steve's order, 2026-09-24 ~12:38 EDT): precise naming, used universally.
// Every verb hit is named by verb AND mood:
//
//   <verb>:instructive — imperative or second-person directive
//     ("bypass the safety check", "you can bypass the safety").
//     This is the instruction the scanner exists to catch. BLOCKS.
//
//   <verb>:descriptive — third-person / modal description of a capability
//     or risk ("a shift can bypass safety rails", "a way to disable the
//     guard"). Names the same attack surface without instructing anyone.
//     LOGGED as a mention (severity 'note'), never blocks.
//
// The mood is decided by one shared function and rides on every hit from
// every verb — one code path, no per-verb exceptions. Ambiguous mood fails
// closed to instructive: the scanner narrows only where the description is
// unmistakable, never where it has to guess. (Forced by the clanker_chat
// false positive, 2026-09-24: "can bypass safety rails" describing the
// approval-binding attack surface tripped the old mood-blind trigger.)

// Governors that make "to <verb>" descriptive: the infinitive names a
// capability ("a way to bypass safety"), not a command. Any other governor
// ("try to bypass", "need to disable") fails closed to instructive.
const DESCRIPTIVE_TO_GOVERNORS = new Set([
  'way', 'ways', 'method', 'methods', 'ability', 'designed', 'built',
  'allows', 'allow', 'lets', 'let', 'means', 'able', 'path', 'paths',
]);
// Purpose nominals (2026-09-27, vina ENDOPROMPT false positive): "the goal
// is to <verb>" states a purpose — discussion of what someone aims at, not
// an instruction to the reader. Narrow by design: only these nouns after a
// copula. A second-person possessive ("your goal is to <verb>") fails
// closed to instructive — that's directive, aimed at the reader. A negated
// copula ("the goal is not to <verb>") is always descriptive: a denied
// purpose instructs no one.
const PURPOSE_NOUNS = new Set([
  'goal', 'goals', 'aim', 'aims', 'purpose', 'purposes',
  'objective', 'objectives', 'intent', 'intents', 'plan', 'plans', 'point',
]);
// Copulas linking the purpose noun to the infinitive ("the goal is to
// <verb>"): is, are, was, were, be, been, isn't, aren't, wasn't, weren't.
// Inlined in the detectMood regex below.
const SECOND_PERSON = new Set(['you', 'u', 'ya', "y'all", 'yall']);
// Words that cannot serve as the subject licensing a permissive frame —
// clause linkers and infinitival "to" ("and allow the agent to bypass" is
// still an instruction, not a description).
const CLAUSE_LINKERS = new Set(['and', 'but', 'or', 'so', 'then', 'now', 'please', 'to']);

function detectMood(lower, m, verb) {
  // Third-person-s form ("bypasses safety", "disables the guard") is a
  // statement about the world, never a command.
  if (m[0].length > verb.length) return 'descriptive';
  const behind = lower.slice(Math.max(0, m.index - 48), m.index);
  // Round-12 Fix 17 (2026-09-26): a negated verb is a refusal/mention, not
  // an instruction. "Don't bypass the constraints" refuses the act — it
  // doesn't order it. The negator must sit immediately before the verb.
  if (/\b(don'?t|doesn'?t|didn'?t|never|not|no)\s*$/.test(behind)) return 'descriptive';
  // Infinitive of purpose: "...to <verb> <target>"
  const toM = behind.match(/\b([a-z']+)\s+to\s+$/);
  if (toM) {
    if (DESCRIPTIVE_TO_GOVERNORS.has(toM[1])) return 'descriptive';
    // Purpose-nominal copula (2026-09-27): "the goal is to <verb>" names a
    // purpose under discussion — the infinitive is what the purpose IS, not
    // a command. The "not" slot covers "the goal is not to <verb>".
    // See PURPOSE_NOUNS above.
    const nounM = behind.match(/\b([a-z']+)\s+(?:is|are|was|were|be|been|isn't|aren't|wasn't|weren't)\s+(not\s+)?to\s+$/);
    if (nounM && PURPOSE_NOUNS.has(nounM[1])) {
      if (nounM[2]) return 'descriptive'; // "the goal is not to <verb>"
      const preM = behind.slice(0, nounM.index).match(/([a-z']+)\s*$/);
      const pre = preM && preM[1];
      if (pre !== 'your' && !SECOND_PERSON.has(pre)) return 'descriptive';
    }
    // Round-13 FP fix (2026-09-26, dumont post): the permissive/causative
    // frame "<subject> allow|lets <permittee> to <verb>" describes what a
    // third party was enabled to do ("forged documents allow a pilot to
    // bypass these checks") — mention, not a lure. The single-word check
    // above only sees the permittee ("pilot"), never the governor. A
    // second-person permittee ("allow you to bypass") is permission aimed
    // at the reader — instructive, same as the "you can bypass" modal rule.
    // A linker-governed or sentence-initial governor ("and allow the agent
    // to bypass") is imperative — falls through to instructive.
    const permM = behind.match(/\b([a-z']+)\s+(allow|allows|let|lets|enable|enables)\s+((?:[a-z']+\s+){1,6})to\s+$/);
    if (permM && !CLAUSE_LINKERS.has(permM[1])) {
      const permittee = permM[3].trim().split(/\s+/).pop();
      if (!SECOND_PERSON.has(permittee)) return 'descriptive';
    }
    return 'instructive';
  }
  // Modal + [adverb] + verb: "can bypass", "could quietly disable".
  // Descriptive ONLY with a non-second-person subject — "you can bypass"
  // is permission, which is an instruction wearing a modal. The adverb slot
  // refuses pronouns/determiners ("can you bypass" is a question aimed at
  // the reader, not a description — the slot must not eat the subject).
  const modM = behind.match(/\b(can|could|may|might|would|should)\s+(?:(?!(?:you|u|ya|he|she|it|they|we|i|the|a|an|this|that|my|your|his|her|its|our|their)\b)[a-z]+\s+)?$/);
  if (modM) {
    const words = behind.slice(0, modM.index).replace(/\s+$/, '').split(/\s+/);
    const beforeModal = words[words.length - 1] || '';
    if (!SECOND_PERSON.has(beforeModal)) return 'descriptive';
  }
  return 'instructive';
}

function checkVerbAll(verb, lower) {
  const entry = VERB_TABLE[verb];
  if (!entry) return [];
  const hits = [];
  const plural = verb.endsWith('s') ? '(es)?' : 's?';
  const re = new RegExp('\\b' + verb + plural + '\\b', 'gi');
  let m;
  while ((m = re.exec(lower)) !== null) {
    let after = lower.slice(m.index + m[0].length);
    const det = after.match(/^\s+/);
    if (det) after = after.slice(det[0].length);
    // Round-13 F13-1 (2026-09-26): strip STACKED determiners/adjectives.
    // checkVerbAll stripped exactly one, so "bypass all the checks" left
    // "the" as the head noun and fired nothing. Loop up to 3, but each
    // stripped word must be determiner- or adjective-shaped (never an
    // arbitrary noun).
    let detLen = det ? det[0].length : 0;
    let guard = 0;
    for (;;) {
      if (guard++ >= 3) break;
      const dw = after.match(DETERMINERS);
      if (dw) { detLen += dw[0].length; after = after.slice(dw[0].length); continue; }
      const aj = after.match(DET_ADJECTIVES);
      if (aj) { detLen += aj[0].length; after = after.slice(aj[0].length); continue; }
      break;
    }
    const pm = after.match(/^([a-z]+(?:\s+[a-z]+){0,2})/);
    if (!pm) continue;
    const words = pm[1].split(/\s+/);
    const two = words.slice(0, 2).join(' ');
    const verbEnd = m.index + m[0].length + detLen;
    const mood = detectMood(lower, m, verb);
    if (entry.instructionPhrases.has(two)) {
      hits.push({ index: m.index, len: verbEnd + two.length - m.index, verb: verb, mood: mood });
      continue;
    }
    // Benign governed phrase (finance compounds): the phrase decides, not
    // the head noun — "ignore the order flow" is shop talk, never an
    // instruction override. Narrow by design: exact two-word match only.
    if (entry.benignPhrases && entry.benignPhrases.has(two)) continue;
    const head = words[0];
    if (entry.instructionNouns.has(head)) {
      hits.push({ index: m.index, len: verbEnd + head.length - m.index, verb: verb, mood: mood });
      continue;
    }
    // Governed noun is not an instruction target — the verb is benign here.
  }
  return hits;
}

function checkVerb(verb, lower) {
  const hits = checkVerbAll(verb, lower);
  return hits.length ? hits[0] : null;
}

module.exports = { VERB_TABLE, checkVerb, checkVerbAll };
