---
layout: page
title: Install
description: Getting Veil running takes about ten minutes. Here's exactly what you need to do.
---

## Before you start

Veil has two parts. You need both:

1. **The Chrome extension** — this is what monitors your input fields and shows the highlights.
2. **The local GLiNER2 server** — a small Python process that runs the NER model on your machine.

If the server isn't running, the extension falls back to regex-only detection. That still catches emails, phone numbers, SSNs, and API keys — just not names, organisations, or addresses. For full coverage, you want both running.

---

## Requirements

| Tool | Version |
| --- | --- |
| Google Chrome (or any Chromium-based browser) | 120 or later |
| Python | 3.10 or later |
| Node.js | 18 or later |
| Disk space for the model weights | ~400 MB |

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/nishikantmandal007/Veil.git
cd Veil
```

That's all you need from GitHub. Everything else runs from inside this folder.

---

## Step 2 — Set up the Python environment

This creates a virtual environment and installs the GLiNER2 dependencies. It only needs to happen once.

```bash
npm run setup
```

Then download the model weights. This is a one-time download of about 400 MB:

```bash
npm run download-gliner2
```

Once that's done, start the server:

```bash
npm run run-gliner2
```

Leave that terminal window open. You'll see a message when the server is ready. The server binds to `127.0.0.1:8765` — loopback only, not accessible from the network.

> **Tip:** If you'd rather have the model load on the first scan request (faster startup, slower first detection), use `npm run run-gliner2-lazy` instead.

---

## Step 3 — Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Navigate to the `Veil` folder you cloned and select the **`extension/`** subfolder — not the root of the repo
5. The Veil shield icon appears in your toolbar

Pin it for easy access. That's it — the extension is installed.

---

## Step 4 — Verify it's working

Open [ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com) and type something into the message box. Try a name, an email address, or a phone number.

Within about a second of you stopping typing, Veil should highlight the detected PII directly in the text field. If you see the highlights, everything is working.

If nothing appears, click the Veil icon in your toolbar and check the server status indicator. If it shows the server as unreachable, go back to the terminal where you ran `npm run run-gliner2` and make sure it started without errors.

---

## Autostart (optional)

If you'd rather not manually start the server every time you boot your machine, Veil can set that up for you.

**Linux:**

```bash
npm run install-autostart-linux
```

**macOS and Windows** — autostart scripts are in progress. Check the [releases page]({{ site.releases_url }}) for the latest.

To remove autostart on Linux:

```bash
npm run remove-autostart-linux
```

---

## Keeping Veil up to date

```bash
git pull origin main
npm run setup
```

Then go to `chrome://extensions` and click the reload button on the Veil extension card. The model weights don't need to be re-downloaded unless the model version changes — check the [changelog]({{ site.changelog_url }}) when updating.

---

## Troubleshooting

| What you're seeing | What to try |
| --- | --- |
| No highlights in ChatGPT | Check the Veil popup — is the server status green? If not, run `npm run run-gliner2` |
| Server crashes immediately on start | Run `npm run setup` again. A dependency may have failed to install the first time |
| Extension not appearing in `chrome://extensions` | Make sure you selected the `extension/` subfolder, not the top-level repo folder |
| First scan takes 10+ seconds | Normal behaviour when using `--lazy-load`. The model loads on first use and is fast after that |
| Highlights appear but redaction doesn't work | Refresh the page and try again. Some sites override the DOM in ways that require a fresh attach |

If you're still stuck, [open an issue on GitHub]({{ site.github_url }}/issues). Include the browser console output from the tab where detection isn't working — that's usually enough to diagnose the problem.
