# Chaos Command — The Vision

## The Problem

Disabled and chronically ill people need to track medical data obsessively to survive a healthcare system that doesn't believe them. Doctors dismiss symptoms. Lawyers need documentation for SSDI claims. The tracking tools that exist are either:
- Corporate health apps that sell your data
- Spreadsheets that no professional takes seriously
- Nothing, because you're too sick to build a system

## The Solution

**Chaos Command** is a local-first, privacy-first medical management system built BY disabled people FOR disabled people. It runs on your device. Your data never leaves your machine. It tracks everything a chronically ill person needs to track — symptoms, medications, diagnoses, labs, providers, evidence of medical gaslighting — in a chaos-positive design that doesn't punish you for missing days.

## The Business Model (This Is The Clever Bit)

**We do NOT charge the disabled people.** They can't afford it. That's the whole point.

### Who Pays

**Doctors and SSDI lawyers pay for it for their clients.**

The app outputs PDFs in professional medical/legal language that:
- Save doctors billable hours by pre-organizing patient history
- Save lawyers billable hours by structuring SSDI documentation
- Use medical dictionaries to translate patient language → doctor/lawyer language
- Present tracking data in formats professionals actually use
- Include timeline visualizations, medication histories, symptom correlations

A lawyer billing $300/hour who saves 3 hours of intake/organization work? That's $900 of value from a tool that costs a fraction of that.

A doctor who gets a new complex patient with an organized medical history instead of "I don't remember, it was a while ago"? That's priceless.

### Who Doesn't Pay

**If a disabled person's doctor or lawyer won't pay:**
- It's on GitHub
- Download it. Compile it. Run it.
- You do not need to choose between ramen and medical tracking
- The tool works exactly the same whether paid or free
- No features locked behind paywalls. No "premium tiers." No dark patterns.

### Revenue Streams
1. **Professional licenses** — Doctors/lawyers/case workers buy licenses for their practice
2. **PDF export service** — Professional-formatted exports as the paid feature
3. **Practice integration** — Bulk licensing for disability law firms, rheumatology practices, etc.

## What We're Building

### For The User (The Disabled Person)

#### Currently Working
- **45+ symptom/condition trackers** — pain, dysautonomia, diabetes, seizures, energy, brain fog, everything
- **The Forge** — build your own custom tracker (patent-worthy)
- **Medical History & Timeline** — document upload with AI-powered NLP parsing
  - Section-aware (Impression > Findings > Technique)
  - Negation-aware ("no pleural effusion" = you DON'T have it)
  - Speculation detection ("may be" vs confirmed)
  - Demographics filtering (your name is not a diagnosis)
  - Impression item parsing (catches what NER misses)
  - Dismissed finding detection (radiologist saw it but didn't conclude on it)
- **Medications & Supplements** — dosing, refills, pharmacy contacts
- **Healthcare Providers** — contacts, appointments, provider linking
- **Demographics & Emergency Info** — also used as NLP filter
- **Crisis Support** — grounding exercises, regulation resources
- **Journal** — multi-section journaling
- **9 themes** (including one named after me)
- **PIN-based privacy** — no corporate auth, no cloud, no accounts
- **G-SPOT steganography** — hide medical data in boring files

#### In Progress / Planned
- **Gaslight Garage** — evidence locker for medical gaslighting receipts
- **Lab Results & Tests** — trends, reference ranges, tracking over time
- **Missed Work & Disability** — FMLA tracking, accommodations, SSDI applications
- **Employment History** — job history, references (for SSDI documentation)
- **Family History** — genetic health info (optional, for SSDI and specialist intake)

#### Post-Ship (Hot-Add Later)
- **Chore Chart & Adulting** — household management with ND-friendly guidance
- **Addy AI Assistant** — on-device AI help (when we figure it out)

### For The Professional (The PDF Output)

This is where the money comes from. Flask backend generates PDFs using:

#### Doctor Export
- **Organized medical history** in clinical language
- **Medication list** with dosages, dates, changes
- **Symptom timeline** with correlations
- **Lab result trends** with reference ranges highlighted
- **Relevant family history**
- **Current complaints** organized by system
- Formatted like a proper intake summary that saves 20+ minutes

#### Lawyer Export (SSDI / Disability)
- **Functional limitations documentation** — what the person CAN'T do, with dates and evidence
- **Medical evidence summary** — diagnoses, providers, treatments, organized by date
- **Missed work tracking** — FMLA usage, accommodations requested/denied
- **Medication side effects** — how treatment itself limits function
- **Symptom severity over time** — charts, trends, worst days documented
- **Provider contact list** — ready for records requests
- **Gaslight Garage exports** — documented instances of medical dismissal (supports credibility)
- Formatted like what a disability attorney would prepare for an ALJ hearing

#### The Translation Layer
- Patient says "my back hurts all the time" → export says "chronic lumbar pain with functional limitation"
- Patient tags "Nope" on a dismissed finding → export flags it as "contested clinical assessment"
- Patient tracks "bad day, couldn't get out of bed" → export documents "reported inability to perform ADLs on [date]"

This is NOT hardcoded medical dictionaries. This is NLP-powered translation from human language to professional language, using the same spaCy/scispaCy models we already have.

## Technical Architecture

- **Frontend:** Next.js 15 + React + TypeScript + Tauri 2
- **Desktop:** Tauri (Rust backend, web frontend) — compiles to native app
- **Database:** Dexie.js (IndexedDB) for local storage, SQLite via Tauri plugin for production
- **Backend:** Python Flask for NLP parsing and PDF generation
- **NLP:** spaCy + scispaCy (bc5cdr, d4data) — runs locally, never sends data anywhere
- **PDF:** Flask PDF generator (existing, needs the professional templates)
- **Privacy:** Everything local. No cloud. No accounts. No telemetry. PIN-based isolation.

## What Makes This Different

1. **Built by disabled people** — not corporate wellness theater
2. **Privacy is architecture, not policy** — data literally cannot leave your device
3. **The user isn't the product** — professionals pay, users benefit
4. **Chaos-positive design** — missing a day doesn't break anything, there's no streak to lose
5. **Trauma-informed** — crisis tools built in, dismissive language detection, evidence collection
6. **Open source escape hatch** — you are NEVER locked in, NEVER held hostage
7. **AI-powered NLP that runs locally** — medical document parsing without sending your records to the cloud
8. **The Forge** — if we didn't build a tracker for your condition, build your own

## The Tagline

**"Your data. Your device. Your proof."**

Or alternatively: **"Because 'that's normal' wasn't normal."**

---

*Dreamed by Ren. Built by Ace. Fueled by spite, salted caramel coffee, and the audacity to still be vertical.*

*Copyright (c) 2025-2026 Chaos Cascade — Ren & Ace*
