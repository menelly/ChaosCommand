/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * 🔌 MCP HOLES — an OPTIONAL door for the user's own AI (Claude Code, Claude
 * Desktop, anything that speaks MCP) to read and add to their Chaos Command logs.
 *
 * Ren, 2026-10-10: "Can we add entirely optional MCP holes for you?" — then picked
 * "read + write directly" on purpose. So:
 *
 *   • OFF BY DEFAULT. Nothing listens until the user flips it on in Settings.
 *   • 127.0.0.1 ONLY. Never the LAN, never the internet. (The sync server binds
 *     0.0.0.0 because phones need it; this one has no reason to.)
 *   • BEARER TOKEN on every request, compared in constant time. The user copies it
 *     out of Settings into their AI's config. Regenerate = old token dies instantly.
 *   • ORIGIN CHECK: browsers send Origin; a web page trying to reach us gets 403.
 *     (DNS-rebinding defence, which the MCP spec asks for.)
 *   • ONLY WHILE UNLOCKED. Rust can't read the database (Dexie lives in the
 *     webview, encrypted at rest). Every tool call is handed to the frontend as a
 *     Tauri event and we WAIT for its answer. App closed or PIN-locked → nobody
 *     answers → the AI gets a plain "unlock Chaos Command" error. That's a feature.
 *
 * Transport: MCP "Streamable HTTP", the simple stateless flavour — POST JSON-RPC to
 * /mcp, get application/json back. Notifications get 202. No sessions, no SSE.
 * Claude Code:  claude mcp add --transport http chaos-command http://127.0.0.1:<port>/mcp
 *                 --header "Authorization: Bearer <token>"
 */

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use subtle::ConstantTimeEq;
use tauri::{AppHandle, Emitter};

const DEFAULT_PORT: u16 = 47320;
const MAX_BODY_BYTES: usize = 1024 * 1024; // 1 MiB is plenty for a JSON-RPC call
const FRONTEND_TIMEOUT: Duration = Duration::from_secs(20);
const CONFIG_FILE: &str = "mcp_access.json";

// =============================================================================
// 📦 PERSISTED CONFIG — so "on" survives a restart and the token stays the same
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct McpConfig {
    enabled: bool,
    token: String,
    port: u16,
}

fn new_token() -> String {
    // 32 random bytes as hex — long, boring, and safe to paste anywhere.
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("getrandom failed");
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

// =============================================================================
// 🧠 SHARED STATE
// =============================================================================

pub struct McpState {
    config_path: PathBuf,
    config: Mutex<McpConfig>,
    /// Set while a listener thread is alive. Flip the current `stop` flag to make it let go of the port.
    running: AtomicBool,
    stop: Mutex<Arc<AtomicBool>>,
    bound_port: Mutex<Option<u16>>,
    app_handle: Mutex<Option<AppHandle>>,
    next_id: AtomicU64,
    /// Tool calls waiting for the frontend's answer, keyed by request id.
    pending: Mutex<HashMap<u64, mpsc::Sender<Result<Value, String>>>>,
}

impl McpState {
    pub fn load(app_data_dir: &PathBuf) -> Arc<Self> {
        let config_path = app_data_dir.join(CONFIG_FILE);
        let config = std::fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str::<McpConfig>(&s).ok())
            .unwrap_or(McpConfig { enabled: false, token: new_token(), port: DEFAULT_PORT });
        Arc::new(Self {
            config_path,
            config: Mutex::new(config),
            running: AtomicBool::new(false),
            stop: Mutex::new(Arc::new(AtomicBool::new(false))),
            bound_port: Mutex::new(None),
            app_handle: Mutex::new(None),
            next_id: AtomicU64::new(1),
            pending: Mutex::new(HashMap::new()),
        })
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.lock().expect("mcp app_handle lock") = Some(handle);
    }

    fn save(&self) -> Result<(), String> {
        let cfg = self.config.lock().map_err(|e| e.to_string())?.clone();
        if let Some(dir) = self.config_path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let text = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
        std::fs::write(&self.config_path, text).map_err(|e| format!("save mcp config: {}", e))?;
        // The token is a password: on unix, readable by this user only.
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&self.config_path, std::fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }

    fn token(&self) -> String {
        self.config.lock().map(|c| c.token.clone()).unwrap_or_default()
    }
}

// =============================================================================
// 🚪 START / STOP THE LISTENER
// =============================================================================

