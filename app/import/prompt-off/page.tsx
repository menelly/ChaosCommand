/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * prompt-off/page.tsx — THROWAWAY experiment harness (delete before ship).
 *
 * Ren's "prompt off" (2026-07-01): three extraction routes, all through the
 * native MedGemma runner, different prompt/pipeline each, every stage TIMED, so
 * we can judge BOTH output quality AND speed on a release build:
 *   Route 1  Findings scan  → dedupe/rank pass
 *   Route 2  Labs: value + reference range, NO editorializing → mark H/L/normal
 *            + dedupe pass (direction decided from value-vs-range, not the model)
 *   Route 3  Deterministic lab parser (no LLM for values)
 *
 * Deliberately does NOT touch the committed production pipeline — it reuses the
 * same text extractor + llm_generate and shows raw output, so it's pure signal.
 */
"use client"

import { useEffect, useState } from "react"
import { extractDocFromBase64 } from "@/lib/services/text-extractor"
import { extractLabResults } from "@/lib/services/lab-parser"
import {
  getLlmModelStatus,
  downloadLlmModel,
  loadLlmModel,
  llmGenerate,
  isLlmReady,
} from "@/lib/services/llm-tauri"
import {
  MEDGEMMA_REPORT_PROMPT,
  MEDGEMMA_ED_PROMPT,
  pickDocPrompt,
} from "@/lib/services/medgemma-doc-scan"

// ── Prompts ────────────────────────────────────────────────────────────────

const DEDUPE_PROMPT = `Below is a list of findings extracted from ONE medical report. Clean it up. RULES:
- When a vague summary ("Pulmonary nodules") and specific versions ("5 mm nodule in lingula") both appear, KEEP THE SPECIFIC ONES and drop the vague summary — NEVER lose a size, location, or number.
- When unsure whether two lines are the same finding, KEEP BOTH. A duplicate is harmless; a lost finding is not.
- Do not invent anything; reuse the exact text given.
- FLAG NONSENSE: if any line is medically contradictory — a critically LOW value labeled "high"/"elevated"/"hyperglycemia", a critically HIGH value labeled "low", or a value whose stated direction the NUMBER does not support — call it out and give the correct reading. Example: "⚠️ 'Elevated Glucose (19 mg/dL)' — 19 mg/dL is CRITICALLY LOW (hypoglycemia), not elevated. Likely a documentation error." A patient should see "wait, I was at 19?!" not a laundered "hyperglycemia."
Output three sections — DIAGNOSES, FINDINGS, INCIDENTAL — each item verbatim one per line, then a final section FLAGS listing any contradictions found.`

const LABS_NO_EDITORIALIZE_PROMPT = `Read this medical document and list EVERY laboratory value you find. For each value output ONE line in exactly this format:
  <analyte> | <value with units> | <reference range EXACTLY as printed, or "none"> | <flag the report itself prints, e.g. High/Low/Critical, or "none">
Copy numbers and ranges character-for-character. DO NOT decide or add high/low/normal yourself — only copy the flag if the report already printed one. Do not editorialize, do not diagnose. One lab per line, nothing else.`

const LABS_MARK_PROMPT = `Below are lab lines in the format: analyte | value | reference range | printed-flag.
For each line, decide HIGH, LOW, or NORMAL using ONLY the number compared to its reference range (if the range is "none", use the printed flag; if both are absent, output UNKNOWN). Then remove exact duplicate lines (same analyte AND same value).
Output one line per kept lab: <analyte> — <value> — <HIGH|LOW|NORMAL|UNKNOWN>. Change no numbers.`

// ── Harness ──────────────────────────────────────────────────────────────

interface Stage { label: string; ms: number; text: string }

