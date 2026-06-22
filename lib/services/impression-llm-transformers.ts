/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * impression-llm-transformers.ts — real ImpressionLLMRunner backed by
 * transformers.js + Qwen3.5-0.8B-ONNX (the q4 quant).
 *
 * Architecture: lazy load on first call. The first impression upload finds
 * the runner not-yet-ready (returns null → regex fallback), AND kicks off the
 * model download/load in the background. The next impression upload uses the
 * loaded LLM. This avoids burning 500MB of bandwidth on users who never
 * import a medical doc, while still being demonstrable end-to-end without
 * any UI changes tonight.
 *
 * Model: onnx-community/Qwen3.5-0.8B-ONNX, dtype 'q4'. WebGPU when present,
 * WASM fallback. Cached in the browser's HF transformers cache after first
 * download (subsequent app launches are instant).
 *
 * WHY THIS FILE IS SEPARATE
 * impression-parser-llm.ts owns the prompt + parsing + abstract runner
 * interface — it's testable without any model present. This file is the
 * actual transformers.js wire-in. The init() function below is what
 * activates the LLM path in the app.
 */

import {
  type ImpressionLLMRunner,
  setImpressionLLMRunner,
} from './impression-parser-llm';

// Type for the singleton pipeline. Loose because transformers.js types vary
// across versions and the web bundle doesn't always ship full TS definitions.
type TextGenerationPipeline = any;

// Qwen2.5-0.5B (smaller, well-loved baseline) instead of 3.5-0.8B. ONNX q4
// of the 0.8B returned empty `[]` for two real impressions even with
// /no_think — different quant scheme from the llama.cpp Q4_K_M that DID
// work in python. Trying the smaller model at the same quant level on the
// theory that 0.5B has less to lose to ONNX-q4's simpler weight quant.
// Python spike data: 2.5-0.5B surfaced all 6 PE items (lymphoma bundled
// inside item #4 rather than split out, which is acceptable). If this ALSO
// produces empty, escalate to q4f16 of the 0.8B for the synthesis-split win.
const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';
const DTYPE: 'q4' | 'q4f16' | 'q8' | 'fp16' = 'q4';

let _pipeline: TextGenerationPipeline | null = null;
let _loadingPromise: Promise<TextGenerationPipeline> | null = null;
let _loadFailed = false;

/** Has any user-facing code asked us to load the model yet? Used to decide
 *  whether the first impression upload should KICK OFF the load (background)
 *  or just sit there. */
let _initRequested = false;

async function detectDevice(): Promise<'webgpu' | 'wasm'> {
  if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        console.log('🧠 WebGPU available — using GPU acceleration');
        return 'webgpu';
      }
    } catch {
      /* fall through to wasm */
    }
  }
  console.log('🧠 no WebGPU — using WASM (CPU); LLM will be slower');
  return 'wasm';
}

