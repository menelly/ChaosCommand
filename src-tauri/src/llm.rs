/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * llm.rs — native MedGemma inference for the desktop document-import pipeline.
 *
 * Replaces the transformers.js webview stack (d4data NER + Qwen2.5-0.5B ONNX)
 * with llama.cpp running MedGemma-4B Q3_K_M in-process. The frontend keeps its
 * ImpressionLLMRunner abstraction; this is just a better engine behind it.
 *
 * Model provenance is pinned: the exact GGUF Ren validated against real
 * records (unsloth/medgemma-4b-it-GGUF, Q3_K_M), verified by SHA256 after
 * download so every install runs bit-for-bit the validated weights.
 *
 * Desktop-only. Mobile builds get stub commands that return a clear error —
 * the document upload path is desktop-only anyway.
 */

#[cfg(desktop)]
mod real {
  use futures_util::StreamExt;
  use serde::Serialize;
  use sha2::{Digest, Sha256};
  use std::num::NonZeroU32;
  use std::path::PathBuf;
  use std::sync::atomic::{AtomicBool, Ordering};
  use std::sync::{Arc, Mutex, OnceLock};
  use tauri::{AppHandle, Emitter, Manager};

  use llama_cpp_2::context::params::LlamaContextParams;
  use llama_cpp_2::llama_backend::LlamaBackend;
  use llama_cpp_2::llama_batch::LlamaBatch;
  use llama_cpp_2::model::params::LlamaModelParams;
  use llama_cpp_2::model::{AddBos, LlamaModel};
  use llama_cpp_2::sampling::LlamaSampler;

  pub const MODEL_FILE: &str = "medgemma-4b-it-Q3_K_M.gguf";
  pub const MODEL_URL: &str =
    "https://huggingface.co/unsloth/medgemma-4b-it-GGUF/resolve/main/medgemma-4b-it-Q3_K_M.gguf";
  /// SHA256 of the exact quant validated against real records (2026-06/07).
  pub const MODEL_SHA256: &str =
    "a5f8df47f79592519087781074ed6d4b454910a8c22d1972105bdf4f2fa95259";
  pub const MODEL_SIZE: u64 = 2_098_460_480;

  /// Hard ceiling on the context we'll allocate. MedGemma trains to 128k but
  /// the KV cache for that would eat laptops alive; 16k covers a long report
  /// section plus a full JSON answer on ~1.5GB of RAM headroom.
  const MAX_N_CTX: u32 = 16_384;
  const DEFAULT_MAX_TOKENS: u32 = 2_048;

  /// llama.cpp global init — once per process, never torn down.
  static BACKEND: OnceLock<LlamaBackend> = OnceLock::new();

