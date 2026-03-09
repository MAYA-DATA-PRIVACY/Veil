---
layout: default
title: How It Works
description: How Veil detects and redacts PII locally using GLiNER2 — no data leaves your machine.
---

# How It Works

Veil operates entirely on your device. No text is ever sent to a third-party server.

---

## The Detection Pipeline

When you type or paste into a monitored input field, Veil runs a three-stage pipeline:

### 1. Regex Pre-scan (instant, offline)

Before contacting any model, Veil's built-in regex patterns catch high-confidence PII that has a predictable format:

| Pattern                 | Examples                 |
| ----------------------- | ------------------------ |
| OpenAI API keys         | `sk-proj-…`, `sk-live-…` |
| AWS access keys         | `AKIA…`                  |
| JWT tokens              | `eyJ…`                   |
| IPv4 addresses          | `192.168.1.1`            |
| Social Security Numbers | `123-45-6789`            |

These detections are instant — no model required.

### 2. GLiNER2 NER Model (local, on-device)

For context-aware detection (names, addresses, organisations, dates of birth), Veil sends the text to a **local Python HTTP server at `127.0.0.1:8765`** running the [GLiNER2](https://github.com/urchade/GLiNER) named-entity recognition model.

The model runs entirely on your CPU or GPU. Nothing reaches the internet.

### 3. Merge & Deduplicate

Regex and model detections are merged, overlapping spans are resolved (higher-confidence detection wins), and the result is rendered as inline highlights directly in the input field.

---

## Redaction Modes

| Mode          | What happens                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Anonymize** | Replaces PII with a consistent alias: `<PERSON_1>`, `<EMAIL_1>` — the same value always maps to the same alias within a session |
| **Mask**      | Replaces PII with a type label: `[NAME REDACTED]`, `[SSN REDACTED]`                                                             |

You can switch modes in the popup and redact individual items or all at once.

---

## Architecture

```
Browser tab (content.js)
    │  text to scan
    ▼
Background service worker (background.js)
    │  /detect POST
    ▼
Local Python server — GLiNER2 (127.0.0.1:8765)
    │  detections (JSON)
    ▼
background.js — merge + dedup
    │  detections
    ▼
content.js — render highlights in the DOM
```

The local server is the only network hop, and it is bound to `127.0.0.1` (loopback only) — unreachable from outside your machine.

---

## Privacy Guarantees

- ✅ No cloud API calls for detection
- ✅ No telemetry or analytics
- ✅ API keys stored in `chrome.storage.local` (device-only, never synced)
- ✅ Extension source is fully open — [read the code]({{ site.github_url }})
