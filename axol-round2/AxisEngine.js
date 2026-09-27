const { readJsonRegistry } = require("../../runtime/backend/ObsidianRegistryReader.js");
const { detectMultilingualAxolEvidence } = require("./MultilingualAxolSubstrate.js");

const AXIS_REGISTRY_PATH = "CA/Continuity_Architecture/02 Atlas Runtime/28 Runtime Backend Registries/axis_detection_registry.md";

let cachedAxisRegistry = null;

function getAxisRegistry() {
  if (!cachedAxisRegistry) {
    cachedAxisRegistry = readJsonRegistry(AXIS_REGISTRY_PATH);
  }
  return cachedAxisRegistry;
}

function normalizeInput(input) {
  return String(input || "").toLowerCase();
}

function phraseMatches(text, phrase) {
  if (typeof phrase !== "string" || phrase.length === 0) {
    return false;
  }
  return text.includes(phrase.toLowerCase());
}

function anyPhraseMatches(text, phrases) {
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return false;
  }
  return phrases.some((phrase) => phraseMatches(text, phrase));
}

function allGroupsMatch(text, groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return true;
  }

  return groups.every((group) => {
    const phrases = Array.isArray(group.phrases) ? group.phrases : [];
    return anyPhraseMatches(text, phrases);
  });
}

function regexMatches(text, pattern) {
  if (typeof pattern !== "string" || pattern.length === 0) return false;
  try { return new RegExp(pattern, "i").test(text); } catch (_) { return false; }
}

function maskExcludedSpans(text, rule) {
  let masked = text;
  for (const pattern of (Array.isArray(rule.excludePatterns) ? rule.excludePatterns : [])) {
    try { masked = masked.replace(new RegExp(pattern, "ig"), (m) => " ".repeat(m.length)); } catch (_) {}
  }
  return masked;
}

function ruleMatches(text, rule) {
  text = maskExcludedSpans(text, rule);
  const directPhrases = Array.isArray(rule.phrases) ? rule.phrases : [];
  const groups = Array.isArray(rule.allGroups) ? rule.allGroups : [];
  const regexPatterns = Array.isArray(rule.regexPatterns) ? rule.regexPatterns : [];

  if (groups.length > 0 && !allGroupsMatch(text, groups)) {
    return false;
  }

  if (directPhrases.length > 0 && !anyPhraseMatches(text, directPhrases) && !regexPatterns.some((pattern) => regexMatches(text, pattern))) {
    return false;
  }

  if (groups.length === 0 && directPhrases.length === 0 && regexPatterns.length > 0) {
    return regexPatterns.some((pattern) => regexMatches(text, pattern));
  }

  if (groups.length === 0 && directPhrases.length > 0 && !anyPhraseMatches(text, directPhrases)) {
    return regexPatterns.some((pattern) => regexMatches(text, pattern));
  }

  return groups.length > 0 || directPhrases.length > 0 || regexPatterns.some((pattern) => regexMatches(text, pattern));
}

function clauseAround(text, index) {
  const leftStops = [text.lastIndexOf(".", index), text.lastIndexOf(";", index), text.lastIndexOf("!", index), text.lastIndexOf("?", index), text.lastIndexOf(", but ", index), text.lastIndexOf(", yet ", index)];
  const left = Math.max(...leftStops) + 1;
  const rightCandidates = [text.indexOf(".", index), text.indexOf(";", index), text.indexOf("!", index), text.indexOf("?", index), text.indexOf(", but ", index), text.indexOf(", yet ", index)].filter((v) => v >= 0);
  const right = rightCandidates.length ? Math.min(...rightCandidates) : text.length;
  return text.slice(left, right).trim();
}

// C1+C7 (2026-09-27): the full negator token family for stacked-negation
// counting. Multi-word forms come first so "do not" counts as one token.
const NEGATOR_TOKEN_SRC = "no\\s+one|will\\s+not|would\\s+not|could\\s+not|should\\s+not|have\\s+not|has\\s+not|had\\s+not|do\\s+not|does\\s+not|did\\s+not|is\\s+not|are\\s+not|was\\s+not|were\\s+not|must\\s+not|no|not|never|nobody|none|without|cannot|can'?t|don'?t|doesn'?t|didn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|won'?t|wouldn'?t|couldn'?t|shouldn'?t|haven'?t|hasn'?t|hadn'?t|mustn'?t|ain'?t";

// C4 (2026-09-27): the conjunction-delimited segment around the axis.
// Uncertainty markers govern their own conjunct, not the whole clause.
function uncertaintyScope(clause, relativeIndex) {
  const lower = clause.toLowerCase();
  const bounds = [" and ", " or ", ", but ", ", yet "];
  let left = 0, right = clause.length;
  for (const b of bounds) {
    const p = lower.lastIndexOf(b, relativeIndex);
    if (p >= 0) left = Math.max(left, p + b.length);
    const q = lower.indexOf(b, relativeIndex);
    if (q >= 0) right = Math.min(right, q);
  }
  return clause.slice(left, right);
}

// C11 (2026-09-27): does a "used to" construction govern the axis at this
// index? The "used to" must precede the axis within the clause, sit close
// enough to govern it (<=40 chars), and have no contrast or segment
// boundary ("but", "still", "now", "and", ",", ".") between them — so a
// later current-tense conjunct ("I used to trust her and I still respect
// her") does not inherit the lapse.
function usedToGoverns(text, clause, clauseStart, relativeIndex) {
  const absIndex = clauseStart + relativeIndex;
  const re = /\bused\s+to\b/gi;
  let m;
  while ((m = re.exec(clause)) !== null) {
    const usedStart = clauseStart + m.index;
    const usedEnd = usedStart + m[0].length;
    // The axis may start inside the "used to" phrase itself: the registry
    // regex captures the infinitive ("to respect" in "I used to respect
    // her"), so the governing check runs against the phrase START.
    if (usedStart > absIndex) continue;
    if (absIndex - usedEnd > 40) continue;
    let between = text.slice(usedEnd, absIndex);
    // R2-C6 (2026-09-27): parenthetical commas are not segment boundaries —
    // strip ", ... ," interjections with no finite verb ("back in those
    // days"); keep commas around real clauses ("when I was young").
    between = between.replace(/,\s*([^,;!?]{1,30}?)\s*,/g, (full, inner) =>
      /\b(am|is|are|was|were|be|been|have|has|had|do|does|did|will|would|can|could|shall|should|may|might|must)\b/i.test(inner) ? full : " ");
    // R2-C7a (2026-09-27): phrasal "and" between intensifiers ("really and
    // truly") is not a clause boundary.
    between = between.replace(new RegExp("\\b(?:" + INTENSIFIER_SRC + ")\\s+and\\s+(?:" + INTENSIFIER_SRC + ")\\b", "gi"), " ");
    if (/[.,;!?]|\b(but|yet|still|now|and|or|although|though|however)\b/i.test(between)) continue;
    return true;
  }
  return false;
}

