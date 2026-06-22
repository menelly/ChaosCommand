/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * assertion.golden.test.ts — adversarial golden suite for the NegEx/ConText
 * assertion engine (CHA-367 §3.B).
 *
 * The bar (spec §5): ZERO suppressed real findings on the adversarial
 * "no change in X" set. A suppressed real finding costs a diagnosis; a surfaced
 * benign one costs a conversation. So the pseudo-negation cases are the
 * load-bearing ones — they MUST stay affirmed.
 *
 * All text is SYNTHETIC (no PHI). Phrasings mirror real radiology/clinic prose.
 *
 * HOW TO RUN (no framework installed):
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out lib/services/assertion.golden.test.ts
 *   node .tmp-out/lib/services/assertion.golden.test.js
 */

import { classifyAssertion, classifyStatement, type Assertion } from './assertion';

let pass = 0, fail = 0;

/** Find `entity` in `sentence`, classify it, assert the expected assertion. */
function expect(sentence: string, entity: string, want: Assertion, note?: string) {
  const start = sentence.toLowerCase().indexOf(entity.toLowerCase());
  if (start < 0) { fail++; console.log(`  ✗ entity "${entity}" not found in: ${sentence}`); return; }
  const got = classifyAssertion(sentence, start, start + entity.length);
  if (got.assertion === want) { pass++; }
  else { fail++; console.log(`  ✗ FAIL [${want} expected, got ${got.assertion}${got.cue ? ` via "${got.cue}"` : ''}] "${entity}" — ${note || sentence}`); }
}

console.log('\n🩺 assertion (NegEx/ConText) golden suite\n');

// --- SAFETY-CRITICAL: pseudo-negation MUST stay affirmed (never suppressed) ---
expect('There is no interval change in the known liver mass.', 'liver mass', 'affirmed', 'pseudo: no interval change');
expect('No significant change in the pulmonary nodule.', 'pulmonary nodule', 'affirmed', 'pseudo: no significant change');
expect('No change in the size of the renal cyst.', 'renal cyst', 'affirmed', 'pseudo: no change');
expect('No new mass is identified; the spleen is stable.', 'spleen', 'affirmed', 'pseudo: no new (different entity)');
expect('No increase in the thyroid nodule since prior.', 'thyroid nodule', 'affirmed', 'pseudo: no increase');

// --- TRUE negation: clean "no evidence of X" → negated (drop / mark negative) ---
expect('No evidence of acute fracture of the cervical spine.', 'fracture', 'negated', 'the exact bug Ren caught');
expect('No acute intracranial hemorrhage.', 'hemorrhage', 'negated', 'pre: no');
expect('The patient denies chest pain.', 'chest pain', 'negated', 'pre: denies');
expect('Negative for pulmonary embolism.', 'pulmonary embolism', 'negated', 'pre: negative for');
expect('Pneumothorax is ruled out.', 'Pneumothorax', 'negated', 'post: is ruled out');
expect('No focal consolidation, effusion, or pneumothorax.', 'effusion', 'negated', 'negation spans a list');

// --- TERMINATION: negation must NOT leak past a contrast word ----------------
expect('No acute fracture, but there is a large soft tissue mass.', 'soft tissue mass', 'affirmed', 'negation stops at "but"');
expect('Lungs are clear except for a small left base nodule.', 'left base nodule', 'affirmed', 'stops at "except"');

// --- SENTENCE BOUNDARY: a cue must not leak into the next sentence -----------
expect('Kidneys are normal. A 2 cm adrenal cyst is noted.', 'adrenal cyst', 'affirmed', 'cue cannot cross sentence');
expect('No acute findings. Degenerative changes are present.', 'Degenerative changes', 'affirmed', 'next sentence affirmed');

// --- HEDGE / speculation → speculative (surface with marker, never suppress) --
expect('Findings may represent early osteomyelitis.', 'osteomyelitis', 'speculative', 'hedge: may');
expect('Cannot exclude a small fracture.', 'fracture', 'speculative', 'cannot exclude = possible');
expect('A nodule, suspicious for malignancy, is seen.', 'nodule', 'affirmed', 'nodule affirmed (the hedge qualifies malignancy)');
expect('Suspicious for malignancy.', 'malignancy', 'speculative', 'hedge: suspicious for');

// --- HISTORICAL / FAMILY ----------------------------------------------------
expect('Status post appendectomy.', 'appendectomy', 'historical', 'historical: status post');
expect('History of diabetes mellitus.', 'diabetes mellitus', 'historical', 'historical: history of');
expect('Family history of breast cancer.', 'breast cancer', 'family', 'family history');

// --- "normal"/"unremarkable" are NOT negation cues (blunt — spec §3.B) ------
expect('The liver is normal. A simple cyst is present.', 'cyst', 'affirmed', 'normal does not negate co-mentioned finding');
expect('Unremarkable study. Mild degenerative changes noted.', 'degenerative changes', 'affirmed', 'unremarkable not a negation');

// --- classifyStatement: whole impression bullets (cue INSIDE the statement) ---
function expectStmt(statement: string, want: Assertion, note?: string) {
  const got = classifyStatement(statement);
  if (got.assertion === want) { pass++; }
  else { fail++; console.log(`  ✗ FAIL stmt [${want} expected, got ${got.assertion}${got.cue ? ` via "${got.cue}"` : ''}] "${statement}" — ${note || ''}`); }
}
expectStmt('No evidence of acute fracture of the cervical spine.', 'negated', 'the exact impression-parser bug');
expectStmt('No acute intracranial abnormality.', 'negated', 'leading no');
expectStmt('Fracture is ruled out.', 'negated', 'trailing post-negation');
expectStmt('No interval change in the known liver mass.', 'affirmed', 'pseudo stays affirmed');
expectStmt('Nodule of the left thyroid, appears stable.', 'affirmed', 'real finding');
expectStmt('Congenital nonunion of the posterior arch of C1.', 'affirmed', 'the finding that must surface');
expectStmt('Status post cholecystectomy.', 'historical', 'historical bullet');

console.log('\n──────────────────────────────────────────');
console.log(`PASS: ${pass}   FAIL: ${fail}`);
console.log('──────────────────────────────────────────\n');
if (fail > 0) process.exit(1);
