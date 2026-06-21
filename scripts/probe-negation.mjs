/* probe-negation.mjs — test the CURRENT negation logic (replicated verbatim
 * from medical-ner.ts) against labeled findings in a REAL rad report, to see
 * if it's safe for the clinical claims the app makes ("no effusion = absent",
 * "this finding was dismissed"). MEASUREMENT, not a fix.
 */
import fs from 'fs';

// ---- verbatim copy of medical-ner.ts negation logic ----
const NEGATION_CUES = [
  /\bno\b/, /\bnot\b/, /\bnor\b/, /\bnever\b/,
  /\bwithout\b/, /\babsence of\b/, /\babsent\b/,
  /\bnegative for\b/, /\bnegative\b/,
  /\bdeny\b/, /\bdenies\b/, /\bdenied\b/,
  /\brules? out\b/, /\bruled out\b/,
  /\bno evidence of\b/, /\bno sign of\b/, /\bno signs of\b/,
  /\bfree of\b/, /\bfree from\b/,
  /\bunremarkable\b/, /\bnormal\b/,
  /\bfailed to (?:reveal|demonstrate|show)\b/,
  /\bdoes not\b/, /\bdid not\b/, /\bdo not\b/,
];
const NEGATION_WINDOW = 40;
function isNegated(text, start) {
  const windowStart = Math.max(0, start - NEGATION_WINDOW);
  const preceding = text.slice(windowStart, start).toLowerCase();
  return NEGATION_CUES.some(cue => cue.test(preceding));
}

const text = fs.readFileSync(process.argv[2], 'utf8');

// labeled findings: [unique locating substring, the entity word, truth]
// truth = 'present' (must NOT be negated) | 'absent' (must be negated)
const CASES = [
  ['simple cyst in the lower pole', 'cyst', 'present'],   // real kidney cyst (incidental)
  ['left ovary there is a cyst', 'cyst', 'present'],        // real ovarian cyst (incidental)
  ['Small bowel is mildly distended', 'distended', 'present'],
  ['Mild ileus versus enteritis', 'ileus', 'present'],
  ['no enlarged retroperitoneal lymph nodes', 'enlarged', 'absent'],
  ['No enlarged lymph nodes are seen', 'enlarged', 'absent'],
  ['no masses or inflammatory', 'masses', 'absent'],
  ['No anterior abdominal wall defects', 'defects', 'absent'],
  ['No significant lumbar spondylosis', 'spondylosis', 'absent'],
  ['Aorta is\nnot enlarged', 'enlarged', 'absent'],
];

console.log('\n🩺 NEGATION SAFETY PROBE — current 40-char-window engine\n' + '='.repeat(66));
let correct = 0, dangerous = 0, falseAlarm = 0;
for (const [locator, word, truth] of CASES) {
  const li = text.indexOf(locator);
  if (li < 0) { console.log(`  (skip, locator not found: "${locator}")`); continue; }
  const wi = text.indexOf(word, li);
  const negated = isNegated(text, wi);
  const got = negated ? 'absent' : 'present';
  const ok = got === truth;
  if (ok) correct++;
  else if (truth === 'present' && got === 'absent') dangerous++;   // SUPPRESSED a real finding
  else falseAlarm++;                                                // surfaced a negated finding
  const tag = ok ? '✅' : (truth === 'present' ? '🛑 SUPPRESSED REAL FINDING' : '⚠️ FALSE FINDING');
  const pre = text.slice(Math.max(0, wi - 40), wi).replace(/\n/g, ' ');
  console.log(`\n  ${tag}  "${word}" — truth=${truth}, engine=${got}`);
  console.log(`     40-char window before: …"${pre}"`);
}
console.log('\n' + '='.repeat(66));
console.log(`correct=${correct}  🛑 suppressed-real=${dangerous}  ⚠️ false-finding=${falseAlarm}`);
console.log('='.repeat(66));

// ---- ADVERSARIAL: realistic radiology phrasings the window-approach mishandles ----
// Each is a real sentence shape that appears constantly in reports.
const ADV = [
  ['Kidneys are normal. A 2 cm cyst is noted.', 'cyst', 'present'],            // "normal" bleeds into next sentence
  ['No change in the known liver mass.', 'mass', 'present'],                    // "no CHANGE in X" ≠ "no X"
  ['Liver normal. Splenic lesion present.', 'lesion', 'present'],              // cross-sentence "normal"
  ['No interval increase in the dominant nodule.', 'nodule', 'present'],        // "no increase in X" ≠ "no X"
  ['Pleural effusion cannot be excluded.', 'effusion', 'present'],             // hedged-present, not absent
];
console.log('\n🧪 ADVERSARIAL (synthetic, realistic phrasings)\n' + '='.repeat(66));
let advBad = 0;
for (const [t, word, truth] of ADV) {
  const wi = t.indexOf(word);
  const negated = isNegated(t, wi);
  const got = negated ? 'absent' : 'present';
  const ok = got === truth;
  if (!ok && truth === 'present') advBad++;
  const tag = ok ? '✅' : '🛑 SUPPRESSED REAL FINDING';
  console.log(`  ${tag}  "${word}" truth=${truth} engine=${got}   ← "${t}"`);
}
console.log('='.repeat(66));
console.log(`🛑 adversarial real findings WRONGLY SUPPRESSED: ${advBad}/${ADV.length}`);
console.log('='.repeat(66) + '\n');
