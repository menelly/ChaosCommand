/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Frontend abstractions for the auto-sync feature. The actual networking,
 * crypto, and peer registry live in Rust (src-tauri/src/server.rs and
 * peers.rs). This file is the thin layer the rest of the React tree
 * talks to.
 *
 * Privacy posture matches update-check: off by default, opt-in only,
 * fires only on a deliberate daily user action (the survival button
 * click). No background polling. No telemetry. The only network
 * traffic is local-network HTTP between the user's own paired devices,
 * authenticated with a long-lived shared secret per pairing.
 */

import { invoke } from "@tauri-apps/api/core"
import { exportAllData, importData } from "@/lib/database/migration-helper"

const PREF_KEY = "chaos-auto-sync"
const LAST_RUN_KEY = "chaos-auto-sync-last-run"
const THROTTLE_MS = 60 * 60 * 1000 // 1 hour

export interface PeerView {
  peer_id: string
  peer_name: string
  pin_hash: string
  last_known_ip: string
  last_seen_unix: number
  last_synced_unix: number
  consecutive_failures: number
}

export interface SelfInfo {
  peer_id: string
  port: number
  ip: string
  device_name: string
}

export interface ToPeerResult {
  success: boolean
  reason: string | null
  peer_id: string
  peer_name: string
  data: string | null
  snapshot_age_secs: number | null
}

export type AutoSyncOutcome =
  | { kind: "skipped"; reason: "pref_off" | "throttled" | "no_peers" | "no_pin" }
  | {
      kind: "ran"
      peers_attempted: number
      peers_succeeded: number
      pin_mismatches: { peer_name: string }[]
      unreachable: { peer_name: string; cleared: boolean }[]
      successes: { peer_name: string; pulled_bytes: number }[]
    }

// =============================================================================
// PREFERENCE
// =============================================================================

export function getAutoSyncPref(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(PREF_KEY) === "true"
}

export function setAutoSyncPref(enabled: boolean): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PREF_KEY, enabled ? "true" : "false")
}

// =============================================================================
// PEER MANAGEMENT (thin Tauri wrappers)
// =============================================================================

export async function getSelfInfo(): Promise<SelfInfo> {
  return invoke<SelfInfo>("sync_get_self_info")
}

export async function listPeers(pin?: string): Promise<PeerView[]> {
  return invoke<PeerView[]>("sync_list_peers", { pin })
}

export async function removePeer(peerId: string): Promise<boolean> {
  return invoke<boolean>("sync_remove_peer", { peerId })
}

export async function renamePeer(peerId: string, newName: string): Promise<boolean> {
  return invoke<boolean>("sync_rename_peer", { peerId, newName })
}

// =============================================================================
// SNAPSHOT PUBLISHER
// =============================================================================

/**
 * Push the current database export into the Rust server's cached
 * snapshot. The server hands this back when a paired peer calls our
 * /sync endpoint. Safe to call frequently — only stored in memory on
 * the Rust side, no disk I/O for snapshots.
 */
export async function publishSnapshot(pin: string, deviceName?: string): Promise<void> {
  const data = await exportAllData(pin)
  await invoke("sync_publish_snapshot", { data, pin, deviceName })
}

// =============================================================================
// AUTO-SYNC RUN
// =============================================================================

/**
 * Run an outgoing sync attempt against every peer paired under `pin`,
 * if the user has opted in and the throttle has elapsed. Each peer is
 * tried independently — one failure doesn't block the others. The
 * caller is expected to display per-peer toasts based on the returned
 * outcome.
 */
export async function maybeRunAutoSync(pin: string): Promise<AutoSyncOutcome> {
  if (!getAutoSyncPref()) return { kind: "skipped", reason: "pref_off" }
  if (!pin) return { kind: "skipped", reason: "no_pin" }

  const last = parseInt(localStorage.getItem(LAST_RUN_KEY) || "0", 10)
  const now = Date.now()
  if (Number.isFinite(last) && now - last < THROTTLE_MS) {
    return { kind: "skipped", reason: "throttled" }
  }

  let peers: PeerView[]
  try {
    peers = await listPeers(pin)
  } catch {
    return { kind: "skipped", reason: "no_peers" }
  }

  if (peers.length === 0) return { kind: "skipped", reason: "no_peers" }

  // Mark the run timestamp BEFORE we start so a failure mid-loop still
  // counts toward the throttle (don't hammer peers if something's broken).
  localStorage.setItem(LAST_RUN_KEY, String(now))

  // Make sure the server has a fresh snapshot to hand back when peers
  // call us. Errors here are non-fatal — the actual outgoing syncs still
  // run with whatever the server had previously.
  try {
    await publishSnapshot(pin)
  } catch (err) {
    console.warn("[auto-sync] publishSnapshot failed:", err)
  }

  const data = await exportAllData(pin)

  const pin_mismatches: { peer_name: string }[] = []
  const unreachable: { peer_name: string; cleared: boolean }[] = []
  const successes: { peer_name: string; pulled_bytes: number }[] = []

  for (const peer of peers) {
    let result: ToPeerResult
    try {
      result = await invoke<ToPeerResult>("sync_to_peer", {
        peerId: peer.peer_id,
        pin,
        data,
      })
    } catch (err) {
      console.warn(`[auto-sync] hard error syncing to ${peer.peer_name}:`, err)
      unreachable.push({ peer_name: peer.peer_name, cleared: false })
      continue
    }

    if (result.success && result.data) {
      try {
        await importData(result.data)
        successes.push({ peer_name: result.peer_name, pulled_bytes: result.data.length })
      } catch (err) {
        console.warn(`[auto-sync] import from ${peer.peer_name} failed:`, err)
      }
    } else if (result.reason === "pin_mismatch") {
      pin_mismatches.push({ peer_name: result.peer_name })
    } else if (result.reason && /unreachable/.test(result.reason)) {
      const cleared = result.reason.startsWith("unreachable_cleared")
      unreachable.push({ peer_name: result.peer_name, cleared })
    } else {
      // Other reasons (snapshot_missing, peer_not_found, bad_auth, http_*)
      // — silent in the toast UI, logged for debugging.
      console.warn(
        `[auto-sync] ${peer.peer_name} returned reason=${result.reason}`
      )
    }
  }

  return {
    kind: "ran",
    peers_attempted: peers.length,
    peers_succeeded: successes.length,
    pin_mismatches,
    unreachable,
    successes,
  }
}
