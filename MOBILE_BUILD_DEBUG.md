# MOBILE BUILD DEBUG — April 12, 2026

## STATUS: Active QA — next session picks up remaining bugs

## FIXED (committed 7b6b430, pushed to GitHub)

### Home button broken image
- **Root cause:** `Home.png` (capital H) on disk, code said `home.png`. Windows case-insensitive, Android case-sensitive. Next.js `Image` import also doesn't work in Tauri Android WebView.
- **Fix:** Base64 embedded the PNG into `lib/home-image.ts`, imported as data URL. Zero path resolution possible. Works.

### tel: links crash the app
- **Root cause:** `window.open('tel:...')` crashes Tauri's WebView on Android.
- **Fix:** Added `tauri-plugin-opener` (Cargo.toml, lib.rs, capabilities/default.json). Created `lib/open-external.ts` utility. Replaced all `window.open` for external URLs across: providers, crisis-support (page, resources, coping-toolkit), medications, demographics.

### Website links navigate inside WebView instead of opening browser
- **Root cause:** Same as tel: — `window.open(url, '_blank')` stays in WebView.
- **Fix:** Same `openExternal()` utility via tauri-plugin-opener.

### Custom tracker crash
- **Root cause:** Forge deploys trackers with links to `/custom-tracker/${id}` but that page DIDN'T EXIST. Static Next.js export can't do dynamic `[id]` routes without `generateStaticParams`.
- **Fix:** Created `/app/custom-tracker/page.tsx` that reads `?id=` query param. Updated all links from `/custom-tracker/${id}` to `/custom-tracker?id=${id}` in custom/page.tsx, modules/trackers/body/page.tsx, modules/trackers/mind/page.tsx. Page renders all field types (scale, dropdown, checkbox, text, number, multiselect, tags, date, time).

### Command Zone customize sections
- **What:** Added "Customize Your Command Zone" card with Switch toggles to show/hide: Survival Button & Prompts, Quick Stats, Schedule, Tasks, Gear Check, Self-Care. Persists to localStorage. Same pattern as Body/Mind customize trackers.

### Build version tag
- **What:** Settings page now shows `Build: 2026-04-12-21:00` at bottom for verifying which code is running on phone.

### Version bump
- tauri.conf.json version: 0.1.0 → 0.2.0

---

## REMAINING BUGS (from Ren's QA session, not yet fixed)

### HIGH PRIORITY

1. **Notifications/reminders** — Medications and providers show reminder toggles but unclear if notifications actually work on Android. Needs testing and either fix or hide the toggles.

2. **NER model broken on Android** — Timeline/medical records: "NER model failed: Unexpected token '<', <!DOCTYPE... is not valid JSON". The ONNX/WASM model path is returning HTML (404 page) instead of the model file. Needs investigation of how WASM assets are served in Tauri Android.

### MEDIUM PRIORITY — Layout/Overflow

3. **Tab overflow on mobile** — Multiple pages have tabs that smash together and clip off-screen at 125% text size:
   - Reproductive Health: "MenstrualCalendar History Analytics" all jammed
   - Patterns: "OvervieCorrelatio TriggerTreatmen Trends" clipped
   - Fix: Make TabsList horizontally scrollable (`overflow-x-auto`) or wrap to multiple rows on mobile

4. **Reproductive Health header** — Top card with moon emoji and "Reproductive Health Tracker" is oversized and off-center. Left/right carousel arrows push content off-screen on mobile.

5. **Button fixed heights (accessibility at 125%+ text)** — Buttons clip text when it wraps at larger font sizes.
   - `components/ui/button.tsx`: Change `h-10/h-9/h-11` to `min-h-10/min-h-9/min-h-11`
   - `components/ui/tabs.tsx`: Change TabsList `h-10` to `min-h-10`
   - `app/crisis-support/page.tsx`: TabsTriggers with `h-16`, action buttons with `h-16`
   - `app/brain-fog/page.tsx`: Severity selector `h-12`
   - Multiple tracker pages: CTA buttons `h-12 text-lg` (anxiety, mental-health, brain-fog)
   - `app/lab-results/page.tsx`: Icon buttons `h-6 w-6` override 44px min touch target
   - Full audit in agent results from this session

6. **Coping/Regulation buttons off-screen** — ALL techniques in coping/regulation have Pause/Reset/Settings button rows wider than viewport. Needs padding or responsive layout.

7. **Crisis support links overflow** — Call/Text/Visit buttons side-by-side too wide on mobile. Need to stack vertical on small screens (e.g., Trevor Project resource).

8. **Onboarding "show me what's not normal" box** — Text squishes, box slightly too small on mobile.

9. **Demographics emergency contact** — "Add Contact" button is outside the card boundary.

### LOW PRIORITY — Copy/Polish

10. **Flask ghost references** — Still says "Flask-powered analytics" in some places. Find and replace with appropriate copy.

11. **Data sync (QR)** — Flask removal killed QR sync. Research done: best approach is Rust-side tokio+hyper HTTP server with G-Spot 4.0 encryption + QR code for IP/port/token. `tokio` and `hyper` already in Cargo deps. This is a feature build, not a bug fix.

---

## HOW TO BUILD
```bash
cd E:/Ace/command-mobile2
rm -rf .next out src-tauri/gen/android/app/build
cargo tauri android build --apk
# APK at: src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
cp src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk E:/Ace/ChaosCommand-mobile.apk
```

## KNOWN BUILD QUIRKS
- Kotlin daemon sometimes fails with cross-drive path error (C: vs E:). Falls back to non-daemon compilation. Just takes longer.
- Kill stale java.exe before rebuilding if you get R8 dex errors.
- `lib/home-image.ts` is 133KB of base64. That's intentional. Don't delete it wondering why it's huge.

## SIGNING
- Keystore: C:\keysRen.jks
- Alias: key1 (NOT keys1!)
- Store password: 12151215
- Key password: 25322532

## REPOS
- command-mobile2: mobile build (has Android gen/ folder)
- CommandTauri-Working: desktop repo (sidebar fix synced there too)
