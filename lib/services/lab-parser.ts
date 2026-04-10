/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * lab-parser.ts — Lab result extraction from medical documents.
 * Ported from Python medical_nlp.py extract_lab_results_from_text.
 *
 * Three format parsers:
 * 1. Horizontal (generic): "TestName value unit (low-high) FLAG"
 * 2. Vertical (MyChart/Epic/Intermountain): Card layout
 * 3. Mayo/graphical: Two-column "Normal range:" layout
 *
 * The NER model finds WHAT (test names). Regex finds HOW MUCH (values, units, ranges).
 */

import { buildExclusionSet, type MedicalEvent } from './medical-ner';

// ============================================================================
// TYPES
// ============================================================================

export interface LabResult {
  testName: string;
  value: number | null;
  valueText: string;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string;
  flag: string;
  isAbnormal: boolean;
  context: string;
  confidence: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LAB_UNITS = '(?:mg\\/dL|mEq\\/L|g\\/dL|g\\/L|%|K\\/uL|M\\/uL|mIU\\/L|mmol\\/L|IU\\/mL|' +
  'µIU\\/mL|uIU\\/mL|U\\/L|ng\\/mL|ng\\/dL|pg\\/mL|mcg\\/dL|µg\\/dL|' +
  'cells\\/uL|cells\\/mcL|x10\\^[0-9]+\\/uL|fL|pg|mL\\/min|' +
  'mm\\/hr|sec|seconds|ratio|copies\\/mL|MEq\\/L|mmHg)';

const LAB_FLAGS = '(?:\\b(?:H|L|HH|LL|HIGH|LOW|CRITICAL|ABNORMAL|ABN|CRIT)\\b|\\*)';

// ============================================================================
// HORIZONTAL FORMAT PARSER
// ============================================================================

function parseHorizontalFormat(
  text: string,
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const results: LabResult[] = [];

  const pattern = new RegExp(
    '(\\b[\\w\\s\\-\\(\\)]+?)\\s+' +          // Test name
    '([<>]?\\s*\\d+(?:\\.\\d+)?)\\s*' +         // Value
    '(' + LAB_UNITS + ')\\s*' +                  // Unit
    '(?:' +
      '[\\(\\[]?\\s*' +
      '(\\d+(?:\\.\\d+)?)\\s*' +                 // Low bound
      '[-–]\\s*' +
      '(\\d+(?:\\.\\d+)?)\\s*' +                 // High bound
      '[\\)\\]]?' +
    ')?\\s*' +
    '(' + LAB_FLAGS + ')?',                      // Flag
    'gi'
  );

  let match;
  while ((match = pattern.exec(text)) !== null) {
    let testName = match[1].trim()
      .replace(/^[\s\-:,]+/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (testName.length < 2 || testName.length > 60) continue;
    if (nameExclusions.has(testName.toLowerCase())) continue;
    if (/^[\d\s.]+$/.test(testName)) continue;

    const key = testName.toLowerCase();
    if (seenTests.has(key)) continue;
    seenTests.add(key);

    const valueText = match[2].trim();
    const unit = match[3].trim();
    const refLowText = match[4];
    const refHighText = match[5];
    let flag = (match[6] || '').trim();

    const valueClean = valueText.replace(/[<>]/g, '').trim();
    let value: number | null = null;
    try { value = parseFloat(valueClean); if (isNaN(value)) value = null; } catch { value = null; }

    const refLow = refLowText ? parseFloat(refLowText) : null;
    const refHigh = refHighText ? parseFloat(refHighText) : null;

    let isAbnormal = !!flag;
    if (!isAbnormal && value !== null) {
      if (refLow !== null && value < refLow) { isAbnormal = true; flag = 'L'; }
      else if (refHigh !== null && value > refHigh) { isAbnormal = true; flag = 'H'; }
    }

    const contextStart = Math.max(0, match.index - 100);
    const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
    const context = text.slice(contextStart, contextEnd).trim();

    results.push({
      testName, value, valueText, unit,
      referenceLow: refLow, referenceHigh: refHigh,
      referenceText: refLow && refHigh ? `${refLow}-${refHigh}` : '',
      flag, isAbnormal,
      context: context.slice(0, 200),
      confidence: refLow && refHigh ? 0.92 : 0.80,
    });
  }

  return results;
}

// ============================================================================
// VERTICAL FORMAT PARSER (MyChart/Epic/Intermountain)
// ============================================================================

function parseVerticalFormat(
  text: string,
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const results: LabResult[] = [];

  // Detect vertical format
  if (!/Test Date\s*\n[\s\S]*?\nTest Location/.test(text)) return results;

  // Clean page artifacts
  let clean = text;
  clean = clean.replace(/Copyright\s+.?\d{4}[\s\S]*?Page\s+\d+\s+of\s+\d+\s*/g, '');
  clean = clean.replace(/\n*---\s*Page\s+\d+\s*---\n*/g, '\n');
  clean = clean.replace(/^\d{2}\/\d{2}\/\d{4}\s+Test Results\s*$/gm, '');
  clean = clean.replace(/^Health Record\s*$/gm, '');
  clean = clean.replace(/^Notes\s*$/gm, '');
  clean = clean.replace(/\n{3,}/g, '\n\n');

  const pattern = new RegExp(
    '(?<test_name>[A-Za-z][\\w \\-\\(\\)/]+?)\\s*\\n' +
    'Test Date\\s*\\n' +
    '(?<date>\\d{2}\\/\\d{2}\\/\\d{4})\\s*\\n' +
    'Test Location\\s*\\n' +
    '(?:(?!Range).*?\\n)*?' +
    'Range \\(Normal\\)\\s*\\n' +
    '(?<range_line>.*?)\\s*\\n' +
    'Value\\s*\\n' +
    '(?<value_line>.*?)\\s*\\n' +
    'Interpretation\\s*\\n' +
    '(?<interp>(?:LLOW|LOW|HI|HIGH|H|L|LL|HH|CRITICAL|CRIT|ABNORMAL|ABN)?\\s*)\\n',
    'gm'
  );

  let match;
  while ((match = pattern.exec(clean)) !== null) {
    const testName = match.groups!.test_name.trim();
    const rangeLine = match.groups!.range_line.trim();
    const valueLine = match.groups!.value_line.trim();
    const interp = (match.groups!.interp || '').trim();

    if (testName.length < 2 || testName.length > 80) continue;
    if (nameExclusions.has(testName.toLowerCase())) continue;
    if (/^[\d\s.]+$/.test(testName)) continue;
    if (['notes', 'note', 'comments', 'comment', 'see note'].includes(testName.toLowerCase())) continue;

    const key = testName.toLowerCase();
    if (seenTests.has(key)) continue;
    seenTests.add(key);

    // Parse value
    let value: number | null = null;
    let unit = '';
    const valueMatch = valueLine.match(/([<>]?\s*\d+(?:\.\d+)?)\s*(.+)/);
    if (valueMatch) {
      const valStr = valueMatch[1].replace(/[<>]/g, '').trim();
      try { value = parseFloat(valStr); if (isNaN(value)) value = null; } catch { value = null; }
      unit = valueMatch[2].trim();
    }

    // Parse range
    let refLow: number | null = null;
    let refHigh: number | null = null;
    const rangeMatch = rangeLine.match(/([<>]?\s*\d+(?:\.\d+)?)\s*\S+\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      try {
        refLow = parseFloat(rangeMatch[1].replace(/[<>]/g, '').trim());
        refHigh = parseFloat(rangeMatch[2].trim());
      } catch { /* ignore */ }
    }

    // Parse flag
    let flag = '';
    let isAbnormal = false;
    const interpUpper = interp.toUpperCase();
    if (interpUpper.includes('LLOW') || interpUpper === 'LL') { flag = 'LL'; isAbnormal = true; }
    else if (['LOW', 'L'].includes(interpUpper)) { flag = 'L'; isAbnormal = true; }
    else if (['HI', 'HIGH', 'H', 'HH'].includes(interpUpper)) { flag = 'H'; isAbnormal = true; }
    else if (['CRITICAL', 'CRIT'].includes(interpUpper)) { flag = 'CRITICAL'; isAbnormal = true; }

    if (!isAbnormal && value !== null) {
      if (refLow !== null && value < refLow) { isAbnormal = true; flag = flag || 'L'; }
      else if (refHigh !== null && value > refHigh) { isAbnormal = true; flag = flag || 'H'; }
    }

    results.push({
      testName, value, valueText: valueLine, unit,
      referenceLow: refLow, referenceHigh: refHigh,
      referenceText: refLow || refHigh ? rangeLine : '',
      flag, isAbnormal,
      context: `Vertical format: ${testName} = ${valueLine}`,
      confidence: refLow && refHigh ? 0.90 : 0.75,
    });
  }

  return results;
}

// ============================================================================
// MAYO/GRAPHICAL FORMAT PARSER
// ============================================================================

function parseMayoFormat(
  text: string,
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const results: LabResult[] = [];

  // Detect: need multiple "Normal range:" entries and NOT vertical format
  if (/Test Date\s*\n[\s\S]*?\nTest Location/.test(text)) return results;
  if ((text.match(/Normal range:/g) || []).length < 2) return results;

  let clean = text;
  clean = clean.replace(/\n*---\s*Page\s+\d+\s*---\n*/g, '\n');
  clean = clean.replace(/^\d+\/\d+\/\d+,.*$/gm, '');
  clean = clean.replace(/^https?:\/\/\S+.*$/gm, '');
  clean = clean.replace(/^.*\d\.\.\d.*$/gm, '');
  clean = clean.replace(/^[a-z]\d\d\s+[a-z]\.\..*$/gm, '');
  clean = clean.replace(/\n{3,}/g, '\n\n');

  const lines = clean.split('\n').filter(l => l.trim());

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('Normal range:')) continue;

    const rangeMatches = [...lines[i].matchAll(
      /Normal range:\s*([\d.]+)\s*-\s*([\d.]+)\s*(\S+(?:\(\d+\))?(?:\/\S+)*)/g
    )];
    if (rangeMatches.length === 0) continue;

    const nameLine = i > 0 ? lines[i - 1].trim() : '';
    const valueLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

    if (!nameLine || /^(Results|Name:|Collected|Ordering|Specimens)/.test(nameLine)) continue;

    const valMatches = [...valueLine.matchAll(/([\d.]+)\s*(Low|High)?/gi)];

    type TestEntry = [string, RegExpMatchArray, RegExpMatchArray | undefined];
    let tests: TestEntry[];

    if (rangeMatches.length === 2) {
      const words = nameLine.split(/\s+/);
      const mid = Math.floor(words.length / 2);
      const name1 = words.slice(0, Math.max(mid, 1)).join(' ');
      const name2 = words.slice(Math.max(mid, 1)).join(' ');
      tests = [
        [name1, rangeMatches[0], valMatches[0]],
        [name2, rangeMatches[1], valMatches[1]],
      ];
    } else if (rangeMatches.length === 1) {
      tests = [[nameLine, rangeMatches[0], valMatches[0]]];
    } else {
      continue;
    }

    for (const [testName, rmatch, vmatch] of tests) {
      const trimmedName = testName.trim();
      if (!trimmedName || trimmedName.length < 2) continue;
      if (nameExclusions.has(trimmedName.toLowerCase())) continue;

      const key = trimmedName.toLowerCase();
      if (seenTests.has(key)) continue;
      seenTests.add(key);

      const refLow = parseFloat(rmatch[1]);
      const refHigh = parseFloat(rmatch[2]);
      const unit = rmatch[3];

      let value: number | null = null;
      let valueText = '';
      let flag = '';
      let isAbnormal = false;

      if (vmatch) {
        const valStr = vmatch[1];
        const flagStr = vmatch[2] || '';
        try { value = parseFloat(valStr); if (isNaN(value)) value = null; } catch { value = null; }
        valueText = `${valStr} ${unit}`;
        if (flagStr) {
          flag = flagStr.toLowerCase() === 'low' ? 'L' : 'H';
          isAbnormal = true;
        }
      }

      if (!isAbnormal && value !== null) {
        if (value < refLow) { isAbnormal = true; flag = flag || 'L'; }
        else if (value > refHigh) { isAbnormal = true; flag = flag || 'H'; }
      }

      results.push({
        testName: trimmedName, value, valueText, unit,
        referenceLow: refLow, referenceHigh: refHigh,
        referenceText: `${refLow} ${unit}-${refHigh} ${unit}`,
        flag, isAbnormal,
        context: `Mayo format: ${trimmedName} = ${value} ${unit}`,
        confidence: 0.90,
      });
    }
  }

