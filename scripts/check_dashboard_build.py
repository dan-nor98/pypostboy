#!/usr/bin/env python3
"""Verify the generated React dashboard is present when linked from the app."""

from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_INDEX = REPO_ROOT / "public" / "index.html"
DASHBOARD_INDEX = REPO_ROOT / "public" / "dashboard" / "index.html"
DASHBOARD_LINK_MARKERS = ('href="/dashboard/"', "href='/dashboard/'")


def main() -> int:
    if not PUBLIC_INDEX.exists():
        print(f"Missing required public entrypoint: {PUBLIC_INDEX.relative_to(REPO_ROOT)}", file=sys.stderr)
        return 1

    public_index = PUBLIC_INDEX.read_text(encoding="utf-8")
    dashboard_link_enabled = any(marker in public_index for marker in DASHBOARD_LINK_MARKERS)

    if dashboard_link_enabled and not DASHBOARD_INDEX.exists():
        print(
            "Dashboard link is enabled in public/index.html, but "
            "public/dashboard/index.html is missing. Run `npm run frontend:build` "
            "before serving, packaging, or deploying the app.",
            file=sys.stderr,
        )
        return 1

    print("Dashboard build check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
