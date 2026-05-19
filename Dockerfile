FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
ENV VITE_API_BASE_URL=/manuais/api
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=1601
ENV ORACLE_CLIENT_PATH=/opt/oracle/instantclient
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl unzip libaio1 libnsl2 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /opt/oracle \
  && curl -fsSL -o /tmp/instantclient.zip https://download.oracle.com/otn_software/linux/instantclient/2121000/instantclient-basic-linux.x64-21.21.0.0.0dbru.zip \
  && unzip -q /tmp/instantclient.zip -d /opt/oracle \
  && mv /opt/oracle/instantclient_21_21 /opt/oracle/instantclient \
  && rm /tmp/instantclient.zip

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend-dist

EXPOSE 1601

CMD ["node", "backend/server.js"]
