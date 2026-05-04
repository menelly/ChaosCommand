/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Persistent peer registry for the auto-sync feature. Each pairing
 * produces a long-lived credential pair (peer_id + shared_secret) that
 * lives on both devices, scoped to the PIN under which the pair was
 * established. The frontend reads pairings via Tauri commands; the
 * persistent HTTP server (server.rs) consults this registry directly.
 *
 * Storage: ${app_data_dir}/peers.json. Atomic writes via tempfile +
 * rename. Mutex-protected in-memory cache.
 */

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const STORE_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Peer {
    /// Stable UUID-shaped identifier for the remote device.
    pub peer_id: String,
    /// Human-readable name (initially the remote's `hostname`, user-renamable).
    pub peer_name: String,
    /// Long-lived shared secret used for HMAC auth on /sync. Base64 of 32 random bytes.
    pub shared_secret: String,
    /// PIN this pairing was established under. Pairings are PIN-scoped.
    pub pin_hash: String,
    /// Last-known IP for outbound auto-sync attempts. Updated on every
    /// successful incoming connection from this peer.
    pub last_known_ip: String,
    /// Port the remote's server is listening on. Updated on every pair/sync.
    pub last_known_port: u16,
    /// Unix seconds — last time we saw any activity from this peer.
    pub last_seen_unix: u64,
    /// Unix seconds — last time a sync with this peer succeeded end-to-end.
    pub last_synced_unix: u64,
    /// Consecutive failed sync attempts since the last success.
    pub consecutive_failures: u32,
    /// Unix seconds — when the current failure streak started. 0 if no streak.
    pub first_failure_unix: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PeerFile {
    version: u32,
    /// This device's own peer_id (generated on first run, stable forever).
    self_peer_id: String,
    /// This device's persisted server port (so it survives restarts on the
    /// same number when possible — peers don't have to re-pair after every
    /// app launch). 0 means "not yet bound."
    self_port: u16,
    peers: Vec<Peer>,
}

impl Default for PeerFile {
    fn default() -> Self {
        Self {
            version: STORE_VERSION,
            self_peer_id: generate_id(),
            self_port: 0,
            peers: Vec::new(),
        }
    }
}

pub struct PeerStore {
    path: PathBuf,
    inner: Mutex<PeerFile>,
}

impl PeerStore {
    /// Load the registry from disk, creating a fresh one (with a freshly
    /// minted self_peer_id) if the file doesn't exist.
    pub fn load(app_data_dir: &Path) -> Result<Self, String> {
        let path = app_data_dir.join("peers.json");
        let inner = if path.exists() {
            let raw = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read peers.json: {}", e))?;
            match serde_json::from_str::<PeerFile>(&raw) {
                Ok(f) => f,
                Err(e) => {
                    // Corrupt file — back it up and start fresh rather than
                    // losing access to the app entirely. The old file is kept
                    // so a human can recover pairings if needed.
                    let backup = app_data_dir.join("peers.json.corrupt");
                    let _ = fs::rename(&path, &backup);
                    eprintln!(
                        "peers.json corrupt ({}); backed up to {} and starting fresh",
                        e,
                        backup.display()
                    );
                    PeerFile::default()
                }
            }
        } else {
            // Ensure parent dir exists before we ever try to save.
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create app data dir: {}", e))?;
            }
            PeerFile::default()
        };

        let store = Self {
            path,
            inner: Mutex::new(inner),
        };
        // Make sure a freshly created store gets persisted with its
        // self_peer_id so subsequent loads return the same identity.
        store.save()?;
        Ok(store)
    }

    fn save(&self) -> Result<(), String> {
        let snapshot = {
            let g = self.inner.lock().map_err(|e| e.to_string())?;
            g.clone()
        };
        let body = serde_json::to_string_pretty(&snapshot)
            .map_err(|e| format!("Failed to serialize peers: {}", e))?;
        // Atomic write: tempfile in the same dir, fsync, rename over the target.
        let tmp = self.path.with_extension("json.tmp");
        {
            let mut f = fs::File::create(&tmp)
                .map_err(|e| format!("Failed to open peers.json.tmp: {}", e))?;
            f.write_all(body.as_bytes())
                .map_err(|e| format!("Failed to write peers.json.tmp: {}", e))?;
            f.sync_all()
                .map_err(|e| format!("Failed to fsync peers.json.tmp: {}", e))?;
        }
        fs::rename(&tmp, &self.path)
            .map_err(|e| format!("Failed to rename peers.json.tmp: {}", e))?;
        Ok(())
    }

    pub fn self_peer_id(&self) -> Result<String, String> {
        let g = self.inner.lock().map_err(|e| e.to_string())?;
        Ok(g.self_peer_id.clone())
    }

    /// Returns the persisted server port, or None if we haven't bound one yet.
    pub fn self_port(&self) -> Result<Option<u16>, String> {
        let g = self.inner.lock().map_err(|e| e.to_string())?;
        Ok(if g.self_port == 0 { None } else { Some(g.self_port) })
    }

    pub fn set_self_port(&self, port: u16) -> Result<(), String> {
        {
            let mut g = self.inner.lock().map_err(|e| e.to_string())?;
            g.self_port = port;
        }
        self.save()
    }

    pub fn list_all(&self) -> Result<Vec<Peer>, String> {
        let g = self.inner.lock().map_err(|e| e.to_string())?;
        Ok(g.peers.clone())
    }

    pub fn list_for_pin(&self, pin_hash: &str) -> Result<Vec<Peer>, String> {
        let g = self.inner.lock().map_err(|e| e.to_string())?;
        Ok(g.peers
            .iter()
            .filter(|p| p.pin_hash == pin_hash)
            .cloned()
            .collect())
    }

    pub fn find(&self, peer_id: &str) -> Result<Option<Peer>, String> {
        let g = self.inner.lock().map_err(|e| e.to_string())?;
        Ok(g.peers.iter().find(|p| p.peer_id == peer_id).cloned())
    }

    /// Insert a new peer or update an existing one (matched by peer_id).
    pub fn upsert(&self, peer: Peer) -> Result<(), String> {
        {
            let mut g = self.inner.lock().map_err(|e| e.to_string())?;
            if let Some(existing) = g.peers.iter_mut().find(|p| p.peer_id == peer.peer_id) {
                *existing = peer;
            } else {
                g.peers.push(peer);
            }
        }
        self.save()
    }

    pub fn remove(&self, peer_id: &str) -> Result<bool, String> {
        let removed = {
            let mut g = self.inner.lock().map_err(|e| e.to_string())?;
            let before = g.peers.len();
            g.peers.retain(|p| p.peer_id != peer_id);
            before != g.peers.len()
        };
        if removed {
            self.save()?;
        }
        Ok(removed)
    }

    /// Update last_known_ip/port/last_seen for an existing peer. No-op if
    /// the peer isn't found.
    pub fn record_seen(&self, peer_id: &str, ip: &str, port: u16, now_unix: u64) -> Result<(), String> {
        let changed = {
            let mut g = self.inner.lock().map_err(|e| e.to_string())?;
            if let Some(p) = g.peers.iter_mut().find(|p| p.peer_id == peer_id) {
                p.last_known_ip = ip.to_string();
                p.last_known_port = port;
                p.last_seen_unix = now_unix;
                true
            } else {
                false
            }
        };
        if changed {
            self.save()?;
        }
        Ok(())
    }

    /// Mark a sync with this peer as successful — resets failure tracking.
    pub fn record_success(&self, peer_id: &str, now_unix: u64) -> Result<(), String> {
        let changed = {
            let mut g = self.inner.lock().map_err(|e| e.to_string())?;
            if let Some(p) = g.peers.iter_mut().find(|p| p.peer_id == peer_id) {
                p.last_synced_unix = now_unix;
                p.last_seen_unix = now_unix;
                p.consecutive_failures = 0;
                p.first_failure_unix = 0;
                true
            } else {
                false
            }
        };
        if changed {
            self.save()?;
        }
        Ok(())
    }

    /// Mark a sync attempt as failed. Returns true if this push tipped the
    /// peer over the 3-failures-over-3+-days threshold and the caller
    /// should auto-clear the pairing.
    pub fn record_failure(&self, peer_id: &str, now_unix: u64) -> Result<bool, String> {
        let should_clear = {
            let mut g = self.inner.lock().map_err(|e| e.to_string())?;
            if let Some(p) = g.peers.iter_mut().find(|p| p.peer_id == peer_id) {
                p.consecutive_failures = p.consecutive_failures.saturating_add(1);
                if p.first_failure_unix == 0 {
                    p.first_failure_unix = now_unix;
                }
                let three_days_secs: u64 = 3 * 24 * 60 * 60;
                let aged = now_unix.saturating_sub(p.first_failure_unix) >= three_days_secs;
                p.consecutive_failures >= 3 && aged
            } else {
                false
            }
        };
        self.save()?;
        Ok(should_clear)
    }
}

/// Generate a 32-hex-char identifier (16 random bytes) for peer_ids.
/// Not a real UUID, but the same uniqueness guarantees and we don't need
/// to add a uuid crate just for this.
pub fn generate_id() -> String {
    let mut bytes = [0u8; 16];
    getrandom::getrandom(&mut bytes).expect("getrandom failed");
    hex_encode(&bytes)
}

/// Generate a 32-byte shared secret, base64-encoded for storage.
pub fn generate_shared_secret() -> String {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("getrandom failed");
    STANDARD.encode(bytes)
}

/// Generate a one-time pairing token (24 hex chars = 12 random bytes).
pub fn generate_pairing_token() -> String {
    let mut bytes = [0u8; 12];
    getrandom::getrandom(&mut bytes).expect("getrandom failed");
    hex_encode(&bytes)
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push_str(&format!("{:02x}", b));
    }
    out
}