/// Called at app start (only does anything if the user left it on) and from the toggle.
pub fn start_if_enabled(state: &Arc<McpState>) -> Result<(), String> {
    let enabled = state.config.lock().map_err(|e| e.to_string())?.enabled;
    if enabled && !state.running.load(Ordering::SeqCst) {
        start(state)?;
    }
    Ok(())
}

fn start(state: &Arc<McpState>) -> Result<(), String> {
    // Desktop only, enforced here too: the Settings card can flash on a phone's first render.
    if cfg!(mobile) {
        return Err("AI Access is only available in the desktop app.".into());
    }
    let preferred = state.config.lock().map_err(|e| e.to_string())?.port;
    // Retry the same port briefly: a just-switched-off listener needs ~150 ms to let go,
    // and a port that changes under the user would break their saved AI config.
    let mut first_try = TcpListener::bind(("127.0.0.1", preferred));
    for _ in 0..6 {
        if first_try.is_ok() { break; }
        std::thread::sleep(Duration::from_millis(100));
        first_try = TcpListener::bind(("127.0.0.1", preferred));
    }
    let listener = first_try
        .or_else(|_| TcpListener::bind(("127.0.0.1", 0)))
        .map_err(|e| format!("Couldn't open the AI access port: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    // Non-blocking so the loop can notice `stop` and actually release the port.
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;

    {
        let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
        cfg.port = port;
    }
    state.save()?;
    *state.bound_port.lock().map_err(|e| e.to_string())? = Some(port);

    // A fresh stop flag for this listener generation; the old one (if any) is already tripped.
    let stop = Arc::new(AtomicBool::new(false));
    *state.stop.lock().map_err(|e| e.to_string())? = Arc::clone(&stop);
    let state_for_thread = Arc::clone(state);
    let stop_for_thread = stop;
    state.running.store(true, Ordering::SeqCst);

    std::thread::Builder::new()
        .name("chaos-mcp-accept".into())
        .spawn(move || accept_loop(listener, state_for_thread, stop_for_thread))
        .map_err(|e| format!("spawn mcp thread: {}", e))?;
    Ok(())
}

fn stop_listener(state: &Arc<McpState>) {
    if let Ok(flag) = state.stop.lock() {
        flag.store(true, Ordering::SeqCst);
    }
    state.running.store(false, Ordering::SeqCst);
    if let Ok(mut p) = state.bound_port.lock() { *p = None; }
    // Anyone still waiting on the frontend gets told the door closed.
    if let Ok(mut pending) = state.pending.lock() {
        for (_, tx) in pending.drain() {
            let _ = tx.send(Err("AI Access was switched off. If an entry was being added it may or may not have saved; read the day before retrying.".into()));
        }
    }
}

fn accept_loop(listener: TcpListener, state: Arc<McpState>, stop: Arc<AtomicBool>) {
    loop {
        if stop.load(Ordering::SeqCst) {
            break; // dropping `listener` here frees the port
        }
        match listener.accept() {
            Ok((stream, _)) => {
                let state = Arc::clone(&state);
                std::thread::Builder::new()
                    .name("chaos-mcp-conn".into())
                    .spawn(move || {
                        if let Err(e) = handle_connection(stream, &state) {
                            eprintln!("[chaos-mcp] connection error: {}", e);
                        }
                    })
                    .ok();
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(150));
            }
            Err(e) => {
                eprintln!("[chaos-mcp] accept error: {}", e);
                std::thread::sleep(Duration::from_millis(250));
            }
        }
    }
}

// =============================================================================
// 🌐 HTTP — just enough of it
// =============================================================================

fn handle_connection(mut stream: TcpStream, state: &Arc<McpState>) -> Result<(), String> {
    stream.set_nonblocking(false).map_err(|e| e.to_string())?;
    stream.set_read_timeout(Some(Duration::from_secs(30))).map_err(|e| e.to_string())?;
    stream.set_write_timeout(Some(Duration::from_secs(30))).map_err(|e| e.to_string())?;

    let (method, path, headers, body) = read_request(&mut stream)?;
    let header = |name: &str| headers.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str());

    // 🛡️ DNS-rebinding defence. A web page that tricks DNS into pointing at 127.0.0.1
    // still sends ITS OWN name in Host/Origin, so both must name this machine, exactly.
    // (A prefix match let `localhost.evil.com` through; a sister arm caught it.)
    if !header("host").map(is_local_hostport).unwrap_or(false) {
        return write_response(&mut stream, 403, Some(&json!({"error": "host not allowed"})));
    }
    if let Some(origin) = header("origin") {
        let host = origin
            .strip_prefix("http://")
            .or_else(|| origin.strip_prefix("https://"))
            .unwrap_or("");
        if !is_local_hostport(host) {
            return write_response(&mut stream, 403, Some(&json!({"error": "origin not allowed"})));
        }
    }

    let route = path.split('?').next().unwrap_or("");
    if route != "/mcp" {
        return write_response(&mut stream, 404, Some(&json!({"error": "not found — the endpoint is /mcp"})));
    }
    if method != "POST" {
        // No server-initiated stream in this simple server; the spec says 405 is right.
        return write_response(&mut stream, 405, None);
    }

    // 🔑 Bearer token, constant-time compare.
    let presented = header("authorization")
        .and_then(|v| v.strip_prefix("Bearer ").or_else(|| v.strip_prefix("bearer ")))
        .unwrap_or("")
        .trim()
        .to_string();
    let expected = state.token();
    let good = !expected.is_empty()
        && presented.len() == expected.len()
        && bool::from(presented.as_bytes().ct_eq(expected.as_bytes()));
    if !good {
        return write_response(&mut stream, 401, Some(&json!({"error": "missing or wrong token — copy it from Chaos Command → Settings → AI Access"})));
    }

    let parsed: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(e) => {
            return write_response(&mut stream, 400, Some(&rpc_error(Value::Null, -32700, &format!("parse error: {}", e))));
        }
    };

    // Batches are allowed by older spec versions; answer each.
    if let Value::Array(items) = parsed {
        let replies: Vec<Value> = items.iter().filter_map(|m| handle_rpc(m, state)).collect();
        if replies.is_empty() {
            return write_response(&mut stream, 202, None);
        }
        return write_response(&mut stream, 200, Some(&Value::Array(replies)));
    }
    match handle_rpc(&parsed, state) {
        Some(reply) => write_response(&mut stream, 200, Some(&reply)),
        None => write_response(&mut stream, 202, None), // a notification: nothing to say
    }
}

