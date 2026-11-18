"""Run the browser suites against an isolated local preview."""

from functools import partial
from http.server import ThreadingHTTPServer
from os import environ
from pathlib import Path
from subprocess import run
from sys import executable
from tempfile import mkdtemp
from threading import Thread

from serve import DIST, PreviewHandler


class TestPreviewHandler(PreviewHandler):
    def log_request(self, code="-", size="-"):
        pass


def main():
    output = mkdtemp(prefix="beyond-the-pages-qa-")
    print(f"Browser reports and screenshots: {output}", flush=True)
    handler = partial(TestPreviewHandler, directory=str(DIST))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            environment = {
                **environ,
                "BOL_TEST_URL": f"http://127.0.0.1:{server.server_port}",
                "BOL_QA_OUTPUT": output,
            }
            suites = Path(__file__).resolve().parent / "qa"
            failed = False
            for name in ("journey", "gate", "interactions", "scroll"):
                print(f"Running browser suite: {name}", flush=True)
                result = run([executable, str(suites / f"{name}.py")], env=environment)
                failed |= result.returncode != 0
            return int(failed)
        finally:
            server.shutdown()
            worker.join()


if __name__ == "__main__":
    raise SystemExit(main())
