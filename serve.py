"""Local dev server with caching disabled.  Run:  python serve.py   → http://localhost:5173"""
import functools
import http.server
import os

PORT = 5173
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCache, directory=ROOT)
    print(f"FixFlow running at http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("", PORT), handler).serve_forever()
