/*
 * ner-recon-real.ts — run the ACTUAL engine over faithfully-extracted real
 * portal text (.phi-scratch/extracted/*.txt) and report per-file results +
 * the parser's own attempt diagnostics. MEASUREMENT ONLY — no fixes here.
 *
 * Prints test NAMES + counts (generic medical terms), never patient
 * name/DOB/MRN. Real values stay on disk; this is Ren's own data in Ren's
 * own session, but we keep the transcript clean anyway.
 *
 * Run (after pdf-extract-faithful.mjs):
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out scripts/ner-recon-real.ts
 *   node .tmp-out/scripts/ner-recon-real.js
 */

// --- minimal localStorage shim so the parser's diagnostics persist ---
const _store = new Map<string, string>();
(globalThis as any).window = { localStorage: {
  getItem: (k: string) => (_store.has(k) ? _store.get(k)! : null),
  setItem: (k: string, v: string) => { _store.set(k, v); },
} };
(globalThis as any).localStorage = (globalThis as any).window.localStorage;

import * as fs from 'fs';
import * as path from 'path';
import { extractLabResults, getLastLabParserDiagnostics } from '../lib/services/lab-parser';
import { detectSections } from '../lib/services/medical-ner';

const dir = path.resolve(process.cwd(), '.phi-scratch', 'extracted');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort();

const RAD = /spine|cervical|abdomen|pelvis|abd-/i;

console.log('\n🔬 REAL-PORTAL RECON  (' + files.length + ' docs)\n' + '='.repeat(70));

const zeros: string[] = [];
let labDocs = 0, labWith = 0;

for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const isRad = RAD.test(f);

  if (isRad) {
    const secs = detectSections(text).map(s => s.name);
    const SW: Record<string, number> = { impression: 1.0, findings: 0.7, indication: 0.3, comparison: 0.2, technique: 0.0, unknown: 0.5 };
    const survive = secs.filter(n => Math.round(0.90 * (SW[n] ?? 0.5) * 100) >= 70);
    console.log(`\n📄 [RAD] ${f}`);
    console.log(`   sections: [${secs.join(', ')}]`);
    console.log(`   NER-surviving sections (floor 70): [${survive.join(', ') || '∅ ALL DROPPED'}]`);
    continue;
  }

  labDocs++;
  const labs = extractLabResults(text, null);
  const diag = getLastLabParserDiagnostics();
  if (labs.length > 0) labWith++;
  else zeros.push(f);

  const names = labs.slice(0, 6).map(l => l.testName).join(' | ');
  console.log(`\n🧪 ${f}`);
  console.log(`   → ${labs.length} labs via ${diag?.finalParser ?? '?'}`);
  if (diag) {
    for (const a of diag.attempts) {
      console.log(`      ${a.detectionPassed ? '✓' : '·'} ${a.parser}: ${a.resultsFound} (${a.detectionReason})`);
    }
  }
  if (labs.length) console.log(`   names: ${names}${labs.length > 6 ? ' …' : ''}`);
}

console.log('\n' + '='.repeat(70));
console.log(`LAB DOCS: ${labWith}/${labDocs} produced ≥1 result`);
if (zeros.length) console.log(`❌ ZERO results: ${zeros.join(', ')}`);
console.log('='.repeat(70) + '\n');
