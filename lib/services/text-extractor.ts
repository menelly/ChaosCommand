/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * text-extractor.ts — PDF and text extraction using pdf.js
 * Replaces Python's pdfplumber/PyPDF2/Tesseract chain.
 *
 * pdf.js is what Firefox uses. Battle-tested on every PDF imaginable.
 */

// pdf.js is loaded dynamically to avoid SSG prerender issues
// (DOMMatrix and other browser APIs don't exist in Node.js).
//
// IMPORTANT: we load pdf.js as a NATIVE browser ES module from public/, NOT
// through webpack. Bundling pdfjs (either build) through Next's webpack mangles
// its module object → "Object.defineProperty called on non-object" inside
// __webpack_require__.r at load time. The `webpackIgnore: true` magic comment
// makes webpack leave this import untouched, so the WebView imports the
// self-contained bundle (public/pdf.min.mjs) directly — no bundler interop, no
// crash. public/pdf.worker.min.mjs is the version-matched worker.
// (Both files are copied from pdfjs-dist/legacy/build at the project's pdfjs
// version; if pdfjs is upgraded, re-copy both: see scripts/sync-pdfjs-assets.)
let _pdfjsLib: typeof import('pdfjs-dist') | null = null;
async function getPdfjs() {
  if (!_pdfjsLib) {
    // In Tauri, public/ static files are served at the root path. Build an
    // absolute URL from the current origin so the native import resolves in
    // both dev (http://localhost:PORT) and the packaged app (tauri://localhost).
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    _pdfjsLib = (await import(
      /* webpackIgnore: true */ `${origin}/pdf.min.mjs`
    )) as unknown as typeof import('pdfjs-dist');
    _pdfjsLib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;
  }
  return _pdfjsLib;
}

// ============================================================================
// TEXT CLEANING (ported from text_cleaner.py)
// ============================================================================

/**
 * Clean OCR artifacts and normalize text.
 */
function cleanExtractedText(text: string): string {
  let clean = text;

  // -------------------------------------------------------------------
  // Step A: protect medical units, abbreviations, and common nucleic-acid
  // names from the camelCase fix below. Without this, "mg/dL" becomes
  // "mg/d L", "dsDNA" becomes "ds DNA", "mRNA" becomes "m RNA", etc. —
  // which silently breaks the lab parser (units no longer match LAB_UNITS)
  // and the NER (test names get mangled). Stash them under sentinels,
  // run the camelCase fix, then restore.
  //
  // Pattern matches:
  //   - <numeric-prefix>/<unit-suffix> like mg/dL, IU/mL, mIU/L, ng/mL,
  //     mcg/dL, cells/uL, copies/mL, mEq/L
  //   - bare unit pairs that the camelCase rule would split: mEq, mIU,
  //     µIU, uIU
  //   - nucleic-acid abbreviations: dsDNA, ssDNA, mRNA, miRNA, siRNA,
  //     snRNA, tRNA, rRNA, ncRNA, lncRNA, sgRNA, circRNA, mtDNA, cfDNA
  // -------------------------------------------------------------------
  const PROTECT_PATTERNS: RegExp[] = [
    /\b(?:mg|mcg|ug|µg|ng|pg|g|kg|mL|dL|L|IU|mIU|µIU|uIU|mEq|mol|mmol|µmol|umol|cells|copies|x10\^[0-9]+)\/(?:dL|mL|L|min|µL|uL|day|hr|hour)\b/g,
    /\b(?:mEq|mIU|µIU|uIU|mOsm|mAU|mU)\b/g,
    /\b(?:ds|ss|m|mi|si|sn|t|r|nc|lnc|sg|circ|mt|cf|gu|lc)(?:DNA|RNA)\b/g,
  ];

  const stash: string[] = [];
  for (const pat of PROTECT_PATTERNS) {
    clean = clean.replace(pat, (m) => {
      stash.push(m);
      return `__CHAOS_PROTECT__${stash.length - 1}__CHAOS_PROTECT__`;
    });
  }

  // Fix camelCase splits from OCR (e.g., "bloodPressure" -> "blood Pressure")
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Restore protected terms
  clean = clean.replace(/__CHAOS_PROTECT__(\d+)__CHAOS_PROTECT__/g, (_, i) => stash[parseInt(i, 10)] ?? '');

  // Common OCR medical term corrections
  const corrections: Record<string, string> = {
    'pinoussofft': 'spinous soft',
    'thoracolumbar': 'thoracolumbar',
    'Iordosis': 'lordosis',
    'kyphosi s': 'kyphosis',
    'interverte bral': 'intervertebral',
    'foramin al': 'foraminal',
    'desicc ation': 'desiccation',
    'spondyloli sthesis': 'spondylolisthesis',
    'spondy losis': 'spondylosis',
    'osteo phyte': 'osteophyte',
    'steno sis': 'stenosis',
    'herni ation': 'herniation',
    'radic ulopathy': 'radiculopathy',
    'myelo pathy': 'myelopathy',
    'neuro foraminal': 'neuroforaminal',
  };

  for (const [wrong, right] of Object.entries(corrections)) {
    clean = clean.replace(new RegExp(wrong, 'gi'), right);
  }

  // Fix punctuation spacing
  clean = clean.replace(/\s+([.,;:!?])/g, '$1');
  // Normalize whitespace
  clean = clean.replace(/[ \t]+/g, ' ');
  // Normalize line breaks
  clean = clean.replace(/\r\n/g, '\n');
  clean = clean.replace(/\n{3,}/g, '\n\n');

  return clean.trim();
}

