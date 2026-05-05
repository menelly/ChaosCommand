/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Tauri commands for the auto-sync feature. The persistent HTTP server
 * itself lives in server.rs; this module exposes commands the frontend
 * uses to:
 *
 *   - look up its own peer_id / port / IP for QR generation
 *   - open and close pairing windows
 *   - complete pairings as the scanner side
 *   - run an auth'd outgoing sync against a known peer
 *   - publish the latest data snapshot for incoming syncs
 *   - list / remove paired peers
 *
 * All commands are PIN-aware: pairings are scoped to the active PIN, and
 * outgoing sync attempts include the active PIN so the responder can
 * detect cross-PIN mismatches and refuse cleanly.
 */

use crate::peers::{self, Peer, PeerStore};
use crate::server::{
    self, CachedSnapshot, InboxItem, PairQr, PairRequest, PairResponse, ServerState, SyncRequest,
    SyncResponse,
};
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;

// =============================================================================
// LEGACY (kept for compile compatibility with lib.rs's manage() call)
// =============================================================================

/// The old one-shot session struct. Kept so existing lib.rs `.manage(SyncState{...})`
/// and the deprecated sync_start_host / sync_send_data / sync_receive_data / sync_stop
/// commands continue to compile during the rollout. The actual handlers below
/// return a clear "deprecated" error so the frontend knows to migrate.
pub struct SyncState {
    #[allow(dead_code)]
    pub session: Mutex<Option<()>>,
}

#[tauri::command]
pub async fn sync_start_host(_pin: String) -> Result<String, String> {
    Err("sync_start_host is deprecated — use sync_open_pairing_window".into())
}

#[tauri::command]
pub async fn sync_send_data(_qr_json: String, _pin: String, _data: String) -> Result<(), String> {
    Err("sync_send_data is deprecated — use sync_complete_pairing then sync_to_peer".into())
}

#[tauri::command]
pub async fn sync_receive_data(_host_data: Option<String>) -> Result<(), String> {
    Err("sync_receive_data is deprecated — the persistent server now handles incoming sync".into())
}

#[tauri::command]
pub fn sync_stop() -> Result<(), String> {
    // The old "stop the one-shot listener" call. The persistent server is
    // intended to keep running; calling stop is a no-op for forward
    // compatibility.
    Ok(())
}

// =============================================================================
// SHARED HELPERS
// =============================================================================

fn hash_pin(pin: &str) -> String {
    let mut hasher = DefaultHasher::new();
    pin.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn hostname_string() -> String {
    server::hostname_string()
}

fn local_ip() -> Result<String, String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0")
        .map_err(|e| format!("Failed to bind UDP socket: {}", e))?;
    socket
        .connect("8.8.8.8:80")
        .map_err(|e| format!("Failed to determine local IP: {}", e))?;
    let addr = socket
        .local_addr()
        .map_err(|e| format!("Failed to get local address: {}", e))?;
    Ok(addr.ip().to_string())
}

fn hmac_b64(secret_b64: &str, body: &[u8]) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let secret = STANDARD
        .decode(secret_b64)
        .map_err(|e| format!("Bad secret encoding: {}", e))?;
    let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(&secret)
        .map_err(|e| format!("HMAC init: {}", e))?;
    mac.update(body);
    Ok(STANDARD.encode(mac.finalize().into_bytes()))
}

// =============================================================================
// SELF INFO
// =============================================================================

#[derive(Debug, Serialize)]
pub struct SelfInfo {
    pub peer_id: String,
    pub port: u16,
    pub ip: String,
    pub device_name: String,
}

#[tauri::command]
pub fn sync_get_self_info(server_state: State<'_, Arc<ServerState>>) -> Result<SelfInfo, String> {
    let port = server_state
        .bound_port
        .lock()
        .map_err(|e| e.to_string())?
        .ok_or("Sync server is not running yet")?;
    let peer_id = server_state.peer_store.self_peer_id()?;
    let ip = local_ip()?;
    Ok(SelfInfo {
        peer_id,
        port,
        ip,
        device_name: hostname_string(),
    })
}

// =============================================================================
// PAIRING WINDOW
// =============================================================================

#[tauri::command]
pub fn sync_open_pairing_window(
    pin: String,
    server_state: State<'_, Arc<ServerState>>,
) -> Result<PairQr, String> {
    server::open_pairing_window(&server_state, hash_pin(&pin))
}

#[tauri::command]
pub fn sync_close_pairing_window(
    server_state: State<'_, Arc<ServerState>>,
) -> Result<(), String> {
    server::close_pairing_window(&server_state)
}

// =============================================================================
// COMPLETE PAIRING (scanner side)
// =============================================================================

#[derive(Debug, Serialize)]
pub struct PairingResult {
    pub success: bool,
    pub host_peer_id: String,
    pub host_device_name: String,
    pub message: Option<String>,
}

