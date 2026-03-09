---
layout: page
title: How It Works
description: What actually happens between you typing and the AI reading your words. No cloud, no surprises.
---

## The short version

You type something into ChatGPT. Veil intercepts that text, runs it through a fast local detection pipeline, and marks anything sensitive right where you wrote it — before you send. The entire detection happens on your machine. Nothing travels anywhere.

---

## What Veil is watching

Veil runs as a Chrome extension with a content script that attaches to the page. It monitors `textarea` elements and `contenteditable` divs — the kind you find in Gemini's input box, Notion, Claude.ai, and anywhere else where you type into a rich-text field.

Every time you pause typing, the current text goes into the detection pipeline. The pause threshold is intentionally short — you shouldn't have to wait to see the highlights appear.

---

## The detection pipeline

### Step 1 — Regex pre-scan

The first pass happens instantly, with no model involved. Veil has a set of built-in regular expressions that catch PII with a predictable, structured format:

| Pattern | Example |
| --- | --- |
| Email address | `sarah@company.com` |
| Phone number | `(415) 555-0187` |
| Social Security Number | `482-66-1209` |
| OpenAI API key | `sk-proj-...` |
| AWS access key | `AKIA...` |
| JWT token | `eyJ...` |
| IPv4 address | `192.168.1.1` |

These fire synchronously. By the time the text reaches the model, you're already seeing some highlights.

### Step 2 — GLiNER2 NER model

For PII that depends on context — a person's name buried in a paragraph, an organisation mentioned in passing, a street address written out in plain English — Veil sends the text to a local HTTP server running on `127.0.0.1:8765`.

That server runs a [GLiNER2](https://github.com/urchade/GLiNER) named-entity recognition model. It's a transformer-based model designed specifically for this kind of span detection, and it runs on your CPU or GPU depending on what's available. The `127.0.0.1` binding is not a setting you can misconfigure — it's loopback-only, unreachable from anywhere outside your device.

The entities GLiNER2 detects:

- **PERSON** — names, including partial names
- **LOCATION** — cities, countries, specific places
- **ORGANISATION** — companies, institutions, teams
- **ADDRESS** — full or partial street addresses
- **DATE_OF_BIRTH** — birth dates in various formats

### Step 3 — Merge and deduplicate

Regex and model results come back independently. Before rendering, Veil merges the two sets of spans and resolves any overlaps — if a regex match and a model match cover the same characters, the higher-confidence detection wins. The merged result is then rendered as inline highlights directly inside the input field.

---

## Redaction modes

There are two ways to handle detected PII once you see the highlights:

**Anonymize** replaces each unique value with a consistent alias — `<PERSON_1>`, `<PERSON_2>`, and so on. The same person mentioned twice gets the same alias. This is useful when the structure of the text matters and you want the AI to reason about relationships without knowing the actual names.

**Mask** replaces PII with a type label: `[NAME REDACTED]`, `[SSN REDACTED]`. Simpler, more aggressive. Good when you just want the sensitive data gone.

You can switch between modes in the Veil popup, and you can redact individual spans by clicking them or redact everything at once with a single button.

---

## Architecture overview

```
Browser tab (content.js)
    │  raw text on every input event
    ▼
Background service worker (background.js)
    │  POST /detect
    ▼
Local Python server  —  GLiNER2  (127.0.0.1:8765)
    │  JSON array of detected spans
    ▼
background.js  —  merge regex + model results
    │  final span list
    ▼
content.js  —  apply inline highlights to the DOM
```

The local server is the only network hop in the whole pipeline, and it's bound to loopback. There is no path by which your text reaches the internet during detection.

---

## Privacy guarantees

Veil was built on a few hard commitments:

- **No cloud detection.** The only server Veil talks to for detection is the one running on your own machine. If that server isn't running, Veil falls back to regex-only detection — it doesn't fall back to a cloud API.
- **No telemetry.** There's no analytics library, no crash reporter, no usage tracking. Veil doesn't know how many people use it or what they type.
- **No sync.** Any settings or API keys you configure are stored in `chrome.storage.local`. Chrome's sync engine doesn't touch it.
- **Open source.** The entire codebase is on GitHub. If you want to verify any of the above, you can read the code.

---

## Supported sites

Veil works on any site with a `textarea` or `contenteditable` input. These have been explicitly tested:

| Site | Input type | Status |
| --- | --- | --- |
| ChatGPT | `contenteditable` | ✅ Supported |
| Claude.ai | `contenteditable` | ✅ Supported |
| Google Gemini | `contenteditable` | ✅ Supported |
| Any site | `textarea` | ✅ Supported |
| Firefox | — | 🔜 Planned |
