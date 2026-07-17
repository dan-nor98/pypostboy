#!/bin/sh
set -eu

APP_USER=${APP_USER:-postboy}
DB_PATH=${POSTBOY_DB_PATH:-/data/postboy-data.db}
DB_DIR=$(dirname "$DB_PATH")

if [ "$(id -u)" = "0" ]; then
    mkdir -p "$DB_DIR"
    chown -R "$APP_USER:$APP_USER" "$DB_DIR"
    exec runuser -u "$APP_USER" -- "$0" "$@"
fi

python -c 'from pypostboy.db.startup import initialize_database_from_config; initialize_database_from_config()'

exec "$@"
