// 📱🧊 check_android_target.mjs — CHA-685, night shift 2026-09-29.
//
// WHY THIS EXISTS: `src-tauri/gen/` is GITIGNORED. The targetSdk bump 35 -> 36 that
// Google Play has required for ALL updates since 2026-08-31 lives only in
// gen/android/app/build.gradle.kts on whichever disk last touched it. Regenerate the
// Android project (`tauri android init`) and it silently goes back to the template's
// number — and Play rejects the upload, AFTER a 20-minute build. That's a frozen chart:
// the build REMEMBERED a fact about the world instead of CHECKING it.
//
// So this runs as `prebuild` and ASSERTS the number. Loud, early, before the long part.
//
// No gen/android folder (web/desktop/tryme builds)?  -> nothing to check, exit 0 quietly.
// Can't find targetSdk in the file?                  -> say COULD NOT CHECK and fail.
//   (A check that can't find its thing is not a pass. 🐙)
//
// When Google raises the floor again, change PLAY_MIN_TARGET_SDK and re-read
// https://support.google.com/googleplay/android-developer/answer/11926878

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const PLAY_MIN_TARGET_SDK = 36 // Google Play, new apps AND updates, since 2026-08-31
const gradle_file = join("src-tauri", "gen", "android", "app", "build.gradle.kts")

if (!existsSync(gradle_file)) process.exit(0) // not an Android build — nothing to guard

const gradle_text = readFileSync(gradle_file, "utf8")
const found_target = gradle_text.match(/targetSdk\s*=\s*(\d+)/)
const found_compile = gradle_text.match(/compileSdk\s*=\s*(\d+)/)

if (!found_target || !found_compile) {
  console.error(`🚨 check_android_target: COULD NOT CHECK — no targetSdk/compileSdk line in ${gradle_file}. Not a pass.`)
  process.exit(1)
}

const target_sdk = Number(found_target[1])
const compile_sdk = Number(found_compile[1])

if (target_sdk < PLAY_MIN_TARGET_SDK || compile_sdk < target_sdk) {
  console.error(
    `🚨 check_android_target: targetSdk=${target_sdk}, compileSdk=${compile_sdk}. ` +
      `Google Play needs targetSdk >= ${PLAY_MIN_TARGET_SDK} (and compileSdk >= targetSdk).\n` +
      `   Fix ${gradle_file} (gen/ is gitignored, so a regenerate reverts it). ` +
      `AGP 8.5.1 also wants android.suppressUnsupportedCompileSdk=${compile_sdk} in gradle.properties.`
  )
  process.exit(1)
}

console.log(`✅ check_android_target: targetSdk ${target_sdk} / compileSdk ${compile_sdk} (Play floor ${PLAY_MIN_TARGET_SDK}).`)
