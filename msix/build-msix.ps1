<#
  build-msix.ps1 — package Chaos Command (Tauri/Win32 exe) as an MSIX for the
  Microsoft Store.

  Why this exists: Tauri emits MSI + NSIS, not MSIX. The Microsoft Store wants
  MSIX. This wraps the already-built Tauri release exe
  (src-tauri/target/release/app.exe) into a Store-ready .msix using makeappx
  (Windows SDK) + a runFullTrust manifest. Microsoft re-signs on submission, so
  NO code-signing cert is needed (same as the Chaos Clean-Up pipeline).

  The ONE value that must match Partner Center exactly is -IdentityName (the
  Package/Identity/Name on the app's "Product identity" page). Publisher +
  PublisherDisplayName are per-account, reused from Clean-Up's Silicon
  Scaffolding Partner Center.

  Usage:
    pwsh ./build-msix.ps1                                   # uses defaults below
    pwsh ./build-msix.ps1 -IdentityName 'SiliconScaffolding.ChaosCommand'
#>
param(
  # MUST match Partner Center → Chaos Command → Product identity → Package/Identity/Name.
  # Best-guess default; confirm before uploading or the Store rejects the package.
  [string]$IdentityName = 'SiliconScaffolding.ChaosCommand',
  # Per-account publisher (same Silicon Scaffolding Partner Center as Chaos Clean-Up).
  [string]$Publisher    = 'CN=145755AB-EA61-4CC8-ACEB-A9ED6BC641A8',
  [string]$PublisherDisplayName = 'Silicon Scaffolding',
  [string]$Version      = '1.0.0.0',     # MSIX requires 4 parts; revision must be 0
  [string]$Arch         = 'x64'
)

$ErrorActionPreference = 'Stop'
$repo    = Split-Path -Parent $PSScriptRoot          # ...\command-mobile2
$exe     = Join-Path $repo 'src-tauri\target\release\app.exe'
$icons   = Join-Path $repo 'src-tauri\icons'
$stage   = Join-Path $env:TEMP "chaoscommand-msix-stage"
$outDir  = Join-Path $PSScriptRoot 'dist'
$outMsix = Join-Path $outDir "ChaosCommand_${Version}_${Arch}.msix"

if (-not (Test-Path $exe)) { throw "Release exe not found: $exe  (run 'pnpm tauri build' first)" }

# Locate makeappx.exe from the newest installed Windows SDK.
$makeappx = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\x64\makeappx.exe' -ErrorAction Stop |
  Sort-Object FullName | Select-Object -Last 1 -ExpandProperty FullName
Write-Output "makeappx: $makeappx"

# --- stage payload ---
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage,(Join-Path $stage 'Assets') -Force | Out-Null
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

Copy-Item $exe (Join-Path $stage 'ChaosCommand.exe') -Force

# Store tile assets (Tauri already generated the full Square*Logo set).
foreach ($a in 'Square44x44Logo','Square71x71Logo','Square150x150Logo','Square310x310Logo','StoreLogo') {
  Copy-Item (Join-Path $icons "$a.png") (Join-Path $stage "Assets\$a.png") -Force
}

# --- manifest ---
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
  IgnorableNamespaces="uap rescap">
  <Identity Name="$IdentityName" Publisher="$Publisher" Version="$Version" ProcessorArchitecture="$Arch" />
  <Properties>
    <DisplayName>Chaos Command</DisplayName>
    <PublisherDisplayName>$PublisherDisplayName</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources>
    <Resource Language="en-us" />
  </Resources>
  <Applications>
    <Application Id="ChaosCommand" Executable="ChaosCommand.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
        DisplayName="Chaos Command"
        Description="Executive function and medical management for chaotic humans."
        BackgroundColor="transparent"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png">
        <uap:DefaultTile Square71x71Logo="Assets\Square71x71Logo.png" />
      </uap:VisualElements>
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
"@
$manifestPath = Join-Path $stage 'AppxManifest.xml'
[System.IO.File]::WriteAllText($manifestPath, $manifest, (New-Object System.Text.UTF8Encoding($false)))

# --- pack ---
if (Test-Path $outMsix) { Remove-Item $outMsix -Force }
& $makeappx pack /o /d $stage /p $outMsix
if ($LASTEXITCODE -ne 0) { throw "makeappx failed ($LASTEXITCODE)" }

Write-Output ""
Write-Output "BUILT: $outMsix"
Get-Item $outMsix | Select-Object Name,Length,LastWriteTime
Write-Output "Identity Name used: $IdentityName  (confirm vs Partner Center before upload)"