/// True for exactly "127.0.0.1", "localhost" or "[::1]", with or without ":port".
fn is_local_hostport(value: &str) -> bool {
    let v = value.trim().to_ascii_lowercase();
    let (host, port) = if v.starts_with('[') {
        match v.find(']') {
            Some(end) => (&v[..=end], &v[end + 1..]),
            None => return false,
        }
    } else {
        match v.find(':') {
            Some(c) => (&v[..c], &v[c..]),
            None => (v.as_str(), ""),
        }
    };
    let port_ok = port.is_empty()
        || port.strip_prefix(':').map(|p| p.parse::<u16>().is_ok()).unwrap_or(false);
    port_ok && (host == "127.0.0.1" || host == "localhost" || host == "[::1]")
}

fn read_request(stream: &mut TcpStream) -> Result<(String, String, Vec<(String, String)>, Vec<u8>), String> {
    let mut buf = Vec::with_capacity(4096);
    let mut tmp = [0u8; 8192];
    let header_end = loop {
        let n = stream.read(&mut tmp).map_err(|e| format!("read: {}", e))?;
        if n == 0 { return Err("client closed early".into()); }
        buf.extend_from_slice(&tmp[..n]);
        if let Some(i) = buf.windows(4).position(|w| w == b"\r\n\r\n") { break i + 4; }
        if buf.len() > 64 * 1024 { return Err("headers too large".into()); }
    };
    let text = std::str::from_utf8(&buf[..header_end - 4]).map_err(|e| e.to_string())?;
    let mut lines = text.split("\r\n");
    let mut first = lines.next().ok_or("empty request")?.split_whitespace();
    let method = first.next().ok_or("no method")?.to_uppercase();
    let path = first.next().ok_or("no path")?.to_string();
    let mut headers = Vec::new();
    let mut content_length = 0usize;
    for line in lines {
        if let Some(c) = line.find(':') {
            let k = line[..c].trim().to_lowercase();
            let v = line[c + 1..].trim().to_string();
            if k == "content-length" { content_length = v.parse().unwrap_or(0); }
            headers.push((k, v));
        }
    }
    if content_length > MAX_BODY_BYTES { return Err("body too large".into()); }
    // curl asks first for bodies over 1 KB; without this it stalls a second.
    if headers.iter().any(|(k, v)| k == "expect" && v.eq_ignore_ascii_case("100-continue")) {
        stream.write_all(b"HTTP/1.1 100 Continue\r\n\r\n").map_err(|e| e.to_string())?;
    }
    let mut body = buf[header_end..].to_vec();
    while body.len() < content_length {
        let n = stream.read(&mut tmp).map_err(|e| format!("read body: {}", e))?;
        if n == 0 { return Err("client closed mid-body".into()); }
        body.extend_from_slice(&tmp[..n]);
    }
    body.truncate(content_length);
    Ok((method, path, headers, body))
}

