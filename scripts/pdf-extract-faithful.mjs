/*
 * pdf-extract-faithful.mjs — replicate the APP's exact pdf.js extraction so
 * recon measures production reality, not pdftotext's different layout engine.
 *
 * Ports lib/services/text-extractor.ts verbatim: same spatial heuristic
 * (|Δy|>5 → newline, else space), same cleanExtractedText pass.
 *
 * Reads PDFs from argv, writes cleaned .txt into .phi-scratch/extracted/.
 * .phi-scratch is GITIGNORED — extracted PHI never reaches git.
 *
 * Usage: node scripts/pdf-extract-faithful.mjs <pdf...>
 */
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const outDir = path.join(repo, '.phi-scratch', 'extracted');
fs.mkdirSync(outDir, { recursive: true });

const pdfjsLib = await import(pathToFileURL(path.join(repo, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(repo, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

// ---- verbatim port of cleanExtractedText (text-extractor.ts) ----
function cleanExtractedText(text) {
  let clean = text;
  const PROTECT_PATTERNS = [
    /\b(?:mg|mcg|ug|µg|ng|pg|g|kg|mL|dL|L|IU|mIU|µIU|uIU|mEq|mol|mmol|µmol|umol|cells|copies|x10\^[0-9]+)\/(?:dL|mL|L|min|µL|uL|day|hr|hour)\b/g,
    /\b(?:mEq|mIU|µIU|uIU|mOsm|mAU|mU)\b/g,
    /\b(?:ds|ss|m|mi|si|sn|t|r|nc|lnc|sg|circ|mt|cf|gu|lc)(?:DNA|RNA)\b/g,
  ];
  const stash = [];
  for (const pat of PROTECT_PATTERNS) {
    clean = clean.replace(pat, (m) => { stash.push(m); return `__CHAOS_PROTECT__${stash.length - 1}__CHAOS_PROTECT__`; });
  }
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');
  clean = clean.replace(/__CHAOS_PROTECT__(\d+)__CHAOS_PROTECT__/g, (_, i) => stash[parseInt(i, 10)] ?? '');
  const corrections = {
    'pinoussofft':'spinous soft','Iordosis':'lordosis','kyphosi s':'kyphosis','interverte bral':'intervertebral',
    'foramin al':'foraminal','desicc ation':'desiccation','spondyloli sthesis':'spondylolisthesis','spondy losis':'spondylosis',
    'osteo phyte':'osteophyte','steno sis':'stenosis','herni ation':'herniation','radic ulopathy':'radiculopathy',
    'myelo pathy':'myelopathy','neuro foraminal':'neuroforaminal',
  };
  for (const [w, r] of Object.entries(corrections)) clean = clean.replace(new RegExp(w, 'gi'), r);
  clean = clean.replace(/\s+([.,;:!?])/g, '$1');
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.replace(/\r\n/g, '\n');
  clean = clean.replace(/\n{3,}/g, '\n\n');
  return clean.trim();
}

// ---- verbatim port of extractTextFromPdf loop ----
async function extractTextFromPdf(data) {
  const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: false, disableAutoFetch: false }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY = null;
    let pageText = '';
    for (const item of content.items) {
      if ('str' in item) {
        const y = item.transform?.[5] || 0;
        if (lastY !== null && Math.abs(y - lastY) > 5) pageText += '\n';
        else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) pageText += ' ';
        pageText += item.str;
        lastY = y;
      }
    }
    pages.push(pageText.trim());
  }
  return cleanExtractedText(pages.join('\n\n--- Page Break ---\n\n'));
}

const files = process.argv.slice(2);
if (!files.length) { console.error('no files'); process.exit(1); }
for (const f of files) {
  try {
    const buf = new Uint8Array(fs.readFileSync(f));
    const text = await extractTextFromPdf(buf);
    const base = path.basename(f).replace(/\.[^.]+$/, '') + '.txt';
    fs.writeFileSync(path.join(outDir, base), text);
    console.log(`OK  ${path.basename(f)}  →  ${text.length} chars, ${text.split('\n').length} lines`);
  } catch (e) {
    console.log(`ERR ${path.basename(f)}: ${e.message}`);
  }
}
