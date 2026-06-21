/*
 * proto-portal-parsers.ts — PROTOTYPE (scratch, not shipping) of real parsers
 * for the three dominant portal grammars observed in the real corpus:
 *   LabCorp  : "Name [01] value [Flag] [unit] refInterval"
 *   Quest    : "Name value [L/H] Reference Range: <ref> unit"
 *   CareSpace: "Name value [Flag] low-high unit"   (Epic-style table)
 *
 * Runs over .phi-scratch/extracted/*.txt and reports row yield per file.
 * Iterate here against real shapes; promote to lab-parser.ts once solid.
 */
import * as fs from 'fs';
import * as path from 'path';

interface Row { name: string; value: string; unit: string; ref: string; flag: string; }

const NOISE = /^(test |date |ordered |specimen|patient|account|sex|age|fasting|client|requisition|report status|collected|received|reported|phone|fax|©|all rights|this document|if you have|enterprise|lab\b|analyte|your result|normal range|comp\.|cbc|cmp|comprehensive|©?\d{4}|page \d|---)/i;

function looksLikeName(s: string): boolean {
  return /[A-Za-z]/.test(s) && s.length >= 2 && s.length <= 60;
}
const REF = '(?:[<>]\\s*(?:or\\s*=\\s*)?\\d+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s*[-–]\\s*\\d+(?:\\.\\d+)?|not\\s+estab\\.?|not\\s+applicable)';

// ---------- LabCorp ----------
function parseLabCorp(text: string): Row[] {
  const rows: Row[] = [];
  const re = new RegExp(
    '^(?<name>[A-Za-z][A-Za-z0-9 ,()/.\\-]*?)\\s+(?:0\\d\\s+)?' +
    '(?<value>[<>]?\\d+(?:\\.\\d+)?)\\s*' +
    '(?<flag>High|Low|Abnormal)?\\s*' +
    '(?<unit>[A-Za-z%][A-Za-z0-9%/.^ µ\\-]*?)?\\s*' +
    '(?<ref>' + REF + ')\\s*$', 'i');
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l || NOISE.test(l)) continue;
    const m = l.match(re);
    if (!m || !m.groups) continue;
    const name = m.groups.name.trim();
    if (!looksLikeName(name)) continue;
    rows.push({ name, value: m.groups.value, unit: (m.groups.unit || '').trim(), ref: m.groups.ref.trim(), flag: m.groups.flag || '' });
  }
  return rows;
}

// ---------- Quest ----------
function parseQuest(text: string): Row[] {
  const rows: Row[] = [];
  const re = new RegExp(
    '^(?<name>[A-Za-z][A-Za-z0-9 ,()/.\\-]*?)\\s+' +
    '(?<value>[<>]?\\d+(?:\\.\\d+)?)\\s*' +
    '(?<flag>H|L|HH|LL|High|Low)?\\s*' +
    'Reference Range:\\s*(?<ref>.+?)\\s*' +
    '(?<unit>[A-Za-z%][A-Za-z0-9%/.^ µ\\-]*)?$', 'i');
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l || !/Reference Range:/i.test(l)) continue;
    const m = l.match(re);
    if (!m || !m.groups) continue;
    const name = m.groups.name.trim();
    if (!looksLikeName(name)) continue;
    rows.push({ name, value: m.groups.value, unit: (m.groups.unit || '').trim(), ref: (m.groups.ref || '').trim(), flag: m.groups.flag || '' });
  }
  return rows;
}

// ---------- CareSpace (Epic table: name value [flag] range unit) ----------
function parseCareSpace(text: string): Row[] {
  const rows: Row[] = [];
  const re = new RegExp(
    '^(?<name>[A-Za-z][A-Za-z0-9 ,()/.#%\\-]*?)\\s+' +
    '(?<value>[<>]?\\d+(?:\\.\\d+)?)\\s*' +
    '(?<flag>High|Low|Abnormal|H|L)?\\s+' +
    '(?<ref>\\d+(?:\\.\\d+)?\\s*[-–]\\s*\\d+(?:\\.\\d+)?)\\s+' +
    '(?<unit>[A-Za-z%][A-Za-z0-9%/.^ µ\\-]*)$', 'i');
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l || NOISE.test(l)) continue;
    const m = l.match(re);
    if (!m || !m.groups) continue;
    const name = m.groups.name.trim();
    if (!looksLikeName(name)) continue;
    rows.push({ name, value: m.groups.value, unit: m.groups.unit.trim(), ref: m.groups.ref.trim(), flag: m.groups.flag || '' });
  }
  return rows;
}

function detect(text: string): 'quest' | 'carespace' | 'labcorp' {
  if (/Reference Range:/i.test(text)) return 'quest';
  if (/Your result\s+Normal range/i.test(text) || /Lab Your result/i.test(text)) return 'carespace';
  return 'labcorp';
}

const dir = path.resolve(process.cwd(), '.phi-scratch', 'extracted');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt') && !/spine|cervical|abdomen|pelvis|abd-/i.test(f)).sort();

console.log('\n🧪 PROTOTYPE portal parsers vs real corpus\n' + '='.repeat(64));
let total = 0;
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const fmt = detect(text);
  const rows = fmt === 'quest' ? parseQuest(text) : fmt === 'carespace' ? parseCareSpace(text) : parseLabCorp(text);
  total += rows.length;
  const sample = rows.slice(0, 4).map(r => `${r.name}=${r.value}${r.unit ? ' ' + r.unit : ''}${r.flag ? ' [' + r.flag + ']' : ''} (${r.ref})`).join('  ·  ');
  console.log(`\n${f}  [${fmt}]  → ${rows.length} rows`);
  if (rows.length) console.log('   ' + sample + (rows.length > 4 ? '  …' : ''));
}
console.log('\n' + '='.repeat(64));
console.log(`TOTAL rows parsed across ${files.length} lab docs: ${total}`);
console.log('='.repeat(64) + '\n');
