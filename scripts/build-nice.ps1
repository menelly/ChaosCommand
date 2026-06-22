<#
  build-nice.ps1 - build Chaos Command WITHOUT murdering Ren's desktop.

  Born 2026-06-14, after Ren out-debugged Ace: builds were freezing the whole
  computer, and it wasn't code size - it was .next/cache/webpack quietly
  compounding to ~900 MB across builds. Every `next build` then deserialized
  300 MB cache packs into Node's heap (memory spike) while pegging every core
  (CPU starvation) -> taskbar + mouse freeze.

  This wrapper kills both causes:
    1. Clears .next first  -> webpack cache can't balloon, next build stays bounded.
    2. Runs at IDLE priority -> the build yields CPU to the desktop, so the UI
       stays responsive even while every core is busy.

  ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 as the ANSI codepage
  unless the file has a BOM, so UTF-8 punctuation/emoji broke the parser when run
  without pwsh (which isn't installed on this box). Keep it plain ASCII.

  Usage (from the command-mobile2 folder):
    powershell -File scripts\build-nice.ps1                  # desktop .exe/.msi
    powershell -File scripts\build-nice.ps1 -Target android  # .apk
    powershell -File scripts\build-nice.ps1 -Target both     # desktop then android
#>

param(
  [ValidateSet('desktop','android','both')]
  [string]$Target = 'desktop',
  # -Store builds the STORE edition: trial + entitlement gating ON. WITHOUT it,
  # the build is the FREE source edition (unlocked, no gating) - that's what the
  # public GitHub build is, so "free if you build from source" stays true.
  [switch]$Store
)

$ErrorActionPreference = 'Stop'
# Project root = parent of this script's folder
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($Store) {
  $env:NEXT_PUBLIC_STORE_BUILD = 'true'
  Write-Host "STORE edition: trial + entitlement gating is ON." -ForegroundColor Yellow
} else {
  $env:NEXT_PUBLIC_STORE_BUILD = ''
  Write-Host "FREE/source edition: fully unlocked, no gating (the public-GitHub build)." -ForegroundColor Cyan
}

function Clear-NextCache {
  if (Test-Path "$root\.next") {
    $mb = [math]::Round((Get-ChildItem "$root\.next" -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB)
    Write-Host "Clearing .next (was $mb MB) so the webpack cache can't balloon..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force "$root\.next" -ErrorAction SilentlyContinue
  }
}

function Invoke-NiceBuild([string]$label, [string]$cmd) {
  Write-Host "==> $label  (IDLE priority - your desktop stays responsive)" -ForegroundColor Green
  $p = Start-Process cmd.exe -ArgumentList '/c', $cmd -PassThru -NoNewWindow
  # Cache the handle BEFORE waiting. Without this, Start-Process -PassThru leaves
  # $p.ExitCode null after the process exits (a long-standing PowerShell bug), so
  # `($p.ExitCode -ne 0)` was true even on a clean build and threw a false failure
  # AFTER both installers were already produced. Caching .Handle makes ExitCode
  # populate correctly.
  $null = $p.Handle
  try { $p.PriorityClass = 'Idle' } catch { Write-Warning "couldn't set Idle priority: $_" }
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "$label failed (exit $($p.ExitCode))" }
  Write-Host "==> $label done." -ForegroundColor Green
}

Clear-NextCache

if ($Target -in 'desktop','both') {
  Invoke-NiceBuild 'Desktop build (.exe/.msi)' 'npm run tauri:build'
}
if ($Target -in 'android','both') {
  # Android runs its own next build; clear again so the second build is clean too.
  Clear-NextCache
  Invoke-NiceBuild 'Android build (.apk)' 'npx tauri android build --apk'
}

Write-Host "`nAll done. Desktop survived." -ForegroundColor Magenta