async function loadPipeline(): Promise<TextGenerationPipeline> {
  const { pipeline, env } = (await import('./transformers-shim.mjs')) as any;
  // Same env config the existing medical NER uses — HF CDN, no local-model
  // attempts (Tauri returns HTML 404s for missing local models which breaks
  // JSON parsing in transformers.js).
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  env.backends.onnx.wasm.proxy = false;

  const device = await detectDevice();
  console.log(`🧠 loading ${MODEL_ID} (dtype=${DTYPE}, device=${device})...`);
  const t0 = Date.now();
  const pipe = await pipeline('text-generation', MODEL_ID, {
    dtype: DTYPE,
    device,
    progress_callback: (p: any) => {
      if (p.status === 'progress' && p.progress !== undefined) {
        const pct = Math.round(p.progress);
        if (pct % 10 === 0) console.log(`📦 ${p.file ?? 'shard'}: ${pct}%`);
      } else if (p.status === 'done') {
        console.log(`📦 ✓ ${p.file ?? 'file'} loaded`);
      } else if (p.status === 'ready') {
        console.log(`📦 ✓ model ready`);
      }
    },
  });
  console.log(`🧠 ${MODEL_ID} ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return pipe;
}

class TransformersJsImpressionRunner implements ImpressionLLMRunner {
  /** Ready when the pipeline has loaded. Used by the abstract runner to
   *  decide whether to call run() or fall through to regex. */
  isReady(): boolean {
    return _pipeline !== null;
  }

  async run(
    systemPrompt: string,
    userPrompt: string,
    opts?: { maxTokens?: number },
  ): Promise<string | null> {
    // Lazy-load on first ever run() call, but ONLY if init() has been
    // requested. Without init(), this runner stays idle and the regex path
    // wins — that's the user-not-opted-in behavior.
    if (!_initRequested) {
      console.log('🧠 runner skipped: _initRequested=false (Enable-AI not called this session — HMR may have reset module state; refresh the page)');
      return null;
    }
    if (_loadFailed) {
      console.log('🧠 runner skipped: _loadFailed=true (a previous load errored — see earlier console)');
      return null;
    }

    if (!_pipeline) {
      if (!_loadingPromise) {
        // Kick off the load in the background. Return null this call so the
        // user sees regex results immediately; the NEXT impression upload
        // will hit the loaded model.
        _loadingPromise = loadPipeline()
          .then((pipe) => {
            _pipeline = pipe;
            return pipe;
          })
          .catch((e) => {
            console.warn('🧠 model load failed, LLM path disabled:', e);
            _loadFailed = true;
            _loadingPromise = null;
            throw e;
          });
        console.log('🧠 model load started in background — this impression will use regex; next one will use LLM');
      } else {
        console.log('🧠 model still loading — falling back to regex for this upload');
      }
      return null;
    }

    // Pipeline is loaded — run the prompt.
    const t0 = Date.now();
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      // NOTE: removed return_full_text:false — for chat output it was stripping
      // everything to a 2-char delimiter. Letting it return the full conversation
      // and extracting the last assistant message ourselves is more robust.
      const out = await _pipeline(messages, {
        // Raised from 900 → 2048: Qwen3.5 emits a <think>...</think> reasoning
        // preamble that ate the whole budget before the JSON answer started,
        // leaving us with `[]`. 2048 gives reasoning room AND a real answer.
        max_new_tokens: opts?.maxTokens ?? 2048,
        do_sample: false,
      });
      const elapsed = Date.now() - t0;
      // DEBUG: log the raw shape so we can see what transformers.js returned
      // for this model. Remove once the parser stabilizes.
      console.log('🧠 raw pipeline output:', out);
      const first = Array.isArray(out) ? out[0] : out;
      const gt = first?.generated_text;
      let text: string | null = null;
      // Chat-format: [{role:'assistant', content:'...'}] — take last assistant.
      if (Array.isArray(gt)) {
        const lastAssistant = [...gt].reverse().find((m: any) => m?.role === 'assistant');
        text = typeof lastAssistant?.content === 'string' ? lastAssistant.content : null;
        // Fallback: take whatever's last if no role is set.
        if (!text) {
          const last = gt[gt.length - 1];
          text = typeof last?.content === 'string' ? last.content
               : typeof last === 'string' ? last
               : null;
        }
      } else if (typeof gt === 'string') {
        // Plain-string format: strip the prompt prefix if it leaked through.
        text = gt;
      }
      // Log RAW text (pre-think-strip) so we can see if reasoning ate the
      // budget vs the model just emitting `[]` directly.
      if (text) {
        const hasThink = /<think>/.test(text);
        console.log(`🧠 raw text before think-strip (${text.length} chars, hasThink=${hasThink}):`, text.slice(0, 500), text.length > 500 ? `... +${text.length - 500} more` : '');
      }
      // Strip Qwen3.5's <think>...</think> preamble if present.
      if (text) {
        const m = text.match(/<\/think>\s*([\s\S]+)$/);
        if (m) text = m[1];
      }
      console.log(`🧠 LLM generation done in ${elapsed}ms (${text?.length ?? 0} chars)`);
      if (text && text.length < 200) console.log('🧠 short LLM output (full):', text);
      return text;
    } catch (e) {
      console.warn('🧠 LLM generate threw:', e);
      return null;
    }
  }
}

/** Activate the LLM-powered impression parser. Idempotent. Call this once
 *  at app startup (or from a user "Enable AI extraction" button). Until
 *  this is called, the runner stays idle and the regex parser handles
 *  everything — which protects users who never want a 500MB download.
 *
 *  The actual model download starts on the FIRST impression upload after
 *  init() — not at init() itself — so calling this on app start doesn't
 *  immediately burn 500MB. For eager-load (downloads NOW so the first
 *  upload uses the LLM not the regex fallback), call loadImpressionLLM(). */
export function initImpressionLLM(): void {
  if (_initRequested) {
    console.log('🧠 initImpressionLLM: already initialized — no-op');
    return;
  }
  _initRequested = true;
  setImpressionLLMRunner(new TransformersJsImpressionRunner());
  console.log('🧠 impression LLM runner registered (Qwen3.5-0.8B-ONNX q4) — will load on first use');
}

/** Eager-load: register the runner AND start downloading the model
 *  immediately. Returns a promise that resolves when the model is ready (or
 *  rejects on load failure). Idempotent — repeat calls await the same
 *  in-flight load. Use this for an "Initialize Qwen" button so the user
 *  knows EXACTLY when the model is ready, and the first impression upload
 *  uses the LLM instead of waiting through a regex-fallback first. */
export function loadImpressionLLM(): Promise<void> {
  initImpressionLLM(); // registers the runner if not yet
  if (_pipeline) return Promise.resolve(); // already loaded
  if (!_loadingPromise) {
    console.log('🧠 loadImpressionLLM: kicking off model download now (eager-load)');
    _loadingPromise = loadPipeline()
      .then((pipe) => {
        _pipeline = pipe;
        return pipe;
      })
      .catch((e) => {
        console.warn('🧠 model load failed, LLM path disabled:', e);
        _loadFailed = true;
        _loadingPromise = null;
        throw e;
      });
  }
  return _loadingPromise.then(() => undefined);
}

/** Cheap probe for UI: has the model loaded yet? */
export function isImpressionLLMReady(): boolean {
  return _pipeline !== null;
}

/** UI probe: is the model currently downloading/loading? Returns true between
 *  loadImpressionLLM() being called and _pipeline being populated. */
export function isImpressionLLMLoading(): boolean {
  return _loadingPromise !== null && _pipeline === null && !_loadFailed;
}

/** UI probe: did the last load attempt fail? Surface this so the button
 *  doesn't stay forever in "Loading..." after a real error. */
export function didImpressionLLMFail(): boolean {
  return _loadFailed;
}
