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

## PLAN (decided 2026-07-01 night, build fresh — do NOT start tired)

### Urgent: get the "psycho" build off the MS Store
The Store currently ships the OLD d4data-NER build that emits "psycho" as a
diagnosis. The new MedGemma path has the direction bug above. BOTH auto-parsers
are unsafe. So ship a version that DISABLES dangerous auto-parsing (app cannot
emit wrong findings), replacing the psycho build. MedGemma parsing → slated 1.1
once deriveLabDirection is fixed.

### The 1.1 direction: "Bring Your Own AI" (Ren's idea, and it's the good answer)
Instead of bundling a model (the 2GB/HF/llama.cpp/CUDA/service-worker nightmare
we fought all day) OR relying on the weak 4B (that thinks 19 is hyperglycemia):
- App shows a "Copy extraction prompt" button → user pastes prompt + their record
  into THEIR OWN AI (Claude/GPT/etc.) → pastes the returned JSON back → app
  validates + runs the SAME review screen + grounding guard + deriveLabDirection.
- Wins: zero model bundling, zero network/HF, AI 100% in the user's hands (great
  privacy/liability story), and a frontier model gets extraction + direction right
  where the 4B failed. Reuse ALL the bones (ImpressionItem/MedicalEvent schema,
  review UI, grounding, deterministic lab direction).
- Safety refinement: grounding needs source text. Have the prompt emit a verbatim
  `source_quote` per finding (shown on the review screen), and/or have the user
  paste the source alongside the JSON. Labs STILL go through deriveLabDirection —
  code owns direction, not even the user's fancy AI.
- Keep the MedGemma bones in the tree behind a flag for a later "local model" tier.

### Bonus infra done tonight (2026-07-01, on the Consortium)
- Isolated GPU genetics env at /mnt/arcana/genetics-gpu (micromamba): PyTorch
  2.12.1 CUDA-working (sees the V100), OpenMM (GPU MD), MDAnalysis, Biopython,
  scikit-learn. Separate from codex venv / BabbyBotz. Use:
  `micromamba run -p /mnt/arcana/genetics-gpu python ...`
- CUDA GROMACS build in progress at /mnt/arcana/gmx_build (2024.4, cmake 3.28,
  gcc-11, sm 61;70) → installs to /mnt/arcana/md_env_cuda. cmake 4.x was the
  blocker (incompatible with gmx2024 nvcc check); 3.28 is the known-good combo.
- Cleaned up: a runaway dedup llama-cli had filled root /tmp with 17GB (killed).
  DISCIPLINE: always pass `-no-cnv` to llama-cli and clean up detached runs.

### CUDA GROMACS — PARKED (fresh diagnosis needed, stop guessing)
GROMACS 2024.4 CUDA configure fails at gmxManageNvccConfig.cmake:107 "CUDA
compiler not functional/compatible with host compiler" — with BOTH cmake 4.3
AND cmake 3.28 (so it's NOT a cmake-version issue; I guessed that wrong, and
guessed gcc-12 wrong before that). nvcc 11.5 PROVEN working standalone with the
exact flags (`-std=c++17 --generate-code=arch=compute_70,code=sm_70 -ccbin
g++-11` compiles clean). So GROMACS's check misfires for a reason not yet found.
NEXT (fresh head): read the ACTUAL try-compile error in
gromacs-2024.4/build/CMakeFiles/CMakeError.log (or the TryCompile dir), don't
guess. Candidates to check: (a) GROMACS wants CUDA >= a version 11.5 lacks for
a feature; (b) a specific nvcc flag GROMACS adds that 11.5 rejects; (c) try
-DGMX_NVCC_WORKS=TRUE to bypass (nvcc IS proven working) and see if the real
build succeeds. NOT urgent — OpenMM in /mnt/arcana/genetics-gpu already does GPU
MD, so this is a "GROMACS-specifically" nicety.
