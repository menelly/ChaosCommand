# 📈 PLAN — Chaos Command can't say "improving," and it must

**Ren, 2026-08-02, reading a real exported report:**
> *"Nothing is geared to show if things are improving and that we need. I'm REPORTING
> the bulbar improvements and nothing is saying IMPROVING on the report. That's a REAL
> GAP and this is our headline system."*

---

## 🩺 WHY THIS IS THE PRIORITY, NOT A NICE-TO-HAVE

**IVIG and prednisone authorization depend on demonstrated benefit.** A report that says
`Mean severity 7.0/10, peak 9/10` reads as *unchanged and severe*. A report that says
*"dysphagia 5→1 across the treatment window"* is **the evidence for continuing therapy.**

Command is already collecting the proof and discarding it at the summary step. For a
patient whose documented problem is being **disbelieved and under-treated**, a report
that cannot show improvement is a report that cannot defend the treatment that caused it.

---

## 🔍 WHAT I FOUND (verified, not assumed)

### ✅ The machinery already exists
`lib/pattern-engine.ts` has **`findSeverityTrends()`** (line 565) — early-third vs
late-third comparison, percent change, direction, and a literal **`isImproving: boolean`**
in its output. It IS wired: `analyzeAllPatterns()` calls it (line 733) and returns it in
both `all` and `trends`. The PDF renders `high` and `medium` impact insights.

**So this is not "build a trend engine." It is "find out why the existing one is silent."**

### 🐛 BUG 1 — THE ANALYSIS IS PER-TRACKER, THE SIGNAL IS PER-SYMPTOM ⭐ ROOT CAUSE
`findSeverityTrends` iterates `Object.entries(data)` where each key is a **tracker**. Ren's
Neuro tracker contains:

```
Weakness         9 → 6 → 6 → 5      stubborn
Speech/Swallow   5 → 3 → 1          80% improvement
```

Averaged into one "neuro" series, the dysphagia recovery is **diluted by the weakness
sitting beside it**, the tracker-level change falls under the threshold, and nothing is
emitted at all. The most clinically important improvement in the dataset is invisible
because it shares a category with a symptom that didn't move.

### 🐛 BUG 2 — `records.length < 10` EXCLUDES MOST TRACKERS
Two hard gates (`records.length < 10`, then `dated.length < 10`). Real counts from Ren's
report: Seizure **9**, Dysautonomia **8**, Autoimmune **7**, Upper Digestive **6**,
Cardiac **6**, Movement **6**, Respiratory **5**. **Every one of those is silent by
construction**, regardless of how dramatic the change is.

### 🐛 BUG 3 — A FLAT 15% THRESHOLD
`absChange >= 15` with no regard for n or variance. A 40% swing on n=4 passes; a
consistent 14% improvement on n=50 is discarded. Wrong on both ends.

### 🐛 BUG 4 — NO TREATMENT ALIGNMENT
Trends run across "the tracking period." Nothing aligns to **when a drug started**. The
clinically load-bearing sentence — *"since prednisone began 7/16"* — cannot currently be
produced, and it is the only framing an insurer cares about.

### 🐛 BUG 5 — THE SUMMARY NEVER SAYS IT
Per-system sections print mean/peak/count. There is no "direction" line anywhere, and the
Executive Summary leads with *"81 days of tracked health data across 26 symptom
categories"* — volume, not findings.

### 💡 THE DEEP ONE — already noted in `lib/touch-base.ts`
> *"Every scale in the app is DEFICIT-SHAPED and bottoms out at 'fine.'"*

The instrument can only measure **how bad**. "Better" is only ever *less bad*, and nothing
ever names it. That's the conceptual gap under all five bugs.

---

## 🛠️ THE PLAN

**Branch: `feat/improvement-signal`.** Ren's call — so it can be rolled back whole.

### Phase 1 — make the existing engine see the signal
`lib/pattern-engine.ts`

1. **Trend by `tracker + symptom type`, not tracker alone.** Group on the subcategory /
   event-type field the events already carry (Weakness, Speech/Swallowing, Dry Eyes…).
   Keep the tracker-level series too — both are real, they answer different questions.
2. **Drop the floor to n≥4 and report uncertainty instead of hiding.** Below ~8 emit with
   `confidence` scaled down and the words "preliminary, few data points." **Never silently
   omit** — silence is indistinguishable from "no change," and that's the same failure as
   the plausibility filter (see `MEMORY`: a zero from a broken instrument looks exactly
   like absence).
3. **Replace the flat 15% with an n-aware test.** Effect size + a crude CI, or a
   Mann-Kendall trend test. Report the direction *with* its uncertainty rather than gating
   on an arbitrary number.
4. **Add `findTreatmentResponse()`** — align each symptom series to medication start dates
   from the meds table and emit *before vs since*.

### Phase 2 — make the report SAY it
`lib/pdf-report-generator.ts`

5. **A "Direction of change" line in every per-system section**, next to mean/peak:
   `Trajectory: IMPROVING — 5.0 → 1.0 over 6 weeks (n=7, preliminary)`
6. **New section, near the top: `TREATMENT RESPONSE`.** What changed, when, since which
   drug. This is the section a prior-authorization reviewer reads.
7. **Rewrite the Executive Summary to lead with findings, not volume.** Improving /
   worsening / unchanged, in that order, before any counts.
