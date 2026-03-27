"""
Regression tests for server/native_host.py utility behavior.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "server"))

import native_host


@pytest.fixture()
def runtime_paths(monkeypatch, tmp_path):
    runtime_dir = tmp_path / "runtime"
    cache_dir = runtime_dir / "cache"
    monkeypatch.setattr(native_host, "RUNTIME_DIR", runtime_dir)
    monkeypatch.setattr(native_host, "STATE_DIR", runtime_dir)
    monkeypatch.setattr(native_host, "STATE_FILE", runtime_dir / "native_host_state.json")
    monkeypatch.setattr(native_host, "LOG_FILE", runtime_dir / "gliner2_server.log")
    monkeypatch.setattr(native_host, "CACHE_DIR", cache_dir)
    monkeypatch.setattr(native_host, "PIP_CACHE_DIR", cache_dir / "pip")
    monkeypatch.setattr(native_host, "HF_HOME", cache_dir / "hf")
    monkeypatch.setattr(native_host, "HF_HUB_CACHE", cache_dir / "hf" / "hub")
    monkeypatch.setattr(native_host, "TRANSFORMERS_CACHE", cache_dir / "hf" / "transformers")
    monkeypatch.setattr(native_host, "XDG_CACHE_HOME", cache_dir / "xdg")
    monkeypatch.setattr(native_host, "RELEASE_INFO_FILE", runtime_dir / "bundle_release.json")
    monkeypatch.setattr(native_host, "PROCESS_STATE_FILE", runtime_dir / "server_process.json")
    return runtime_dir


def test_load_state_reads_existing_json(runtime_paths):
    native_host.ensure_runtime_dirs()
    native_host.STATE_FILE.write_text('{"pid": 1234}', encoding="utf-8")

    assert native_host.load_state() == {"pid": 1234}


def test_read_process_state_reads_existing_json(runtime_paths):
    native_host.ensure_runtime_dirs()
    native_host.PROCESS_STATE_FILE.write_text('{"pid": 5678, "session_id": "abc"}', encoding="utf-8")

    assert native_host.read_process_state() == {"pid": 5678, "session_id": "abc"}


def test_start_server_skips_launch_when_port_is_already_bound(monkeypatch, runtime_paths):
    monkeypatch.setattr(native_host, "is_server_healthy", lambda: False)
    monkeypatch.setattr(native_host, "is_port_open", lambda host="127.0.0.1", port=8765: True)
    monkeypatch.setattr(native_host, "load_state", lambda: {})
    monkeypatch.setattr(native_host, "read_process_state", lambda: {})
    monkeypatch.setattr(native_host, "runtime_meta", lambda: {})

    def fail_popen(*args, **kwargs):
        raise AssertionError("start_server should not spawn a new process when port 8765 is already bound")

    monkeypatch.setattr(native_host.subprocess, "Popen", fail_popen)

    result = native_host.start_server(install_deps=False, download_model=False)

    assert result["success"] is True
    assert result["running"] is True
    assert result["healthy"] is False
    assert "already bound to port 8765" in result["message"]
