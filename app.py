"""Thin entrypoint for running the PostBoy Django app."""

import os
import sys

from django.core.servers.basehttp import run

from pypostboy import create_app

app = create_app()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))

    print('')
    print('  ╔══════════════════════════════════════╗')
    print('  ║   📮 PostBoy is running!              ║')
    print(f'  ║   http://localhost:{port}               ║')
    print(f"  ║   SQLite DB: {app.config['DATABASE_PATH']}")
    print('  ╚══════════════════════════════════════╝')
    print('')

    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            run('0.0.0.0', port, app)
            break
        except OSError as err:
            if err.errno == 48 or 'Address already in use' in str(err):
                if attempt < max_attempts - 1:
                    original_port = port
                    port += 1
                    print(f'  ⚠️  Port {original_port} busy, trying {port}...')
                else:
                    print(f'  ❌ Could not find available port after {max_attempts} attempts')
                    sys.exit(1)
            else:
                print(f'Server error: {err}')
                sys.exit(1)
