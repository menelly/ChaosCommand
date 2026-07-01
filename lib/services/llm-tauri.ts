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
export async function downloadLlmModel(
  onProgress?: (p: LlmDownloadProgress) => void,
): Promise<void> {
  if (!inTauri()) throw new Error('model download requires the desktop app');
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = onProgress
    ? await listen<LlmDownloadProgress>('llm-download-progress', (e) => onProgress(e.payload))
    : null;
  try {
    await invoke<void>('llm_download_model');
  } finally {
    unlisten?.();
  }
}

/** Load the downloaded GGUF into RAM. Idempotent; ~3GB resident once loaded. */
export async function loadLlmModel(): Promise<void> {
  if (!inTauri()) throw new Error('model load requires the desktop app');
  if (_loaded) return;
  _loading = true;
  _failed = false;
  try {
    await invoke<void>('llm_load_model');
    _loaded = true;
  } catch (e) {
    _failed = true;
    throw e;
  } finally {
    _loading = false;
  }
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
    if (!_loaded) {
      // Model not resident — callers fall back / fail safe, same as before.
      console.log('🧠 TauriLlmRunner: model not loaded — returning null');
      return null;
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
