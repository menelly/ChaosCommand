/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * entitlement.golden.test.ts — pins the dual-source entitlement truth table.
 *
 * The app is usable iff: a license key verifies, OR the store IAP is purchased,
 * OR the 14-day trial is still running. The one unusable state is: none of the
 * above. Locked here so a refactor can't silently lock out a paying user or let
 * an expired trial through.
 *
 * HOW TO RUN:
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out lib/services/entitlement.golden.test.ts
 *   node .tmp-out/lib/services/entitlement.golden.test.js
 */

import { resolveEntitlement } from './entitlement';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('\n🔑 entitlement resolver golden suite\n');

// --- trial active, nothing purchased ---------------------------------------
{
  const e = resolveEntitlement({ hasKey: false, hasStoreIAP: false, trialExpired: false, trialDaysRemaining: 9 });
  check('trial active: appUsable', e.appUsable === true);
  check('trial active: NOT permanently unlocked', e.unlocked === false);
  check('trial active: state=trial', e.state === 'trial', e.state);
  check('trial active: 9 days shown', e.trialDaysRemaining === 9);
}

// --- trial expired, nothing purchased → the ONLY locked state --------------
{
  const e = resolveEntitlement({ hasKey: false, hasStoreIAP: false, trialExpired: true, trialDaysRemaining: 0 });
  check('expired+unpaid: NOT usable (the only locked state)', e.appUsable === false);
  check('expired+unpaid: state=expired', e.state === 'expired', e.state);
}

// --- license key: usable forever, even after trial expiry ------------------
{
  const e = resolveEntitlement({ hasKey: true, hasStoreIAP: false, trialExpired: true, trialDaysRemaining: 0 });
  check('key + expired trial: still usable', e.appUsable === true);
  check('key + expired trial: unlocked', e.unlocked === true);
  check('key: state=licensed', e.state === 'licensed', e.state);
}

// --- store IAP: usable forever, even after trial expiry ---------------------
{
  const e = resolveEntitlement({ hasKey: false, hasStoreIAP: true, trialExpired: true, trialDaysRemaining: 0 });
  check('store IAP + expired trial: still usable', e.appUsable === true);
  check('store IAP + expired trial: unlocked', e.unlocked === true);
  check('store IAP: state=purchased', e.state === 'purchased', e.state);
}

// --- both sources: key label wins, still unlocked --------------------------
{
  const e = resolveEntitlement({ hasKey: true, hasStoreIAP: true, trialExpired: false, trialDaysRemaining: 14 });
  check('key + store: unlocked', e.unlocked === true);
  check('key + store: label prefers licensed', e.state === 'licensed', e.state);
}

// --- key present DURING trial: unlocked outranks trial label ---------------
{
  const e = resolveEntitlement({ hasKey: true, hasStoreIAP: false, trialExpired: false, trialDaysRemaining: 5 });
  check('key during trial: state=licensed (not trial)', e.state === 'licensed', e.state);
  check('key during trial: usable + unlocked', e.appUsable && e.unlocked);
}

// --- negative days clamp ---------------------------------------------------
{
  const e = resolveEntitlement({ hasKey: false, hasStoreIAP: false, trialExpired: true, trialDaysRemaining: -3 });
  check('negative trial days clamp to 0', e.trialDaysRemaining === 0, String(e.trialDaysRemaining));
}

console.log('\n──────────────────────────────────────────');
console.log(`PASS: ${pass}   FAIL: ${fail}`);
console.log('──────────────────────────────────────────\n');
if (fail > 0) process.exit(1);
