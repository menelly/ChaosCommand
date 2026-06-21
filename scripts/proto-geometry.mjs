/* proto-geometry.mjs — PROTOTYPE geometry-aware lab table extractor.
 * One engine, self-calibrating from each table's header row, for GRID formats
 * (LabCorp, CareSpace/Epic). Reads columns by x-position → no cross-bleed,
 * units read raw (pre-mangle). Quest (inline prose) intentionally not targeted.
 *
 * node scripts/proto-geometry.mjs <pdf...>
 */
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
const repo = process.cwd();
const pdfjsLib = await import(pathToFileURL(path.join(repo, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(repo, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

// --- role keywords (CONTAINS match, PRIORITY order: first hit wins per token) ---
// pdf.js returns each header CELL as one combined token ("Current Result and
// Flag"), so we match substrings. 'ignore' (previous) is checked before 'value'
// so "Previous Result and Date" doesn't register as a value column.
const ROLE = [
  [/previous/i, 'ignore'],
  [/\btest\b|analyte|component|^lab\b|^name\b/i, 'name'],
  [/current|your|^value|^result/i, 'value'],
  [/^units?\b/i, 'unit'],
  [/reference|normal|range|interval/i, 'range'],
];
const VAL = /^[<>]?=?\s*\d+(?:\.\d+)?$/;
const RANGE = /^(?:[<>]=?\s*(?:or\s*=\s*)?\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?|not\s+estab\.?|not\s+applicable|>\s*or\s*=\s*\d+)/i;
const FLAG = /^(High|Low|Abnormal|HH|LL|H|L|A)$/i;

function rowsFromPage(items) {
  const toks = items.filter(it => 'str' in it && it.str.trim())
    .map(it => ({ x: it.transform[4], y: it.transform[5], t: it.str.trim() }));
  toks.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  let cur = [], lastY = null;
  for (const tk of toks) {
    if (lastY !== null && Math.abs(tk.y - lastY) > 3) { rows.push(cur); cur = []; }
    cur.push(tk); lastY = tk.y;
  }
  if (cur.length) rows.push(cur);
  return rows.map(r => r.sort((a, b) => a.x - b.x));
}

function detectHeader(row) {
  const anchors = [];
  const seen = new Set();
  for (const tk of row) {
    for (const [re, role] of ROLE) {
      if (re.test(tk.t)) { if (!seen.has(role)) { anchors.push({ x: tk.x, role }); seen.add(role); } break; }
    }
  }
  // a header needs at least a name-ish and a value/range-ish column
  const roles = new Set(anchors.map(a => a.role));
  if (roles.has('name') && (roles.has('value') || roles.has('range'))) return anchors;
  return null;
}

function nearest(anchors, x) {
  let best = anchors[0], bd = Infinity;
  for (const a of anchors) { const d = Math.abs(a.x - x); if (d < bd) { bd = d; best = a; } }
  return best.role;
}

function parseGeometry(pageRows) {
  const out = [];
  let anchors = null;
  for (const row of pageRows) {
    const h = detectHeader(row);
    if (h) { anchors = h; continue; }
    if (!anchors) continue;
    // bucket tokens by nearest column
    const buckets = { name: [], value: [], unit: [], range: [], ignore: [] };
    // LabCorp prints a specimen-indicator code (01/02) in its own narrow column
    // between name and value; it is NOT a lab value. Drop it everywhere.
    const SPEC = /^0\d$/;
    for (const tk of row) { if (SPEC.test(tk.t)) continue; buckets[nearest(anchors, tk.x)].push(tk.t); }
    const name = buckets.name.join(' ').trim();
    if (!/[A-Za-z]/.test(name) || name.length < 2) continue;

    // value column may hold value + flag
    let value = '', flag = '';
    const valToks = buckets.value.slice();
    for (const t of valToks) { if (VAL.test(t) && !value) value = t; else if (FLAG.test(t) && !flag) flag = t; }

    // range column may hold range + (CareSpace) trailing unit
    let range = '', unitFromRange = '';
    for (const t of buckets.range) { if (RANGE.test(t) && !range) range = t; else if (/[A-Za-z%]/.test(t)) unitFromRange += (unitFromRange ? ' ' : '') + t; }

    let unit = buckets.unit.join(' ').trim() || unitFromRange;
    // unit sometimes lands as a bare number-less token in value bucket tail
    if (!value) continue; // require a numeric value
    out.push({ name, value, unit, flag, range });
  }
  return out;
}

const files = process.argv.slice(2);
console.log('\n📐 GEOMETRY extractor vs real corpus\n' + '='.repeat(64));
let total = 0;
for (const f of files) {
  try {
    const buf = new Uint8Array(fs.readFileSync(f));
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let rows = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      rows = rows.concat(parseGeometry(rowsFromPage(content.items)));
    }
    total += rows.length;
    const s = rows.slice(0, 4).map(r => `${r.name}=${r.value}${r.unit ? ' ' + r.unit : ''}${r.flag ? ' [' + r.flag + ']' : ''} (${r.range || '—'})`).join('  ·  ');
    console.log(`\n${path.basename(f)}  → ${rows.length} rows`);
    if (rows.length) console.log('   ' + s + (rows.length > 4 ? '  …' : ''));
  } catch (e) { console.log(`\n${path.basename(f)}  ERR ${e.message}`); }
}
console.log('\n' + '='.repeat(64));
console.log(`TOTAL geometry rows: ${total}`);
console.log('='.repeat(64) + '\n');