#[tauri::command]
pub async fn sync_complete_pairing(
    qr_json: String,
    pin: String,
    server_state: State<'_, Arc<ServerState>>,
    peer_store: State<'_, Arc<PeerStore>>,
) -> Result<PairingResult, String> {
    let qr: PairQr = serde_json::from_str(&qr_json).map_err(|e| format!("Invalid QR: {}", e))?;
    let pin_hash = hash_pin(&pin);
    let scanner_peer_id = server_state.peer_store.self_peer_id()?;
    let scanner_secret = peers::generate_shared_secret();
    let scanner_device_name = hostname_string();
    // Tell the host what port our persistent server is listening on so
    // it can initiate sync to us later. Without this, host pairs blind
    // and gets "no_known_ip" the first time it tries to push.
    let scanner_port = server_state
        .bound_port
        .lock()
        .map_err(|e| e.to_string())?
        .ok_or("Sync server isn't running yet — can't pair")?;

    let body = PairRequest {
        pairing_token: qr.pairing_token,
        scanner_peer_id: scanner_peer_id.clone(),
        scanner_device_name: scanner_device_name.clone(),
        scanner_pin_hash: pin_hash.clone(),
        shared_secret: scanner_secret.clone(),
        scanner_port,
    };

    let url = format!("http://{}:{}/pair", qr.ip, qr.port);
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .json(&body)
        .timeout(Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("Failed to reach pairing host: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Ok(PairingResult {
            success: false,
            host_peer_id: String::new(),
            host_device_name: String::new(),
            message: Some(format!("Pair failed ({}): {}", status, body)),
        });
    }

    let pair_resp: PairResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse pair response: {}", e))?;

    if !pair_resp.success {
        return Ok(PairingResult {
            success: false,
            host_peer_id: String::new(),
            host_device_name: String::new(),
            message: pair_resp.message,
        });
    }

    // Store the host as our new peer.
    let now = now_unix();
    let host_peer = Peer {
        peer_id: pair_resp.host_peer_id.clone(),
        peer_name: pair_resp.host_device_name.clone(),
        shared_secret: scanner_secret,
        pin_hash: pin_hash.clone(),
        last_known_ip: qr.ip.clone(),
        last_known_port: qr.port,
        last_seen_unix: now,
        last_synced_unix: 0,
        consecutive_failures: 0,
        first_failure_unix: 0,
    };
    peer_store.upsert(host_peer)?;

    Ok(PairingResult {
        success: true,
        host_peer_id: pair_resp.host_peer_id,
        host_device_name: pair_resp.host_device_name,
        message: None,
    })
}

// =============================================================================
// OUTGOING SYNC TO A PAIRED PEER
// =============================================================================

#[derive(Debug, Serialize)]
pub struct ToPeerResult {
    pub success: bool,
    pub reason: Option<String>,
    pub peer_id: String,
    pub peer_name: String,
    pub data: Option<String>,
    pub snapshot_age_secs: Option<u64>,
}

#[tauri::command]
pub async fn sync_to_peer(
    peer_id: String,
    pin: String,
    data: String,
    peer_store: State<'_, Arc<PeerStore>>,
) -> Result<ToPeerResult, String> {
    let peer = peer_store
        .find(&peer_id)?
        .ok_or_else(|| format!("Unknown peer: {}", peer_id))?;

    // The auth header identifies US to the remote so they can look us
    // up in THEIR peer registry. Sending the remote's own id back to
    // them would (and did, until 2026-05-05) fail with peer_not_found
    // because nobody stores themselves as a peer.
    let self_peer_id = peer_store.self_peer_id()?;

    if peer.last_known_ip.is_empty() || peer.last_known_port == 0 {
        return Ok(ToPeerResult {
            success: false,
            reason: Some("no_known_ip".into()),
            peer_id: peer.peer_id,
            peer_name: peer.peer_name,
            data: None,
            snapshot_age_secs: None,
        });
    }

    let pin_hash = hash_pin(&pin);

    if !subtle_eq(peer.pin_hash.as_bytes(), pin_hash.as_bytes()) {
        // Caller is on a PIN that this pairing wasn't created under. The
        // server will reject too, but we save a round-trip.
        return Ok(ToPeerResult {
            success: false,
            reason: Some("local_pin_mismatch".into()),
            peer_id: peer.peer_id,
            peer_name: peer.peer_name,
            data: None,
            snapshot_age_secs: None,
        });
    }

    let body = SyncRequest {
        data,
        pin_hash,
        timestamp: now_unix(),
        sender_device_name: hostname_string(),
    };
    let body_bytes = serde_json::to_vec(&body).map_err(|e| format!("serialize: {}", e))?;

    let mac = hmac_b64(&peer.shared_secret, &body_bytes)?;
    let auth_header = format!("{}:{}", self_peer_id, mac);

    let url = format!("http://{}:{}/sync", peer.last_known_ip, peer.last_known_port);
    let client = reqwest::Client::new();
    let resp_result = client
        .post(&url)
        .header("X-Chaos-Auth", auth_header)
        .header("Content-Type", "application/json")
        .body(body_bytes)
        .timeout(Duration::from_secs(30))
        .send()
        .await;

    let resp = match resp_result {
        Ok(r) => r,
        Err(e) => {
            // Network error — record as failure and possibly surface auto-clear.
            let now = now_unix();
            let should_clear = peer_store.record_failure(&peer.peer_id, now)?;
            if should_clear {
                let _ = peer_store.remove(&peer.peer_id);
                return Ok(ToPeerResult {
                    success: false,
                    reason: Some(format!("unreachable_cleared:{}", e)),
                    peer_id: peer.peer_id,
                    peer_name: peer.peer_name,
                    data: None,
                    snapshot_age_secs: None,
                });
            }
            return Ok(ToPeerResult {
                success: false,
                reason: Some(format!("unreachable:{}", e)),
                peer_id: peer.peer_id,
                peer_name: peer.peer_name,
                data: None,
                snapshot_age_secs: None,
            });
        }
    };

    if !resp.status().is_success() {
        let status = resp.status();
        return Ok(ToPeerResult {
            success: false,
            reason: Some(format!("http_{}", status.as_u16())),
            peer_id: peer.peer_id,
            peer_name: peer.peer_name,
            data: None,
            snapshot_age_secs: None,
        });
    }

    let sync_resp: SyncResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse sync response: {}", e))?;

    let now = now_unix();
    if sync_resp.success {
        peer_store.record_success(&peer.peer_id, now)?;
    } else {
        // Server-side rejection (pin mismatch, snapshot missing, etc.) —
        // not a delivery failure, don't increment the auto-clear counter.
    }

    Ok(ToPeerResult {
        success: sync_resp.success,
        reason: sync_resp.reason,
        peer_id: peer.peer_id,
        peer_name: peer.peer_name,
        data: sync_resp.data,
        snapshot_age_secs: sync_resp.snapshot_age_secs,
    })
}

