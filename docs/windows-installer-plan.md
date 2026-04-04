# Windows Installer Plan

## Goal

Ship a branded `VeilSetup.exe` release asset for Windows that installs the
local Veil backend offline, keeps the bundled GLiNER2 model available on disk,
and registers the native messaging host for the user's Veil extension.

## Why This Plan Fits Veil

- Veil must keep the local GLiNER2 model available after install.
- The current PowerShell installer assembles too much at user install time:
  runtime bootstrap, dependency sync, model download, native-host setup, and
  autostart registration.
- The browser native host still needs an extension ID in order to write the
  allowed origin manifest on Windows.

## Production Shape

Phase 1 focuses on the shippable path we can build from this repository now:

1. Build a Windows-only staged payload on `windows-latest`.
2. Bundle `.venv`, server files, release metadata, and the extracted model into
   an offline staging directory.
3. Compile a branded Inno Setup installer from that stage.
4. Accept `/EXTENSION_ID=<id>` from the extension-generated install command,
   and only prompt during install if that argument is missing.
5. Publish `VeilSetup-<version>.exe` as a GitHub Release asset beside the raw
   backend and model bundles, plus a stable `VeilSetup.exe` latest-download
   alias for extension-generated commands.

## Installer UX

- Veil branding on setup binary and wizard surfaces.
- Per-user install into `%LOCALAPPDATA%\Veil`.
- Offline payload with no runtime `uv sync`.
- Extension-generated Windows command downloads `VeilSetup.exe` and passes
  `/EXTENSION_ID=...`, with prompt fallback only when needed.
- Deterministic uninstall that removes the native host and autostart entries
  before deleting files.

## Follow-Up Phases

Phase 2:
- Sign the installer and installed executables/scripts.
- Publish checksums for release assets.
- Add a stable extension ID path once Veil's distribution channel is fixed.

Phase 3:
- Graduate to MSI/WiX only if enterprise deployment requirements justify the
  added complexity for GPO, repair, and managed rollouts.
