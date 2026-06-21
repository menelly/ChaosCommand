/* probe-geometry.mjs — do lab PDFs carry clean COLUMN geometry (x-coords)?
 * If yes, a geometry-aware table extractor generalizes better than per-portal
 * text regex. Dumps x-position of each token for a few rows of one page. */
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
const repo = process.cwd();
const pdfjsLib = await import(pathToFileURL(path.join(repo, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(repo, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

const file = process.argv[2];
const buf = new Uint8Array(fs.readFileSync(file));
const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
const page = await pdf.getPage(1);
const content = await page.getTextContent();

// group items by y (row), then print each row as [x: text] sorted by x
const rows = new Map();
for (const it of content.items) {
  if (!('str' in it) || !it.str.trim()) continue;
  const x = Math.round(it.transform[4]);
  const y = Math.round(it.transform[5]);
  if (!rows.has(y)) rows.set(y, []);
  rows.get(y).push({ x, t: it.str });
}
const ys = [...rows.keys()].sort((a, b) => b - a);
let shown = 0;
for (const y of ys) {
  const cells = rows.get(y).sort((a, b) => a.x - b.x);
  const line = cells.map(c => `x${c.x}:"${c.t}"`).join('  ');
  // only show data-ish rows (has a number)
  if (/\d/.test(line) && cells.length >= 3) {
    console.log(`y${y}  ${line}`);
    if (++shown >= 12) break;
  }
}
