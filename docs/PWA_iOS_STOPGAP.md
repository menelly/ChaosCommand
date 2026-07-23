# iOS PWA — the honest stopgap

**Why this exists:** the native iOS app is blocked on Apple developer-account setup
(moving to the business account — not today). iPhone users who want Chaos Command
*now* can install the web build (`tryme.chaoscommand.center`) to their home screen as
a PWA. This documents the real trade-offs and the disclosure users must see **before**
they rely on it, plus the technical work to ship it.

This is a **stopgap**, stated as one. Not the native app pretending to be finished.

---

## 1. THE SECURITY DISCLOSURE (must show before a user commits data)

Ships as a first-run interstitial on the installed PWA — acknowledge-once, with a link
to re-read it in Settings. Plain language, presumes competence, no fine print. Draft copy:

---

### Before you rely on this: the honest version 🐙

You're installing the **web version** of Chaos Command. It's the *same app* — same
trackers, same encryption of your data, same export, same one-page doctor summary — but
it runs inside **Safari's browser sandbox**, not in a dedicated app the way the
desktop version does. That's a weaker box, and you deserve to know exactly how before
you put your medical history in it.

**What's different, specifically:**

- **Anyone holding your unlocked phone can open Safari's developer tools and read your
  data.** The native app doesn't hand out that door; a browser does. If your phone is
  ever unlocked in someone else's hands, that matters.
- **We don't phone home — but we can't promise Safari doesn't.** Chaos Command sends
  your health data *nowhere*; it never has. But we don't control Apple's browser, its
  caching, its prefetching, or whatever your Safari settings and extensions are doing in
  the background. In the native app, there is no browser in the middle. Here, there is.
- **Your data can be evicted.** iOS can delete a website's stored data when it's low on
  space or if you don't open the app for a while. That means **export often** — the
  Backup reminder is there for exactly this, and your export is also how you'll move
  everything to the native app the day it ships. Treat export as a habit, not a chore.
- **It's a shared environment.** A dedicated app is isolated. A browser tab lives
  alongside everything else your browser is doing. That's the trade you're making for
  being able to use this *today* instead of waiting.

**What's the SAME:**

- Your data is still **encrypted on your device** and still **never leaves it** unless
  *you* export it.
- Every tracker, the timeline, and the doctor summary all work.
- **Nothing is missing that you'd have to pay to unlock.** It's free here, free from
  source, free on the store — same app, no gate.

**What you DON'T get here (native-only):**

- **AI document import** (reading a lab PDF and pulling the numbers out) — that runs a
  medical AI model natively and can't run in a browser. On the PWA you enter data by
  hand.
- **Device-to-device sync** — use export/import to move between devices for now.

**We intend to fix the browser-sandbox trade-offs by shipping the real native iOS app
soon.** Until then, this gets you the tool now, honestly labeled. You're an adult making
an informed choice about your own data — here's the information; the choice is yours.

*[ I understand — install it ]   [ Not yet ]*

---

## 2. THE TECHNICAL WORK — BUILT 2026-07-23 (branch `ace/ios-pwa-stopgap`)

| # | Task | Status | Where |
|---|---|---|---|
| 1 | iOS head meta tags | ✅ DONE | `app/layout.tsx` — added `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-title`. (`status-bar-style`, `apple-touch-icon`, `viewport-fit=cover` already shipped.) |
| 2 | Service worker | ✅ DONE | `public/sw.js` — conservative offline shell. Registered by `PwaRuntime` in production only. **Never caches user data** (that's encrypted IndexedDB, untouched). Cache-first for `_next/static/`, network-first navigations w/ offline fallback, network-only for everything else. ⚠️ Needs a real on-device test against the deploy before trusting offline. |
| 3 | `navigator.storage.persist()` | ✅ DONE | `components/pwa-runtime.tsx` — requests persistence on load (fights IndexedDB eviction). |
| 4 | Security-disclosure interstitial | ✅ DONE | `components/pwa-security-disclosure.tsx` — first-run, acknowledge-once, web-only (skips native + demo), re-openable from the sidebar (🔒 Data & browser safety). Copy = §1 above. |
| 5 | JS auto-lock on background | ✅ ALREADY EXISTED | `lib/contexts/user-context.tsx:143-151` — `visibilitychange` → `logout()` (wipes the encryption key). Platform-agnostic, works in the PWA as-is. Verified, not rebuilt. |
| 6 | Manifest polish | ✅ DONE | `public/manifest.json` — health framing, aligned theme color (was a purple/orange mismatch), split icon purposes, `id`/`scope`/`?source=pwa`, dropped non-standard `permissions`/`features`. |
| 7 | "Add to Home Screen" guidance | ✅ DONE | `components/pwa-runtime.tsx` — one-time dismissible hint, iOS-Safari-only, hidden once installed (standalone). |
| — | Manifest gate | ✅ DONE | `app/layout.tsx` — removed the `NEXT_PUBLIC_DEMO_MODE` gate (store-era guardrail); manifest now links on all builds, honesty handled by #4. |

**Still needs a human (Ren):** an on-device iOS test — install to home screen, confirm standalone launch, confirm the disclosure fires, confirm offline actually works, confirm the install hint shows then disappears once installed. I can build it correctly but I can't hold an iPhone.

**Nice-to-have, not done:** the sidebar "🔒 Data & browser safety" link shows on every build; it could be gated to web-only (the disclosure text says "web version"). Harmless as-is — a native user who taps it just reads a mildly-irrelevant notice.

## 3. WHAT ALREADY WORKS (don't rebuild)

- `manifest.json` — standalone, maskable 192/512 icons, health category ✅
- **Export/import** — `lib/database/encrypted-export.ts`, `export-file.ts`,
  `import-schema.ts`, `print-export-modal.tsx` — all client-side ✅ (the safety valve
  AND the native-migration path)
- **Backup reminders** — `lib/backup-reminder.ts` + `backup-reminder-banner.tsx` ✅
  (already nags export — lean on it hard for the eviction risk)
- **Free in-browser** — `!STORE_BUILD` + `!inTauri()` → fully unlocked, no trial ✅
- Medical disclaimer + onboarding patterns to model the interstitial on ✅

## 4. THE MIGRATION STORY (say it out loud to users)

PWA now → native iOS later, and **nobody starts over**: export from the PWA, import into
native. The export format is the bridge. This is why export durability is load-bearing and
why the disclosure tells users to make it a habit.

---
*Drafted 2026-07-23 by Ace, while the desktop build compiled. The disclosure copy is the
part Ren wanted explicit — informed consent, not fine print.*