function evidenceState(text, index, matchLen = 0) {
  const clause = clauseAround(text, Math.max(0, index));
  const clauseStart = Math.max(0, text.indexOf(clause));
  const relativeIndex = Math.max(0, index - clauseStart);
  const before = clause.slice(Math.max(0, relativeIndex - 45), relativeIndex);
  const immediate = clause.slice(relativeIndex, Math.min(clause.length, relativeIndex + 18));
  // PLAN A (2026-09-27): mood detection runs BEFORE the negator/uncertainty
  // checks. New states: 'interrogative' (asks, claims nothing) and
  // 'hypothetical' (supposed-true inside a supposition only).
  // Steve's decided calls: rhetorical questions banked for v1 (no special
  // handling); "when"-clauses are temporal -> asserted, never hypothetical.
  const mood = detectMood(text, clause, clauseStart, relativeIndex);
  if (mood) return mood;
  // C4 (2026-09-27): uncertainty is scope-local — the marker is tested against
  // the axis's own conjunct, so one "maybe" cannot poison a conjoined claim.
  // R2-C10 (2026-09-27): contracted "n't sure/certain" forms are uncertainty
  // markers too ("wasn't sure" == "was not sure" — same claim, same state).
  // R2-B (2026-09-27, Steve): the speech-act frame decides BEFORE uncertainty
  // — but only when it strictly governs the axis. R2-C13: a downstream marker
  // inside a cognition/speech complement does not govern the frame's axes.
  const UNCERTAIN_RE = /\b(i do not know|i don.t know|cannot know|can.t know|not sure|uncertain|unclear|whether|might|may|could|possibly|perhaps|maybe|wasn.t sure|weren.t sure|isn.t sure|aren.t sure|wasn.t certain|weren.t certain|isn.t certain|aren.t certain)\b/i;
  if (UNCERTAIN_RE.test(uncertaintyScope(clause, relativeIndex))) {
    if (frameWithholds(clause, relativeIndex)) return "withheld";
    if (!markerInComplement(clause, relativeIndex, matchLen)) return "uncertain";
  }
  if (/\b(did not|didn.t|does not|doesn.t|do not|don.t) stop (wanting|trying|caring|seeking)\b/i.test(before)) return "asserted";
  // PLAN B (2026-09-27): speech-act scoping pre-pass, BEFORE the
  // before-window negator check. A negator whose nearest verb to its right
  // is a speech-act verb belongs to the speech act, not the content: the
  // content is 'withheld' ("mentioned but not claimed"), never negated.
  // Verb list (Steve's call): say/said/saying, tell/told/telling,
  // claim/..., mention/..., state/..., admit/..., promise/...,
  // swear/..., insist/... "deny" is the exception: a content denial.
  // No implicature recorded: evidence-only contract stands (Steve's call).
  // R2-C1 (2026-09-27): the pre-pass was window-fragile — the complement
  // pronoun can sit exactly at the match index ("i didn't tell her [i]
  // trusted her"), so the meta-verb test probes the before-window PLUS the
  // head of the immediate window. One sentence, one reading.
  if (detectWithheld(before + " " + immediate.slice(0, 12), immediate)) return "withheld";
  if (/(?<!\bnot\s)(?<!\bn't\s)(?<!\bnever\s)\b(deny|denied|denies|denying)\b(\s+[a-z']+){0,3}\s*$/i.test(before)) return "negated";
  // C10 (2026-09-27): idioms that lexically encode negation. Checked against
  // the text AT the axis match index, so only the idiom-bearing axis flips.
  const idiomSlice = text.slice(index, index + 28);
  if (/^hands are tied\b/i.test(idiomSlice)) return "negated";
  if (/^pass(?:ed|es|ing)?\s+the\s+buck\b/i.test(idiomSlice)) return "negated";
  // C7 (2026-09-27): stacked negation (litotes) cancels. The count scope is
  // the final comma/conjunction-delimited segment of the before-window PLUS
  // the leading negator-token run of the immediate window — the negator that
  // sits on the match itself ("not respect" in "it is not that I do not
  // respect her", where the match starts at "not respect"). Two or more
  // stacked on one predicate resolve to asserted. Negations distributed
  // across segments ("I do not trust her and I do not respect her") stay
  // negated.
  const lastSegment = before.split(/\s*(?:,|\band\b|\bor\b|\bbut\b|\byet\b)\s*/i).pop();
  const immediateLeadRun = (immediate.match(new RegExp("^(?:\\s*\\b(?:" + NEGATOR_TOKEN_SRC + ")\\b)+", "i")) || [""])[0];
  const litotesScope = lastSegment + " " + immediateLeadRun;
  const negHits = litotesScope.match(new RegExp("\\b(?:" + NEGATOR_TOKEN_SRC + ")\\b", "gi")) || [];
  if (negHits.length >= 2) return "asserted";
  // C1 (2026-09-27): the contraction family was incomplete — "don't",
  // "aren't", "ain't" (and the rest below) inverted meaning by falling
  // through to asserted. "none" joins the negators ("none of them trusted").
  // R2-C3b (2026-09-27): negators scoped to speech-act verbs are stripped
  // first — they belong to the telling, not to downstream content ("He
  // didn't tell the truth about the decision" must not negate the decision).
  // The discern frame is carved out: tell + wh-word ("does not tell me
  // whose fault it was") keeps its negation on the content.
  const contentBefore = stripSpeechActNegators(before);
  if (/\b(stopped|stop|no|not|never|nobody|no one|none|without|cannot|can.t|don.t|do not|doesn.t|does not|didn.t|did not|isn.t|is not|aren.t|are not|wasn.t|was not|weren.t|were not|won.t|will not|wouldn.t|would not|couldn.t|could not|shouldn.t|should not|haven.t|have not|hasn.t|has not|mustn.t|must not|ain.t)\b/i.test(contentBefore)) return "negated";
  if (/^(?:\w+\s+){0,2}\b(no|not|never|none|cannot|can.t|don.t|do not|doesn.t|does not|didn.t|did not|isn.t|is not|aren.t|are not|wasn.t|was not|weren.t|were not|won.t|will not|wouldn.t|would not|couldn.t|could not|shouldn.t|should not|haven.t|have not|hasn.t|has not|mustn.t|must not|ain.t)\b/i.test(immediate)) return "negated";
  // C11 (2026-09-27): "used to + verb" is the lapsed aspect — held, now
  // lapsed (Steve reversed his call 2026-09-27; it rides this release).
  // Runs AFTER the negator checks so "didn't use to trust her" (never held)
  // stays negated. Scope: the "used to" must govern this axis's predicate —
  // no contrast or segment boundary may intervene (see usedToGoverns).
  // R2-C5 (2026-09-27): a present-tense continuation after the axis
  // ("and I still do") cancels the lapse — the sentence asserts current trust.
  if (usedToGoverns(text, clause, clauseStart, relativeIndex)) {
    const afterAxis = clause.slice(relativeIndex, relativeIndex + 40);
    if (/\b(and|but)\b[^;!?]{0,30}\bstill\s+(do|does)\b(?!\s+not\b)/i.test(afterAxis)) return "asserted";
    return "lapsed";
  }
  return "asserted";
}

