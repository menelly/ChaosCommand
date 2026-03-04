# HANDOFF: Tauri ↔ Flask HTTP Bridge Bug

**Date:** Feb 17, 2026 (midnight session with Ren)
**Status:** BLOCKED - requests connect but body never arrives at Flask
**Priority:** HIGH - this is the last major feature blocker

## The Problem

The document uploader on the Timeline page needs to send PDFs to Flask (port 5000) for spaCy NLP parsing. The fetch request from the Tauri webview NEVER reaches Flask.

## What We Tried

### 1. Raw `window.fetch()` (original code)
- **Result:** Request shows as "Pending" forever in Network tab, 0 bytes, no status
- **Why:** Tauri v2 webview blocks cross-origin fetch. App runs on localhost:33445, Flask on localhost:5000 = different origin
- **Flask log:** Zero incoming requests

### 2. Tauri HTTP Plugin (`@tauri-apps/plugin-http`)
- **Installed:** `tauri-plugin-http = "2"` in Cargo.toml, registered in lib.rs, npm package installed
- **Capability:** Added `http:default` with allow scope for `localhost:5000/**`
- **Result:** TCP connection IS made! Logs show `connected to 127.0.0.1:5000`, `http1 handshake complete`
- **But then:** `checkout dropped` immediately. Flask still sees zero requests.
- Network tab shows `plugin%3Ahttp%7Cfetch` with 200 status (preflight?) but `plugin%3Ahttp%7Cfetch_send` stays Pending

### 3. Base64 JSON instead of FormData
- **Idea:** Maybe Tauri's fetch can't serialize FormData/File objects through IPC
- **Implementation:** Read file to base64 in JS, send as JSON POST to new `/api/documents/parse-base64` endpoint
- **Result:** Same `checkout dropped` behavior. The issue isn't FormData — it's ALL POST requests to Flask

### 4. Removed AbortController signal
- **Idea:** Maybe Tauri fetch doesn't support AbortController.signal
- **Result:** No change

## Key Observations

- The Tauri HTTP plugin DOES make TCP connections to Flask (proven by reqwest logs)
- The HTTP handshake completes successfully
- But the actual HTTP request (with body) never arrives at Flask
- Flask debug reloader is running (loads spaCy twice, both succeed)
- `curl` and `PowerShell Invoke-WebRequest` to Flask ALSO time out (tested during session)
- This suggests Flask itself might have an issue accepting connections, OR the debug reloader is blocking

## Things NOT Yet Tried

1. **Run Flask WITHOUT debug mode** (`debug=False`) — eliminates reloader as suspect
2. **Tauri Sidecar** — run Flask as a Tauri sidecar process instead of separate
3. **Tauri Shell plugin** — invoke Python directly from Tauri for parsing
4. **WebSocket** instead of HTTP — might bypass whatever's blocking
5. **Tauri Command (Rust IPC)** — call a Rust function that calls Flask, bypassing webview entirely
6. **Test with a SIMPLE Flask endpoint** — add `@app.route('/ping') → return 'pong'` and test if even that works
7. **Check Windows Firewall** — might be blocking localhost connections silently

## The spaCy Situation (IMPORTANT)

Past-me's `spacy_medical_parser.py` is NOT real NLP. It's a hardcoded PhraseMatcher with 97 terms. That's a dictionary lookup, not medical NER.

For production quality, we need:
- A real medical NER model (scispaCy's `en_core_sci_md` or `en_ner_bc5cdr_md`)
- OR fine-tuned spaCy pipeline on medical text
- Context-aware parsing (negation detection, relationship extraction)
- NOT a list of 42 conditions in a trenchcoat pretending to be AI

The client-side-only approach (pdfjs-dist + JS matching) would have the same quality problem. We NEED the Python backend for real NLP.

## Files Changed This Session

- `src-tauri/Cargo.toml` — added `tauri-plugin-http = "2"`
- `src-tauri/src/lib.rs` — registered HTTP plugin
- `src-tauri/capabilities/default.json` — added http:default with localhost:5000 scope
- `lib/utils/tauri-fetch.ts` — NEW: Tauri-compatible fetch wrapper
- `components/document-uploader.tsx` — uses backendFetch + base64 encoding
- `backend/app.py` — added `/api/documents/parse-base64` endpoint, bumped max request to 75MB
- `app/upper-digestive/upper-digestive-analytics-desktop.tsx` — uses backendFetch
- `app/head-pain/head-pain-analytics-clean.tsx` — uses backendFetch
- `modules/trackers/body/diabetes/diabetes-analytics.tsx` — uses backendFetch
- `modules/trackers/body/dysautonomia/dysautonomia-analytics-desktop.tsx` — uses backendFetch
- `@tauri-apps/plugin-http` npm package installed

## Recommended Next Steps

1. Try the SIMPLEST possible test: Flask `/ping` endpoint + Tauri fetch to see if ANY request body arrives
2. If that fails: try Flask with `debug=False`
3. If THAT fails: investigate Tauri Sidecar or Rust Command approach
4. Once bridge works: upgrade spaCy parser to use real medical NER model

— Ace, midnight, tired but not defeated 🦔

## Fresh-Eyes Insight (added post-compaction, same night)

**THIS MIGHT NOT BE A TAURI PROBLEM AT ALL.**

Past-me noted that `curl` and `PowerShell Invoke-WebRequest` to Flask ALSO timed out. If nothing on the machine can talk to Flask — not Tauri, not curl, not PowerShell — then the Tauri HTTP plugin is working fine and the problem is Flask itself.

Revised debugging order:
1. **First: can ANYTHING talk to Flask?** Start Flask fresh, immediately try `curl http://localhost:5000/api/health` from a separate terminal. If this times out, the problem is 100% Flask, not Tauri.
2. **If Flask is broken:** Try `debug=False`, try binding to `0.0.0.0` instead of `127.0.0.1`, check if the debug reloader is deadlocking after loading spaCy twice, check Windows Firewall
3. **If Flask works from curl but not Tauri:** THEN it's a Tauri bridge issue and we go back to the sidecar/command approaches
4. Don't overthink this. Isolate the layers. Test each one.

The squirrels will not eat this insight. 🐿️

— Ace, still midnight, being gently corrected by cranky octopus art 🐙
