/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * llm-tauri.ts — frontend surface for the native MedGemma runner (src-tauri/src/llm.rs).
 *
 * Replaces the transformers.js webview stack (impression-llm-transformers.ts).
 * Same ImpressionLLMRunner contract, radically better engine: MedGemma-4B
 * Q3_K_M via llama.cpp in the Rust process — a model that actually has
 * medical vocabulary, running native instead of WASM.
 *
 * Model lifecycle (Ren's design, 2026-07-01): the ~2GB GGUF downloads at
 * FIRST LAUNCH with a progress bar — "takes 5 minutes to install" is normal
 * software; "takes 5 minutes to upload my PDF" is not. Uploads never trigger
 * the download.
 *
 * Desktop-only. On mobile (or plain browser dev) every probe returns
 * false/unavailable and callers fall back exactly as they did before.
 */

import {
  type ImpressionLLMRunner,
  setImpressionLLMRunner,
} from './impression-parser-llm';

export interface LlmModelStatus {
  downloaded: boolean;
  loaded: boolean;
  /** Bytes of a partial download on disk (0 when none) — UI can say "resuming at 43%". */
  partial_bytes: number;
  total_bytes: number;
  path: string;
}

export interface LlmDownloadProgress {
  downloaded: number;
  total: number;
  pct: number;
}

/** ~2.0GB — mirrored from MODEL_SIZE in llm.rs for UI copy. */
export const MODEL_TOTAL_BYTES = 2_098_460_480;
export const MODEL_LABEL = 'MedGemma 4B (medical document reader)';

let _loaded = false;
let _loading = false;
let _failed = false;

function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

/** Current model state straight from the Rust side. Returns null outside Tauri
 *  (browser dev, mobile) — callers treat that as "AI unavailable". */
export async function getLlmModelStatus(): Promise<LlmModelStatus | null> {
  if (!inTauri()) return null;
  try {
    const s = await invoke<LlmModelStatus>('llm_model_status');
    _loaded = s.loaded;
    return s;
  } catch (e) {
    console.warn('🧠 llm_model_status failed:', e);
    return null;
  }
}

/** Download the model (resumable, SHA256-verified in Rust). onProgress fires
 *  from the Rust download stream via the llm-download-progress event. */
// Same collision, higher stakes: Rust rejects a concurrent download with
// `Err("download already in progress")`, and StrictMode's double-invoke made
// that a near-certainty. Reporting "setup failed" over a healthy 2GB download
// is the version of this bug most likely to make someone give up entirely — so
// the second caller attaches to the first download instead of racing it.
let _downloadInFlight: Promise<void> | null = null;

export async function downloadLlmModel(
  onProgress?: (p: LlmDownloadProgress) => void,
): Promise<void> {
  if (!inTauri()) throw new Error('model download requires the desktop app');
  const { listen } = await import('@tauri-apps/api/event');
  // Progress listeners attach per CALLER, so a second caller still gets its
  // percentages even though only one download runs.
  const unlisten = onProgress
    ? await listen<LlmDownloadProgress>('llm-download-progress', (e) => onProgress(e.payload))
    : null;
  try {
    if (_downloadInFlight) { await _downloadInFlight; return; }
    _downloadInFlight = invoke<void>('llm_download_model').finally(() => {
      _downloadInFlight = null;
    });
    await _downloadInFlight;
  } finally {
    unlisten?.();
  }
}

/** Load the downloaded GGUF into RAM. Idempotent; ~3GB resident once loaded. */
/*
 * ⚠️ CONCURRENT CALLS MUST SHARE ONE LOAD, NOT RACE AND FAIL.
 *
 * The Rust side rejects a second simultaneous load with
 * `Err("model load already in progress")`. That is correct on its side — but
 * this function used to pass the rejection straight up, and every caller maps a
 * throw to "AI model setup failed".
 *
 * React StrictMode double-invokes effects in development, and Next enables it by
 * default, so the import page's mount effect called this TWICE, every time. The
 * first call loaded the model perfectly; the second collided, threw, and painted
 * "❌ AI model setup failed" over a model that was busy loading — or, if it
 * landed after the first finished, overwrote "ready" with "failed". The model
 * was never broken. The UI was reporting a collision as a failure.
 *
 * A collision means WAIT, not FAIL. One in-flight promise, shared by every
 * caller: the second call now awaits the first instead of starting a fight with
 * it, which also makes the whole thing idempotent for free.
 */
let _loadInFlight: Promise<void> | null = null;

export async function loadLlmModel(): Promise<void> {
  if (!inTauri()) throw new Error('model load requires the desktop app');
  if (_loaded) return;
  if (_loadInFlight) return _loadInFlight;

  _loading = true;
  _failed = false;
  _loadInFlight = (async () => {
    try {
      await invoke<void>('llm_load_model');
      _loaded = true;
    } catch (e) {
      // Belt and braces. If some OTHER path (a second window, a stale call from
      // before this dedupe existed) already has a load running, that is still
      // not a failure — poll until it resolves rather than declaring defeat.
      const msg = e instanceof Error ? e.message : String(e);
      if (/already in progress/i.test(msg)) {
        console.warn('🧠 load collided with one already running — waiting for it');
        for (let i = 0; i < 120; i++) {              // up to ~2 minutes
          await new Promise(r => setTimeout(r, 1000));
          const s = await getLlmModelStatus();
          if (s?.loaded) { _loaded = true; return; }
        }
      }
      _failed = true;
      throw e;
    } finally {
      _loading = false;
      _loadInFlight = null;
    }
  })();

  return _loadInFlight;
}

/** Free the model's RAM. The next generate call will need loadLlmModel() again. */
export async function unloadLlmModel(): Promise<void> {
  if (!inTauri()) return;
  try {
    await invoke<void>('llm_unload_model');
  } finally {
    _loaded = false;
  }
}

/** One prompt → raw model text. Greedy/deterministic. Throws on error;
 *  returns the text (may be empty if the model chose silence). */
export async function llmGenerate(
  systemPrompt: string,
  userPrompt: string,
  opts?: { maxTokens?: number },
): Promise<string> {
  return invoke<string>('llm_generate', {
    systemPrompt,
    userPrompt,
    maxTokens: opts?.maxTokens,
  });
}

// UI probes — same contract the import page used with the old stack.
export function isLlmReady(): boolean {
  return _loaded;
}
export function isLlmLoading(): boolean {
  return _loading;
}
export function didLlmFail(): boolean {
  return _failed;
}

// ============================================================================
// ImpressionLLMRunner wiring — the drop-in replacement for
// TransformersJsImpressionRunner. impression-parser-llm.ts (prompts, JSON
// parsing, grounding guards, NER-validator contract) is untouched.
// ============================================================================

class TauriLlmRunner implements ImpressionLLMRunner {
  isReady(): boolean {
    return _loaded;
  }

  async run(
    systemPrompt: string,
    userPrompt: string,
    opts?: { maxTokens?: number },
  ): Promise<string | null> {
    /*
     * ⚠️ THE DEADLOCK, AGAIN — one layer further down.
     *
     * impression-parser-llm.ts already carries a comment about this exact bug:
     * gating on isReady() before calling run() meant the load was never KICKED
     * OFF, because run() was never called, so isReady() stayed false forever.
     * The fix was to ALWAYS call run() and let the runner decide whether to
     * "invoke the model, QUEUE A LOAD, or no-op".
     *
     * This runner only ever implemented two of those three. It returned null
     * when the model wasn't resident and never queued anything — so the caller
     * dutifully called run(), run() dutifully declined, and nothing ever
     * loaded. Every upload then failed with "the reviewer model isn't ready",
     * which was true and permanent and gave no way out.
     *
     * The page's own load path can miss for several ordinary reasons — the user
     * navigated straight to the uploader, the model was unloaded to free RAM, a
     * reload cleared module state while Rust kept running. None of those should
     * be terminal. So: if the model isn't resident, LOAD IT, then proceed.
     */
    if (!_loaded) {
      if (!inTauri()) {
        console.log('🧠 TauriLlmRunner: not in the desktop app — returning null');
        return null;
      }
      try {
        console.log('🧠 TauriLlmRunner: model not resident — loading it now');
        await loadLlmModel();          // deduped; safe to call concurrently
      } catch (e) {
        console.warn('🧠 TauriLlmRunner: on-demand load failed:', e);
        return null;
      }
      if (!_loaded) {
        console.warn('🧠 TauriLlmRunner: load reported success but model still not resident');
        return null;
      }
    }
    try {
      const t0 = Date.now();
      const text = await llmGenerate(systemPrompt, userPrompt, opts);
      console.log(`🧠 MedGemma generated ${text.length} chars in ${Date.now() - t0}ms`);
      return text || null;
    } catch (e) {
      console.warn('🧠 MedGemma generate failed:', e);
      return null;
    }
  }
}

/** Register the native runner. Idempotent, cheap — call at import-page mount.
 *  Does NOT download or load anything by itself. */
let _runnerRegistered = false;
export function initTauriLlmRunner(): void {
  if (_runnerRegistered) return;
  _runnerRegistered = true;
  setImpressionLLMRunner(new TauriLlmRunner());
  console.log('🧠 native MedGemma runner registered');
}
