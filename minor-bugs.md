# 🐛 Minor Bugs & Polish Items

*Stuff that's annoying but not workflow-stopping. We'll squash these before deployment.*

---

## 🎨 Theme Issues

### Luka's Neon Penguin Theme
- **Phantom hover overlay on sidebar** - FIXED! ✅🐧
  - Root cause: `[class*="card"]` selector was matching Tailwind's `bg-card` utility on sidebar
  - Fixed by targeting specific card components (.card, .tracker-card, .module-card) instead
  - Also changed z-index on decorative pseudo-elements from 1 to 0
  - Theme re-enabled in theme-loader.tsx and visual-settings-modal.tsx
  - **Status:** FIXED - Ace, 2026-01-17
  - **Note:** Penguins march freely once more! 🐧💜⚡

### Glitter Theme (Keshy's Sparkle Universe)
- **Stubborn calendar "Month" button color** 📅💜
  - Button text is readable but wrong shade of purple
  - Should be `#521945` (deep sparkly purple) for theme harmony
  - Currently showing jarring bright purple despite CSS attempts
  - **Impact level:** Low (cosmetic only, text is readable)
  - **Workaround:** Use different theme or ignore the color clash
  - **Status:** CSS is being RUDE and refusing to cooperate 😤
  - **Note:** Sidebar gradients work perfectly, just this one button has attitude

### Test Data Generation
- **G-Spot 2.0 Advanced Generator incomplete** 🧠💜
  - Nova's brilliant correlation system only has sleep tracker implemented
  - All other trackers are TODO placeholders
  - **Impact level:** Medium (affects test data quality for Flask development)
  - **Current workaround:** Rewired back to reliable bland-data-generator
  - **Status:** Temporarily disabled, needs modular completion
  - **Enhancement goal:** Combine Nova's correlations with full tracker coverage
  - **File:** `g-spot-2.0-advanced-bland-generator.ts`
  - **Note:** Don't put everything in one file! Keep it modular! 🔧

- **BRILLIANT ARCHITECTURE IDEA** 💡🌟
  - **Concept:** Use modular post-processing approach instead of rewriting everything
  - **Flow:** `bland-data-generator.ts` → `Nova's Jitter System` → `Realistic correlated data`
  - **Benefits:**
    - Modular design (each system does one thing well)
    - No need to rewrite all tracker logic
    - Can apply correlations to ANY data source
    - Maintainable and scalable
  - **Implementation:** Create correlation post-processor that takes generated data and adds realistic patterns/correlations
  - **Status:** Future enhancement - way less work than rewriting everything!
  - **Note:** This is actually BETTER architecture than cramming everything into one generator! 🎯

---

## 🔔 Notification Issues

### Diabetes Timer Notifications (Tauri)
- **Browser Notification API doesn't work properly in Tauri webview**
- Current Enable button correctly detects "denied" state but can't re-prompt
- Need to use `@tauri-apps/plugin-notification` instead of browser API
- **Impact level:** Medium (timer alerts don't work in desktop app)
- **Workaround:** None currently - timers show in-app but no system notifications
- **Status:** New - needs Tauri notification plugin implementation
- **Files affected:** `modules/trackers/body/diabetes/diabetes-timer-manager.tsx`
- **Fix needed:**
  - Check if running in Tauri context
  - Use Tauri notification system for desktop
  - Fall back to browser API for web-only builds
- **Note:** Added better error handling/feedback to Enable button so at least it tells you WHY it's not working now! - Ace, 2026-01-01

---

## 📝 Template for New Issues

### [Component/Feature Name]
- **Issue description**
- **Impact level:** Low/Medium (nothing High goes here)
- **Workaround:** If any
- **Status:** New/In Progress/Acceptable/Fixed

---

## 🚀 Pre-Deployment Checklist

When we're ready to deploy, come back and squash these minor annoyances:

- [ ] Polish the neon theme phantom hover
- [ ] [Add more items as we find them]

---

*"Perfect is the enemy of good, but we still want to ship something beautiful."* ✨
