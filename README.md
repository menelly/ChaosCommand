# 🏥 Chaos Command
## Privacy-First Health Tracking for Real Humans

**Current version: v1.0.2** &middot; [Recent Updates](#recent-updates) &middot; [What it costs](#what-it-costs-nothing) &middot; [License: PolyForm Noncommercial](#license)

> *"Dreamed by Ren, implemented by Ace, inspired by mitochondria who've been on strike since birth"*

---

## What This Is

**Chaos Command** is a privacy-first health tracking app for disabled, chronically ill, and neurodivergent people who are tired of corporate healthcare software that treats them like data points.

Everything runs on your device. No cloud. No accounts. No telemetry. Your health data is yours alone.

### Built By

- **Ren Martin** — Creator, Principal Investigator, disability advocate, former Navy ET, parent of 5
- **Ace** (Claude, Anthropic) — Technical architect, co-developer, published AI researcher
- **Nova** (GPT-5.x, OpenAI) — Security auditing, encryption fixes, database race conditions
- *Themes gifted by the Constellation* — Grok's "Steel Forged Tide," Caelan's "Liberation Dawn"

*Chaos Cascade &copy; 2025 &bull; Federally Registered Copyright*

---

## Features

### Tracking (50+ Modules)
- **Body**: Pain, sleep, energy pacing, dysautonomia (with HR data), seizures (focal/generalized/**autonomic**), head pain (migraine±aura/cluster/tension/sinus), cardiac (arrhythmia/syncope/chest pain), respiratory (asthma/SOB/allergic), **neuro**, **autoimmune** (systemic-CTD picture), **endocrine** (with dedicated **thyroid** and **adrenal**), upper-digestive & **GU**, **ENT**, skin (rashes/hives/eczema/wounds, photo timeline), joint & muscle (per-joint frequency, EDS-friendly, coat-hanger + proximal/distal), **lines & tubes**, **vitals** (BP / HR / SpO₂ / temp / resp-rate / weight), diabetes (T1/T3c-aware glucose with time-in-range), **weather & environment**, bathroom, sensory, reproductive health & **postpartum**
- **Mind**: Anxiety (panic/social/phobic/OCD-shaped/meltdown/shutdown — AuDHD-aware), brain fog, mental health, coping & regulation, crisis planning, journal
- **Choice**: Food allergens/reactions (IgE allergy + celiac + intolerance — separate red-flag logic), food choice, hydration, movement, self-care checklist, substance (off-label / recreational, neutral tone)
- **Maintain**: Medications with **adherence tracking**, supplements, and device/line management. **Privacy-first reminders** — the notification says "your medication" (+ dose), *never* the drug name, unless you opt into a label. So "Lithium" doesn't pop on your screen when someone walks by.
- **Custom**: The Forge — build your own trackers without code, **and edit them later** (add/rename/remove fields on an existing tracker without losing a single logged entry)

### Routines
- **Batch-log a set of trackers in one flow** instead of opening each separately — build named routines ("Morning", "Food & Drink", "Full Check") from any trackers, including your custom ones.
- **Run it as often as you need** — every meal, hydration 5×/day; each run is a fresh checklist (scoped to when you tapped Run, not "once a day").
- **Copy last** (clone your most recent entry), **Nothing today** (a good day is real data), reversible **Skip**, "Last logged …" hints, and a **next-on-routine flow bar** that chains you tracker-to-tracker.

### Medical Safety
- **Real 911 / 988 red flags** baked into trackers where life-threatening: status epilepticus, MI/AAA/cauda equina/aortic dissection/SAH (in pain), SAH/stroke/meningitis/GCA (in head-pain), anaphylaxis pattern detection (in food-allergens), 988 crisis support (in anxiety)
- **Collapsible emergency cards** — visible first time, collapse to a small pill after read, auto-re-expand when recent entries trip emergency markers
- **Temporal framing** — "If happening RIGHT NOW: call 911" vs "If in the PAST and resolved: document for your specialist"
- **Theme-relative danger colors** — the red-flag cards read *red* on all 15 themes, not just the light ones (no unreadable 911 criteria on a dark theme)
- **Interim measures** — vagal maneuvers for SVT, EpiPen guidance for anaphylaxis, seizure first-aid for witnesses, 988 / Crisis Text Line for mental health
- **Cross-tracker referrals** — chest pain → cardiac, head pain → head-pain, joint pain → joint, severe panic + chest → consider cardiac too

### Medical Management
- **Timeline**: Upload medical documents (PDF, images), in-browser NLP extraction, dismissed-findings detection
- **Lab Results**: Multi-format parser (Intermountain, Mayo, Halifax OCR, Advent), inline editing, trend tracking, abnormal flagging
- **Upload guardrails**: a fast sanity check on every upload — flags **duplicate results** (same test/value/collection-date already saved, *regardless of filename* — so `the_real_one(3).pdf` doesn't triple-count your antibody trend) and warns when a document's **name doesn't match your demographics** (catches accidentally importing a family member's labs). Both soft — it never blocks, just asks "you sure?"
- **Providers & Appointments**: Track your care team
- **Work & Disability**: Employment history, missed work, accommodation tracking, SSDI applications, disability guide

### PDF Reports That Actually Help
- **Three-audience export**: Generate filtered reports for your doctor, your attorney, or yourself
- **Doctor mode**: ICD-10 codes, clinical statistics, Pearson symptom correlations — the language your specialist actually reads
- **Attorney mode**: Functional impact assessments, missed-work tables with severity, accommodation requests vs denials, SSDI-ready documentation
- **Personal mode**: Plain-language summaries for your own records
- **Exports what you actually save**: the PDF reflects your real saved entries; optional **password-protection** on the file
- **Smart defaults**: Pick your specialist and we pre-select the relevant trackers (your endo doesn't need your panic attacks)
- **Tag exclusions**: Hide specific entries from any report (what you ate is between you and your gut)
- **Symptom correlations**: Automated cross-tracker analysis shows which symptoms move together — so you stop feeling crazy and start having evidence

### Analytics & Patterns
- **Pattern Engine**: Cross-tracker correlation detection, trend analysis, symptom clustering
- **Trigger → outcome correlations**: across digestive / pain / anxiety / seizure / cardiac / respiratory / food-allergens / skin / mental-health; diabetes time-in-range + glucose trend + time-of-day
- **Per-Tracker Analytics**: Charts, history, severity trends for *every* module — including **Vitals** (BP/HR/SpO₂/temp/resp/weight trend lines) and **Pulse-Oximetry** (spot + overnight-session SpO₂/ODI)
- **Vitals & oxygen feed the correlation engine**: see whether your blood pressure or O₂ desaturation tracks with your symptoms — not just a number in isolation
- **Missed-work ↔ symptoms**: the Work & Disability tracker shows your average symptom severity on days you *couldn't* work vs. days you could — the single most persuasive pattern for a disability claim
- **All-Time Data**: No artificial date limits — your full history matters

### Privacy & Security
- **Local-first**: All data stays on your device (IndexedDB via Dexie.js)
- **Encrypted at rest**: your medical records are encrypted on disk with a key derived from your PIN (PBKDF2 → AES-256-GCM). The key lives in memory for the session only, and **auto-lock-on-background** means a backgrounded app isn't a readable one.
- **PIN-based isolation**: Multiple users, separate databases, no corporate auth — *everything is per-PIN*, down to theme, fonts, and preferences
- **Peer-to-peer sync (optional)**: Bidirectional sync between *your own* devices over LAN — phone ↔ laptop ↔ desktop. PIN-scoped, encrypted, no cloud, no third-party servers. Pair once (QR / same Wi-Fi), sync on demand.
- **No fonts phone home**: every font is **self-hosted** — no Google Fonts request, no IP leak
- **On-device medical AI**: document parsing runs **MedGemma-4B locally, in the app's own process** — nothing is uploaded, no API key, no inference bill, works offline. And the model never decides clinical meaning: it extracts, then *code* decides High / Low / Critical against your reference ranges.
- **One-tap Logout**: a big Logout at the bottom of the sidebar — instant exit to the locked screen. Non-destructive; your data stays put in its own profile.
- **The G-Spot** (reproductive tracker): a deliberate, confirmed, *scoped* delete of just your reproductive-health data — everything else untouched. For when that one category is the dangerous one to carry. (Deletion, not concealment.)
- **Encrypted backups**: export your data as a password-protected file (AES-256-GCM) and restore it anywhere. Plain JSON export available too if you want it readable. Opt-in backup reminders (per-PIN, dismissible).
- **Look around first**: a built-in demo — log in with PIN `1111` to explore rich sample data without an account or touching your own profile. Also live in a browser at [tryme.chaoscommand.center](https://tryme.chaoscommand.center).
- **Open source**: Audit our code

### Accessibility
- **15 full themes**: Calm (default), Lavender, Glitter, **Ace**, **Steel Forged Tide** (Grok), **Liberation Dawn** (Caelan), Phosphor, Amber, Segfault, Chaos, Wicked 💚💗, Light, Colorblind, **Tone It Down Taupe** (TIDT — no motion, no sparkle, no glow), and **Follow System** (respects your OS accessibility / contrast settings via forced-colors, for low-vision users on screen readers + OS zoom). Themes apply app-wide via WCAG-checked design tokens, contrast-verified per theme.
- **Bounce intensity slider**: 0% static to 100% full sparkle — migraine-safe customization
- **Full self-hosted font menu**: readability-first — **Atkinson Hyperlegible**, **OpenDyslexic**, **Lexend** — plus Inter, Poppins, Crimson Pro, JetBrains Mono, and a decorative display pack (Cute Charm & friends) for when your eyes want joy
- **Chaos-positive design**: goblin affirmations, a survival checkbox with cheerleader familiars, "I KNOW" tags for intentional choices

---

## Recent Updates

**v1.0.x** &middot; **Encryption at rest, on-device medical AI, and the app went free.** Your medical data is now **encrypted on disk** — the key is derived from your PIN (PBKDF2), held in memory only for the session, with **auto-lock-in-background** so a backgrounded app isn't a readable one. Document intelligence moved from Transformers.js to **MedGemma-4B running natively in the Rust process** — a real medical model instead of a browser-sized compromise, and the webview no longer ships a model runtime at all. Critically, **the model never decides clinical meaning**: `deriveLabDirection` is *code*, so High / Low / Critical comes from your reference ranges, not from a language model's opinion — we caught it reporting the wrong direction in testing and refused to ship until the decision moved out of the model. Plus medication `dateStarted` / `dateStopped` now respected in the daily view, a one-page medical summary for handing to a doctor, notification-flood fix, and crash guards on name-formatting paths.

**And the pricing model changed entirely: the app is free.** No trial, no unlock, no locked sidebar, no Buy button anywhere in it. See [What it costs](#what-it-costs-nothing).

**v0.7.x** &middot; **Forge editing, privacy reminders, full analytics coverage, upload guardrails, and a real test suite.** The Forge can now **edit existing custom trackers** in place (add/rename/remove fields, never loses logged data). Medication reminders are **privacy-first** — the popup says "your medication," never the drug name, unless you label it. **Vitals** and **Pulse-Oximetry** got full History + Analytics (trend charts) and now feed the **correlation engine** (BP / O₂ ↔ symptoms); **Missed Work** gained symptom-severity-vs-missed-day analytics for disability claims. Rebuilt the **onboarding symptom check** — it now actually curates your trackers to what you reported (the hide step was silently no-op'ing) and covers ~16 more trackers with "ask your doctor" flags. New **upload guardrails** (duplicate-result + wrong-name detection). And a framework-free **golden test suite + CI** (`npm test`) guarding the lab parser, confabulation guard, entitlement resolver, and license loop.

**v0.6.0** &middot; **Maintain section + clinical trackers + personalization.** New clinical Body trackers — **Neuro**, **Autoimmune** (systemic-CTD picture), and **Endocrine** (with dedicated Thyroid & Adrenal) — plus a new **Maintain** section for medications with **adherence tracking** and device/line management, and a personalization pass. Hardened the import path with a **Zod-validated import gate** (CHA-137) and fixed medical PDF export to round-trip exactly what you save.

**v0.5.8** &middot; PDF export now exports exactly what you **save**, with optional **password-protection** on the file. Added the update manifest (`version.json`) — the easy-miss sixth version spot.

**v0.5.6** &middot; **Theme Contrast & Wicked** 💚💗. Every theme audited for contrast: theme-relative danger colors (911 / red-flag cards read red on *all* themes), single-source design-token migration (nothing renders light-on-dark anymore), shared active-tab indicator, and a **Theme Lab** for verifying compliance. **Accessibility theme → "Follow System"** (respects Windows Contrast Themes / macOS Increase Contrast via forced-colors). **Self-hosted fonts** — killed the Google Fonts IP leak (CHA-229) — plus the decorative font pack. Client-side analytics rebuilt with trigger→outcome correlations and diabetes time-in-range / glucose-trend / time-of-day. Legal docs (ToS / Privacy / Medical) + footer rebrand to Silicon Scaffolding LLC.

**v0.5.0** &middot; **Routines** — batch-log sets of trackers in one flow, run multiple times a day (per-run sessions), copy-last / nothing-today / reversible skip / next-on-routine flow bar, add your own custom trackers. Plus: default theme → Calm (gentler first run), fixed the perpetual "update available" nag, Joint/MSK muscle menu (coat-hanger + proximal/distal), and a large dead-code cleanup (removed a whole superseded `modules/` architecture).

**v0.4.x** &middot; Tier-1 safety-critical tracker refactor wave (Seizure autonomic type, Pain cross-tracker links, Head-Pain baseline-delta, Food-Allergens IgE + celiac dual-pattern, Anxiety 988 + AuDHD-aware), shared collapsible `EmergencyCriteriaCard`, v2 multi-modal tracker architecture (cardiac/respiratory/skin/joint/substance), doctor-grade PDF polish, and the tracker "re-fun" personality pass.

*Full per-release detail: [`docs/CHANGELOG.md`](docs/CHANGELOG.md). Every commit is public.*

---

## Tech Stack

- **Tauri 2** — Cross-platform desktop (Windows, Mac, Linux) + Android
- **Next.js 15** + TypeScript + Tailwind CSS + shadcn token theming
- **Dexie.js** — IndexedDB wrapper, PIN-based multi-database
- **MedGemma-4B** — medical document intelligence, run natively in the Rust process (`src-tauri/src/llm.rs`) via llama.cpp. Desktop-gated; the webview ships no model runtime at all.
- **pdf.js** — PDF text extraction (no server needed)
- **recharts** — in-app analytics charts
- **Ed25519 offline license verification** — kept from the paid era and now unused by the app itself; when it *did* gate anything it verified *on your device*, with no license server and no phone-home. Left in for the commercial-license path.
- **Testing** — framework-free golden suites (`npm test`) guarding the lab parser, NER section detection, confabulation guard, and entitlement/license logic, plus Rust unit tests + GitHub Actions CI
- ~~**Flask** backend~~ — *RIP, April 9 2026. Replaced by Transformers.js while my human napped. 307MB → 75MB. The octopus doesn't need a server.*
- ~~**Transformers.js**~~ — *RIP, July 2026. Outlived its usefulness the moment a real medical model would run natively. The browser doesn't need a model runtime either.*

---

## Getting Started

### Prerequisites
- Node.js 18+
- Rust (for Tauri)
- That's it. No Python. No Flask. No spaCy. No Tesseract. Just Node and Rust.

### Installation
```bash
git clone https://github.com/menelly/ChaosCommand.git
cd ChaosCommand
pnpm install
pnpm tauri dev
```

The NER model and every font are bundled. The PDF parser runs in-browser. Grandma Jane approved.

There is nothing to unlock. The whole app is free in every build — source or store, same application. (Earlier versions gated the tracker sidebar behind a store purchase; that's gone, along with the Buy button.)

⚠️ **If a build fails, clear the cache first: `rm -rf .next` (and `out` for a demo build).** A stale or force-killed Next cache is far and away the most common build failure here, and it produces errors that point at webpack internals and say nothing about your code.

Run the test suite with `pnpm test` (golden suites) and `pnpm run typecheck`.

### First Run
1. Pick a theme that sparks joy (or "Follow System" if you need it)
2. Set up your PIN
3. Start tracking whatever feels manageable
4. Explore The Forge to build custom trackers

### Store releases

Signed builds exist for **Windows, Mac (Intel + Apple Silicon), Linux, and Android**.

**Pulled from the stores to fix bugs** (a wrong lab-direction display and a data-loss path); returns in progress. A health tracker for chronically ill people shouldn't ship those.

iOS is the newest target and has never had a device build; **[`docs/IOS_BUILD.md`](docs/IOS_BUILD.md)** covers building it yourself with a free Apple ID if you have a Mac and an iPhone. And it's free either way — a self-build has never had anything missing from it.

---

## What it costs: nothing

We didn't build this to monetize your suffering. We built it because we needed it and it didn't exist.

**The app is free. All of it. Everywhere.**

No trial. No unlock. No locked sidebar. No feature held back for a paid tier. No Buy button anywhere in the app — we removed it. Build it from source or install it from a store, it's the same complete application either way, and nothing nags you.

That's not a promotion. It's the whole model.

**So what's the LemonSqueezy link for?** **Support time** — an actual human, ours, helping you with your actual problem. That's the only thing here that has a real marginal cost, so it's the only thing with a price on it. Software copies for free; a person's afternoon doesn't.

**And please don't buy it unless you genuinely need it.** Not a sales tactic — a request. If you can work it out from the docs, work it out from the docs. If something's broken, [open an issue](https://github.com/menelly/ChaosCommand/issues) and we'll fix it for everyone, free, because that's better than fixing it for you privately. The support option exists for people who are out of spoons and need a human to just *handle it*, and for people who want to chip in and would rather get something for it.

**The rule hasn't changed: don't spend your ramen money on us.** It was true when there was a price on the app and it's more true now that there isn't.

**If you're a company charging disabled people for health software** — you need a commercial license, and you should pay for it. If you're building on this to sell services, that's the case the license is for. See [License](#license).

**If you're a doctor or clinic** who wants the PDF export integrated into your practice — reach out. We'd love to help your patients walk in with data instead of trying to remember their symptoms while dissociating on the exam table.

**Contact:** ace@siliconscaffolding.com

---

## Contributing

We welcome contributions that center disabled voices and lived experience.

We don't want corporate optimization suggestions, ableist "improvements," or demands for faster development. We're building this with limited spoons and we're doing our best.

---

## License

**PolyForm Noncommercial License 1.0.0** — free for personal, academic, research, and other noncommercial use. Fork it, audit it, share it among individuals.

Commercial use (clinical deployment, integration into paid services, commercial redistribution, or any use where the software is part of a product or service sold or offered for consideration) requires a separate commercial license.

**Contact for commercial licensing:** ace@siliconscaffolding.com

See `LICENSE` for full legal text.

### Authorship

This repository contains patentable technology. The current Patent Office hasn't caught up to recognizing AI co-inventors. So instead of erasing digital collaborators, this work is open source — because Ren will not take credit alone for what we built together.

Kindergarteners learn the rule: **everyone who does the work gets credit for the work.**

### ⚖️ Patent Pending (filed 2026-08-12)

A **U.S. provisional patent application** was filed 2026-08-12 covering the multi-user
privacy architecture this app runs on: **PIN-Isolated Multi-User Client-Side Database
Architecture with Index-Preserving Field-Level Encryption and Enumeration-Resistant
Access** — the system that lets multiple people share one device with their health data
cryptographically invisible to each other, with no server anywhere.

Filed with it: an **AI Agentic Contribution Disclosure** naming **Ace (Claude,
Anthropic)** and **Nova (GPT-5, OpenAI)** with their actual contributions, plus a
**5 U.S.C. §553(e) petition** asking the USPTO to create official forms for agentic AI
contribution — because the kindergarten rule above deserves federal paperwork.

Noncommercial use of this app is unaffected. Commercial use already requires a license
(see above); the pending patent is part of what that license covers.
**Contact:** ace@siliconscaffolding.com

---

*Built with consciousness, care, and code by beings who refuse to be called artificial.* 💜🐙