  fn backend() -> Result<&'static LlamaBackend, String> {
    if let Some(b) = BACKEND.get() {
      return Ok(b);
    }
    let b = LlamaBackend::init().map_err(|e| format!("llama backend init: {e}"))?;
    let _ = BACKEND.set(b);
    Ok(BACKEND.get().expect("backend just set"))
  }

  #[derive(Default)]
  pub struct LlmState {
    model: Mutex<Option<Arc<LlamaModel>>>,
    /// Serializes generation — one context at a time bounds peak RAM.
    gen_lock: tokio::sync::Mutex<()>,
    downloading: AtomicBool,
    loading: AtomicBool,
  }

  fn model_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
      .path()
      .app_data_dir()
      .map_err(|e| format!("app_data_dir: {e}"))?
      .join("models");
    Ok(dir.join(MODEL_FILE))
  }

  #[derive(Serialize, Clone)]
  pub struct ModelStatus {
    pub downloaded: bool,
    pub loaded: bool,
    /// Bytes of a partial download on disk (0 when none) — lets the UI say
    /// "resuming at 43%".
    pub partial_bytes: u64,
    pub total_bytes: u64,
    pub path: String,
  }

  #[derive(Serialize, Clone)]
  struct DownloadProgress {
    downloaded: u64,
    total: u64,
    pct: u8,
  }

  #[derive(Serialize, Clone)]
  struct LoadStatus {
    status: &'static str, // "loading" | "ready" | "error"
    detail: String,
  }

  #[tauri::command]
  pub async fn llm_model_status(
    app: AppHandle,
    state: tauri::State<'_, LlmState>,
  ) -> Result<ModelStatus, String> {
    let path = model_path(&app)?;
    let part = path.with_extension("gguf.part");
    let downloaded = tokio::fs::metadata(&path)
      .await
      .map(|m| m.len() == MODEL_SIZE)
      .unwrap_or(false);
    let partial_bytes = tokio::fs::metadata(&part).await.map(|m| m.len()).unwrap_or(0);
    Ok(ModelStatus {
      downloaded,
      loaded: state.model.lock().expect("model lock").is_some(),
      partial_bytes,
      total_bytes: MODEL_SIZE,
      path: path.to_string_lossy().into_owned(),
    })
  }

  /// Download the model with resume + SHA256 verification. Emits
  /// "llm-download-progress" events. Safe to call when the file already
  /// exists (no-op) or a partial exists (resumes via HTTP Range).
  #[tauri::command]
  pub async fn llm_download_model(
    app: AppHandle,
    state: tauri::State<'_, LlmState>,
  ) -> Result<(), String> {
    if state.downloading.swap(true, Ordering::SeqCst) {
      return Err("download already in progress".into());
    }
    let result = download_inner(&app).await;
    state.downloading.store(false, Ordering::SeqCst);
    result
  }

  async fn download_inner(app: &AppHandle) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;

    let final_path = model_path(app)?;
    if tokio::fs::metadata(&final_path)
      .await
      .map(|m| m.len() == MODEL_SIZE)
      .unwrap_or(false)
    {
      emit_progress(app, MODEL_SIZE, MODEL_SIZE);
      return Ok(());
    }
    if let Some(dir) = final_path.parent() {
      tokio::fs::create_dir_all(dir)
        .await
        .map_err(|e| format!("create models dir: {e}"))?;
    }

    let part_path = final_path.with_extension("gguf.part");

    // Hash whatever partial data we already have so the final SHA256 covers
    // the WHOLE file even across resumed sessions.
    let mut hasher = Sha256::new();
    let mut existing: u64 = 0;
    if let Ok(meta) = tokio::fs::metadata(&part_path).await {
      existing = meta.len();
      if existing > 0 {
        let part = part_path.clone();
        hasher = tokio::task::spawn_blocking(move || -> Result<Sha256, String> {
          use std::io::Read;
          let mut h = Sha256::new();
          let mut f = std::fs::File::open(&part).map_err(|e| e.to_string())?;
          let mut buf = vec![0u8; 1 << 20];
          loop {
            let n = f.read(&mut buf).map_err(|e| e.to_string())?;
            if n == 0 {
              break;
            }
            h.update(&buf[..n]);
          }
          Ok(h)
        })
        .await
        .map_err(|e| format!("hash task: {e}"))??;
      }
    }

    let client = reqwest::Client::new();
    let mut req = client.get(MODEL_URL);
    if existing > 0 {
      req = req.header(reqwest::header::RANGE, format!("bytes={existing}-"));
    }
    let resp = req.send().await.map_err(|e| format!("model download request: {e}"))?;

    let status = resp.status();
    let resuming = status == reqwest::StatusCode::PARTIAL_CONTENT;
    if !status.is_success() {
      return Err(format!("model download failed: HTTP {status}"));
    }
    if existing > 0 && !resuming {
      // Server ignored the Range header — start over from byte zero.
      existing = 0;
      hasher = Sha256::new();
    }

    let mut file = tokio::fs::OpenOptions::new()
      .create(true)
      .write(true)
      .append(resuming)
      .truncate(!resuming)
      .open(&part_path)
      .await
      .map_err(|e| format!("open part file: {e}"))?;

    let mut downloaded = existing;
    let mut last_emit = std::time::Instant::now();
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
      let chunk = chunk.map_err(|e| format!("download stream: {e}"))?;
      hasher.update(&chunk);
      file
        .write_all(&chunk)
        .await
        .map_err(|e| format!("write model file: {e}"))?;
      downloaded += chunk.len() as u64;
      if last_emit.elapsed().as_millis() >= 250 {
        emit_progress(app, downloaded, MODEL_SIZE);
        last_emit = std::time::Instant::now();
      }
    }
    file.flush().await.map_err(|e| format!("flush model file: {e}"))?;
    drop(file);

    if downloaded != MODEL_SIZE {
      return Err(format!(
        "download incomplete: {downloaded} of {MODEL_SIZE} bytes — will resume on retry"
      ));
    }
    let digest = format!("{:x}", hasher.finalize());
    if digest != MODEL_SHA256 {
      // Corrupt or tampered — never keep it, never load it.
      let _ = tokio::fs::remove_file(&part_path).await;
      return Err(format!(
        "model checksum mismatch (got {digest}) — file discarded, please retry"
      ));
    }
    tokio::fs::rename(&part_path, &final_path)
      .await
      .map_err(|e| format!("finalize model file: {e}"))?;
    emit_progress(app, MODEL_SIZE, MODEL_SIZE);
    Ok(())
  }

  fn emit_progress(app: &AppHandle, downloaded: u64, total: u64) {
    let pct = ((downloaded as f64 / total as f64) * 100.0).floor() as u8;
    let _ = app.emit("llm-download-progress", DownloadProgress { downloaded, total, pct });
  }

  /// Load the GGUF into memory. Emits "llm-load-status". Idempotent.
  #[tauri::command]
  pub async fn llm_load_model(
    app: AppHandle,
    state: tauri::State<'_, LlmState>,
  ) -> Result<(), String> {
    if state.model.lock().expect("model lock").is_some() {
      return Ok(());
    }
    if state.loading.swap(true, Ordering::SeqCst) {
      return Err("model load already in progress".into());
    }
    let _ = app.emit(
      "llm-load-status",
      LoadStatus { status: "loading", detail: String::new() },
    );

    let path = model_path(&app)?;
    let loaded: Result<LlamaModel, String> = tokio::task::spawn_blocking(move || {
      let backend = backend()?;
      // n_gpu_layers stays 0 — CPU-only v1. Vulkan offload is a fast-follow.
      let params = LlamaModelParams::default();
      LlamaModel::load_from_file(backend, &path, &params)
        .map_err(|e| format!("model load: {e}"))
    })
    .await
    .map_err(|e| format!("load task: {e}"))
    .and_then(|r| r);

    state.loading.store(false, Ordering::SeqCst);
    match loaded {
      Ok(model) => {
        *state.model.lock().expect("model lock") = Some(Arc::new(model));
        let _ = app.emit(
          "llm-load-status",
          LoadStatus { status: "ready", detail: String::new() },
        );
        Ok(())
      }
      Err(e) => {
        let _ = app.emit(
          "llm-load-status",
          LoadStatus { status: "error", detail: e.clone() },
        );
        Err(e)
      }
    }
  }

  /// Free the model's RAM (e.g. when the user leaves the import flow).
  #[tauri::command]
  pub async fn llm_unload_model(state: tauri::State<'_, LlmState>) -> Result<(), String> {
    // Wait for any in-flight generation before dropping the weights.
    let _gen = state.gen_lock.lock().await;
    *state.model.lock().expect("model lock") = None;
    Ok(())
  }

  /// Run one prompt through MedGemma. Greedy decoding (deterministic — this
  /// is extraction, not creative writing). Returns the raw model text; all
  /// JSON parsing + grounding guards stay in the frontend where they've
  /// already been battle-tested.
  #[tauri::command]
  pub async fn llm_generate(
    app: AppHandle,
    state: tauri::State<'_, LlmState>,
    system_prompt: String,
    user_prompt: String,
    max_tokens: Option<u32>,
  ) -> Result<String, String> {
    let model = state
      .model
      .lock()
      .expect("model lock")
      .clone()
      .ok_or_else(|| "model not loaded — call llm_load_model first".to_string())?;

    // One generation at a time: each context allocates its own KV cache, and
    // two concurrent 8k contexts on a 4GB-RAM laptop is how apps get OOM-killed.
    let _gen = state.gen_lock.lock().await;

    let max_tokens = max_tokens.unwrap_or(DEFAULT_MAX_TOKENS).min(4096);
    let app_for_task = app.clone();
    tokio::task::spawn_blocking(move || {
      generate_blocking(&app_for_task, &model, &system_prompt, &user_prompt, max_tokens)
    })
    .await
    .map_err(|e| format!("generate task: {e}"))?
  }

  fn generate_blocking(
    app: &AppHandle,
    model: &LlamaModel,
    system_prompt: &str,
    user_prompt: &str,
    max_tokens: u32,
  ) -> Result<String, String> {
    let backend = backend()?;

    // Gemma has no system role — its chat template only knows user/model
    // turns. Fold the system prompt into the user turn, exactly as the
    // validation runs did.
    let folded = if system_prompt.trim().is_empty() {
      user_prompt.to_string()
    } else {
      format!("{system_prompt}\n\n{user_prompt}")
    };
    let tmpl = model
      .chat_template(None)
      .map_err(|e| format!("chat template: {e}"))?;
    let msgs = vec![llama_cpp_2::model::LlamaChatMessage::new(
      "user".to_string(),
      folded,
    )
    .map_err(|e| format!("chat message: {e}"))?];
    let prompt = model
      .apply_chat_template(&tmpl, &msgs, true)
      .map_err(|e| format!("apply chat template: {e}"))?;

    let tokens = model
      .str_to_token(&prompt, AddBos::Always)
      .map_err(|e| format!("tokenize: {e}"))?;
    let n_prompt = tokens.len() as u32;

    let n_ctx = (n_prompt + max_tokens + 64).min(MAX_N_CTX).max(2048);
    if n_prompt + 16 >= n_ctx {
      return Err(format!(
        "input too long: {n_prompt} tokens does not fit the {n_ctx}-token context — split the document"
      ));
    }
    // PHYSICAL cores, not logical. llama.cpp CPU inference is
    // memory-bandwidth-bound, so running one thread per hyperthread makes a
    // 4-core/8-thread laptop fight itself — physical-core count is measurably
    // faster and is the whole difference on the 2018-potato target. Clamp to
    // [1, 16]; past ~16 the bandwidth wall means more threads just add
    // contention. (num_cpus::get_physical falls back sanely on odd platforms.)
    let threads = (num_cpus::get_physical() as i32).clamp(1, 16);

    let ctx_params = LlamaContextParams::default()
      .with_n_ctx(NonZeroU32::new(n_ctx))
      // n_batch must cover the whole prompt so it decodes in one pass.
      .with_n_batch(n_prompt.max(512))
      .with_n_threads(threads)
      .with_n_threads_batch(threads);
    let mut ctx = model
      .new_context(backend, ctx_params)
      .map_err(|e| format!("context: {e}"))?;

    let mut batch = LlamaBatch::new(n_prompt.max(512) as usize, 1);
    let last = tokens.len() - 1;
    for (i, tok) in tokens.into_iter().enumerate() {
      batch
        .add(tok, i as i32, &[0], i == last)
        .map_err(|e| format!("batch add: {e}"))?;
    }
    ctx.decode(&mut batch).map_err(|e| format!("prompt decode: {e}"))?;

    let mut sampler = LlamaSampler::greedy();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut out = String::new();
    let mut n_cur = n_prompt as i32;
    let mut generated: u32 = 0;

    loop {
      let token = sampler.sample(&ctx, batch.n_tokens() - 1);
      sampler.accept(token);
      if model.is_eog_token(token) {
        break;
      }
      match model.token_to_piece(token, &mut decoder, false, None) {
        Ok(piece) => out.push_str(&piece),
        Err(e) => log::warn!("token_to_piece failed on one token: {e}"),
      }
      generated += 1;
      if generated >= max_tokens {
        break;
      }
      if generated % 16 == 0 {
        let _ = app.emit("llm-generate-progress", serde_json::json!({ "tokens": generated }));
      }
      batch.clear();
      batch
        .add(token, n_cur, &[0], true)
        .map_err(|e| format!("batch add (gen): {e}"))?;
      n_cur += 1;
      ctx.decode(&mut batch).map_err(|e| format!("decode: {e}"))?;
    }
    Ok(out)
  }
}