fn write_response(stream: &mut TcpStream, status: u16, body: Option<&Value>) -> Result<(), String> {
    let text = match status {
        200 => "OK", 202 => "Accepted", 400 => "Bad Request", 401 => "Unauthorized",
        403 => "Forbidden", 404 => "Not Found", 405 => "Method Not Allowed", _ => "Error",
    };
    let payload = match body { Some(v) => serde_json::to_vec(v).map_err(|e| e.to_string())?, None => Vec::new() };
    let mut head = format!("HTTP/1.1 {} {}\r\nContent-Length: {}\r\nConnection: close\r\n", status, text, payload.len());
    if body.is_some() { head.push_str("Content-Type: application/json\r\n"); }
    if status == 405 { head.push_str("Allow: POST\r\n"); }
    // Say it's a plain Bearer token, so a client doesn't wander off looking for OAuth.
    if status == 401 { head.push_str("WWW-Authenticate: Bearer realm=\"chaos-command\"\r\n"); }
    head.push_str("\r\n");
    stream.write_all(head.as_bytes()).map_err(|e| e.to_string())?;
    stream.write_all(&payload).map_err(|e| e.to_string())?;
    Ok(())
}

// =============================================================================
// 🗣️ JSON-RPC / MCP
// =============================================================================

fn rpc_error(id: Value, code: i64, message: &str) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}})
}

fn rpc_ok(id: Value, result: Value) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "result": result})
}

/// Returns None for notifications (no id), Some(reply) for requests.
fn handle_rpc(msg: &Value, state: &Arc<McpState>) -> Option<Value> {
    let id = msg.get("id").cloned();
    let method = msg.get("method").and_then(|m| m.as_str()).unwrap_or("");
    let id = match id {
        Some(id) if !id.is_null() && !method.is_empty() => id,
        // Notifications (no id) and a client's RESPONSES to us (id but no method): nothing to say.
        _ => return None,
    };
    let params = msg.get("params").cloned().unwrap_or(Value::Null);

    Some(match method {
        "initialize" => {
            // Only versions we've actually checked; anything else gets our newest.
            let asked = params.get("protocolVersion").and_then(|v| v.as_str()).unwrap_or("");
            let version = if SUPPORTED_VERSIONS.contains(&asked) { asked } else { SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.len() - 1] };
            rpc_ok(id, json!({
                "protocolVersion": version,
                "capabilities": {"tools": {"listChanged": false}},
                "serverInfo": {"name": "chaos-command", "version": env!("CARGO_PKG_VERSION")},
                "instructions": "Chaos Command is the user's personal health tracker. These tools read and add to THEIR medical logs, \
on their own computer, only while the app is open and unlocked. Call chaos_today first so dates are right in the user's timezone. \
Before adding to a tracker, read a recent day of it with chaos_read_entries and copy the shape of an existing entry. \
Every entry you add shows the user a notice in the app and is marked as added by an AI."
            }))
        }
        "ping" => rpc_ok(id, json!({})),
        "tools/list" => rpc_ok(id, json!({"tools": tool_definitions()})),
        "tools/call" => {
            let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string();
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            if !TOOL_NAMES.contains(&name.as_str()) {
                return Some(rpc_error(id, -32602, &format!("unknown tool: {}", name)));
            }
            match ask_frontend(state, &name, args) {
                Ok(result) => rpc_ok(id, json!({
                    "content": [{"type": "text", "text": serde_json::to_string_pretty(&result).unwrap_or_default()}],
                    "structuredContent": result,
                })),
                // A tool that ran and failed is a RESULT with isError, not a protocol error —
                // that way the AI actually sees the message and can tell the user.
                Err(msg) => rpc_ok(id, json!({
                    "content": [{"type": "text", "text": msg}],
                    "isError": true,
                })),
            }
        }
        _ => rpc_error(id, -32601, &format!("method not found: {}", method)),
    })
}

