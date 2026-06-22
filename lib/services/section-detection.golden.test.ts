/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * section-detection.golden.test.ts — Golden suite for detectSections().
 *
 * WHY THIS EXISTS
 * detectSections() decides what counts as a radiology "IMPRESSION/FINDINGS/…"
 * section. Those sections feed the diagnosis parser + NER and carry the highest
 * confidence weight (impression = 1.0), so a FALSE section silently manufactures
 * medical events. There was no golden here, and that gap let a real bug ship:
 * a Quest LAB report's interpretive prose — "…supplementation. Interpretation
 * and therapy are based on measurement of Vitamin D…" — was mis-detected as an
 * IMPRESSION section (the old pattern allowed a period header-start + optional
 * colon), which hallucinated "pregnancy"/"Second" (trimester)/"TSH Analysis:"
 * events onto the timeline. (Ren caught it dogfooding, 2026-06-22.)
 *
 * THE RULE this suite pins: a section header is LINE-ANCHORED and terminated by a
 * colon/dash, a line break, or end-of-text. A prose word mid-sentence is NOT a
 * header. Real radiology headers (with OR without a colon) must still be found.
 *
 * HOW TO RUN (no test framework installed in this repo yet):
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out lib/services/section-detection.golden.test.ts
 *   node .tmp-out/lib/services/section-detection.golden.test.js
 */

import { detectSections } from './medical-ner';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }
}
function names(text: string): string[] {
  return detectSections(text).map((s) => s.name);
}
function has(text: string, name: string): boolean {
  return names(text).includes(name);
}

console.log('\n🧭 section-detection golden suite\n');

// --- REAL radiology headers MUST still be detected --------------------------
check('radiology "IMPRESSION:" detected',
  has('FINDINGS:\nLungs clear.\n\nIMPRESSION:\n1. No acute disease.', 'impression'));
check('radiology "FINDINGS:" detected',
  has('FINDINGS:\nLungs clear.\n\nIMPRESSION:\n1. No acute disease.', 'findings'));
check('radiology "IMPRESSION" no colon, own line detected',
  has('TECHNIQUE\nCT chest.\n\nIMPRESSION\nMass in RUL.', 'impression'));
check('lowercase "Impression:" header detected',
  has('Impression:\nDegenerative changes.', 'impression'));
check('"INTERPRETATION:" WITH a colon is a real header',
  has('INTERPRETATION:\nConsistent with iron deficiency.', 'impression'));
check('"TECHNIQUE" header detected',
  has('TECHNIQUE\nCT chest.\n\nIMPRESSION\nMass.', 'technique'));

// --- LAB prose MUST NOT be mis-detected as a section ------------------------
check('lab prose "Interpretation and therapy are based on…" is NOT an impression',
  !has('Vitamin D supplementation. Interpretation and therapy are based on measurement of Vitamin D, 1,25(OH)2, Total.', 'impression'),
  names('Vitamin D supplementation. Interpretation and therapy are based on measurement of Vitamin D, 1,25(OH)2, Total.').join(','));
check('mid-sentence "…supplementation. Interpretation and…" does NOT open a section (period is not a header-start)',
  !has('hemoglobin A1c control. Interpretation and therapy are based on this.', 'impression'));
check('prose "Summary of findings shows…" is NOT a summary header',
  !has('The summary of findings shows no change.', 'impression'));
check('prose "Assessment and plan were discussed" is NOT an assessment header',
  !has('Assessment and plan were discussed with the patient.', 'impression'));

// --- The real Quest shape: interpretive prose + disclaimer, NO real header --
{
  const questish = [
    'COMPREHENSIVE METABOLIC PANEL',
    'GLUCOSE 82 Reference Range: 65-99 mg/dL',
    'In diabetes, hemoglobin A1c <7.0% represents optimal control in non-pregnant',
    'diabetic patients. Interpretation and therapy are based on measurement of',
    'Vitamin D, 1,25(OH)2, Total.',
    'This test was developed and its analytical performance characteristics have',
    'been determined by Quest Diagnostics Nichols Institute, Chantilly, VA.',
    'TSH 3.02 mIU/L',
    'Pregnancy Ranges',
    'First trimester 0.26-2.66',
    'Second trimester 0.73-4.09',
  ].join('\n');
  check('Quest-shaped lab text yields NO impression section',
    !has(questish, 'impression'), names(questish).join(','));
  check('Quest-shaped lab text yields NO findings section',
    !has(questish, 'findings'), names(questish).join(','));
}

// --- summary ----------------------------------------------------------------
console.log('\n──────────────────────────────────────────');
console.log(`PASS: ${pass}   FAIL: ${fail}`);
console.log('──────────────────────────────────────────\n');
if (fail > 0) process.exit(1);
