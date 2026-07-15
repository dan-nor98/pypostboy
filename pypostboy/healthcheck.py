"""Container healthcheck client for the PostBoy runtime image."""

import os
import sys
import urllib.request


def _healthcheck_host():
    """Resolve a Host header accepted by Django's ALLOWED_HOSTS setting."""
    explicit_host = os.environ.get('POSTBOY_HEALTHCHECK_HOST')
    if explicit_host:
        return explicit_host

    allowed_hosts = [
        host.strip()
        for host in os.environ.get('ALLOWED_HOSTS', '').split(',')
        if host.strip()
    ]
    if allowed_hosts:
        return allowed_hosts[0]
    return 'localhost'


def main():
    """Exit successfully only when the local health endpoint returns HTTP 200."""
    port = os.environ.get('PORT', '3001')
    request = urllib.request.Request(
        f'http://127.0.0.1:{port}/healthz',
        headers={'Host': _healthcheck_host()},
    )
    with urllib.request.urlopen(request, timeout=3) as response:
        return 0 if response.status == 200 else 1


if __name__ == '__main__':
    sys.exit(main())