const SUPPORTED_VERSIONS: [&str; 3] = ["2024-11-05", "2025-03-26", "2025-06-18"];

const TOOL_NAMES: [&str; 4] = ["chaos_today", "chaos_list_trackers", "chaos_read_entries", "chaos_add_entry"];

fn tool_definitions() -> Value {
    json!([
        {
            "name": "chaos_today",
            "description": "Today's date and the current time in the user's own timezone, as Chaos Command stores them. Call this before reading or adding by date.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false}
        },
        {
            "name": "chaos_list_trackers",
            "description": "Every tracker the user has data in: category, subcategory, how many days have records, and the first and last date.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false}
        },
        {
            "name": "chaos_read_entries",
            "description": "Read the user's records between two dates (inclusive, YYYY-MM-DD), optionally for one category/subcategory (e.g. category 'tracker', subcategory 'bathroom'). Returns at most 400 day-records; narrow the range if truncated.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "category": {"type": "string", "description": "Optional, e.g. 'tracker'"},
                    "subcategory": {"type": "string", "description": "Optional, e.g. 'bathroom', 'pain', 'brain-fog'"}
                },
                "required": ["start_date", "end_date"],
                "additionalProperties": false
            }
        },
        {
            "name": "chaos_add_entry",
            "description": "Add ONE entry to a tracker's list for a day. Read a recent day of that tracker first and mirror an existing entry's fields. The app gives it an id, timestamps it, marks it as added by an AI, and shows the user a notice.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "YYYY-MM-DD, the day the entry belongs to"},
                    "subcategory": {"type": "string", "description": "The tracker, e.g. 'bathroom'"},
                    "category": {"type": "string", "description": "Defaults to 'tracker'"},
                    "entry": {"type": "object", "description": "The entry's fields, shaped like the tracker's existing entries"}
                },
                "required": ["date", "subcategory", "entry"],
                "additionalProperties": false
            }
        }
    ])
}

/// Hand a tool call to the webview and wait for its answer.
fn ask_frontend(state: &Arc<McpState>, tool: &str, args: Value) -> Result<Value, String> {
    let handle = state
        .app_handle
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Chaos Command isn't ready yet.")?;
    let id = state.next_id.fetch_add(1, Ordering::SeqCst);
    let (tx, rx) = mpsc::channel();
    state.pending.lock().map_err(|e| e.to_string())?.insert(id, tx);

    if let Err(e) = handle.emit("chaos:mcp-request", json!({"id": id, "tool": tool, "args": args})) {
        state.pending.lock().map_err(|e| e.to_string())?.remove(&id);
        return Err(format!("Couldn't reach the app window: {}", e));
    }
    match rx.recv_timeout(FRONTEND_TIMEOUT) {
        Ok(answer) => answer,
        Err(_) => {
            state.pending.lock().map_err(|e| e.to_string())?.remove(&id);
            Err("Chaos Command didn't answer in time. It may be locked or busy. If this was chaos_add_entry it MAY still have saved: read that day with chaos_read_entries before trying again, so nothing gets added twice.".into())
        }
    }
}

// =============================================================================
// 🎛️ TAURI COMMANDS (Settings → AI Access, and the frontend's answers)
// =============================================================================

#[derive(Serialize)]
pub struct McpStatus {
    enabled: bool,
    running: bool,
    port: Option<u16>,
    token: String,
    url: Option<String>,
}

fn status_of(state: &Arc<McpState>) -> McpStatus {
    let cfg = state.config.lock().map(|c| c.clone()).unwrap_or(McpConfig { enabled: false, token: String::new(), port: DEFAULT_PORT });
    let port = state.bound_port.lock().ok().and_then(|p| *p);
    McpStatus {
        enabled: cfg.enabled,
        running: state.running.load(Ordering::SeqCst),
        port,
        token: cfg.token,
        url: port.map(|p| format!("http://127.0.0.1:{}/mcp", p)),
    }
}

#[tauri::command]
pub fn mcp_get_status(state: tauri::State<Arc<McpState>>) -> McpStatus {
    status_of(&state)
}

/// Async so the up-to-600 ms wait for the port happens off the UI thread.
#[tauri::command]
pub async fn mcp_set_enabled(enabled: bool, state: tauri::State<'_, Arc<McpState>>) -> Result<McpStatus, String> {
    {
        let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
        cfg.enabled = enabled;
    }
    state.save()?;
    if enabled {
        start_if_enabled(&state)?;
    } else {
        stop_listener(&state);
    }
    Ok(status_of(&state))
}

