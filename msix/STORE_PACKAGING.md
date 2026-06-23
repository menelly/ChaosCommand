# Chaos Command — Microsoft Store packaging reference

Tauri emits MSI + NSIS, not MSIX. The Microsoft Store wants MSIX. `build-msix.ps1`
wraps the already-built Tauri release exe into a Store-ready `.msix` with
`makeappx` (Windows SDK). **Microsoft re-signs on submission — no code-signing
cert needed** (same as the Chaos Clean-Up pipeline).

## Build
```powershell
# 1. Build the Tauri Windows release first (produces src-tauri/target/release/app.exe)
pnpm tauri build
# 2. Package it
powershell -ExecutionPolicy Bypass -File msix/build-msix.ps1
# → msix/dist/ChaosCommand_<ver>_x64.msix
```

## Package identity (must match Partner Center)
The package `Identity/Name` MUST exactly match the value on the app's
**Partner Center → Chaos Command → Product → Product identity** page, or the
upload is rejected.

- **Identity / Name:** `SiliconScaffolding.ChaosCommand`  ⚠️ *best-guess default —
  CONFIRM against Partner Center, then rebuild if different:*
  `build-msix.ps1 -IdentityName '<exact value>'`
- **Identity / Publisher:** `CN=145755AB-EA61-4CC8-ACEB-A9ED6BC641A8`
  (per-account — reused from Chaos Clean-Up's Silicon Scaffolding Partner Center.
  Only differs if Command is under a *different* seller account.)
- **PublisherDisplayName:** `Silicon Scaffolding`
- **Version:** 4-part, revision must be `0` (e.g. `1.0.0.0`)

## Notes / gotchas
- **runFullTrust**: this is a full-trust Win32 (Tauri) app packaged as MSIX via
  `EntryPoint="Windows.FullTrustApplication"` + the `runFullTrust` restricted
  capability. Standard for desktop-bridge apps; allowed in the Store.
- **WebView2 dependency**: Tauri uses the WebView2 runtime. Present on Win11 and
  most Win10. If cert flags a missing runtime, declare/bundle the Evergreen
  bootstrapper — but usually it just passes.
- **No Wide310x150 / Square310x310 tiles**: Tauri didn't generate a wide tile, so
  the DefaultTile uses only the small (71x71) tile. Adding a `Wide310x150Logo.png`
  to `src-tauri/icons` would let us restore the large tile in the manifest.
- **arm64**: only an x64 exe is built today. arm64 would need a separate Tauri
  arm64 cross-build; optional for v1 (x64 covers the vast majority of desktops).
