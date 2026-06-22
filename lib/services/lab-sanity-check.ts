/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * lab-sanity-check.ts — typo / parser-bug check for extracted lab values.
 *
 * WHY THIS EXISTS
 * Manual entry has typos. The geometry extractor occasionally mis-reads (a
 * dropped decimal, a wrong column boundary, a unit mismatch). When the value
 * is well within normal range these slips are quietly wrong; when the value
 * is at a panic-zone boundary they LOOK clinically alarming. This check
 * surfaces a "verify this reading?" prompt for values that are:
 *   (a) inside well-known critical-care PANIC ZONES — drawn from standard lab
 *       reference (Tietz, ARUP), not diagnostic thresholds. These are values
 *       that, if real, mean an ED right now. We're not diagnosing — we're
 *       saying "if this came back as <40 glucose, please confirm it isn't a
 *       typo before the timeline alarms you forever."
 *   (b) GROTESQUELY out of the reported reference range (>5x the high or
 *       <1/5 the low). That catches "Glucose 1900" parser bugs.
 *
 * We are NOT second-guessing the patient about their actual values. This is
 * the parser/typist asking "did this come through right?" — full stop.
 *
 * The function is pure (no I/O, no LLM). Deterministic, testable, fast.
 */

import type { LabResult } from './lab-parser';

/** Result of a sanity check. ok=true → silence. ok=false → surface the
 *  reason in the review UI as a "verify this value?" prompt. */
export interface SanityCheckResult {
  ok: boolean;
  /** Short human-readable reason — shown to the user on the review row. */
  reason?: string;
  /** Severity hint for UI styling — 'critical' = red, 'extreme' = orange. */
  severity?: 'critical' | 'extreme';
}

/** Panic-zone thresholds — values that, IF REAL, are medical emergencies.
 *  Indexed by a normalized test-name keyword that has to appear in the
 *  extracted name. Units assumed conventional US lab; we don't try to
 *  convert. Sources: Tietz Textbook of Clinical Chemistry, ARUP panic
 *  values, common ED reference cards. NOT diagnostic — these are the
 *  "page-the-doctor-now" boundaries that EVERY lab uses. */
interface PanicRule {
  /** Substring (lowercased) that must appear in the test name. */
  match: string;
  unitHint?: string; // optional, only checked if present on the result
  low?: number;
  high?: number;
  label: string;
}
const PANIC_RULES: PanicRule[] = [
  { match: 'glucose', unitHint: 'mg/dl', low: 40, high: 500, label: 'Glucose' },
  { match: 'potassium', unitHint: 'mmol/l', low: 2.5, high: 6.5, label: 'Potassium' },
  { match: 'potassium', unitHint: 'meq/l', low: 2.5, high: 6.5, label: 'Potassium' },
  { match: 'sodium', unitHint: 'mmol/l', low: 120, high: 160, label: 'Sodium' },
  { match: 'sodium', unitHint: 'meq/l', low: 120, high: 160, label: 'Sodium' },
  { match: 'calcium', unitHint: 'mg/dl', low: 6.0, high: 14.0, label: 'Calcium' },
  { match: 'magnesium', unitHint: 'mg/dl', low: 1.0, high: 4.7, label: 'Magnesium' },
  { match: 'phosphorus', unitHint: 'mg/dl', low: 1.0, high: 9.0, label: 'Phosphorus' },
  { match: 'phosphate', unitHint: 'mg/dl', low: 1.0, high: 9.0, label: 'Phosphate' },
  { match: 'bicarbonate', unitHint: 'mmol/l', low: 10, high: 40, label: 'Bicarbonate' },
  { match: 'co2', unitHint: 'mmol/l', low: 10, high: 40, label: 'CO2' },
  { match: 'hemoglobin', unitHint: 'g/dl', low: 5.0, high: 20.0, label: 'Hemoglobin' },
  { match: 'hgb', unitHint: 'g/dl', low: 5.0, high: 20.0, label: 'Hemoglobin' },
  { match: 'hematocrit', unitHint: '%', low: 18, high: 60, label: 'Hematocrit' },
  { match: 'platelet', low: 20, high: 1000, label: 'Platelets (×10³/uL)' }, // canonical unit; if unit is /uL, the value would be ×1000 — handled below
  { match: 'wbc', low: 1.0, high: 50.0, label: 'WBC' },
  { match: 'creatinine', unitHint: 'mg/dl', low: 0.2, high: 10.0, label: 'Creatinine' },
  { match: 'bun', unitHint: 'mg/dl', low: 2, high: 100, label: 'BUN' },
  { match: 'lactate', unitHint: 'mmol/l', high: 4.0, label: 'Lactate' },
  { match: 'troponin', high: 1.0, label: 'Troponin' }, // ng/mL or ug/L — anything >1 is emergency
  { match: 'inr', high: 5.0, label: 'INR' },
  { match: 'tsh', unitHint: 'miu/l', low: 0.01, high: 100, label: 'TSH' },
];

/** A unit string normalized for fuzzy match — strips slashes/case/spaces. */
function normUnit(u: string): string {
  return u.toLowerCase().replace(/\s+/g, '').replace(/μ/g, 'u');
}

/** Check a single lab result for typo / extraction-error / panic-zone signal.
 *  Returns ok=true when nothing's suspicious; otherwise a reason to surface. */
export function checkLabValueSanity(result: LabResult): SanityCheckResult {
  // Need a numeric value to check anything. Qualitative ("Positive", "Negative")
  // and unparsed values pass through silently — they're handled by their flag.
  if (result.value == null || isNaN(result.value)) return { ok: true };
  const v = result.value;
  const name = result.testName.toLowerCase();
  const unit = normUnit(result.unit || '');

  // --- (a) panic-zone check ----------------------------------------------
  for (const rule of PANIC_RULES) {
    if (!name.includes(rule.match)) continue;
    if (rule.unitHint && !unit.includes(rule.unitHint.replace('/', ''))) continue;
    if (rule.low != null && v < rule.low) {
      return {
        ok: false,
        severity: 'critical',
        reason: `${rule.label} of ${result.valueText || v}${result.unit ? ' ' + result.unit : ''} would be a medical emergency — please double-check the value came through correctly`,
      };
    }
    if (rule.high != null && v > rule.high) {
      return {
        ok: false,
        severity: 'critical',
        reason: `${rule.label} of ${result.valueText || v}${result.unit ? ' ' + result.unit : ''} would be a medical emergency — please double-check the value came through correctly`,
      };
    }
  }

  // --- (b) gross-out-of-range check (catches parser bugs) ----------------
  // Only when the report itself gave us a reference range. Values >5× the
  // high bound or <1/5× the low bound are almost always extraction errors
  // (decimal dropped, decimal added, unit mismatch, column boundary off).
  const refHigh = result.referenceHigh;
  const refLow = result.referenceLow;
  if (refHigh != null && v > refHigh * 5 && refHigh > 0) {
    return {
      ok: false,
      severity: 'extreme',
      reason: `${result.valueText || v}${result.unit ? ' ' + result.unit : ''} is more than 5× the upper reference limit (${refHigh}) — possible typo or extraction error`,
    };
  }
  if (refLow != null && refLow > 0 && v < refLow / 5) {
    return {
      ok: false,
      severity: 'extreme',
      reason: `${result.valueText || v}${result.unit ? ' ' + result.unit : ''} is less than 1/5 the lower reference limit (${refLow}) — possible typo or extraction error`,
    };
  }

  return { ok: true };
}