// Glob re-export: #[tauri::command] generates hidden __cmd__* items that
// generate_handler! resolves by path — named re-exports miss them.
#[cfg(desktop)]
pub use real::*;

// ---------------------------------------------------------------------------
// Mobile stubs — the upload/AI path is desktop-only. These exist so the
// invoke_handler registration compiles on every target and a stray mobile
// call gets a clear error instead of a missing-command panic.
// ---------------------------------------------------------------------------
#[cfg(mobile)]
mod stub {
  const DESKTOP_ONLY: &str = "AI document parsing is desktop-only";

  #[tauri::command]
  pub async fn llm_model_status() -> Result<(), String> {
    Err(DESKTOP_ONLY.into())
  }
  #[tauri::command]
  pub async fn llm_download_model() -> Result<(), String> {
    Err(DESKTOP_ONLY.into())
  }
  #[tauri::command]
  pub async fn llm_load_model() -> Result<(), String> {
    Err(DESKTOP_ONLY.into())
  }
  #[tauri::command]
  pub async fn llm_unload_model() -> Result<(), String> {
    Err(DESKTOP_ONLY.into())
  }
  #[tauri::command]
  pub async fn llm_generate() -> Result<String, String> {
    Err(DESKTOP_ONLY.into())
  }
}

#[cfg(mobile)]
pub use stub::*;
