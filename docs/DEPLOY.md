# Деплой albedo на голову `~/app`

**Стандарт:** `docs/DOCKER_COMPOSE_RULES.md`  
**Образец:** belle (`Dockerfile` + `docker-compose.yml`, сеть `app-net`)

Albedo — статическая SPA за nginx. Браузер ходит только на albedo. `/api/` проксируется на belle внутри `app-net`. Иначе `__Host-albedo_*` cookies не сядут.

Серверную голову (`~/app/docker-compose.yml`) этот документ описывает, но **не правит сам**. Правка — руками, по списку ниже.

---

## 0. Что должно быть на сервере

Голова уже включает:

```yaml
include:
  - ./postgres/docker-compose.yml
  - ./redis/docker-compose.yml
  - ./pgbouncer/docker-compose.yml
  - ./belle/docker-compose.yml
```

Сеть: `app-net` (имя задано в compose belle и albedo).

Репозиторий образа: `https://github.com/Dek1m/albedo.git`  
Dockerfile клонирует этот URL на сборке (`ARG CACHEBUST` сбрасывает слой).

---

## 1. Клон в `~/app/albedo`

На сервере (ai-t-01 и аналоги):

```bash
cd ~/app
git clone https://github.com/Dek1m/albedo.git albedo
cp albedo/.env.example albedo/.env
# при необходимости поправить albedo/.env — порты, publish
```

Повторный деплой кода:

```bash
cd ~/app/albedo
git pull --ff-only
```

`.env` не из git. Не коммитить, не копировать секреты belle в albedo — их тут нет.

---

## 2. Include в голове

Файл `~/app/docker-compose.yml` — добавить **одну** строку в `include`, не трогая остальные сервисы:

```yaml
include:
  - ./postgres/docker-compose.yml
  - ./redis/docker-compose.yml
  - ./pgbouncer/docker-compose.yml
  - ./belle/docker-compose.yml
  - ./albedo/docker-compose.yml
```

Интерполяция `${ALBEDO_PUBLISH_*}` при запуске из `~/app` читается из **`~/app/.env`**, не из `albedo/.env`.

`albedo/.env` уходит в контейнер через `env_file`.

Практично: продублировать блок albedo в `~/app/.env` (или оставить дефолты compose: listen/publish `8080`).

Конфликт порта: belle уже публикует `8080:8080` (REST). Albedo по умолчанию тоже `:8080`. На голове выбрать свободный publish, например:

```bash
# ~/app/.env  и/или  ~/app/albedo/.env
ALBEDO_LISTEN_HOST=0.0.0.0
ALBEDO_LISTEN_PORT=8080
ALBEDO_PUBLISH_HOST=0.0.0.0
ALBEDO_PUBLISH_PORT=5173
ALBEDO_API_URL=http://belle:8080
```

Внутри контейнера listen может остаться 8080. Снаружи — `5173` или отдельный TLS vhost.

---

## 3. Origin на belle (`MIA_REST_SPA_ORIGINS`)

Если браузер шлёт `Origin`, belle сверяет его со списком. Несовпадение → `403 ORIGIN_MISMATCH`.

CORS не открывать (`MIA_REST_CORS_ORIGINS` пустой).

В `~/app/belle/.env` и/или `~/app/.env`:

```bash
# Dev (Vite на машине разработчика)
MIA_REST_SPA_ORIGINS=http://localhost:5173

# Prod — scheme+host+port СТРАНИЦЫ albedo, не belle
# Пример за TLS-терминатором:
# MIA_REST_SPA_ORIGINS=https://albedo.example.com
# Пример прямой публикации без TLS (только localhost):
# MIA_REST_SPA_ORIGINS=http://localhost:5173
```

Несколько origin — через запятую, без пробелов-сюрпризов:

```bash
MIA_REST_SPA_ORIGINS=http://localhost:5173,https://albedo.example.com
```

После смены — пересоздать контейнер belle (`docker compose up -d belle`), не только albedo.

`__Host-` cookies требуют `Secure`. На не-localhost без HTTPS браузер их не сохранит. TLS — снаружи контейнера (голова / отдельный proxy).

---

## 4. Сборка образа

Код SPA **не** из контекста `~/app/albedo` на диске, а `git clone` внутри Docker. Чтобы взять свежий git:

```bash
cd ~/app

# сброс git-слоя
CACHEBUST=$(date +%s) docker compose build albedo

# или явно
docker compose build --build-arg CACHEBUST="$(date +%s)" albedo
```

Ветка / URL (редко):

```bash
docker compose build \
  --build-arg CACHEBUST="$(date +%s)" \
  --build-arg GIT_REF=main \
  --build-arg GIT_URL=https://github.com/Dek1m/albedo.git \
  albedo
```

Локально из репозитория (без головы):

```bash
cd /path/to/albedo
cp -n .env.example .env
docker compose build --build-arg CACHEBUST="$(date +%s)"
```

Пока GitHub-репо пустое или недоступно — слой `git clone` упадёт. Сначала push в `Dek1m/albedo`.

---

## 5. Запуск

С головы:

```bash
cd ~/app
docker compose up -d albedo
docker compose ps albedo
docker compose logs -f albedo
curl -fsS "http://127.0.0.1:${ALBEDO_PUBLISH_PORT:-5173}/healthz"
```

Ожидание: `ok`, контейнер `healthy`.

Прокси (с хоста, через опубликованный порт):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Content-Type: application/json" \
  -H "X-Albedo-Client: spa" \
  -d '{}' \
  "http://127.0.0.1:${ALBEDO_PUBLISH_PORT:-5173}/api/v1/auth/needs_bootstrap"
```

Должен ответить belle (envelope), не nginx 404. Браузер на belle `:8080` не целиться.

---

## 6. Конфиг

| Источник | Где | Приоритет |
|----------|-----|-----------|
| `environment:` в compose | контейнер | 1 (высший) |
| `albedo/.env` (`env_file`) | контейнер | 2 |
| `/etc/albedo/albedo.conf` | bind `./config` | 3 |
| дефолты `entrypoint.sh` | образ | 4 |

Монтирование: `./config:/etc/albedo:ro`.  
Файл: `config/albedo.conf` (`KEY=VALUE`). Секретов нет.

`ALBEDO_PUBLISH_*` живут только в compose (проброс портов), в nginx не нужны.

`ALBEDO_API_URL` — `http://belle:8080`, **без** `/` на конце и **без** `/api`.

---

## 7. Запреты (не ломать сессию)

- Не ходить браузером на `http://belle:8080`.
- Не включать CORS ради SPA.
- Не писать `proxy_cookie_domain` / `cookieDomainRewrite` / `Domain=` на cookies.
- Не публиковать albedo и belle на разных host/scheme для одной сессии.

---

## 8. Остановка / откат include

```bash
cd ~/app
docker compose stop albedo
# полный откат сервиса:
docker compose rm -f albedo
```

Убрать строку `- ./albedo/docker-compose.yml` из головы. Postgres / belle / redis / pgbouncer не трогать.

---

## Чек-лист

- [ ] `~/app/albedo` склонирован, `.env` из example
- [ ] в голове есть `./albedo/docker-compose.yml`
- [ ] publish-порт не пересекается с belle `8080`
- [ ] `MIA_REST_SPA_ORIGINS` = origin страницы albedo
- [ ] образ собран с новым `CACHEBUST` после push в GitHub
- [ ] `/healthz` → `ok`
- [ ] `/api/v1/...` → envelope belle