// =============================================================================
// PUBLISH SNAPSHOT (frontend → server cache)
// =============================================================================

#[tauri::command]
pub fn sync_publish_snapshot(
    data: String,
    pin: String,
    device_name: Option<String>,
    server_state: State<'_, Arc<ServerState>>,
) -> Result<(), String> {
    let snap = CachedSnapshot {
        data_json: data,
        pin_hash: hash_pin(&pin),
        device_name: device_name.unwrap_or_else(hostname_string),
        updated_unix: now_unix(),
    };
    server::publish_snapshot(&server_state, snap)
}

/// Pull and clear all queued incoming-sync payloads. Called by the
/// frontend on startup and on each "chaos:sync-data-received" event.
/// Returns peer_id + peer_name + data so the frontend can attribute
/// imports in toasts.
#[tauri::command]
pub fn sync_drain_inbox(
    server_state: State<'_, Arc<ServerState>>,
) -> Result<Vec<InboxItem>, String> {
    server::drain_inbox(&server_state)
}

// =============================================================================
// PEER MANAGEMENT
// =============================================================================

#[derive(Debug, Serialize)]
pub struct PeerView {
    pub peer_id: String,
    pub peer_name: String,
    pub pin_hash: String,
    pub last_known_ip: String,
    pub last_seen_unix: u64,
    pub last_synced_unix: u64,
    pub consecutive_failures: u32,
}

impl From<Peer> for PeerView {
    fn from(p: Peer) -> Self {
        Self {
            peer_id: p.peer_id,
            peer_name: p.peer_name,
            pin_hash: p.pin_hash,
            last_known_ip: p.last_known_ip,
            last_seen_unix: p.last_seen_unix,
            last_synced_unix: p.last_synced_unix,
            consecutive_failures: p.consecutive_failures,
        }
    }
}

#[tauri::command]
pub fn sync_list_peers(
    pin: Option<String>,
    peer_store: State<'_, Arc<PeerStore>>,
) -> Result<Vec<PeerView>, String> {
    let peers = match pin {
        Some(p) => peer_store.list_for_pin(&hash_pin(&p))?,
        None => peer_store.list_all()?,
    };
    Ok(peers.into_iter().map(PeerView::from).collect())
}

#[tauri::command]
pub fn sync_remove_peer(
    peer_id: String,
    peer_store: State<'_, Arc<PeerStore>>,
) -> Result<bool, String> {
    peer_store.remove(&peer_id)
}

#[tauri::command]
pub fn sync_rename_peer(
    peer_id: String,
    new_name: String,
    peer_store: State<'_, Arc<PeerStore>>,
) -> Result<bool, String> {
    let mut peer = match peer_store.find(&peer_id)? {
        Some(p) => p,
        None => return Ok(false),
    };
    peer.peer_name = new_name;
    peer_store.upsert(peer)?;
    Ok(true)
}

// =============================================================================
// MISC
// =============================================================================

fn subtle_eq(a: &[u8], b: &[u8]) -> bool {
    use subtle::ConstantTimeEq;
    if a.len() != b.len() {
        return false;
    }
    a.ct_eq(b).into()
}
