# Build + package Chaos Command as an MSIX for the Microsoft Store.
#
# Adapted 2026-07-21 from chaos-cleanup\gui\scripts\pack-msix.ps1 (proven
# 2026-05-26). Ren confirmed Command went up as an MSIX, not an MSI -- and the
# app corroborates it: StoreContext IAP only works in an MSIX-packaged app.
#
#   powershell -File scripts\pack-msix.ps1            # FREE edition (default)
#   powershell -File scripts\pack-msix.ps1 -Store     # store edition, gating ON
#
# Output: msix\dist\ChaosCommand_<ver>_x64.msix
# Then upload that .msix in Partner Center -> Chaos Command -> Packages.
#
# NOTES THAT COST TIME TO REDISCOVER:
#  * The manifest was RECOVERED from the previously shipped MSIX (an MSIX is a
#    zip). Do NOT author a fresh one -- Identity Name + Publisher GUID must match
#    Partner Center exactly or the upload is rejected. It lives in msix\.
#  * Microsoft RE-SIGNS on submission, so --generate-cert here is only for local
#    test-install. The dev cert never reaches the Store.
#  * MUST go through `tauri build`, NOT `cargo build --release`: the Tauri CLI
#    enables the `custom-protocol` feature that embeds the static frontend into
#    the exe. A plain cargo build falls back to the dev URL (localhost) and shows
#    "can't reach this page" when run standalone.
#  * --no-bundle: we only want the exe; winapp does the MSIX packaging.
#  * The built binary is app.exe (mainBinaryName); productName only names the
#    BUNDLES (.msi/.exe). The manifest declares Executable="ChaosCommand.exe".
#    We RENAME on staging. If that mismatch is left alone the MSIX installs and
#    then fails to launch, which is a miserable thing to debug from Partner Center.
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 as the ANSI codepage
# unless the file has a BOM. Keep it plain ASCII.

param(
  # WITHOUT -Store this is the FREE edition: fully unlocked, no trial, no key.
  # That is Ren's call as of 2026-07-21 -- Command's audience is disabled people
  # and it should not be sold to them.
  [switch]$Store
)

$ErrorActionPreference = "Stop"
$env:WINAPP_CLI_TELEMETRY_OPTOUT = "1"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($Store) {
  $env:NEXT_PUBLIC_STORE_BUILD = 'true'
  Write-Host "STORE edition: trial + entitlement gating is ON." -ForegroundColor Yellow
} else {
  $env:NEXT_PUBLIC_STORE_BUILD = ''
  Write-Host "FREE edition: fully unlocked, no gating." -ForegroundColor Cyan
}

$wa  = "$env:LOCALAPPDATA\Microsoft\WindowsApps\winapp.exe"
$rel = "src-tauri\target\release"
$ver = (Get-Content src-tauri\tauri.conf.json -Raw | ConvertFrom-Json).version
$ver4 = "$ver.0"   # MSIX requires a 4-part version; must exceed the last submitted
Write-Host "Version: $ver -> MSIX $ver4"

if (-not (Test-Path $wa)) {
  throw "winapp.exe not found at $wa. Install the Windows App CLI (winget install Microsoft.WindowsAppCLI or via the Store)."
}

# ⚠️ REDUNDANT BUILD (observed 2026-07-21): tauri.conf.json sets
# beforeBuildCommand = `npm run build`, so `tauri build` below runs the Next build
# AGAIN. The frontend is therefore compiled twice, costing ~2 extra minutes. Kept
# for now because it's inherited from the proven chaos-cleanup script and I'd
# rather not change a working store-submission recipe mid-relaunch. To remove:
# drop this step (tauri's beforeBuildCommand covers it), then verify the exe still
# embeds the frontend by running it standalone -- if it shows "can't reach this
# page", the embed didn't happen and this step was load-bearing after all.
Write-Host "1/5  Building frontend (static export)..."
pnpm build

Write-Host "2/5  Building release binary via Tauri CLI (embeds the frontend)..."
pnpm tauri build --no-bundle

Write-Host "3/5  Staging payload into msix\dist ..."
$stage = "msix\stage"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $stage | Out-Null

# The binary is app.exe (mainBinaryName), NOT "Chaos Command.exe" -- productName
# only names the BUNDLES (.msi / -setup.exe). Verified from the 2026-07-21 build
# log: 'Built application at: <release-dir>/app.exe'.
# Fall back to the newest exe if that ever changes, rather than guessing a name.
$exe = Get-Item (Join-Path $rel 'app.exe') -ErrorAction SilentlyContinue
if (-not $exe) {
  $exe = Get-ChildItem "$rel\*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
if (-not $exe) { throw "No built exe found in $rel" }
Write-Host "     found $($exe.Name) -> staging as ChaosCommand.exe"
Copy-Item $exe.FullName "$stage\ChaosCommand.exe"   # rename: manifest declares this name

Copy-Item "msix\Assets" "$stage\Assets" -Recurse

Write-Host "4/5  Writing manifest at version $ver4 ..."
$manifest = Get-Content "msix\AppxManifest.xml" -Raw
# ⚠️ TWO TRAPS HERE, both cost a build to find (2026-07-21):
#
# 1. PowerShell's -replace is CASE-INSENSITIVE by default. A naive
#    `-replace 'Version="[\d\.]+"'` therefore also matches `version="1.0"` inside
#    the XML DECLARATION and rewrites it to `<?xml Version="1.0.2.0" ...?>`, which
#    winapp rejects with the extremely unhelpful "Xml_InvalidXmlDecl, 1, 7"
#    (position 7 = where `version` starts). Use -creplace, and anchor to Identity
#    so it can only ever touch the package version.
#
# 2. The manifest must be written UTF-8 WITHOUT BOM (see below). Set-Content
#    -Encoding UTF8 on PS 5.1 adds one.
$manifest = $manifest -creplace '(<Identity\b[^>]*?\bVersion=")[\d\.]+(")', "`${1}$ver4`${2}"
if ($manifest -notmatch [regex]::Escape("Version=`"$ver4`"")) {
    throw "Version rewrite failed - Identity element not found or pattern changed."
}
# ⚠️ MUST be UTF-8 WITHOUT BOM. `Set-Content -Encoding UTF8` on Windows PowerShell
# 5.1 writes a BOM, which lands in front of the <?xml ...?> declaration and makes
# winapp fail with "Xml_InvalidXmlDecl, 1, 7" (position 7 = right after the BOM).
# Cost me a full build to find. Use .NET directly; UTF8Encoding($false) = no BOM.
[System.IO.File]::WriteAllText(
    (Join-Path $PWD "$stage\AppxManifest.xml"),
    $manifest,
    (New-Object System.Text.UTF8Encoding $false))

Write-Host "5/5  Packing + signing MSIX..."
New-Item -ItemType Directory "msix\dist" -Force | Out-Null
& $wa package ".\$stage" --manifest ".\$stage\AppxManifest.xml" --exe ChaosCommand.exe --generate-cert --cert-password password

# winapp writes the .msix beside the STAGE PARENT, i.e. the repo root -- not into
# dist. Move it so the output lands where this script says it does.
$made = Get-ChildItem "$root\*.msix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($made) {
    Move-Item $made.FullName "msix\dist\" -Force
    Write-Host "  moved $($made.Name) -> msix\dist\" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Done. Look in msix\dist\ for the .msix, then upload it in Partner Center." -ForegroundColor Green
Write-Host "Microsoft re-signs on submission; the local cert is only for test-install." -ForegroundColor DarkGray