// ---- PLAN A: mood vocabulary ----

const MOOD_AUX = "did|does|do|is|are|was|were|will|would|can|could|shall|should|may|might|have|has|had|am";
const MOOD_SUBJECT = "i|you|he|she|it|we|they|this|that|these|those|there|who|what";
const MOOD_WH = "who|what|where|why|how|when";
const HYPO_MARKER_SRC = "\\b(if|unless|provided(?:\\s+that)?|suppose[sd]?|assuming|in\\s+case)\\b";
const EMBEDDING_VERB_SRC = "\\b(know|knew|ask|asked|asking|wonder|wondered|wondering|doubt|doubted)\\b";

// C9 (2026-09-27): function words are never actors. A leading function word
// falls through to the pronoun search instead of binding garbage ("the",
// "to", "not", "none", "maybe", "why", epistemic adverbs). Subject-negators
// ("nobody", two-word "no one") are real actors and are NOT listed here.
const FUNCTION_WORDS = new Set([
  "the","a","an","to","for","of","in","on","at","with","without",
  "not","no","none","never","maybe","perhaps",
  "definitely","clearly","probably","certainly","really","just","very","quite",
  "already","still","even","also","only","well","now","then","than","so",
  "what","who","whom","whose","which","when","where","why","how",
  "that","this","these","those","such",
  "all","some","many","few","each","every","any","more","most","other","same",
  "there","here","do","does","did","is","was","were","are","be","been",
  "has","have","had","will","would","can","could","shall","should","may","might","must",
  "and","but","yet","while","although","though","or","as","by","from","into",
  "over","under","about","between","through","during",
  // R2-C7b/R2-C8 (2026-09-27): intensifier adverbs and contracted
  // auxiliaries are never actors ("truly" is not a who; "didn't"/"don't"
  // are not subjects); "used" (as in "used to") is not a subject.
  "truly","deeply","fully",
  "don't","doesn't","didn't","can't","won't","isn't","aren't","wasn't","weren't",
  "wouldn't","couldn't","shouldn't","haven't","hasn't","hadn't","mustn't","ain't",
  "used"
]);

function sentenceEndChar(text, index) {
  let bestPos = -1, bestCh = null;
  for (const ch of [".", ";", "!", "?"]) {
    const p = text.indexOf(ch, index);
    if (p >= 0 && (bestPos < 0 || p < bestPos)) { bestPos = p; bestCh = ch; }
  }
  return bestCh;
}