  return results;
}

// ============================================================================
// MAIN LAB EXTRACTION
// ============================================================================

/**
 * Extract lab results from text. Tries vertical (portal), mayo, then horizontal format.
 */
export function extractLabResults(
  text: string,
  demographics?: Record<string, any> | null
): LabResult[] {
  const nameExclusions = buildExclusionSet(demographics);
  const seenTests = new Set<string>();

  // Try vertical format first (MyChart/Epic)
  const verticalResults = parseVerticalFormat(text, nameExclusions, seenTests);
  if (verticalResults.length > 0) {
    console.log(`🧪 Vertical format: ${verticalResults.length} results`);
    return sortLabResults(verticalResults);
  }

  // Try Mayo format
  const mayoResults = parseMayoFormat(text, nameExclusions, seenTests);
  if (mayoResults.length > 0) {
    console.log(`🧪 Mayo format: ${mayoResults.length} results`);
    return sortLabResults(mayoResults);
  }

  // Fall back to horizontal format
  const horizontalResults = parseHorizontalFormat(text, nameExclusions, seenTests);
  console.log(`🧪 Horizontal format: ${horizontalResults.length} results`);
  return sortLabResults(horizontalResults);
}

function sortLabResults(results: LabResult[]): LabResult[] {
  return results.sort((a, b) => {
    if (a.isAbnormal !== b.isAbnormal) return a.isAbnormal ? -1 : 1;
    return a.testName.toLowerCase().localeCompare(b.testName.toLowerCase());
  });
}

/**
 * Convert lab results to MedicalEvent format for the timeline.
 */
export function labResultsToEvents(labs: LabResult[], docDate?: string | null): MedicalEvent[] {
  return labs.map((lab, i) => {
    const flagPrefix = ['H', 'HH', 'HIGH', 'CRITICAL', 'CRIT'].includes(lab.flag) ? '🔴 ' :
                       ['L', 'LL', 'LOW'].includes(lab.flag) ? '🔵 ' : '';

    let title = `${flagPrefix}${lab.testName}: ${lab.valueText} ${lab.unit}`;
    if (lab.referenceText) title += ` (ref: ${lab.referenceText})`;

    return {
      id: `nlp-lab-${Date.now()}-${i}`,
      type: 'lab',
      title,
      date: docDate || new Date().toISOString().split('T')[0],
      end_date: null,
      provider: null,
      location: null,
      description: lab.context,
      status: 'active',
      severity: null,
      tags: ['lab', 'imported', 'lab-parser'],
      confidence: Math.round(lab.confidence * 100),
      sources: ['lab-parser'],
      needs_review: false,
      suggestions: [],
      raw_text: lab.context,
      dosage: null,
      incidental_findings: [],
    };
  });
}
