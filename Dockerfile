# Albedo — React SPA. Код приложения тянется с git (CACHEBUST сбрасывает слой).
# Порт слушания не хардкодится: только ARG для EXPOSE.

FROM node:20-alpine AS build

RUN apk add --no-cache git curl ca-certificates

WORKDIR /src

ARG GIT_URL=https://github.com/Dek1m/albedo.git
ARG GIT_REF=main
ARG CACHEBUST=1

RUN echo "$CACHEBUST" \
    && git clone --depth 1 --branch "${GIT_REF}" "${GIT_URL}" /src

RUN npm ci \
    && npm run build

FROM nginx:alpine

RUN apk add --no-cache curl gettext ca-certificates \
    && rm -f /etc/nginx/conf.d/default.conf

COPY --from=build /src/dist /usr/share/nginx/html
COPY --from=build /src/docker/nginx.conf.template /opt/albedo/nginx.conf.template
COPY --from=build /src/docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENV SERVICE_NAME=albedo \
    ALBEDO_LISTEN_HOST=0.0.0.0 \
    ALBEDO_LISTEN_PORT=8080 \
    ALBEDO_API_URL=http://belle:8080

ARG ALBEDO_LISTEN_PORT=8080
EXPOSE ${ALBEDO_LISTEN_PORT}

STOPSIGNAL SIGQUIT

ENTRYPOINT ["/entrypoint.sh"]
