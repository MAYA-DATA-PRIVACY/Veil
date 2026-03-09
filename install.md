---
layout: default
title: Install
description: How to install Veil — set up the GLiNER2 server and load the Chrome extension in minutes.
---

# Install

Veil has two parts: the **Chrome extension** and the **local GLiNER2 server**. Both must be running for full AI-powered detection. Regex-only detection works without the server.

---

## Requirements

| Tool                                    | Version |
| --------------------------------------- | ------- |
| Google Chrome (or Chromium)             | 120+    |
| Python                                  | 3.10+   |
| Node.js (optional, for linting / tests) | 18+     |

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/nishikantmandal007/Veil.git
cd Veil
```

---

## Step 2 — Set up the GLiNER2 server

```bash
# Install dependencies (creates .venv automatically)
npm run setup

# Download the model weights (~400 MB, first run only)
npm run download-gliner2

# Start the server on http://127.0.0.1:8765
npm run run-gliner2
```

Leave this terminal open. The server must be running for NER detection to work.

> **Tip:** Use `npm run run-gliner2-lazy` for faster startup — the model loads on the first scan request instead of at startup.

---

## Step 3 — Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the **`extension/`** subfolder inside the repo
5. The Veil shield icon appears in your toolbar — pin it

---

## Step 4 — Verify it works

1. Open [ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com)
2. Type a name or email into the chat input
3. Veil should highlight it within ~1 second of you stopping typing

If highlights don't appear, click the Veil icon and check the server status indicator.

---

## Autostart (optional, Linux)

To have the server start automatically on login:

```bash
npm run install-autostart-linux
```

To remove autostart:

```bash
npm run remove-autostart-linux
```

---

## Updating

```bash
git pull origin main
npm run setup          # re-install any new dependencies
# Reload the extension in chrome://extensions
```

---

## Troubleshooting

| Symptom                 | Fix                                                                  |
| ----------------------- | -------------------------------------------------------------------- |
| No highlights appearing | Check server is running: `npm run run-gliner2`                       |
| Server crashes on start | Run `npm run setup` again to reinstall dependencies                  |
| Extension not loading   | Make sure you selected the `extension/` subfolder, not the repo root |
| Slow first scan         | Normal — model loads on first request if using `--lazy-load`         |
