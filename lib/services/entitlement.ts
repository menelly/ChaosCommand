/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * entitlement.ts — the dual-source entitlement resolver.
 *
 * The store model (STORE_LAUNCH): the app is usable while EITHER the 14-day
 * trial is still running OR the user is permanently unlocked. "Unlocked" has two
 * independent sources that mean the same thing:
 *   • an offline Ed25519 license key verifies (license.rs) — scholarships +
 *     self-hosters, AND
 *   • the store says the non-consumable IAP was purchased (StoreContext).
 * Two sources, one entitlement. The trial gates the first 14 days regardless of
 * source; after it expires, the app needs one of the two unlock sources.
 *
 * This module is PURE (no Tauri, no React) so the gating logic is unit-testable.
 * The wiring (calling validate_license / get_trial_status / the store check)
 * lives in the entitlement context/hook; dev-mode bypass lives there too.
 */

export interface EntitlementInputs {
  /** Offline Ed25519 license key verified (license.rs). */
  hasKey: boolean;
  /** Store reports the non-consumable unlock as purchased (StoreContext IAP). */
  hasStoreIAP: boolean;
  /** The 14-day trial clock has run out (trial.rs get_trial_status.expired). */
  trialExpired: boolean;
  /** Whole days left in the trial (for the countdown banner). */
  trialDaysRemaining: number;
}

/** Why the app is (or isn't) usable — drives the UI copy. */
export type EntitlementState = 'licensed' | 'purchased' | 'trial' | 'expired';

export interface Entitlement {
  /** Permanently entitled — key OR store purchase. Survives trial expiry. */
  unlocked: boolean;
  /** May the app be used right now? unlocked OR still in trial. */
  appUsable: boolean;
  /** Precedence for display: a real unlock outranks the trial; key outranks
   *  store only for which label we show (both mean "unlocked"). */
  state: EntitlementState;
  /** Clamped ≥ 0 for the banner. Only meaningful while state === 'trial'. */
  trialDaysRemaining: number;
}

/**
 * Resolve the effective entitlement from the three sources. The ONLY way the app
 * is unusable is: no key, no store purchase, AND the trial has expired.
 */
export function resolveEntitlement(i: EntitlementInputs): Entitlement {
  const unlocked = i.hasKey || i.hasStoreIAP;
  const inTrial = !i.trialExpired;
  const appUsable = unlocked || inTrial;

  // A permanent unlock always wins over the trial for labelling; if neither,
  // we're either still in trial or fully expired.
  const state: EntitlementState = i.hasKey
    ? 'licensed'
    : i.hasStoreIAP
      ? 'purchased'
      : inTrial
        ? 'trial'
        : 'expired';

  return {
    unlocked,
    appUsable,
    state,
    trialDaysRemaining: Math.max(0, i.trialDaysRemaining),
  };
}
