# Development Guide

Everything you need to run Veil locally, make changes, and test them end-to-end.

---

## Prerequisites

| Tool                                  | Version |
| ------------------------------------- | ------: |
| Google Chrome (or Chromium)           |    120+ |
| Python                                |   3.10+ |
| pip                                   |  latest |
| Node.js (optional, for linting/tests) |     18+ |

---

## 1. Clone the repo

```bash
git clone https://github.com/nishikantmandal007/Veil.git
cd Veil
```

---

## 2. Start the GLiNER2 inference server

The extension sends text to a local Python HTTP server for NER inference. No text ever leaves your machine.

```bash
# Create a venv and install all dependencies (including PyTorch CPU)
npm run setup
# This is equivalent to:
#   python3 -m venv .venv
#   source .venv/bin/activate
#   pip install torch>=2.0.0 --index-url https://download.pytorch.org/whl/cpu
#   pip install -r requirements.txt

# (First run only) Download the GLiNER2 model weights
npm run download-gliner2

# Start the server — listens on http://127.0.0.1:8765
npm run run-gliner2
```

You should see:

```
[Veil] GLiNER2 server running on http://127.0.0.1:8765
```

Leave this terminal open while developing.

> **Tip:** Use `npm run run-gliner2-lazy` to defer model loading until the first request — faster startup, brief delay on first scan.

---

## 3. Load the extension in Chrome (Developer mode)

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `extension/` subfolder inside the repo (the folder containing `manifest.json`).
5. The Veil icon should appear in your toolbar. Pin it for easy access.

> **Tip:** After editing any extension file, click the refresh icon on the `chrome://extensions` card (or press `Ctrl+R` on that page) to reload the extension. Content scripts on already-open tabs need the tab to be refreshed as well.

---

## 4. Hot-reload workflow

There is no bundler — all JS/CSS is loaded directly by Chrome. Your loop is:

1. Edit a file (e.g., `extension/content.js`).
2. Go to `chrome://extensions` → click the reload icon for Veil.
3. Refresh the target tab (ChatGPT, Gemini, Claude, etc.).
4. Inspect with **F12 → Console** (for page errors) or open the **Service Worker** devtools from `chrome://extensions` (for background.js errors).

---

## 5. Inspecting the background service worker

1. On `chrome://extensions`, click **"Service Worker"** link under Veil.
2. A DevTools window opens attached to `background.js`.
3. You can set breakpoints, inspect `chrome.storage`, and watch network requests to `127.0.0.1:8765`.

---

## 6. Linting & tests

```bash
# ESLint
npm run lint

# JS unit tests (background utility functions)
npm run test:unit

# JS unit tests (content script utility functions)
npm run test:unit:content

# Python server unit tests
npm run test:unit:python

# Playwright e2e tests (requires Chrome)
npm run test:e2e
```

---

## 7. Project structure

```
Veil/
├── extension/             # Chrome extension source — load THIS folder in chrome://extensions
│   ├── manifest.json      # MV3 extension manifest
│   ├── content.js         # Content script: DOM observation, PII render, UI
│   ├── background.js      # Service worker: detection, anonymisation, storage
│   ├── popup.html         # Extension popup markup
│   ├── popup.js           # Popup logic
│   ├── popup.css          # Popup styles
│   └── styles.css         # In-page styles injected by content script
├── server/
│   ├── gliner2_server.py  # Local GLiNER2 Python HTTP server
│   ├── native_host.py     # Chrome native messaging host
│   ├── native-host/       # Install/uninstall scripts for native host
│   └── autostart/         # Systemd autostart scripts (Linux)
├── tests/
│   ├── js/                # Node.js unit tests (no runner needed)
│   └── server/            # pytest tests for gliner2_server utilities
├── docs/
│   ├── DEVELOPMENT.md     # ← you are here
│   ├── SECURITY.md
│   ├── CONTRIBUTING.md
│   └── architecture.drawio
├── scripts/
│   └── build_crx.sh       # Builds release ZIP
├── .github/
│   ├── workflows/         # CI (ci.yml), release-please
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── requirements.txt
├── .editorconfig
└── .gitignore
```

---

## 8. Environment variables

Veil does not require any environment variables to run locally. An optional `.env` file (never commit it) can be used for:

| Variable                     | Description                             |
| ---------------------------- | --------------------------------------- |
| `MDP_ANONYMIZATION_ENDPOINT` | Optional external anonymisation API URL |

---

## 9. Building a release ZIP

```bash
npm run build:zip
# Output: dist/privacy-shield-extension-<version>.zip
```

Do **not** commit `.crx` or `.pem` files — they are gitignored.