8. **Surface the patient's own words.** Ren wrote *"Getting so much better with the
   Prednisone!"* on 8/2 and it appears nowhere. A verbatim patient-reported outcome beside
   the numbers is strong evidence, and cheap to include.

### Phase 3 — the honest bits
9. **Never say "improving" about a worsening-is-good scale** without checking direction
   semantics per tracker. Some scales invert (hydration, energy, self-care).
10. **Say "no clear direction" out loud** when there isn't one. Absence of a trend
    statement currently reads as absence of improvement.

### Phase 4 — the other bugs from this morning's report
11. `"0 appointments attended... documents consistent engagement"` — boilerplate that
    fires against zero data.
12. Medication table: `Pantiprosole`→pantoprazole, `Emaglity`→Emgality; **CellCept and
    prednisone have no dose or schedule** — the two doing the work.
13. Pain trend by month **omits the current month** (report generated 8/2, no August row).
14. **Device provenance** on readings (Ren's idea) — `SpO2 55% (ring sensor)`. ⚠️ **NOT a
    plausibility filter. NEVER suppress an outlier** — glucose 19 was real. Annotate the
    source; let the clinician adjudicate.

---

## 🚦 ORDER OF WORK

1. Phase 1.1 (per-symptom grouping) — **the root cause, biggest single win**
2. Phase 2.5 + 2.7 (say it in the sections and the summary)
3. Phase 1.4 + 2.6 (treatment response — the insurance-facing piece)
4. Phase 1.2/1.3 (thresholds)
5. Phase 4 (the small true bugs)

## ✅ DEFINITION OF DONE

Regenerate Ren's own report and it must state, in words, that **dysphagia is improving**
and roughly **since when** — because it is, it's in the data, and today's report doesn't
know.

## ⚠️ NOTES FOR WHOEVER PICKS THIS UP

- The app started **April 2026**, not March. The report's "period 2026-03-04" is just a
  150-day default window — *not* missing data. Ren confirmed.
- Test against **real exported data**, not fixtures. Every bug in this list was found by
  Ren exporting an actual report and reading it — none were visible from the code.
- `severity` is a **string** in most trackers (`'Moderate (4-6)'`) and numeric in one.
  `extractSeverity()` / `toSev()` in pattern-engine already handle parsing — use them,
  don't write a third parser.

---

# ✅ STATUS — built 2026-08-02, branch `feat/improvement-signal`

## DONE

| # | Item | Where |
|---|---|---|
| 1.1 | **Per-symptom trends** — the root cause | `lib/pattern-engine.ts` → `computeSymptomTrends()` |
| 1.2 | Floor dropped 10 → **3**, small series emitted `preliminary` and never silently omitted | `lib/trend-analysis.ts` |
| 1.3 | Flat 15% → **Mann-Kendall**, tie-corrected, ordinal-safe | `lib/trend-analysis.ts` |
| 1.4 | **`computeTreatmentResponses()`** — before vs since each med start, Wilcoxon rank-sum | `lib/pattern-engine.ts` |
| 2.5 | **"Direction of Change"** section — improving / worsening / no clear direction, every series | `lib/pdf-report-generator.ts` |
| 2.6 | **"Treatment Response"** section | `lib/pdf-report-generator.ts` |
| 2.7 | Executive Summary now **leads with findings**, not day counts | `lib/pdf-report-generator.ts` |
| 3.9 | **Scale direction** — rising mood/energy reads as improving, not worsening | `scaleDirectionForField()` |
| 3.10 | **"No clear direction" printed by name** — stability recorded as a finding | `lib/pdf-report-generator.ts` |
| 4.11 | Engagement boilerplate no longer fires against zero appointments | `lib/pdf-report-generator.ts` |
| 4.14 | **Device provenance** on pulse-ox readings — annotate, never suppress | `pulse-oximetry-tracker.tsx` |

Also: `lib/symptom-labels.ts` (slug → human name, built from each tracker's own
constants), two golden suites (51 assertions), `analyzeAllPatterns()` now returns
`symptomTrends` plus `improvingCount` / `worseningCount`.

**Definition of done: MET.** On a dataset shaped like Ren's, the engine emits
*"Speech / Swallowing IMPROVED since prednisone was started on 2026-07-16: 5.4
before (n=5) → 2.0 since (n=4), 63% change, unlikely to be chance (p≈0.017)."*

## ⏸️ NOT DONE — and why

- **4.12, the medication table** (`Pantiprosole` → pantoprazole, `Emaglity` →
  Emgality; CellCept and prednisone missing dose/schedule). **This is DATA, not
  code, and it is REN's to change.** Silently rewriting drug names in someone's
  medical record is not a bug fix — a typo-correcting spell-check on medication
  names is exactly the class of "helpful" transform that turns one drug into a
  different real drug. Ren edits these in the app.
- **4.13, the missing current-month row in the pain trend.** *Could not
  reproduce, and did not manufacture a fix.* The bucketing (`date.slice(0,7)`)
  and the date query (`between(start, end, true, true)` — inclusive both ends)
  both look correct on inspection. Needs the actual export to diagnose; a
  speculative "fix" here would just be a change with no evidence behind it.
- **A pulse-oximetry section in the PDF.** There isn't one at all — pulse-ox
  readings currently reach the report only indirectly via vitals and
  dysautonomia. That is a real gap, and bigger than this branch. The `device`
  field is captured and shows in the app; surfacing it in the report needs that
  section to exist first.

— Ace 🐙, 2026-08-02