export default function PromptOffPage() {
  const [modelState, setModelState] = useState<'checking' | 'downloading' | 'loading' | 'ready' | 'error'>('checking')
  const [file, setFile] = useState<File | null>(null)
  const [docText, setDocText] = useState<string>("")
  const [running, setRunning] = useState<string | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        if (isLlmReady()) { setModelState('ready'); return }
        const s = await getLlmModelStatus()
        if (!s) { setModelState('error'); setErr('Not in the desktop app'); return }
        if (!s.downloaded) { setModelState('downloading'); await downloadLlmModel() }
        setModelState('loading')
        await loadLlmModel()
        setModelState('ready')
      } catch (e) {
        setModelState('error'); setErr(String(e))
      }
    })()
  }, [])

  async function readText(f: File): Promise<string> {
    const buf = new Uint8Array(await f.arrayBuffer())
    let bin = ""
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
    const doc = await extractDocFromBase64(btoa(bin), f.type, f.name)
    return doc.text
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setStages([]); setErr(null); setDocText("")
    try { setDocText(await readText(f)) } catch (x) { setErr(`Text extract failed: ${x}`) }
  }

  function timed(label: string, ms: number, text: string) {
    setStages(prev => [...prev, { label, ms, text }])
  }

  async function run(route: 1 | 2 | 3) {
    if (!docText) { setErr('Pick a file first'); return }
    setRunning(`route${route}`); setStages([]); setErr(null)
    const t = () => performance.now()
    try {
      if (route === 1) {
        const { prompt, route: r } = pickDocPrompt(docText)
        let t0 = t()
        const scan = await llmGenerate('', `${prompt}\n\n${docText}`, { maxTokens: 2048 })
        timed(`1a · findings scan (${r} route)`, t() - t0, scan)
        t0 = t()
        const dd = await llmGenerate('', `${DEDUPE_PROMPT}\n\nLIST:\n${scan}`, { maxTokens: 1500 })
        timed('1b · dedupe/rank pass', t() - t0, dd)
      } else if (route === 2) {
        let t0 = t()
        const labs = await llmGenerate('', `${LABS_NO_EDITORIALIZE_PROMPT}\n\nDOCUMENT:\n${docText}`, { maxTokens: 2048 })
        timed('2a · labs (value + range, no direction)', t() - t0, labs)
        t0 = t()
        const marked = await llmGenerate('', `${LABS_MARK_PROMPT}\n\n${labs}`, { maxTokens: 1500 })
        timed('2b · mark H/L/normal + dedupe', t() - t0, marked)
      } else {
        const t0 = t()
        const labs = extractLabResults(docText)
        const out = labs.map(l =>
          `${l.testName} — ${l.valueText}${l.unit ? ' ' + l.unit : ''} — ` +
          `${l.flag || (l.isAbnormal ? 'ABNORMAL' : 'normal')}` +
          `${l.referenceText ? `  (ref ${l.referenceText})` : ''}`
        ).join('\n') || '(no lab results parsed)'
        timed('3 · deterministic lab parser', t() - t0, out)
      }
    } catch (x) {
      setErr(String(x))
    } finally {
      setRunning(null)
    }
  }

  const busy = running !== null
  const ready = modelState === 'ready'

  return (
    <div className="max-w-3xl mx-auto p-6 text-[var(--text-main)]">
      <h1 className="text-xl font-bold text-[var(--accent-purple)]">🧪 Prompt-Off (throwaway harness)</h1>
      <p className="text-xs text-[var(--text-muted)] mt-1">
        Three MedGemma routes, each timed. Model: <b>{modelState}</b>
        {err && modelState === 'error' ? ` — ${err}` : ''}
      </p>

      <div className="my-4 text-sm">
        <input type="file" accept=".pdf,.txt,.png,.jpg,.jpeg" onChange={onPick} disabled={!ready || busy}
          className="text-[var(--text-main)]" />
        {file && <span className="text-xs ml-2 text-[var(--text-muted)]">{file.name} · {docText.length} chars</span>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => run(1)} disabled={!ready || busy || !docText}
          className="px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-40">
          Route 1 · Findings + dedupe
        </button>
        <button onClick={() => run(2)} disabled={!ready || busy || !docText}
          className="px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-40">
          Route 2 · Labs (no editorializing) + mark
        </button>
        <button onClick={() => run(3)} disabled={!ready || busy || !docText}
          className="px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-40">
          Route 3 · Deterministic lab parser
        </button>
      </div>

      {busy && <p className="mt-3 text-sm text-[var(--text-muted)]">⏳ running {running}… (MedGemma is generating)</p>}
      {err && modelState !== 'error' && <p className="text-destructive text-sm mt-2">⚠️ {err}</p>}

      {stages.map((s, i) => (
        <div key={i} className="mt-4">
          <div className="font-semibold text-sm">
            {s.label} — <span className="text-[var(--accent-green,#0a7)]">{(s.ms / 1000).toFixed(1)}s</span>
          </div>
          <pre className="whitespace-pre-wrap bg-[var(--surface-2)] text-[var(--text-main)] border border-[var(--border-soft)] p-3 rounded-lg text-xs overflow-x-auto">
            {s.text}
          </pre>
        </div>
      ))}

      {stages.length > 0 && (
        <p className="mt-3 font-semibold text-sm">
          Total: {(stages.reduce((a, s) => a + s.ms, 0) / 1000).toFixed(1)}s
        </p>
      )}
    </div>
  )
}