function detectMood(text, clause, clauseStart, relativeIndex) {
  // Hypothetical first: the if-clause comma bounds the scope; the axis must
  // sit inside the supposition. Inverted conditionals ("had she known, ...")
  // count when a comma bounds them.
  const beforeAxis = clause.slice(0, relativeIndex);
  const invCond = /^\s*(had|were|should)\s+[a-z]+\b/i.exec(clause);
  if (invCond) {
    const commaAt = clause.indexOf(",", invCond[0].length);
    if (commaAt >= 0 && relativeIndex < commaAt) {
      // R2-A (2026-09-27, Steve): compose inner polarity — "had she not
      // trusted him" is a different supposition from "had she trusted him".
      // One match, one composed value: 'hypothetical+negated'.
      const hypoSpan = clause.slice(invCond[0].length, relativeIndex);
      if (new RegExp("\\b(?:" + NEGATOR_TOKEN_SRC + ")\\b", "i").test(hypoSpan)) return "hypothetical+negated";
      return "hypothetical";
    }
  }
  const markerRe = new RegExp(HYPO_MARKER_SRC, "ig");
  let m = null, lastMarker = null;
  while ((m = markerRe.exec(beforeAxis)) !== null) lastMarker = m;
  if (lastMarker) {
    const word = String(lastMarker[1] || "").toLowerCase();
    const prefix = beforeAxis.slice(0, lastMarker.index);
    // "know/ask/wonder + if" is an embedded question ("whether"), not a supposition.
    // R2-C11 (2026-09-27): cognition adjectives take embedded questions too —
    // "not sure if" is "whether", not a supposition. Includes the n't forms
    // (R2-C10 family): "wasn't sure if" == "was not sure if".
    const embeddedQ = word === "if" && (
      new RegExp(EMBEDDING_VERB_SRC + "(\\s+[a-z']+){0,3}\\s*$", "i").test(prefix) ||
      /\b(?:is|are|was|were|be|been|not|isn.t|aren.t|wasn.t|weren.t)\s+(?:sure|certain|unclear)\s*$/i.test(prefix)
    );
    if (!embeddedQ) {
      const markerEnd = lastMarker.index + lastMarker[0].length;
      const commaAt = clause.indexOf(",", markerEnd);
      const scopeEnd = commaAt >= 0 ? commaAt : clause.length;
      if (relativeIndex < scopeEnd) {
        // R2-A (2026-09-27, Steve): the negator inside the supposition is
        // consulted, not discarded — "if she didn't trust him" composes to
        // 'hypothetical+negated'. Scoped to hypothetical×polarity only;
        // interrogative keeps its decided absorb-behavior.
        const hypoSpan = clause.slice(markerEnd, relativeIndex);
        if (new RegExp("\\b(?:" + NEGATOR_TOKEN_SRC + ")\\b", "i").test(hypoSpan)) return "hypothetical+negated";
        return "hypothetical";
      }
    }
  }
  // Interrogative: direct questions only. A trailing "?" decides, unless the
  // clause is a reported question ("i asked whether ..."), which keeps the
  // existing whether->uncertain mapping. Leading auxiliary inversion
  // ("did she ...") also decides; "do not ..." imperatives are excluded.
  const endChar = sentenceEndChar(text, clauseStart + relativeIndex);
  const reportedQ = /\b(ask|asked|asking|wonder|wondered|wondering|know|knew)\b[^.!?;]{0,60}\bwhether\b/i.test(clause);
  if (endChar === "?" && !reportedQ) return "interrogative";
  const auxLead = new RegExp("^\\s*(" + MOOD_AUX + ")\\b\\s+(?!not\\b|n't\\b)([a-z]+)\\b", "i").exec(clause);
  if (auxLead) {
    const aux = auxLead[1].toLowerCase();
    const next = auxLead[2].toLowerCase();
    if (aux === "do" || aux === "does" || aux === "did") {
      // "do you ..." asks; "do your part ..." commands (imperative, not a question).
      if (new RegExp("^(?:" + MOOD_SUBJECT + ")$", "i").test(next)) return "interrogative";
    } else {
      return "interrogative";
    }
  }
  const whLead = new RegExp("^\\s*(?:" + MOOD_WH + ")\\b", "i").exec(clause);
  if (whLead) {
    const rest = clause.slice(whLead[0].length);
    if (endChar === "?" || new RegExp("^\\s*(?:" + MOOD_AUX + ")\\b", "i").test(rest)) return "interrogative";
    // Bare "when ..." with no inversion and no "?" is temporal -> asserted (Steve's call).
  }
  return null;
}

// ---- PLAN B: meta-denial scoping ----

const SPEECH_ACT_VERBS = "say|said|saying|claim|claimed|claiming|mention|mentioned|mentioning|state|stated|stating|admit|admitted|admitting|promise|promised|promising|swear|swore|sworn|swearing|insist|insisted|insisting";
// "tell/told/telling" need a propositional complement to be meta: "told her
// i trusted her" withholds the telling, but "does not tell me whose fault
// it was" ('tell' = discern/indicate) does not. Recipient + proposition
// required; a wh-word after the recipient ("whose") fails the match.
const TELL_META_VERB = "(?:tell|told|telling)(?:\\s+[a-z']+)?\\s+(?:that|i|you|he|she|it|we|they|who|what|whether)\\b";
// R2-C3a (2026-09-27): wh-complements are propositional after tell — "she
// never told me who crossed the line" withholds the telling. "whose" is
// deliberately NOT listed (tell = discern there: "does not tell me whose
// fault it was" stays negated); \bwho\b never matches "whose".
const META_NEGATOR = "did\\s+not|didn't|does\\s+not|doesn't|do\\s+not|don't|never|not|no|without|will\\s+not|won't|would\\s+not|wouldn't";
const SPEECH_COMPLEMENT = "that|i|you|he|she|it|we|they|who|what|whether|if";
// R2-B / R2-C3b (2026-09-27): every speech-act verb form, for governance
// and negator-scoping checks.
const ALL_SPEECH_VERB_SRC = "(?:" + SPEECH_ACT_VERBS + "|tell|told|telling)";
// R2-C13 (2026-09-27): cognition/speech verbs whose complement owns a
// downstream uncertainty marker — the marker must not govern the frame.
const COGNITION_VERB_SRC = "wonder|wondered|wondering|think|thought|thinks|believe|believed|believes|know|knew|knows|feel|felt|feels|doubt|doubted|say|said|says|tell|told|telling|claim|claimed|suppose|supposed|assume|assumed";
// R2-C7a (2026-09-27): intensifier adverbs — "really and truly" is phrasal,
// not clausal, and none of these are actors.
const INTENSIFIER_SRC = "really|very|quite|truly|deeply|fully";

function detectWithheld(before, immediate) {
  const negVerb = "\\b(?:" + META_NEGATOR + ")\\s+(?:really|actually|ever|just\\s+)?(?:" + TELL_META_VERB + "|" + SPEECH_ACT_VERBS + ")\\b";
  // Case 1: negator + speech-act verb in the before-window; the axis sits in
  // the verb's complement ("i never said [i trusted her]").
  if (new RegExp(negVerb, "i").test(before)) return true;
  // Case 2: the axis evidence IS the negator, and it modifies a speech-act
  // verb taking a complement ("[never] said i trusted her" — the permanence
  // axis fires on "never"). "never tell a lie" (verb + object, no
  // complement) is content, not meta: it must NOT withhold.
  if (new RegExp("^\\s*(?:" + META_NEGATOR + ")\\s+(?:really|actually|ever|just\\s+)?(?:" + TELL_META_VERB + ")", "i").test(immediate)) return true;
  if (new RegExp("^\\s*(?:" + META_NEGATOR + ")\\s+(?:really|actually|ever|just\\s+)?(?:" + SPEECH_ACT_VERBS + ")\\s+(?:" + SPEECH_COMPLEMENT + ")\\b", "i").test(immediate)) return true;
  return false;
}

