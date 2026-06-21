/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * assertion.ts — NegEx / ConText assertion classification (CHA-367 §3.B).
 *
 * Replaces the old 40-char backward window (which both (a) surfaced negated
 * findings as positive diagnoses — "No evidence of acute fracture" → a
 * diagnosis — and (b) DANGEROUSLY suppressed real findings via pseudo-negation —
 * "no interval change in the known mass" → dropped the mass).
 *
 * Algorithm: NegEx (Chapman 2001) + ConText (Harkema 2009). Deterministic, no
 * LLM, no PHI risk, literature-defensible. For a target entity span we:
 *   1. scope to the SENTENCE containing it (cues can't leak across sentences);
 *   2. clip the scope at TERMINATION words ("but", "however", "except", …) so a
 *      negation doesn't bleed past a contrast;
 *   3. apply PSEUDO-negation guards FIRST — "no change/interval change/increase
 *      in X" is NOT a negation of X (this is the safety-critical guard: it's the
 *      most common follow-up-imaging sentence and must keep the finding);
 *   4. classify: affirmed / negated / speculative / historical / family.
 *
 * Asymmetric-harm rule (spec §4): when unsure, DO NOT suppress — a benign
 * finding surfaced for review costs a conversation; a suppressed real finding
 * costs a diagnosis. So pseudo-negation always wins over negation, and
 * "normal"/"unremarkable" are NOT treated as negation cues (too blunt — they
 * describe a structure, they don't negate a co-mentioned finding).
 */

export type Assertion = 'affirmed' | 'negated' | 'speculative' | 'historical' | 'family';

export interface AssertionResult {
  assertion: Assertion;
  /** the cue that drove a non-affirmed classification, for tracing/debugging. */
  cue?: string;
}

// --- cue lexicons -----------------------------------------------------------
// PSEUDO-negation: a "no"/"not" that does NOT negate the finding. Checked FIRST;
// if the negation cue is part of one of these, it is ignored. These are the
// killers — "no change in the known mass" must keep the mass.
const PSEUDO_NEGATION = [
  /\bno\s+(?:significant\s+)?(?:interval\s+)?change\b/i,
  /\bno\s+(?:significant\s+)?(?:interval\s+)?(?:increase|decrease|progression|worsening)\b/i,
  /\bno\s+new\b/i,
  /\bnot\s+(?:significantly|substantially|necessarily|only|drained)\b/i,
  /\bno\s+significant\b/i,
  /\bwithout\s+(?:difficulty|change|interval\s+change)\b/i,
  /\bnot\s+(?:entirely|completely)\s+(?:excluded|ruled\s+out)\b/i, // = still possible → hedge, not negation
  /\bcannot\s+be\s+(?:entirely\s+)?excluded\b/i,
  /\bcannot\s+(?:exclude|rule\s+out)\b/i,
  /\bnot\s+well\s+(?:seen|visualized|evaluated)\b/i, // limited study, not a negation of disease
];

// PRE-negation cues — negate entities that FOLLOW them (forward scope).
const PRE_NEGATION = [
  /\bno\s+evidence\s+of\b/i,
  /\bno\s+sign(?:s)?\s+of\b/i,
  /\bno\b/i,
  /\bwithout\b/i,
  /\babsence\s+of\b/i,
  /\bdenies\b/i, /\bdenied\b/i, /\bdeny\b/i,
  /\bnegative\s+for\b/i,
  /\bfree\s+of\b/i,
  /\bfails?\s+to\s+(?:reveal|demonstrate|show)\b/i,
  /\bruled?\s+out\b/i,
  /\brules\s+out\b/i,
  /\bnot\b/i,
];

// POST-negation cues — negate entities that PRECEDE them (backward scope).
const POST_NEGATION = [
  /\bis\s+ruled\s+out\b/i,
  /\bwere?\s+ruled\s+out\b/i,
  /\bnot\s+(?:seen|identified|present|appreciated|visualized|demonstrated)\b/i,
  /\bare\s+absent\b/i,
  /\bis\s+absent\b/i,
];

// TERMINATION — end the scope of a cue (a contrast / new clause starts here).
const TERMINATION = [
  /\bbut\b/i, /\bhowever\b/i, /\bexcept\b/i, /\balthough\b/i, /\bthough\b/i,
  /\byet\b/i, /\bnevertheless\b/i, /\baside\s+from\b/i, /\bapart\s+from\b/i,
  /\bother\s+than\b/i, /\bsecondary\s+to\b/i, /\bas\s+well\s+as\b/i,
  /\bwhich\b/i, /\bcause\s+for\b/i,
];

// HEDGE / speculation — surface WITH an uncertainty marker, never suppress.
const HEDGE = [
  /\bmay\b/i, /\bmight\b/i, /\bcould\b/i, /\bpossibl[ey]\b/i, /\bprobabl[ey]\b/i,
  /\bsuspect(?:ed|s)?\b/i, /\bsuspicious\s+for\b/i, /\bconcern(?:ing|ed)?\s+for\b/i,
  /\bworrisome\s+for\b/i, /\bquestionable\b/i, /\bdifferential\b/i,
  /\bconsider\b/i, /\bcannot\s+(?:exclude|rule\s+out)\b/i,
  /\bnot\s+(?:entirely|completely)\s+(?:excluded|ruled\s+out)\b/i,
  /\bsuggestive\s+of\b/i, /\bappears?\s+to\b/i,
];

// HISTORICAL — past / resolved context.
const HISTORICAL = [
  /\bhistory\s+of\b/i, /\bh\/o\b/i, /\bhx\s+of\b/i, /\bhx\b/i,
  /\bstatus\s+post\b/i, /\bs\/p\b/i, /\bpost[-\s]/i,
  /\bremote\b/i, /\bprevious(?:ly)?\b/i, /\bprior\b/i, /\bold\b/i,
];

// FAMILY — belongs to a relative, not the patient.
const FAMILY = [
  /\bfamily\s+history\b/i, /\bfamilial\b/i, /\bfh:\b/i,
  /\b(?:mother|father|sister|brother|sibling|parent|maternal|paternal|grandmother|grandfather)\b/i,
];

// --- sentence + scope helpers ----------------------------------------------

/** The sentence containing [start,end). Split on . ; ! ? and newlines, but NOT
 *  on a period between digits (decimals) — keeps "1.5 cm" intact. */
function sentenceBounds(text: string, start: number, end: number): { s: number; e: number } {
  // walk back to the previous sentence terminator
  let s = 0;
  for (let i = start - 1; i > 0; i--) {
    const c = text[i];
    if (c === '\n' || c === ';' || c === '!' || c === '?') { s = i + 1; break; }
    if (c === '.' && !(/\d/.test(text[i - 1]) && /\d/.test(text[i + 1] ?? ''))) { s = i + 1; break; }
  }
  // walk forward to the next sentence terminator
  let e = text.length;
  for (let i = end; i < text.length; i++) {
    const c = text[i];
    if (c === '\n' || c === ';' || c === '!' || c === '?') { e = i; break; }
    if (c === '.' && !(/\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? ''))) { e = i; break; }
  }
  return { s, e };
}

