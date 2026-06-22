/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * impression-parser-llm.golden.test.ts — guards against LLM CONFABULATION.
 *
 * WHY THIS EXISTS
 * The impression parser hands a section of report text to a 0.5B instruct model
 * (Qwen2.5) to extract findings. On a Quest ANA report, the section detector
 * handed it a 14-char column header ("Analyte Value"), and the model — given
 * near-empty input — INVENTED two diagnoses ("an elevated level of creatinine
 * was detected", "a history of hypertension and diabetes mellitus") that appear
 * NOWHERE in the document. On a medical timeline, a fabricated diagnosis is the
 * worst possible failure. (Ren caught it dogfooding quest3.pdf, 2026-06-22.)
 *
 * TWO GUARDS pinned here:
 *   1. Skip the model on text too short / non-prose to hold a finding.
 *   2. Ground every returned finding in the source text — drop any whose
 *      distinctive content words aren't actually in the document.
 *
 * HOW TO RUN:
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out lib/services/impression-parser-llm.golden.test.ts
 *   node .tmp-out/lib/services/impression-parser-llm.golden.test.js
 */

import {
  extractImpressionItemsLLM,
  setImpressionLLMRunner,
  type ImpressionLLMRunner,
} from './impression-parser-llm';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }
}

/** A runner that returns a fixed canned model response (or null). */
function cannedRunner(response: string | null): ImpressionLLMRunner {
  return { run: async () => response, isReady: () => true };
}

// The exact confabulation observed in the wild, as the model returned it.
const CONFABULATION_JSON = JSON.stringify([
  { finding: 'An elevated level of creatinine was detected in the blood sample.', negated: false, dismissal_language: 'none', is_synthesis: false, is_historical: false },
  { finding: 'The patient had a history of hypertension and diabetes mellitus.', negated: false, dismissal_language: 'none', is_synthesis: false, is_historical: false },
]);

// A real-ish ANA interpretive section — long enough to pass guard 1, and it
// does NOT contain "creatinine"/"hypertension"/"diabetes".
const ANA_SOURCE =
  'RNP antibody is found in patients with mixed connective tissue disease in high ' +
  'titer and may be present in systemic lupus erythematosus. A low level ANA titer ' +
  'may be present in pre-clinical autoimmune disease.';

(async () => {
  console.log('\n🧠 impression-parser-llm confabulation-guard suite\n');

  // GUARD 1 — too-short input is never sent to the model.
  setImpressionLLMRunner(cannedRunner(CONFABULATION_JSON)); // would confabulate IF called
  check('guard1: 14-char column header "Analyte\\nValue" → null (model not trusted)',
    (await extractImpressionItemsLLM('Analyte\nValue')) === null);
  check('guard1: empty impression → null',
    (await extractImpressionItemsLLM('   ')) === null);

  // GUARD 2 — confabulated findings (not in source) are dropped.
  const confab = await extractImpressionItemsLLM(ANA_SOURCE);
  check('guard2: confabulated creatinine/hypertension findings dropped → null',
    confab === null,
    confab ? `kept: ${confab.map((i) => i.finding).join(' | ')}` : 'null');

  // GUARD 2 — a finding that IS grounded in the source survives.
  setImpressionLLMRunner(cannedRunner(JSON.stringify([
    { finding: 'Mixed connective tissue disease', negated: false, dismissal_language: 'none', is_synthesis: false, is_historical: false },
  ])));
  const grounded = await extractImpressionItemsLLM(ANA_SOURCE);
  check('guard2: grounded finding ("mixed connective tissue disease") survives',
    !!grounded && grounded.length === 1,
    grounded ? `${grounded.length} items` : 'null');

  // GUARD 2 — mixed batch: keep the grounded one, drop the confabulated one.
  setImpressionLLMRunner(cannedRunner(JSON.stringify([
    { finding: 'Elevated creatinine in the blood', negated: false, dismissal_language: 'none', is_synthesis: false, is_historical: false }, // NOT in source
    { finding: 'Systemic lupus erythematosus', negated: false, dismissal_language: 'none', is_synthesis: false, is_historical: false },      // IN source
  ])));
  const mixed = await extractImpressionItemsLLM(ANA_SOURCE);
  check('guard2: mixed batch keeps grounded, drops confabulated',
    !!mixed && mixed.length === 1 && /lupus/i.test(mixed[0].finding ?? mixed[0].text),
    mixed ? mixed.map((i) => i.finding).join(' | ') : 'null');

  console.log('\n──────────────────────────────────────────');
  console.log(`PASS: ${pass}   FAIL: ${fail}`);
  console.log('──────────────────────────────────────────\n');
  if (fail > 0) process.exit(1);
})();