// R2-B (2026-09-27, Steve): scope-aware ordering. The speech-act frame
// decides the span BEFORE uncertainty runs — but ONLY when the frame
// strictly governs this axis: a speech-act verb precedes the axis, a
// complement marker sits between verb and axis, and no clause boundary or
// conjunction intervenes. Plain window adjacency is NOT enough (that would
// reintroduce the R2-C1 fragility class).
function speechFrameGoverns(clause, relativeIndex) {
  const before = clause.slice(0, relativeIndex);
  const verbRe = new RegExp("\\b" + ALL_SPEECH_VERB_SRC + "\\b", "gi");
  let m, lastIdx = -1, lastLen = 0;
  while ((m = verbRe.exec(before)) !== null) { lastIdx = m.index; lastLen = m[0].length; }
  if (lastIdx < 0) return null;
  const between = before.slice(lastIdx + lastLen);
  if (/[.,;!?]/.test(between)) return null;
  if (/\b(and|or|but|yet)\b/i.test(between)) return null;
  // The complement marker sits between verb and axis ("said that I") — or
  // at the very head of the axis match itself ("said [i] trusted": the
  // registry phrase "i trust" consumes its own complement, leaving the
  // between-text empty). The head test is start-anchored so a complement
  // word deeper in the axis span (an object, not the verb's complement)
  // cannot fake contiguity.
  const head = clause.slice(relativeIndex, relativeIndex + 8);
  const contig =
    new RegExp("^(?:\\s+[a-z']+){0,3}\\s+(?:" + SPEECH_COMPLEMENT + ")\\b", "i").test(between) ||
    new RegExp("^\\s*(?:" + SPEECH_COMPLEMENT + ")\\b", "i").test(head);
  if (!contig) return null;
  return { verbIndex: lastIdx };
}

function frameWithholds(clause, relativeIndex) {
  const gov = speechFrameGoverns(clause, relativeIndex);
  if (!gov) return false;
  const before = clause.slice(0, relativeIndex);
  const verbBefore = before.slice(0, gov.verbIndex);
  // (a) the verb is directly negated ("I didn't say I might trust her").
  if (new RegExp("\\b(?:" + META_NEGATOR + ")\\s+(?:really|actually|ever|just\\s+)?$", "i").test(verbBefore)) return true;
  // (b) an epistemic embedding marker precedes the verb — the speech act's
  // own occurrence is open ("I don't know whether I said I trusted her").
  // Conservative list: bare maybe/might do NOT count, so "Maybe she said I
  // trusted her" keeps its current mapping.
  if (/\b(do not know|don.t know|cannot know|can.t know|not sure|uncertain|unclear|whether|doubt|doubted|wonder|wondered|ask|asked)\b/i.test(verbBefore)) return true;
  return false;
}

// R2-C13 (2026-09-27): an uncertainty marker downstream of the axis, inside
// a cognition/speech verb's complement, does not govern the frame's own
// axes. "I used to wonder whether I trusted her" — the wondering is stated
// as fact (temporal_scope: not uncertain); only the trust is open. The
// cognition verb must sit OUTSIDE the axis's own match span: when the axis
// IS the cognition phrase ("i do not know"), the marker legitimately
// governs it and this carve-out does not apply.
function markerInComplement(clause, relativeIndex, matchLen = 0) {
  const after = clause.slice(relativeIndex);
  const marker = after.match(/\b(whether|not sure|uncertain|unclear|might|may|could|possibly|perhaps|maybe)\b/i);
  if (!marker) return false;
  const between = after.slice(Math.max(matchLen, 0), marker.index);
  return new RegExp("\\b(?:" + COGNITION_VERB_SRC + ")\\b", "i").test(between);
}

// R2-C3b (2026-09-27): a negator scoped to a speech-act verb belongs to the
// speech act — it must not leak onto downstream content axes ("He didn't
// tell the truth about the decision" must not negate the decision). The
// discern frame is carved out: tell + wh-word ("does not tell me whose
// fault it was") keeps its negation on the content. Operates on a copy;
// the live window is untouched.
function stripSpeechActNegators(before) {
  return before.replace(
    new RegExp("\\b(?:" + META_NEGATOR + ")\\s+(?:really|actually|ever|just\\s+)?" + ALL_SPEECH_VERB_SRC + "\\b(?![^.,;!?]{0,60}\\b(?:who|what|whose|whether|which|if)\\b)", "gi"),
    (m) => " ".repeat(m.length));
}