/** Index just AFTER the last termination word in [from,to), else `from`. Used to
 *  clip a pre-cue's left edge so a negation before "but" doesn't reach the entity. */
function lastTerminationEnd(segment: string): number {
  let idx = 0;
  for (const t of TERMINATION) {
    const re = new RegExp(t.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(segment)) !== null) {
      const endOfMatch = m.index + m[0].length;
      if (endOfMatch > idx) idx = endOfMatch;
    }
  }
  return idx;
}

/** Index of the first termination word in `segment`, else `segment.length`.
 *  Clips a post-cue's right edge similarly. */
function firstTerminationStart(segment: string): number {
  let idx = segment.length;
  for (const t of TERMINATION) {
    const m = segment.match(new RegExp(t.source, 'i'));
    if (m && m.index !== undefined && m.index < idx) idx = m.index;
  }
  return idx;
}

function anyMatch(haystack: string, cues: RegExp[]): RegExpMatchArray | null {
  for (const c of cues) {
    const m = haystack.match(c);
    if (m) return m;
  }
  return null;
}

/**
 * Classify the assertion of the entity at [entityStart, entityEnd) within `text`.
 * `text` is the chunk/section; offsets are into it.
 */
export function classifyAssertion(
  text: string,
  entityStart: number,
  entityEnd: number,
): AssertionResult {
  const { s, e } = sentenceBounds(text, entityStart, entityEnd);
  const before = text.slice(s, entityStart);
  const after = text.slice(entityEnd, e);

  // FAMILY / HISTORICAL look across the whole sentence (context, not scoped).
  const fam = anyMatch(before, FAMILY) || anyMatch(after, FAMILY);
  if (fam) return { assertion: 'family', cue: fam[0].trim() };

  // PRE-negation: scope = text between the last termination word and the entity.
  const preScope = before.slice(lastTerminationEnd(before));
  // PSEUDO-negation guard FIRST — if the negation in scope is pseudo, it doesn't
  // negate (safety-critical: "no change in the mass" keeps the mass).
  const pseudo = anyMatch(preScope, PSEUDO_NEGATION);
  const preNeg = pseudo ? null : anyMatch(preScope, PRE_NEGATION);

  // POST-negation: scope = entity to the first termination word after it.
  const postScope = after.slice(0, firstTerminationStart(after));
  const postNeg = anyMatch(postScope, POST_NEGATION);

  if (preNeg || postNeg) {
    return { assertion: 'negated', cue: (preNeg || postNeg)![0].trim() };
  }

  // HEDGE scopes FORWARD (like pre-negation): "may be X", "suspicious for X",
  // "possible X" hedge the entity that FOLLOWS. So check the pre-scope only — a
  // hedge AFTER the entity in apposition ("a nodule, suspicious for malignancy")
  // qualifies the following noun, not the preceding one, so the nodule stays
  // affirmed. A pseudo-negation that is itself a hedge ("cannot exclude X")
  // counts too.
  const hedge = pseudo && /exclud|rule/i.test(pseudo[0])
    ? pseudo
    : anyMatch(preScope, HEDGE);
  if (hedge) return { assertion: 'speculative', cue: hedge[0].trim() };

  const hist = anyMatch(before, HISTORICAL);
  if (hist) return { assertion: 'historical', cue: hist[0].trim() };

  return { assertion: 'affirmed' };
}

/** Convenience booleans mirroring the old API so callers migrate cleanly. */
export function isNegatedAssertion(text: string, start: number, end: number): boolean {
  return classifyAssertion(text, start, end).assertion === 'negated';
}
export function isSpeculativeAssertion(text: string, start: number, end: number): boolean {
  return classifyAssertion(text, start, end).assertion === 'speculative';
}