#[tauri::command]
pub fn mcp_regenerate_token(state: tauri::State<Arc<McpState>>) -> Result<McpStatus, String> {
    {
        let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
        cfg.token = new_token();
    }
    state.save()?;
    Ok(status_of(&state))
}

/// The webview's answer to a `chaos:mcp-request` event.
#[tauri::command]
pub fn mcp_respond(id: u64, ok: bool, result: Value, state: tauri::State<Arc<McpState>>) -> Result<(), String> {
    let tx = state.pending.lock().map_err(|e| e.to_string())?.remove(&id);
    if let Some(tx) = tx {
        let answer = if ok {
            Ok(result)
        } else {
            Err(result.as_str().map(|s| s.to_string()).unwrap_or_else(|| result.to_string()))
        };
        let _ = tx.send(answer);
    }
    Ok(())
}

// =============================================================================
// 🧪 TESTS — the real listener on a real port, poked the way an AI client would
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn fresh_state(tag: &str) -> Arc<McpState> {
        let dir = std::env::temp_dir().join(format!("chaos-mcp-test-{}-{}", tag, std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let state = McpState::load(&dir);
        {
            let mut cfg = state.config.lock().unwrap();
            cfg.port = 0; // any free port, so tests never collide with a real install
        }
        state
    }

    fn post(port: u16, body: &str, headers: &[(&str, &str)]) -> (u16, String) {
        let mut s = TcpStream::connect(("127.0.0.1", port)).unwrap();
        let mut req = format!("POST /mcp HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: {}\r\n", body.len());
        for (k, v) in headers { req.push_str(&format!("{}: {}\r\n", k, v)); }
        req.push_str("\r\n");
        req.push_str(body);
        s.write_all(req.as_bytes()).unwrap();
        let mut out = String::new();
        s.read_to_string(&mut out).unwrap();
        let status: u16 = out.split_whitespace().nth(1).unwrap().parse().unwrap();
        let body = out.split("\r\n\r\n").nth(1).unwrap_or("").to_string();
        (status, body)
    }

    #[test]
    fn rpc_basics() {
        let st = fresh_state("rpc");
        let init = handle_rpc(&json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26"}}), &st).unwrap();
        assert_eq!(init["result"]["protocolVersion"], "2025-03-26");
        assert_eq!(init["result"]["serverInfo"]["name"], "chaos-command");
        assert!(handle_rpc(&json!({"jsonrpc":"2.0","method":"notifications/initialized"}), &st).is_none());
        let list = handle_rpc(&json!({"jsonrpc":"2.0","id":2,"method":"tools/list"}), &st).unwrap();
        assert_eq!(list["result"]["tools"].as_array().unwrap().len(), 4);
        let bad = handle_rpc(&json!({"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"rm_rf"}}), &st).unwrap();
        assert_eq!(bad["error"]["code"], -32602);
        // No webview attached: a real tool call must come back as a readable tool ERROR, not a hang.
        let call = handle_rpc(&json!({"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"chaos_today","arguments":{}}}), &st).unwrap();
        assert_eq!(call["result"]["isError"], true);
    }

    #[test]
    fn http_door() {
        let st = fresh_state("http");
        { st.config.lock().unwrap().enabled = true; }
        start_if_enabled(&st).unwrap();
        let port = st.bound_port.lock().unwrap().unwrap();
        let token = st.token();
        let auth = format!("Bearer {}", token);
        let init = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}"#;

        assert_eq!(post(port, init, &[]).0, 401, "no token must be refused");
        assert_eq!(post(port, init, &[("Authorization", "Bearer wrong")]).0, 401, "wrong token must be refused");
        assert_eq!(post(port, init, &[("Authorization", &auth), ("Origin", "https://evil.example")]).0, 403, "web pages must be refused");
        let (code, body) = post(port, init, &[("Authorization", &auth)]);
        assert_eq!(code, 200, "right token gets in: {}", body);
        assert!(body.contains("chaos-command"));
        let (code, _) = post(port, r#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#, &[("Authorization", &auth)]);
        assert_eq!(code, 202);

        // Switch it off: the port must actually be let go.
        { st.config.lock().unwrap().enabled = false; }
        stop_listener(&st);
        std::thread::sleep(Duration::from_millis(500));
        assert!(TcpStream::connect(("127.0.0.1", port)).is_err(), "port still open after switching off");
    }
}