// ============================================================================
// PDF EXTRACTION
// ============================================================================

/** One positioned text token straight from pdf.js (page space, y grows upward). */
export interface PdfToken {
  x: number;
  y: number;
  str: string;
}

/**
 * Core single pass over a PDF. ONE getDocument + ONE page loop produces BOTH
 * products: `text` (flattened, spatially-aware, unit-protected — for NER / rad
 * findings) and `tokens` (raw per-page {x,y,str}, PRE-clean — for the geometry
 * lab-grid extractor). Built this way on purpose so a big PDF is only parsed
 * once even though two very different consumers need two different views of it.
 */
export async function extractTextAndTokensFromPdf(
  data: ArrayBuffer | Uint8Array
): Promise<{ text: string; tokens: PdfToken[][] }> {
  const pdfjsLib = await getPdfjs();
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    disableAutoFetch: false,
  } as any).promise;

  const pages: string[] = [];
  const tokens: PdfToken[][] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Build text with spatial awareness
    let lastY: number | null = null;
    let pageText = '';
    const pageToks: PdfToken[] = [];

    for (const item of content.items) {
      if ('str' in item) {
        const tf = (item as any).transform;
        const x = tf?.[4] ?? 0;
        const y = tf?.[5] ?? 0;

        // Raw token (untouched, pre-clean) for the geometry extractor.
        if (item.str.trim()) pageToks.push({ x, y, str: item.str.trim() });

        // New line if Y position changed significantly
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }

        pageText += item.str;
        lastY = y;
      }
    }

    pages.push(pageText.trim());
    tokens.push(pageToks);
  }

  const rawText = pages.join('\n\n--- Page Break ---\n\n');
  return { text: cleanExtractedText(rawText), tokens };
}

/**
 * Extract text from a PDF file (as ArrayBuffer or Uint8Array). Thin wrapper over
 * the single-pass core — the flattened-prose product only.
 */
export async function extractTextFromPdf(data: ArrayBuffer | Uint8Array): Promise<string> {
  return (await extractTextAndTokensFromPdf(data)).text;
}

// ============================================================================
// GEOMETRY EXTRACTION (lab grids)
// ============================================================================
//
// The flattened-text path above is right for narrative/rad reports, but it
// DISCARDS the per-token x-position and then `cleanExtractedText` mangles units
// (`x10E3/uL` → `x10E3/u L`). Lab GRID tables (LabCorp, CareSpace/Epic) need the
// raw geometry to reconstruct columns by x. So this second exit returns the
// untouched per-page tokens from the SAME pdf.js pass — no flatten, no clean.
// `lab-geometry.ts` consumes these; the prose path keeps using extractTextFromPdf.

/** Raw, unmodified positioned tokens per page (PRE-clean). Thin wrapper over the
 *  single-pass core — the geometry product only. */
export async function extractPdfTokens(
  data: ArrayBuffer | Uint8Array
): Promise<PdfToken[][]> {
  return (await extractTextAndTokensFromPdf(data)).tokens;
}

/** Decode a base64 file to bytes (PDFs, text, images all start here). */
function base64ToBytes(base64Data: string): Uint8Array {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

/**
 * Extract BOTH products from a base64 file in one pass: flattened `text` (for
 * NER/rad findings) and per-page `tokens` (for the geometry lab extractor).
 * Non-PDF inputs return their text with `tokens: []` (geometry needs a PDF).
 * This is the entry point the document uploader uses so the file is parsed once.
 */
export async function extractDocFromBase64(
  base64Data: string,
  fileType: string,
  filename: string
): Promise<{ text: string; tokens: PdfToken[][] }> {
  if (fileType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
    return extractTextAndTokensFromPdf(base64ToBytes(base64Data));
  }
  // Non-PDF: reuse the text-only path, no geometry tokens.
  return { text: await extractTextFromBase64(base64Data, fileType, filename), tokens: [] };
}

/**
 * Extract text from a base64-encoded file.
 * Handles PDFs and plain text files.
 */
export async function extractTextFromBase64(
  base64Data: string,
  fileType: string,
  _filename: string
): Promise<string> {
  // Decode base64
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  if (fileType === 'application/pdf' || _filename.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPdf(bytes);
  }

  // Plain text files
  if (fileType.startsWith('text/') || _filename.match(/\.(txt|csv|md|json)$/i)) {
    return new TextDecoder().decode(bytes);
  }

  // For images, we'd need Tesseract.js — for now, throw a helpful error
  if (fileType.startsWith('image/')) {
    throw new Error(
      'Image OCR not yet supported in this version. Please upload a PDF or text file, ' +
      'or copy-paste the text directly using the text input option.'
    );
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
