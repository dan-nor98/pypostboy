FROM node:20-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
# npm/cli optional dependency resolution can omit Rollup native packages when
# optional dependencies are excluded (see npm/cli#4828). Use the lockfile with
# --include=optional instead of adding ad-hoc package installs.
RUN npm ci --include=optional

COPY frontend ./frontend
RUN npm run frontend:build


FROM python:3.12-slim AS python-deps-builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /build

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && python -m venv "$VIRTUAL_ENV"

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PORT=3001 \
    POSTBOY_CONFIG=production \
    POSTBOY_DB_PATH=/data/postboy-data.db

WORKDIR /app

RUN addgroup --system postboy \
    && adduser --system --ingroup postboy --home /home/postboy postboy \
    && mkdir -p /data /app/frontend/dist \
    && chown -R postboy:postboy /app /data /home/postboy

COPY --from=python-deps-builder /opt/venv /opt/venv
COPY --chown=postboy:postboy requirements.txt app.py db.py manage.py docker-entrypoint.sh ./
COPY --chown=postboy:postboy pypostboy ./pypostboy
COPY --from=frontend-builder --chown=postboy:postboy /app/frontend/dist ./frontend/dist
RUN chmod +x docker-entrypoint.sh

USER postboy

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-3001} --workers ${GUNICORN_WORKERS:-3} --access-logfile - --error-logfile - pypostboy.wsgi:application"]
