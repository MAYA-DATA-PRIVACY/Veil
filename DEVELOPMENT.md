# Development Guide

This file is for developers who want to clone, customize, and reuse Privacy Shield in their own repositories.

## Clone And Run

```bash
git clone <your-fork-or-template-url>
cd privacy-shield-llm
python3 -m venv .venv
source .venv/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu "torch>=2.0.0"
pip install -r requirements.txt
python scripts/gliner2_server.py --download-only
python scripts/gliner2_server.py
```

`pip install gliner2` installs package code only. You still need model weights
for `from_pretrained(...)` (downloaded automatically or provided as a local dir).

Native-host first-run bootstrap uses:
- `.venv/` for Python environment
- `.runtime/` for logs, PID state, and model/package caches
- CPU-only torch install path by default (avoids NVIDIA CUDA package pulls)

If the model repo is gated/private in your environment, set:

```bash
export HF_TOKEN=<your_huggingface_token>
```

Or set it from popup UI: `Local Server -> Model Access Token (Optional)`.

If you have local model files, you can bypass remote model download:

```bash
export GLINER2_MODEL=/absolute/path/to/local/gliner2-model
```

In Chrome:
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this folder

Optional (enables popup Start/Stop server buttons):
1. Copy extension id from `chrome://extensions`
2. Run:

```bash
bash scripts/install_native_host_linux.sh <extension_id>
```

## Use In Your Own Repo

If you want this inside another project:

1. Copy this folder into your repo (for example `tools/privacy-shield-extension/`)
2. Keep the same file structure for `manifest.json`, `background.js`, `content.js`, and `popup.*`
3. Update links and metadata:
  - `package.json` repository URL
  - `popup.html` GitHub link
4. Commit as a normal subdirectory in your repo

Alternative:
1. Keep this as its own git repo
2. Add it to your main repo as a git submodule

## Key Customization Points

- Detection logic: `background.js`
- In-page redaction UX: `content.js`
- Runtime styling/animations: `styles.css`
- Settings UI: `popup.html`, `popup.css`, `popup.js`
- Local inference server: `scripts/gliner2_server.py`
- Native host bridge: `scripts/native_host.py`

## Adding New PII Patterns

Use popup Advanced settings or `chrome.storage.sync` entry `customPatterns`.

Pattern object:

```json
{
  "id": "my_pattern",
  "label": "api_key",
  "pattern": "\\bmy-prefix-[A-Za-z0-9]{16,}\\b",
  "flags": "g",
  "score": 0.98,
  "replacement": "[MY KEY REDACTED]",
  "enabled": true
}
```

## Notes

- The extension cannot launch Python by itself. Use systemd user service on Linux for auto-start.
- GLiNER2 source used by this project: `https://github.com/fastino-ai/GLiNER2`
