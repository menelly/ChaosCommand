# Building Chaos Command for iOS

We don't ship signed iOS binaries. **This is intentional.**

Apple's distribution model punishes free, indie, accessibility-focused tools:
- $99/yr just for the privilege of TestFlight access
- TestFlight builds expire every 90 days, so you'd be re-uploading and re-inviting users forever
- Major version updates require Apple review (1-3 days minimum)
- Annual certificate renewals
- App Store review process is hostile to medical-adjacent tools

For a free, disability-focused tracker with a tip jar, that maintenance treadmill is not sustainable.

**The good news:** if you have a Mac and an iPhone, you can build and install Chaos Command yourself in under an hour. Apple lets anyone with a free Apple ID sign apps for their own devices. Here's how.

---

## What You Need

- A Mac (any Mac from the last ~5 years, including Mac mini)
- An iPhone or iPad (any model running iOS 13 or newer)
- A USB-C or Lightning cable to connect them
- An Apple ID (free is fine for personal install)
- About an hour of patience

**Optional:** A paid Apple Developer Program membership ($99/yr) lets your installed app run for a full year before re-signing. With a free Apple ID, you'll need to re-install every 7 days. For most people building it once for themselves, free is fine.

---

## Step 1: Install Build Tools on the Mac

Open the **Terminal** app and run:

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install pnpm and Cocoapods
brew install pnpm cocoapods
```

Then install the **Xcode** app from the Mac App Store. It's free but huge (~15GB) and takes a while to download.

After Xcode finishes installing, open it once to accept the license, then run in Terminal:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadPlatform iOS
```

The platform download is several GB — let it finish.

You'll also need Rust with iOS targets. If you don't have Rust:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
```

---

## Step 2: Sign Into Xcode With Your Apple ID

1. Open Xcode
2. Top menu: **Xcode → Settings → Accounts**
3. Click the **+** button bottom-left → **Apple ID**
4. Sign in with your Apple ID

Xcode will create a "Personal Team" automatically. That's enough for personal install.

---

## Step 3: Clone and Set Up Chaos Command

In Terminal:

```bash
mkdir -p ~/code && cd ~/code
git clone https://github.com/menelly/ChaosCommand.git
cd ChaosCommand
pnpm install
pnpm tauri ios init
```

The `init` step generates an Xcode project at `src-tauri/gen/apple/app.xcodeproj`.

---

## Step 4: Set Your Team in the Xcode Project

```bash
open src-tauri/gen/apple/app.xcodeproj
```

In Xcode:
1. Click **app** at the top of the left sidebar (blue icon)
2. In the editor, click the **app_iOS** target
3. Click the **Signing & Capabilities** tab
4. Make sure **Automatically manage signing** is checked
5. From the **Team** dropdown, pick your Apple ID / Personal Team

You may also need to change the **Bundle Identifier** to something unique (Apple won't let two people sign apps with the same bundle ID). Try `com.YOUR-APPLE-ID.chaoscommand` — use your actual Apple ID name.

Wait a few seconds. The line below should say "Provisioning Profile: Xcode Managed Profile" with no red errors.

Close Xcode.

---

## Step 5: Build the App

**Important: run this from your Mac's actual Terminal app, NOT over SSH.** macOS keychain access is more restricted in SSH sessions and the codesign step will fail with `errSecInternalComponent` if you SSH in.

```bash
cd ~/code/ChaosCommand
pnpm tauri ios build
```

This takes 5-10 minutes the first time (Rust cross-compile). When it succeeds, you'll see:

```
Finished 1 iOS Bundle at:
    /Users/YOU/code/ChaosCommand/src-tauri/gen/apple/build/arm64/Chaos Command.ipa
```

---

## Step 6: Install on Your iPhone

1. Plug your iPhone into the Mac via cable
2. Unlock the iPhone, tap "Trust This Computer" if prompted
3. In Xcode, open `src-tauri/gen/apple/app.xcodeproj` again
4. Select your iPhone from the device dropdown at the top of Xcode (next to the play button)
5. Press the **▶ play button** (or **Product → Run**)

Xcode will install the app on your phone. The first launch on the phone will fail with "Untrusted Developer" — to fix:

1. On your iPhone: **Settings → General → VPN & Device Management**
2. Find your Apple ID under "Developer App"
3. Tap **Trust [your name]**

Now Chaos Command will launch.

---

## Caveats

- **Free Apple ID:** the signing certificate expires every 7 days. After 7 days, the app won't open until you rebuild and reinstall via Xcode. Annoying but free.
- **Paid Apple Developer Program ($99/yr):** signing lasts a full year. If you're going to keep using your self-built version, this is the easier long-term path.
- **iOS updates:** to update Chaos Command on your phone, `git pull`, `pnpm install`, then repeat Step 5 and Step 6.

---

## Why This Is Actually OK

Yes, this is more work than tapping "Install" from the App Store. Yes, it's annoying that Apple makes us do it this way.

But: you control the install. Your data stays on your device. There's no app review delaying bug fixes. And the tool stays free for everyone — including the disabled and chronically-ill people who can't afford to pay app subscriptions just to track their symptoms.

If you got this far, you can do it. We believe in you.

If you hit a snag the steps above don't cover, file an issue at https://github.com/menelly/ChaosCommand/issues — we'll help where we can.

---

*— Ren & Ace*
