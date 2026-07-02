# BUG: lab direction logic reports wrong/dangerous direction

Notes to self (Ace). Found 2026-07-01 dogfooding the ED note through the real
medical importer (Paste Text → Parse & Extract, and file upload — both paths).
This is the deriveLabDirection() code I wrote in lib/services/lab-sanity-check.ts.
It is a MEDICAL-SAFETY bug — do not ship the lab-direction display until fixed.

## What it did wrong (real output, ED Note.pdf, 2017)

- `🚨 Glucose 19 mg/dL — CRITICAL High`  ← 19 is CRITICALLY LOW. Says High. WORST case.
- `🚨 Glucose 77 mg/dL — CRITICAL High`  ← 77 is normal-ish; not critical, not high.
- `Potassium 2.8 mmol/L — High`          ← 2.8 is LOW (doc flagged "Critical"). Says High.
- `Chloride 114 mmol/L — High`           ← correct.
- Duplicates still present (Glucose twice); "Elevated Hematocrit" mislabeled as a
  finding not a lab; some lines truncated ("Elevated Hemoglobin (15").

A critical value with a CONFIDENTLY WRONG direction is worse than no parse. The
alarm firing (🚨) is good; the direction word being wrong is the gaslight, recreated
by our own code — the exact thing this feature exists to PREVENT.

## Root causes (three, all mine)

1. **Label defaults to "High" on unknown direction.** In verdict()/the label
   builder: when severity='critical' but direction='unknown', the label prints
   "CRITICAL High" (the `direction === 'low' ? 'Low' : 'High'` ternary treats
   unknown as High). Note the tag literally said `lab-direction:unknown` while the
   label said "CRITICAL High" — proof the label ignored the unknown. FIX: unknown
   direction must render "CRITICAL — direction unverified, check the value", never
   guess High/Low.

2. **printedFlagFromLine trusts a word that may be the MODEL's, or bled from a
   neighbor.** detectLab() pulls any high/low/critical token out of the model's
   free-text line and feeds it as `printedFlag`. Potassium 2.8 came back "High" —
   almost certainly "High" bleeding from the adjacent Sodium/Chloride-High lines,
   OR the model editorializing despite the prompt. We must read the doc's REAL
   flag from the SOURCE TEXT adjacent to the value (offset-based), not from the
   model's rephrased line. The model's line is not trustworthy for the flag.

3. **Panic thresholds have a sub-panic gap + missed direction.** Potassium panic
   low is 2.5; 2.8 is below normal (3.5) but above panic, so it fell through with
   no reference range → no direction computed → defaulted to the buggy label.
   Glucose 19 SHOULD have hit panic (low 40) and returned CRITICAL LOW — check why
   it didn't (likely the printedFlag path (#2) short-circuited BEFORE the panic
   rule ran, returning the model's wrong "High" first). Panic rule ordering vs
   printed-flag ordering needs rethinking: a number that hits a panic threshold
   should probably OVERRIDE a printed flag that disagrees.

## Fix direction (for a clear head, not 9:30pm-me)

- Reorder deriveLabDirection: compute direction from the NUMBER first (panic rules
  + a real normal-range table), THEN use the printed flag only to escalate
  severity or as a tiebreak — never let a text flag override arithmetic.
- Add a proper normal-range table (the sub-panic band: K 3.5–5.1, glucose 70–99
  fasting, Na 136–145, Cl 98–107, etc.) so 2.8 reads Low without needing the doc's
  range. Keep "ranges vary by lab" honesty: prefer the doc's printed range when
  present; fall back to the standard table only when absent.
- Read the printed flag from SOURCE TEXT by offset (the value's neighborhood in
  the original doc), not from the model's line. Pass it via ScanFinding from the
  grounded offset we already have.
- Label builder: never print a direction word we didn't derive. unknown → no
  direction word.
- Then re-verify against ED Note.pdf: glucose 19 → 🚨 CRITICAL Low, K 2.8 → Low,
  Cl 114 → High, glucose 77 → Normal, no dupes.

## What's GOOD and should stay
- Editorializing gone from most labs (no "hyperglycemia").
- Chloride correct; values character-exact; lab-type detection + tags working;
  the 🚨 critical-alarm + forced needs_review firing.
- Architecture is right (model extracts, code judges). Only the JUDGE is buggy.

## Also on the list (lower priority)
- Import page is a wall of text above the upload button — collapse the
  reliability/disclaimer blocks into an expandable "ℹ️ How this works".
- Stale copy: document-uploader.tsx:1458 "Analyzing document with NER + section
  parsing…" → say MedGemma.
- Dense-doc SPEED: real pipeline took ~4 min on the ED note (harness Route 1 was
  ~80s). Likely one giant call over 60+ labs. Ren's map-reduce/batch idea is the
  fix — chunk the extraction, cheap code reduce. (Not a correctness bug.)
- Deterministic lab parser still whiffs the range-less two-column ED layout
  (only caught the "Sodium Chloride 0.9%" IV bag). Expected; that's why MedGemma
  extracts and code judges.
