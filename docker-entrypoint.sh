#!/bin/sh
set -eu

python -c 'from pypostboy.db.startup import initialize_database_from_config; initialize_database_from_config()'

exec "$@"