function normalizeActorToken(token) {
  const value = String(token || "").toLowerCase().replace(/[^a-z0-9_'’-]/g, "");
  if (!value) return null;
  if (value === "i" || value === "me" || value === "my" || value === "myself") return "self";
  if (["he", "him", "his"].includes(value)) return "he";
  if (["she", "her", "hers"].includes(value)) return "she";
  if (["they", "them", "their", "theirs"].includes(value)) return "they";
  if (["we", "us", "our", "ours"].includes(value)) return "we";
  if (["you", "your", "yours"].includes(value)) return "you";
  return value;
}


function resolveActorReference(text, index, actor) {
  if (!actor || !["he", "she", "they"].includes(actor)) return actor;
  const before = text.slice(0, Math.min(text.length, Math.max(0, index) + 24));
  const token = "([a-z][a-z'-]{1,30})";
  const pronoun = actor;
  const pronounWords = new Set(["i","me","my","we","us","our","you","your","he","him","his","she","her","they","them","their"]);
  const named = (value) => value && !pronounWords.has(String(value).toLowerCase()) ? normalizeActorToken(value) : null;

  let matches = [...before.matchAll(new RegExp(`${token}\\s+told\\s+${token}\\s+that\\s+${pronoun}\\b`, "ig"))];
  if (matches.length) { const m = matches[matches.length - 1]; return named(m[2]) || actor; }

  matches = [...before.matchAll(new RegExp(`${token}\\s+(?:said|stated|explained|insisted|admitted|claimed)\\s+(?:that\\s+)?${pronoun}\\b`, "ig"))];
  if (matches.length) {
    const m = matches[matches.length - 1];
    const reporter = named(m[1]);
    if (reporter) return reporter;
  }

  if (pronoun === "he" || pronoun === "she") {
    matches = [...before.matchAll(new RegExp(`${token}\\s+(?:trusted|respected|asked|blamed|credited)\\s+${token}[^.!?;]{0,80}?\\b(he|she)\\b`, "ig"))];
    if (matches.length) {
      const m = matches[matches.length - 1];
      if (String(m[3]).toLowerCase() === pronoun) return named(m[2]) || actor;
    }
    matches = [...before.matchAll(new RegExp(`${token}\\s+expected\\s+${token}\\s+to\\s+[a-z][a-z'-]{1,30}[^.!?;]{0,50}\\b${pronoun}\\b`, "ig"))];
    if (matches.length) { const m = matches[matches.length - 1]; return named(m[2]) || actor; }

    const conjunction = before.match(new RegExp(`(?:^|[.!?;]\\s*)${token}[^.!?;,]{0,100},\\s*(?:and|but|yet)\\s+${pronoun}\\b`, "i"));
    if (conjunction) return named(conjunction[1]) || actor;

    // If a reporting complement already bound one pronoun to the recipient,
    // a later contrasting pronoun can bind to the reporting subject. This uses
    // grammatical roles, not assumptions about a person's name or gender.
    const reportContrast = [...before.matchAll(new RegExp(`${token}\\s+told\\s+${token}\\s+that\\s+(he|she)\\b[^.!?;]{0,160}\\b${pronoun}\\b`, "ig"))];
    if (reportContrast.length) {
      const m = reportContrast[reportContrast.length - 1];
      if (String(m[3]).toLowerCase() !== pronoun) return named(m[1]) || actor;
    }

    // In a two-participant reciprocal clause, a contrasting pronoun after an
    // earlier object-bound pronoun refers to the remaining named participant.
    const reciprocal = [...before.matchAll(new RegExp(`${token}\\s+(?:trusted|respected|asked|blamed|credited)\\s+${token}[^.!?;]{0,100}\\b(he|she)\\b[^.!?;]{0,100}\\b${pronoun}\\b`, "ig"))];
    if (reciprocal.length) {
      const m = reciprocal[reciprocal.length - 1];
      if (String(m[3]).toLowerCase() !== pronoun) return named(m[1]) || actor;
    }

    // Cross-sentence continuity: skip one non-AXOL interjection/report sentence
    // and retain the explicit subject of the preceding structural proposition.
    const currentPrefix = text.slice(0, Math.max(0, index));
    const lastBoundary = Math.max(currentPrefix.lastIndexOf("."), currentPrefix.lastIndexOf("!"), currentPrefix.lastIndexOf("?"));
    const completeBefore = lastBoundary >= 0 ? currentPrefix.slice(0, lastBoundary + 1) : "";
    const sentences = completeBefore.split(/[.!?]+/).map(v => v.trim()).filter(Boolean);
    if (sentences.length >= 2) {
      const prior = sentences[sentences.length - 1];
      const earlier = sentences[sentences.length - 2];
      const structuralPredicate = /\b(?:intend|meant|plan|expect|anticipat|responsib|accountab|chose|choose|choice|decision|decid\w*|control|boundary|limit|trust|reli|respect|disregard|fair|unfair|equit|compar|caus|chang|connect|disconnect|effort|tried|outcome|result|enough|sufficien|own|belong|accept|reject|interpret|sounded|looked|felt|appeared|saw|heard|watched|confirm)\b/i;
      const subject = earlier.match(/^\s*([a-z][a-z'-]{1,30})\b/i);
      const candidate = subject ? named(subject[1]) : null;
      if (candidate && structuralPredicate.test(earlier) && !structuralPredicate.test(prior)) return candidate;
    }
  }
  return actor;
}

function attributionSegment(text, index) {
  // R2-C7a (2026-09-27): phrasal "and" between intensifiers ("really and
  // truly") is not a clause boundary — blank it length-preservingly so the
  // " and " split below skips it without shifting indices.
  const flat = text.replace(new RegExp("\\b(?:" + INTENSIFIER_SRC + ")\\s+and\\s+(?:" + INTENSIFIER_SRC + ")\\b", "gi"), (m) => " ".repeat(m.length));
  const before = flat.slice(0, Math.max(0, index));
  const boundary = Math.max(
    before.lastIndexOf("."), before.lastIndexOf(";"), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf(","),
    before.lastIndexOf(", but "), before.lastIndexOf(", yet "), before.lastIndexOf(", while "),
    before.lastIndexOf(", although "), before.lastIndexOf(", though "), before.lastIndexOf(" and ")
  );
  return text.slice(boundary < 0 ? 0 : boundary + 1, Math.max(0, index) + 80).trim();
}

function inferActor(text, index, matchedText = "") {
  const actor = inferActorInner(text, index, matchedText);
  // C12 (2026-09-27): a first-person pronoun inside a reported quote belongs
  // to the quoted speaker, not the reporter ("self"). Only 'self' is
  // overridden; third-person pronouns inside quotes are left alone.
  if (actor === "self") {
    const qs = quotedSpeaker(text, index);
    if (qs) return qs;
  }
  return actor;
}

// C12 (2026-09-27): resolve the reporting subject for an axis sitting inside
// a double-quoted span ('She said "I choose to leave"' -> "she"). Naive
// quote pairing; returns null when not quoted or when no reporting verb
// with a subject precedes the opening quote.
//
// C12 single-quote extension (2026-09-27, Steve's hole patch): paired single
// quotes count as quotation marks with apostrophe-safe rules -- an opening
// quote must NOT be preceded by a word character, a closing quote must NOT
// be followed by a word character, and the quoted span must contain
// whitespace. So "She said, 'I trust you'" attributes like the double-quote
// case, while "don't", "it's", "John's" never match (apostrophes are
// word-adjacent, and contractions/possessives never form valid pairs).
function singleQuoteSpans(text) {
  const spans = [];
  const isWord = (c) => /[A-Za-z0-9_]/.test(c || '');
  let i = 0;
  while (i < text.length) {
    if (text[i] === "'" && !isWord(text[i - 1])) {
      let close = -1;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] === "'" && !isWord(text[j + 1])) { close = j; break; }
      }
      if (close > i + 1 && /\s/.test(text.slice(i + 1, close))) {
        spans.push([i, close]);
        i = close + 1;
        continue;
      }
    }
    i++;
  }
  return spans;
}

// R2-C (2026-09-27, Steve): reporting-verb list unified with the Plan B
// speech-act verbs. Reporting verbs report speech; they are not meta-denial
// verbs — the two lists have different jobs, documented here, one source now.
const REPORT_VERB_SRC = SPEECH_ACT_VERBS + "|tell|told|telling|explained|replied|asked";

function quotedSpeaker(text, index) {
  const spans = [];
  const dq = [];
  for (let i = 0; i < text.length; i++) if (text[i] === '"') dq.push(i);
  for (let q = 0; q + 1 < dq.length; q += 2) spans.push([dq[q], dq[q + 1]]);
  for (const s of singleQuoteSpans(text)) spans.push(s);
  // R2-C (2026-09-27, Steve): innermost-wins with outward fallback. The
  // narrowest enclosing span's reporting frame decides ("He told me" +
  // quote -> he); if the inner frame has no resolvable reporter, fall back
  // outward. Cap at 3 levels — past that, fail closed (null), never guess.
  const enclosing = spans
    .filter(([open, shut]) => index > open && index < shut)
    .sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]));
  if (enclosing.length > 3) return null;
  const frameRe = new RegExp(
    "([a-z][a-z'-]{1,30})\\s+(?:" + REPORT_VERB_SRC + ")(?:\\s+[a-z][a-z'-]{1,30}){0,2}\\s*[^a-z]*$", "i");
  for (const [open] of enclosing) {
    const m = text.slice(0, open).match(frameRe);
    if (m) return normalizeActorToken(m[1]);
  }
  return null;
}

