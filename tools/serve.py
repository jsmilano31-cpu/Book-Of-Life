"""Serve the local experience without caching mismatched HTML, scripts, or styles."""
from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DIST = Path(__file__).resolve().parents[1] / "dist"


class PreviewHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        # A development request must read current files, including when a browser
        # has an older response with the same second-resolution modification time.
        for header in ("If-Modified-Since", "If-None-Match"):
            if header in self.headers:
                del self.headers[header]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(DIST))
    try:
        with ThreadingHTTPServer((args.host, args.port), handler) as server:
            print(f"Beyond the Pages: http://{args.host}:{args.port}/", flush=True)
            print("Development caching disabled. Press Ctrl+C to stop.", flush=True)
            try:
                server.serve_forever(poll_interval=.25)
            except KeyboardInterrupt:
                pass
    except OSError as error:
        parser.exit(1, f"Could not start the preview: {error}\nStop the existing server or choose another --port.\n")
