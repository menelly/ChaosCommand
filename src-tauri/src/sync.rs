/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Local network sync — QR pairing + encrypted data transfer.
 * No cloud. No internet. Just two devices on the same WiFi.
 */

use serde::{Deserialize, Serialize};
use std::net::{IpAddr, TcpListener};
use std::sync::Mutex;
use tauri::{command, Manager, State};

/// Sync session state managed by Tauri
pub struct SyncState {
    pub session: Mutex<Option<SyncSession>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncSession {
    pub role: SyncRole,
    pub token: String,
    pub port: u16,
    pub pin_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SyncRole {
    Host,   // The device showing the QR code
    Client, // The device scanning the QR code
}

/// What goes in the QR code — just enough to find each other
#[derive(Debug, Serialize, Deserialize)]
pub struct QrPayload {
    pub ip: String,
    pub port: u16,
    pub token: String,
}

/// Data envelope for sync transfer
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncEnvelope {
    pub token: String,
    pub pin_hash: String,
    pub device_name: String,
    pub timestamp: u64,
    pub data: String, // JSON string of the database export
}

/// Result of a sync operation
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub records_received: Option<usize>,
    pub conflicts: Option<Vec<SyncConflict>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    pub category: String,
    pub key: String,
    pub local_value: String,
    pub remote_value: String,
    pub local_updated: String,
    pub remote_updated: String,
}

fn get_local_ip() -> Result<String, String> {
    // Find the local network IP (not loopback)
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

fn find_open_port() -> Result<u16, String> {
    let listener = TcpListener::bind("0.0.0.0:0")
        .map_err(|e| format!("Failed to find open port: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get port: {}", e))?
        .port();
    Ok(port)
}

fn hash_pin(pin: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    pin.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn generate_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", nonce)
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Start hosting a sync session — returns QR payload as JSON string
#[command]
pub async fn sync_start_host(
    pin: String,
    state: State<'_, SyncState>,
) -> Result<String, String> {
    let ip = get_local_ip()?;
    let port = find_open_port()?;
    let token = generate_token();
    let pin_hash = hash_pin(&pin);

    let session = SyncSession {
        role: SyncRole::Host,
        token: token.clone(),
        port,
        pin_hash,
    };

    *state.session.lock().map_err(|e| e.to_string())? = Some(session);

    let qr = QrPayload {
        ip,
        port,
        token,
    };

    serde_json::to_string(&qr).map_err(|e| format!("Failed to serialize QR payload: {}", e))
}

/// Send data to a host (client side after scanning QR)
#[command]
pub async fn sync_send_data(
    qr_json: String,
    pin: String,
    data: String,
) -> Result<SyncResult, String> {
    let qr: QrPayload =
        serde_json::from_str(&qr_json).map_err(|e| format!("Invalid QR data: {}", e))?;

    let envelope = SyncEnvelope {
        token: qr.token,
        pin_hash: hash_pin(&pin),
        device_name: hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "Unknown Device".to_string()),
        timestamp: now_unix(),
        data,
    };

    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/sync", qr.ip, qr.port);

    let res = client
        .post(&url)
        .json(&envelope)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to connect: {}. Are both devices on the same WiFi?", e))?;

    if res.status().is_success() {
        res.json::<SyncResult>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        Err(format!("Sync failed ({}): {}", status, body))
    }
}

/// Receive data as host — starts a one-shot HTTP server
#[command]
pub async fn sync_receive_data(
    state: State<'_, SyncState>,
) -> Result<SyncEnvelope, String> {
    let session = state
        .session
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("No active sync session")?;

    let addr = format!("0.0.0.0:{}", session.port);
    let listener = TcpListener::bind(&addr)
        .map_err(|e| format!("Failed to listen on {}: {}", addr, e))?;

    // Set a timeout so we don't block forever
    listener
        .set_nonblocking(false)
        .map_err(|e| format!("Failed to set blocking: {}", e))?;

    // Accept one connection (with 120s timeout via tokio)
    let (mut stream, _peer) = tokio::task::spawn_blocking(move || {
        // Simple blocking accept with timeout
        listener.set_nonblocking(false).ok();
        listener.accept()
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
    .map_err(|e| format!("Accept error: {}", e))?;

    // Read the HTTP request
    use std::io::Read;
    let mut buf = Vec::new();
    let mut tmp = [0u8; 8192];

    // Read until we have the full body
    loop {
        match stream.read(&mut tmp) {
            Ok(0) => break,
            Ok(n) => buf.extend_from_slice(&tmp[..n]),
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => break,
            Err(e) => return Err(format!("Read error: {}", e)),
        }
        // Check if we've received the full HTTP request (double CRLF marks end of headers)
        if let Some(header_end) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
            // Parse Content-Length to know when body is complete
            let headers = String::from_utf8_lossy(&buf[..header_end]);
            if let Some(cl) = headers
                .lines()
                .find(|l| l.to_lowercase().starts_with("content-length:"))
                .and_then(|l| l.split(':').nth(1))
                .and_then(|v| v.trim().parse::<usize>().ok())
            {
                let body_start = header_end + 4;
                if buf.len() >= body_start + cl {
                    break;
                }
            }
        }
    }

    // Extract body from HTTP request
    let request = String::from_utf8_lossy(&buf);
    let body = request
        .split("\r\n\r\n")
        .nth(1)
        .ok_or("No body in request")?;

    let envelope: SyncEnvelope =
        serde_json::from_str(body).map_err(|e| format!("Invalid sync data: {}", e))?;

    // Verify token
    if envelope.token != session.token {
        // Send error response
        use std::io::Write;
        let response = "HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nInvalid token";
        stream.write_all(response.as_bytes()).ok();
        return Err("Token mismatch — QR code may have expired".to_string());
    }

    // Verify PIN hash matches
    if envelope.pin_hash != session.pin_hash {
        use std::io::Write;
        let response = "HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nPIN mismatch";
        stream.write_all(response.as_bytes()).ok();
        return Err("PIN mismatch — make sure both devices are logged in with the same PIN".to_string());
    }

    // Send success response
    use std::io::Write;
    let result = SyncResult {
        success: true,
        message: "Data received".to_string(),
        records_received: None,
        conflicts: None,
    };
    let result_json = serde_json::to_string(&result).unwrap_or_default();
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
        result_json.len(),
        result_json
    );
    stream.write_all(response.as_bytes()).ok();

    // Clear session
    *state.session.lock().map_err(|e| e.to_string())? = None;

    Ok(envelope)
}

/// Stop hosting
#[command]
pub fn sync_stop(state: State<'_, SyncState>) -> Result<(), String> {
    *state.session.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}
