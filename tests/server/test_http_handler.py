import http.client
import json
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "server"))

from gliner2_server import DEFAULT_MAX_BODY_BYTES, DEFAULT_THRESHOLD, make_handler


class FakeService:
    default_threshold = DEFAULT_THRESHOLD
    model_name = "fake-model"
    model_source = "test"
    backend = "test"
    model = None

    def detect(self, text, labels, threshold):
        return []

    def classify(self, text):
        return {"sensitivity": "none", "score": 0.0, "label": "none"}

    def structure(self, text, schema=None):
        return {}


def request(server, method, path, body=None, headers=None):
    conn = http.client.HTTPConnection(server.server_address[0], server.server_address[1], timeout=5)
    try:
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse()
        payload = response.read()
        return response.status, payload
    finally:
        conn.close()


def test_post_rejects_untrusted_browser_origin():
    handler = make_handler(FakeService(), max_chars=1000)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        status, body = request(
            server,
            "POST",
            "/detect",
            body=json.dumps({"text": "hello"}),
            headers={"Content-Type": "application/json", "Origin": "https://evil.example"},
        )
        assert status == 403
        assert b"Forbidden origin" in body
    finally:
        server.shutdown()
        server.server_close()


def test_post_rejects_oversized_json_body_before_detection():
    handler = make_handler(FakeService(), max_chars=1000)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        status, payload = request(
            server,
            "POST",
            "/detect",
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(DEFAULT_MAX_BODY_BYTES + 1),
            },
        )
        assert status == 413
        assert b"byte limit" in payload
    finally:
        server.shutdown()
        server.server_close()
