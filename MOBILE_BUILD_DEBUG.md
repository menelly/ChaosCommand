# MOBILE BUILD DEBUG — April 12, 2026

## THE PROBLEM
Source code in command-mobile2 has ALL the fixes (collapsible sections, back buttons, 
responsive grids, button touch targets, truncate fix, etc.) — builds succeed — but the 
APK on the phone STILL SHOWS THE OLD BEHAVIOR. Ren uninstalled, deleted old APK, 
downloaded fresh, still broken.

## WHAT WAS FIXED (in source, verified in code)
- components/ui/button.tsx — removed whitespace-nowrap, added min-h-[44px] sm:min-h-0
- components/ui/tabs.tsx — removed whitespace-nowrap, smaller text on mobile
- components/survival-button.tsx — flex-col sm:flex-row
- modules/life-management/zone/command-zone-v2.tsx — collapsible sections with ChevronRight
- components/app-sidebar.tsx — onClick auto-close on mobile
- app/body/page.tsx — removed truncate from description text
- 8 files: grid-cols-3 → grid-cols-2 sm:grid-cols-3
- 10+ pages: back buttons added
- app/settings/print-export-modal.tsx — jspdf instead of Flask
- app/settings/qr-sync-modal.tsx — share sheet export
- lib/pdf-report-generator.ts — NEW FILE, entire PDF generation

## WHAT TO CHECK
1. **Is `out/` actually fresh?** Check timestamps on files in `out/` after build
2. **Is Next.js caching?** Try `rm -rf .next out && npm run build`
3. **Is the APK actually including the new `out/`?** The Tauri build uses `frontendDist: "../out"` 
4. **WasmHash flake** — Next.js build sometimes fails with WasmHash error but exits 0???
   Check if `out/` directory has fresh timestamps matching the build time
5. **Verify changes are in the built output:** After build, check `out/_next/static/chunks/` 
   for the actual JS — grep for "CollapsibleSection" or "min-h-\[44px\]" in the output
6. **Maybe Tauri is caching the frontend?** Check if there's a Tauri cache that needs clearing

## HOW TO BUILD
```bash
cd E:/Ace/command-mobile2
rm -rf .next out
npm run build
# Verify out/ has fresh timestamps:
ls -la out/index.html
# Then build APK:
cargo tauri android build --apk
# APK lands at:
# src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
# Copy to easy location:
cp src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk E:/Ace/ChaosCommand-mobile.apk
```

## SERVE TO PHONE
```bash
cd E:/Ace && python -m http.server 9876 --bind 0.0.0.0
# Phone downloads from: http://192.168.4.140:9876/ChaosCommand-mobile.apk
```

## SIGNING
- Keystore: C:\keysRen.jks
- Alias: key1 (NOT keys1!)
- Store password: 12151215
- Key password: 25322532
- Config: src-tauri/gen/android/keystore.properties

## REPOS
- command-mobile2: mobile build clone (has Android gen/ folder)
- CommandTauri-Working: main desktop repo (synced with same fixes)
- Both should have identical source files (synced via cp)
