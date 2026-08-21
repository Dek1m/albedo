#!/bin/sh
# Подхват albedo.conf (если смонтирован), ENV побеждает, затем nginx.
set -eu

CONF_FILE="${ALBEDO_CONF_FILE:-/etc/albedo/albedo.conf}"

is_set() {
    eval "test \"\${$1+x}\" = x"
}

load_conf() {
    _path="$1"
    if [ ! -f "$_path" ]; then
        return 0
    fi

    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ''|\#*) continue ;;
        esac

        key="${line%%=*}"
        val="${line#*=}"

        case "$key" in
            ''|*[!A-Za-z0-9_]*) continue ;;
        esac

        # Уже задано в environment / env_file — не трогаем.
        if is_set "$key"; then
            continue
        fi

        # Снять одну пару кавычек вокруг значения
        case "$val" in
            \"*\") val="${val#\"}"; val="${val%\"}" ;;
            \'*\') val="${val#\'}"; val="${val%\'}" ;;
        esac

        export "$key=$val"
    done < "$_path"
}

load_conf "$CONF_FILE"

: "${ALBEDO_LISTEN_HOST:=0.0.0.0}"
: "${ALBEDO_LISTEN_PORT:=8080}"
: "${ALBEDO_API_URL:=http://belle:8080}"

# Хвостовой слэш ломает proxy_pass: /api/v1 уедет в /.
ALBEDO_API_URL="${ALBEDO_API_URL%/}"
export ALBEDO_LISTEN_HOST ALBEDO_LISTEN_PORT ALBEDO_API_URL

TEMPLATE="${ALBEDO_NGINX_TEMPLATE:-/opt/albedo/nginx.conf.template}"
TARGET="${ALBEDO_NGINX_CONF:-/etc/nginx/conf.d/default.conf}"

envsubst '${ALBEDO_LISTEN_HOST} ${ALBEDO_LISTEN_PORT} ${ALBEDO_API_URL}' \
    < "$TEMPLATE" \
    > "$TARGET"

nginx -t
exec nginx -g 'daemon off;'
