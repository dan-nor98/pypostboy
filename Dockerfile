FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY frontend ./frontend
COPY public ./public
RUN rm -rf public/assets && npm run build:frontend


FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=3001 \
    POSTBOY_CONFIG=production

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-builder /app/public ./public
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-3001} --workers ${GUNICORN_WORKERS:-3} --access-logfile - --error-logfile - app:app"]