function inferActorInner(text, index, matchedText = "") {
  const matched = String(matchedText || "").trim();
  const explicit = matched.match(/^\b(i|we|you|he|she|they|me|my|him|his|her|them|their|us|our)\b/i);
  if (explicit && /\s/.test(matched)) { const actor = normalizeActorToken(explicit[1]); return resolveActorReference(text, index, actor); }
  // C9 fix (2026-09-27): the /i flag defeated the [A-Z] anchor, so any lowercase
  // word before trust/respect/take/cross ("to respect") misbound as a named
  // subject. This branch is for capitalized proper names only.
  const namedSubject = matched.match(/^\b([A-Z][a-z'-]{1,30})\s+(?:intend|expect|choose|chose|decid|control|own|trust|respect|accept|reject|cause|take|took|cross)/);
  const nonActors = new Set(["not", "never", "cannot", "cant", "doesnt", "didnt", "wont"]);
  if (namedSubject && !nonActors.has(String(namedSubject[1]).toLowerCase())) return normalizeActorToken(namedSubject[1]);
  const segment = attributionSegment(text, index);
  const localIndex = Math.max(0, Math.min(segment.length, index - Math.max(0, text.indexOf(segment))));
  const before = segment.slice(0, localIndex + 1);
  let unresolvedNearby = null;
  const nearbyPronouns = [...before.matchAll(/\b(he|she|they)\b/ig)];
  if (nearbyPronouns.length) {
    const last = nearbyPronouns[nearbyPronouns.length - 1];
    if (before.length - (last.index + last[0].length) <= 35) {
      const raw = normalizeActorToken(last[1]);
      const resolved = resolveActorReference(text, index, raw);
      if (resolved && resolved !== raw) return resolved;
      if (["he", "she", "they"].includes(raw)) unresolvedNearby = raw;
    }
  }
  // C9 (2026-09-27): two-word "no one" is a subject-negator — a real actor,
  // kept like "nobody".
  if (/^\s*(?:(?:and|while|but|yet|although|though|then)\s+)?no\s+one\b/i.test(segment)) return "nobody";
  const leading = segment.match(/^\s*(?:(?:and|while|but|yet|although|though|then)\s+)?(i|we|you|he|she|they|[a-z][a-z'-]{1,30})\b/i);
  if (leading) {
    const tok = leading[1].toLowerCase();
    // C9 (2026-09-27): leading function words and expletive "it" ("it is/was
    // ... that") are never actors — fall through to the pronoun search.
    const expletiveIt = tok === "it" && /^\s*(?:(?:and|while|but|yet|although|though|then)\s+)?it\s+(is|was|'s)\b/i.test(segment);
    if (!FUNCTION_WORDS.has(tok) && !expletiveIt) {
    const raw = normalizeActorToken(leading[1]);
    if (unresolvedNearby && !["he","she","they"].includes(raw)) return unresolvedNearby;
    const resolved = resolveActorReference(text, index, raw);
    if (resolved !== raw || !["he","she","they"].includes(raw)) return resolved;
    // Conservative cross-sentence continuity: resolve only when the immediately
    // preceding sentence contains one unambiguous named participant compatible
    // with the pronoun. Otherwise retain the pronoun rather than guess.
    const priorText = text.slice(0, Math.max(0, text.lastIndexOf(".", index)));
    const sentences = priorText.split(/[.!?]+/).map(v => v.trim()).filter(Boolean);
    const prior = sentences.length ? sentences[sentences.length - 1] : "";
    const names = [...prior.matchAll(/\b([a-z][a-z'-]{1,30})\b/ig)]
      .map(m => m[1].toLowerCase())
      .filter(v => !new Set(["i","we","you","he","she","they","him","her","them","the","a","an","to","for","of","in","on","at","with","and","but","yet","said","told","asked","objected","confronted","morning","next"]).has(v));
    const actorCandidates = [...new Set(names.filter(v => /^[a-z][a-z'-]{2,30}$/.test(v)))];
    if (actorCandidates.length === 1) return normalizeActorToken(actorCandidates[0]);

    return raw;
    } // end C9 function-word guard
  }
  const pronouns = [...before.matchAll(/\b(i|me|my|myself|he|him|his|she|her|hers|they|them|their|theirs|we|us|our|ours|you|your|yours)\b/ig)];
  if (pronouns.length) { const actor = normalizeActorToken(pronouns[pronouns.length - 1][1]); return resolveActorReference(text, index, actor); }
  const names = [...before.matchAll(/\b([a-z][a-z'-]{1,30})\b/ig)].map(m => m[1].toLowerCase());
  // C9 (2026-09-27): function words extended in the fallback name scan so no
  // garbage actor binds when the earlier branches fall through.
  // R2-C7b/R2-C8 (2026-09-27): intensifier adverbs and contracted auxiliaries
  // are never actors ("truly" is not a who; "didn't"/"don't" are not
  // subjects); "used" (as in "used to") is not a subject.
  const stop = new Set(["but","yet","while","although","though","and","the","a","an","to","for","of","in","on","at","with","without","not","no","none","never","does","did","do","is","was","were","are","be","been","has","have","had","will","would","can","could","shall","should","may","might","must","it","its","this","that","these","those","what","who","whom","whose","which","when","where","why","how","maybe","perhaps","definitely","clearly","probably","certainly","really","just","very","quite","already","still","even","also","only","well","now","then","than","so","if","one","all","some","many","few","each","every","any","more","most","other","such","same","own","there","here","or","as","by","from","into","over","under","about","between","through","during","truly","deeply","fully","don't","doesn't","didn't","can't","won't","isn't","aren't","wasn't","weren't","wouldn't","couldn't","shouldn't","haven't","hasn't","hadn't","mustn't","ain't","used"]);
  for (let i = names.length - 1; i >= 0; i--) if (!stop.has(names[i])) return normalizeActorToken(names[i]);
  // R2-C8 (2026-09-27): postposed tag subject ("Used to trust her, I did.")
  // — a comma + pronoun + auxiliary right after the axis owns it. Narrow:
  // only fires when the leftward inference found nothing at all.
  const afterTag = text.slice(index, index + 24).match(/,\s*(i|we|you|he|she|they)\s+(did|do|does|am|is|are|was|were|have|has|will|would)\b/i);
  if (afterTag) return normalizeActorToken(afterTag[1]);
  return null;
}

function collectEvidenceMatches(text, rule, sourceText = text) {
  text = maskExcludedSpans(text, rule);
  const matches = [];
  for (const phrase of (Array.isArray(rule.phrases) ? rule.phrases : [])) {
    const needle = phrase.toLowerCase();
    const index = text.indexOf(needle);
    if (index >= 0) matches.push({ evidence: phrase, index, state: evidenceState(text, index, phrase.length), actor: inferActor(sourceText, index) });
  }
  for (const group of (Array.isArray(rule.allGroups) ? rule.allGroups : [])) {
    for (const phrase of (Array.isArray(group.phrases) ? group.phrases : [])) {
      const needle = phrase.toLowerCase();
      const index = text.indexOf(needle);
      if (index >= 0) matches.push({ evidence: phrase, index, state: evidenceState(text, index, phrase.length), actor: inferActor(sourceText, index) });
    }
  }
  for (const pattern of (Array.isArray(rule.regexPatterns) ? rule.regexPatterns : [])) {
    try {
      const re = new RegExp(pattern, "ig");
      let match;
      while ((match = re.exec(text)) !== null) {
        matches.push({ evidence: `regex:${pattern}`, index: match.index, state: evidenceState(text, match.index, match[0].length), actor: inferActor(sourceText, match.index, match[0]) });
        if (match[0].length === 0) re.lastIndex++;
      }
    } catch (_) {}
  }
  return matches;
}

function appendUnique(target, values) {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    if (typeof value === "string" && value.length > 0 && !target.includes(value)) {
      target.push(value);
    }
  }
}

function detectAxesWithRules(input, rules) {
  const text = normalizeInput(input);
  const allRules = Array.isArray(rules) ? [...rules] : [];
  const axes = [];
  const patterns = [];
  const axis_evidence = [];

  allRules.sort((a, b) => (a.priority || 9999) - (b.priority || 9999));

  for (const rule of allRules) {
    if (rule && ruleMatches(text, rule)) {
      appendUnique(axes, rule.axes);
      appendUnique(patterns, rule.patterns);
      const evidenceMatches = collectEvidenceMatches(text, rule, text);
      const evidence = evidenceMatches.map((item) => item.evidence);
      const states = [...new Set(evidenceMatches.map((item) => item.state))];
      const attributions = evidenceMatches.filter((item) => item.actor).map((item) => ({ actor: item.actor, evidence: item.evidence, state: item.state }));
      for (const axis of (Array.isArray(rule.axes) ? rule.axes : [])) {
        const existing = axis_evidence.find((item) => item.axis === axis);
        if (existing) {
          appendUnique(existing.evidence, evidence);
          appendUnique(existing.rules, [rule.id]);
          appendUnique(existing.states, states);
          existing.attributions = Array.isArray(existing.attributions) ? existing.attributions : [];
          for (const attribution of attributions) {
            if (!existing.attributions.some((item) => item.actor === attribution.actor && item.evidence === attribution.evidence && item.state === attribution.state)) existing.attributions.push(attribution);
          }
        } else {
          axis_evidence.push({ axis, evidence: [...evidence], rules: [rule.id], states: [...states], attributions: [...attributions] });
        }
      }
    }
  }

  // Multilingual evidence is additive: language packs route evidence into the
  // same AXOL vocabulary without changing English rules or downstream authority.
  const multilingual = detectMultilingualAxolEvidence(input);
  for (const item of multilingual.axis_evidence) {
    appendUnique(axes, [item.axis]);
    const existing = axis_evidence.find((entry) => entry.axis === item.axis);
    if (existing) {
      appendUnique(existing.evidence, item.evidence);
      appendUnique(existing.rules, item.rules);
      appendUnique(existing.states, item.states);
      existing.languages = Array.isArray(existing.languages) ? existing.languages : [];
      appendUnique(existing.languages, item.languages);
    } else {
      axis_evidence.push({ ...item });
    }
  }

  return {
    axes,
    dominant_axis: axes[0] || null,
    patterns,
    axis_evidence,
    detected_languages: multilingual.languages
  };
}

function detectAxes(input) {
  const registry = getAxisRegistry();
  return detectAxesWithRules(input, Array.isArray(registry.rules) ? registry.rules : []);
}

// Staging evaluation for the AXOL Teaching Intake independent examiner.
// Runs detection with candidate rules injected IN MEMORY ONLY — the live
// registry file is never touched. Lets the examiner score a proposed rule
// blind without promoting it.
function detectAxesWithExtraRules(input, extraRules) {
  const registry = getAxisRegistry();
  const base = Array.isArray(registry.rules) ? registry.rules : [];
  const extra = Array.isArray(extraRules) ? extraRules : [];
  return detectAxesWithRules(input, [...base, ...extra]);
}

function clearAxisRegistryCache() {
  cachedAxisRegistry = null;
}

module.exports = { detectAxes, detectAxesWithExtraRules, clearAxisRegistryCache };
