/*
 * ner-generalization-recon.ts — MEASUREMENT, not a fix.
 *
 * Throws synthetic, PHI-free documents (varied real-world shapes + units) at
 * the CURRENT lab parser and reports recall, so we replace "Ace thinks it
 * has gaps" with actual numbers before touching the engine.
 *
 * Run:
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out scripts/ner-generalization-recon.ts
 *   node .tmp-out/scripts/ner-generalization-recon.js
 *
 * All values are obviously fake. No real PHI.
 */

import { extractLabResults } from '../lib/services/lab-parser';
import { detectSections } from '../lib/services/medical-ner';

interface Doc {
  name: string;
  shape: string;          // which parser SHOULD catch it
  text: string;
  expectTests: string[];  // test names we expect to be recalled (lowercased substring match)
}

const corpus: Doc[] = [
  {
    name: 'LabCorp result-range card, COMMON units',
    shape: 'result-range',
    expectTests: ['dsdna antibody', 'crp'],
    text:
`dsDNA ANTIBODY
Result: 17 IU/mL (High)
Reference range: <4 IU/mL
Status: final

CRP
Result: 2 mg/dL
Reference range: 0-1 mg/dL
Status: final
`,
  },
  {
    name: 'Result-range card, UNLISTED units (mg/L, mU/L, /hpf)',
    shape: 'result-range',
    expectTests: ['crp', 'tsh', 'rbc urine'],
    text:
`CRP
Result: 8 mg/L
Reference range: 0-5 mg/L
Status: final

TSH
Result: 6 mU/L (High)
Reference range: 0.4-4.0 mU/L
Status: final

RBC URINE
Result: 12 /hpf (High)
Reference range: 0-3 /hpf
Status: final
`,
  },
  {
    name: 'Horizontal CMP, COMMON units',
    shape: 'horizontal',
    expectTests: ['glucose', 'creatinine', 'sodium'],
    text:
`Glucose 105 mg/dL (70-99) H
Creatinine 1.1 mg/dL (0.6-1.3)
Sodium 140 mEq/L (135-145)
`,
  },
  {
    name: 'Horizontal renal/thyroid, UNLISTED units (mL/min/1.73, nmol/L, pmol/L)',
    shape: 'horizontal',
    expectTests: ['egfr', 'vitamin d', 'free t4'],
    text:
`eGFR 52 mL/min/1.73m2 (>60) L
Vitamin D 40 nmol/L (75-200) L
Free T4 12 pmol/L (12-22)
`,
  },
  {
    name: 'Titer + index format (no decimal units at all)',
    shape: 'horizontal/other',
    expectTests: ['ana titer', 'celiac iga'],
    text:
`ANA Titer 1:160 (negative <1:40) H
Celiac IgA 3.5 index (<1.0) H
`,
  },
  {
    name: 'Unstructured clinic note (NER territory — no IMPRESSION header)',
    shape: 'ner-unstructured',
    expectTests: [],   // lab parser not expected; this probes section detection
    text:
`Progress Note
The patient reports worsening migraines and new-onset peripheral neuropathy.
Exam notable for diabetic retinopathy and mild hepatomegaly.
Plan: start gabapentin, continue metformin.
`,
  },
  {
    name: 'Radiology report WITH impression (Ren-shaped happy path)',
    shape: 'ner-structured',
    expectTests: [],
    text:
`TECHNIQUE: MRI brain without contrast.
FINDINGS: Small vessel ischemic changes. A 7 mm meningioma is noted.
IMPRESSION:
1. 7 mm meningioma, stable.
2. Chronic small vessel ischemic disease.
`,
  },
];

console.log('\n🔬 NER / lab-parser GENERALIZATION RECON\n' + '='.repeat(60));

let totalExpected = 0;
let totalFound = 0;

for (const doc of corpus) {
  const labs = extractLabResults(doc.text, null);
  const foundNames = labs.map(l => l.testName.toLowerCase());

  if (doc.expectTests.length > 0) {
    const hits = doc.expectTests.filter(t => foundNames.some(f => f.includes(t) || t.includes(f)));
    totalExpected += doc.expectTests.length;
    totalFound += hits.length;
    const miss = doc.expectTests.filter(t => !hits.includes(t));
    const pct = Math.round((hits.length / doc.expectTests.length) * 100);
    console.log(`\n[${doc.shape}] ${doc.name}`);
    console.log(`   recall: ${hits.length}/${doc.expectTests.length} (${pct}%)  parsed=[${labs.map(l => `${l.testName}:${l.valueText}${l.unit}`).join(', ') || '∅'}]`);
    if (miss.length) console.log(`   ❌ MISSED: ${miss.join(', ')}`);
  } else {
    // section-detection probe for the NER docs
    const secs = detectSections(doc.text);
    const names = secs.map(s => s.name);
    const hasImpression = names.includes('impression');
    console.log(`\n[${doc.shape}] ${doc.name}`);
    console.log(`   sections: [${names.join(', ')}]  hasImpression=${hasImpression}`);
    // demonstrate the confidence-floor arithmetic
    const SECTION_WEIGHTS: Record<string, number> = { impression: 1.0, findings: 0.7, indication: 0.3, comparison: 0.2, technique: 0.0, unknown: 0.5 };
    const FLOOR = 70;
    const surviving = names.filter(n => Math.round(0.90 * (SECTION_WEIGHTS[n] ?? 0.5) * 100) >= FLOOR);
    console.log(`   sections whose NER entities survive the ${FLOOR}-confidence floor: [${surviving.join(', ') || '∅ — ALL NER ENTITIES DROPPED'}]`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`LAB RECALL across measurable docs: ${totalFound}/${totalExpected} (${Math.round((totalFound / totalExpected) * 100)}%)`);
console.log('='.repeat(60) + '\n');
