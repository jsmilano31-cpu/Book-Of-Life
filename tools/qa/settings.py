"""Shared browser-test paths and preview settings."""

from os import environ
from pathlib import Path
from tempfile import mkdtemp

BASE = environ.get("BOL_TEST_URL", "http://127.0.0.1:4173").rstrip("/")
output = environ.get("BOL_QA_OUTPUT")
OUT = Path(output or mkdtemp(prefix="beyond-the-pages-qa-"))
OUT.mkdir(parents=True, exist_ok=True)
