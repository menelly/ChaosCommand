/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * store.rs — Microsoft Store entitlement gate (the anti-share lock for the paid
 * Store build). Ported from Chaos Clean-Up's StoreContext check, which already
 * shipped through Microsoft cert.
 *
 * Model — Chaos Command C1: PAY-TO-DOWNLOAD, NO in-app trial. The web demo at
 * tryme.chaoscommand.center is the try-before-buy. The Store collects payment
 * before install, so every legit copy is owned; this check confirms ownership
 * against the BUYER'S Microsoft account, so a shared/sideloaded binary on a
 * non-owner's machine stays locked — entitlement lives in the Store receipt,
 * not in the file.
 *
 * FAIL-OPEN by design: we report "not entitled" ONLY on a DEFINITIVE Store
 * "not owned" answer. Owned, or any error / unreadable / unpackaged state →
 * entitled. Locking a paying customer over a transient WinRT hiccup is far
 * worse than a determined non-payer slipping in (and a self-build from public
 * source is free anyway — we sell convenience + support, not secrecy).
 *
 * SCOPE: Windows / Microsoft Store ONLY. Apple App Store (StoreKit) and Google
 * Play Billing are different systems and are NOT implemented here — a STORE
 * build must not ship to those stores until their entitlement is wired, or it
 * would be unlocked-for-all there (non-windows purchase_state() returns None →
 * fail-open).
 */

/// Returns:
///   Some(true)  -> license active and NOT a trial          => owned.
///   Some(false) -> Store definitively says not owned/trial => not entitled.
///   None        -> couldn't determine (no WinRT / query error / unpackaged)
///                  => FAIL OPEN.
#[cfg(windows)]
fn purchase_state() -> Option<bool> {
    use windows::Services::Store::StoreContext;
    // Any failure here -> None (fail open). Each `.ok()?` maps Err -> None.
    let ctx = StoreContext::GetDefault().ok()?;
    let op = ctx.GetAppLicenseAsync().ok()?;
    // Blocks this Tauri command worker thread until the (fast, cached) op
    // completes. Command threads tolerate the block.
    let license = op.get().ok()?;
    let active = license.IsActive().ok()?;
    let is_trial = license.IsTrial().ok()?;
    Some(active && !is_trial)
}

#[cfg(not(windows))]
fn purchase_state() -> Option<bool> {
    None
}

/// The single entitlement signal the frontend reads (`hasStoreIAP` in
/// entitlement-context.tsx). True UNLESS the Store DEFINITIVELY reports
/// not-owned — i.e. owned OR can't-determine both return true (fail open).
#[tauri::command]
pub fn check_store_entitlement() -> bool {
    !matches!(purchase_state(), Some(false))
}
