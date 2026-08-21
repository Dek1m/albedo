# ADR-001: Контракт albedo ↔ mia-auth

| Поле | Значение |
|------|----------|
| **Статус** | accepted |
| **Дата** | 2026-08-21 |
| **Проект** | albedo P0 + mia-auth |
| **Автор** | Эна |
| **Ревью безопасности** | Лита 2026-08-21: **ok с правками** (пункты 1–7 влиты, нормативные). Этап 1 после этого ADR |
| **Связанные стандарты** | `docs/CODING_STANDARD.md` v3.1 §5, §8, §10; OWASP JWT Cheat Sheet; OAuth 2.0 for Browser-Based Apps BCP (2026) |

---

## Решение (одна строка)

First-party React SPA albedo ходит в belle/mia **same-origin RPC POST**. Сессия — **HttpOnly cookies** `__Host-albedo_at` / `__Host-albedo_rt`. Токены **не** в JSON, **не** в `localStorage`/`sessionStorage`. Refresh **не** `public=True` и **не** требует живой access JWT: middleware валидирует refresh-cookie.

---

## Контекст

Сейчас (до этого ADR):

- Транспорт: `POST /api/v1/{module}/{function}`, envelope `{data, error, meta}`.
- `auth.login` возвращает `{access_token, refresh_token, user_id, username}` в JSON.
- Cookies нет. CORS пуст (`MIA_REST_CORS_ORIGINS=[]`).
- Public: `needs_bootstrap`, `bootstrap`, `login`. `refresh_token` / `logout` требуют живой Bearer.
- Access TTL 15 мин → после истечения refresh даёт 401.
- `auth.users`: нет `nickname` / `phone` / avatar / `user_prompt` / `chip_display_mode`.
- Группа Administrators не сидится. Primary membership нет.
- Ошибки логина часто уезжают HTTP 500 (dispatcher default).

Мастер (P0): бренд Albedo; колонки профиля не JSONB; аватар = инициалы или загруженная картинка; cookies; сид Administrators; superadmin = bootstrap user; смена username с паролем; телефон необязателен; Member Of только свои группы; primary = `is_primary`; same-origin, CORS `*` не открывать.

---

## Отклонённые альтернативы

| Вариант | Почему нет |
|---------|------------|
| **Bearer в JSON + sessionStorage/memory** | XSS читает JS. План P0 так предлагал — Мастер отверг. |
| **localStorage** | Ещё хуже: переживает вкладку, крадётся XSS. |
| **BFF / opaque server session** | Отдельный сервер на P0 избыточен. Reverse-proxy + HttpOnly cookies закрывают first-party SPA. |
| **CORS `*` + credentials** | Запрещено. Credentials только first-party. Dev = Vite proxy, prod = nginx same-origin. |
| **Keycloak / OIDC** | Local auth (argon2id + JWT) уже принят. |
| **REST CRUD** (`GET /users/me`) | Транспорт остаётся RPC POST. Исключение — один GET байтов аватара для `<img>`. |
| **`custom_fields` JSONB как профиль** | Ломает контракт и индексы. Отдельные колонки. |
| **`public=True` на `refresh_token`** | Анонимный RPC с refresh в теле. Хуже, чем cookie-credential: нет CSRF-слоя, проще украсть/replay из JS. |
| **Клиентский таймер `exp-60s` вместо фикса бэка** | Костыль. Сессия всё равно умирает. |

**Совместимость machine-клиентов (TUI/CLI):** только если **нет** `X-Albedo-Client: spa` **и нет** cookie `__Host-albedo_*`. Тогда login/refresh/logout — старый Bearer/JSON. Cookie без заголовка → `403 CSRF_HEADER`, не machine-режим. Albedo machine-канал **не использует**.

---

## 1. Транспорт и origin

```
Dev:  браузер → http://localhost:5173  (Vite)
                 └── proxy /api → http://127.0.0.1:8080
                 Cookie / Set-Cookie проксируются as-is. Origin для браузера = :5173.

Prod: браузер → https://<host>  (nginx)
                 ├── /        → static albedo
                 └── /api     → belle :8080
                 same-origin. CORS middleware не вешать.
```

- RPC: только `POST /api/v1/{module}/{function}`.
- Тело = kwargs. Ответ = envelope `{data, error, meta}`. Успех RPC = HTTP 200 (кроме ошибок).
- Фронт: `fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Albedo-Client": "spa" } })`.
- Заголовка `Authorization` у SPA **нет** (если прислали — **игнорировать**, см. §3.1).
- Dev URL страницы **только** `http://localhost:5173`. Не `127.0.0.1` (другой host → `__Host-` cookies не те).
- Если заголовок `Origin` **есть** — обязан совпасть со scheme+host страницы (`http://localhost:5173` в dev, prod host). Иначе **403** `ORIGIN_MISMATCH`.
- **Запрет P0:** cookie-сессия (`__Host-albedo_*`) **и** непустой `MIA_REST_CORS_ORIGINS`. CORS остаётся пустым, CORSMiddleware не монтируется.

Vite proxy — норма §2.5.

---

## 2. Cookies — принятая схема

### 2.1. Коллизия `__Host-` vs узкий Path (явно)

Префикс `__Host-` (RFC 6265bis / Chromium):

1. `Secure` обязателен.
2. Атрибут `Domain` **запрещён**.
3. `Path` **обязан** быть `/`.

Узкий `Path=/api/v1/auth/` для refresh **несовместим** с `__Host-`.

**Решение:** оба cookie с `Path=/`. Различаем **именами**. Refresh дополнительно `SameSite=Strict`. Сервер **читает** refresh-cookie только на `auth.refresh_token` и `auth.logout`; на остальных RPC игнорирует.

Отклонено: снять `__Host-` и взять `__Secure-albedo_rt` + узкий Path — слабее (можно поставить Domain, cookie уедет на поддомен).

### 2.2. Атрибуты

| | Access | Refresh |
|--|--------|---------|
| Имя | `__Host-albedo_at` | `__Host-albedo_rt` |
| Значение | JWT access | opaque refresh (как сейчас в БД, hash в `auth.auth_sessions`) |
| HttpOnly | да | да |
| Secure | да | да |
| SameSite | **Lax** | **Strict** |
| Path | `/` | `/` |
| Domain | нет | нет |
| Max-Age | 900 (15 мин) | 2592000 (30 суток) |

**Logout / сброс сессии (норма):** SPA **всегда** получает две `Set-Cookie` с `Max-Age=0` и **полным twin-атрибутов** каждой cookie. Успех отзыва в БД **не** условие очистки.

Twin при установке и при стирании:

- `__Host-albedo_at`: `Path=/; Secure; HttpOnly; SameSite=Lax` — без `Domain`
- `__Host-albedo_rt`: `Path=/; Secure; HttpOnly; SameSite=Strict` — без `Domain`

То же (две стирающие cookie) на `auth.logout` **и** на 401 / `REUSE_DETECTED` у `auth.refresh_token`.

localhost: Chromium считает `http://localhost` secure context — `Secure` cookies ставятся. Dev на LAN IP / `127.0.0.1` — **запрещён** как URL страницы. P0-dev = `http://localhost:5173`.

### 2.3. Что в JSON (SPA)

Токены **не** возвращать в `data`.

| Метод | `data` (SPA) |
|-------|----------------|
| `login` | `{ user_id, username }` затем клиент зовёт `get_me` |
| `refresh_token` | `{ user_id, username }` (без токенов) |
| `logout` | `true` |
| `bootstrap` | `{ user_id, username }` — cookies **не** ставит |

### 2.4. Кто ставит Set-Cookie

Не `AuthProvider` (он не знает HTTP). Слой REST:

- `modules/rest/dispatcher.py` — после `auth.login` / `auth.refresh_token` / `auth.logout` при SPA-режиме (`X-Albedo-Client: spa`) пишет `Set-Cookie`. На logout и на 401/`REUSE_DETECTED` refresh — две стирающие cookie (§2.2), даже если БД-сессия уже мертва.
- Токены вырезаются из `data` до envelope.
- `modules/rest/cookie_auth.py` — сборка атрибутов `__Host-`, twin Max-Age=0.

### 2.5. Vite (норма)

- Страница dev: **только** `http://localhost:5173`. Не `http://127.0.0.1:5173`.
- Target прокси: `http://127.0.0.1:8080` допустим (это upstream, не URL страницы).
- **Запрет:** `cookieDomainRewrite`, `cookiePathRewrite`. Бэкенд **никогда** не пишет `Domain`.
- `changeOrigin` допустим (не трогает cookie браузера).
- Прокси обязан отдать **оба** `Set-Cookie` как массив. Если proxy схлопнул два заголовка в один — чинить разбором массивом, не «последний победил».
- Проверка: DevTools → Application → Cookies на `http://localhost:5173` → два имени `__Host-albedo_at` и `__Host-albedo_rt`.

---

## 3. Refresh без живого Bearer (M7)

**Не** `public=True`.

`AuthMiddleware` (`modules/apiproxy/middleware.py`) + REST dispatcher:

1. Методы `auth.refresh_token` и `auth.logout` — **cookie-credential**. Живой access JWT **не** требуется.
2. Приоритет credential — **норма §3.1**. Не «cookie если есть, иначе body».
3. SPA: dispatcher **подставляет** refresh из `__Host-albedo_rt` в вызов provider **до** метода. Пустой kwargs (`{}`) **допустим**.
4. Дальше: hash → `auth.auth_sessions`, reuse (§3.2), ротация.
5. Остальные не-public в SPA: access только из `__Host-albedo_at`.

Клиентский таймер `exp-60s` — предохранитель **поверх** фикса. Single-flight: **Web Locks** (или BroadcastChannel) — не только in-memory mutex вкладки.

### 3.1. Приоритет credential (норма)

| Условие | Поведение |
|---------|-----------|
| Есть `X-Albedo-Client: spa` | **Cookie побеждает.** `kwargs.refresh_token` **игнорировать**. `Authorization` **игнорировать**. Refresh/access брать из `__Host-albedo_*`. |
| Cookie `__Host-albedo_*` есть, заголовка `X-Albedo-Client: spa` нет | **403** `CSRF_HEADER`. Не fallback на Bearer/JSON. |
| Нет header и нет cookie | Старый machine: Bearer + refresh в JSON. |

Значение `spa` — **не секрет**. Защита = non-simple header → preflight, плюс SameSite.

### 3.2. Reuse + cookies (норма)

Серверный **grace 5–10 с** на только что ротированный refresh:

- Повтор **того же** hash в окне → вернуть **ту же новую пару** (те же access+refresh, те же Set-Cookie). **Не** revoke family.
- Повтор того же hash **после** окна → `ReuseDetectedError` + revoke family + стирающие cookie (§2.2).

Клиент: `navigator.locks` с именем вроде `albedo-refresh` (или BroadcastChannel между вкладками). In-memory mutex вкладки **недостаточен**.

---

## 4. CSRF (норма)

`X-Albedo-Client: spa` **обязателен на каждом POST**, который читает `__Host-albedo_*`. Не только «мутации»: `get_me`, `refresh_token`, `logout`, `list_groups` — любой POST с cookie.

- Нет заголовка при наличии cookie → **403** `CSRF_HEADER`.
- GET **не** мутирует.

**Единственный exception:** `GET /api/v1/auth/avatar` — только чтение байтов. Обязательные заголовки ответа:

- `Cache-Control: private, no-store`
- `X-Content-Type-Options: nosniff`

Public POST без cookie (`needs_bootstrap`, `bootstrap`, `login`) заголовок всё равно шлёт SPA; сервер на login в SPA-режиме ставит cookie только если заголовок есть. Login без заголовка и без cookie = machine JSON.

**P1, не внедрять в P0:** synchronizer CSRF (`__Host-albedo_csrf` + `X-CSRF-Token`), `Sec-Fetch-Site`, HSTS. Место в `cookie_auth.py` не раздувать пустой веткой-заглушкой — отдельный пункт P1.

---

## 5. RPC-методы

Все: `POST /api/v1/auth/{fn}`. Имена полей как в БД: `username`, `first_name`, `last_name`. Не `displayName`.

### 5.1. Существующие (сигнатуры kwargs сохранить)

```
auth.needs_bootstrap() → bool                                          public
auth.bootstrap(username, password, email?) → {user_id, username}       public
auth.login(username, password, user_agent?, ip?)                       public
    SPA: Set-Cookie + data {user_id, username}
    machine: data {access_token, refresh_token, user_id, username}
auth.refresh_token(refresh_token?, user_agent?, ip?)                   cookie-credential
    SPA: dispatcher кладёт refresh из cookie; kwargs пустой ок; body refresh игнорировать
auth.logout(refresh_token?)                                            cookie-credential
    SPA: refresh из cookie; всегда две Set-Cookie Max-Age=0 (§2.2)
```

`user_agent` / `ip` SPA может не слать: REST подставляет из запроса (не доверять клиентскому IP как истине).

### 5.2. Профиль (себя)

Permission `profile:self` — у **любого** аутентифицированного пользователя. Не `users:read` (иначе дыра на чужие записи).

```
auth.get_me() → Profile
auth.update_me(nickname?, first_name?, last_name?, email?, phone?,
               user_prompt?, chip_display_mode?) → Profile
auth.change_username(new_username, password) → Profile
auth.set_avatar(image_b64, content_type) → { avatar_url }
auth.clear_avatar() → Profile
```

- `update_me` не принимает `username`, группы, `is_bootstrap_admin`, `is_superadmin`.
- `change_username`: текущий пароль обязателен; uniqueness как сейчас на колонке.
- Санитизация длины: nickname/first/last ≤ 255; phone ≤ 32; user_prompt ≤ 32 KiB; email RFC-простая проверка.
- `chip_display_mode`: только `"nickname"` | `"full_name"`. Mutex на сервере (не два boolean).

### 5.3. DTO Profile

```
Profile {
  user_id: uuid
  username: str
  nickname: str | null
  first_name: str | null
  last_name: str | null
  email: str | null
  phone: str | null                 # колонка есть, NULL ок, форма не обязана
  avatar_url: str | null            # "/api/v1/auth/avatar" если байты есть; иначе null
  user_prompt: str | null
  chip_display_mode: "nickname" | "full_name"
  is_superadmin: bool               # = is_bootstrap_admin
  is_bootstrap_admin: bool
  primary_group_id: uuid | null
}
```

`password_hash` в DTO **никогда**.

### 5.4. Аватар

- Нет картинки → UI рисует инициалы из display name (не серый placeholder).
- Загрузка в P0: `set_avatar`.
- Хранение: **не** JSONB. Таблица `auth.user_avatars` (предпочтительно) или `BYTEA` на `users`.
- MIME: `image/jpeg` | `image/png` | `image/webp`. **SVG запрещён** (XSS).
- Лимит: 256 KiB raw до b64. `MIA_REST_MAX_BODY_BYTES` = 1 MiB — запас на envelope.
- `avatar_url` — относительный same-origin URL, не `data:` в JSON.

**Исключение из RPC-only:** `GET /api/v1/auth/avatar` → `Content-Type` картинки, байты, cookie-access. Нужен `<img src>`. Это **не** CRUD users. POST `get_avatar` → b64 допустим как fallback, UI P0 использует GET.

### 5.5. Группы (Member Of = только self)

```
auth.get_my_groups() → Group[]
auth.list_groups(offset?, limit?) → { items: Group[], total: int }
auth.add_user_to_group(user_id?, group_id)
auth.remove_user_from_group(user_id?, group_id)
```

P0:

- `user_id` из сессии. Чужой `user_id` без `groups:manage_membership` → `ForbiddenError`. UI чужих юзеров нет.
- `list_groups` для диалога Add: `id, name, description, is_builtin` (без чужих membership). Любой аутентифицированный.
- `set_primary_group` — **не P0**. Primary назначается при bootstrap/создании и не снимается.

```
Group {
  id: uuid
  name: str
  description: str | null
  is_builtin: bool
  is_primary: bool          # относительно текущего пользователя в get_my_groups
}
```

В `list_groups` поле `is_primary` = false / опустить.

---

## 6. Ошибки логина ≠ 500

`envelope.error` всегда. HTTP = `error.status_code`. Фронт парсит `error` **независимо** от HTTP.

| Исключение | `error.code` | HTTP |
|------------|--------------|------|
| `InvalidCredentialsError` | `INVALID_CREDENTIALS` | **401** |
| `AccountLockedError` | `LOCKED` | **403** |
| `AccountDisabledError` | `DISABLED` | **403** |
| `ReuseDetectedError` | `REUSE_DETECTED` | **401** |
| `ForbiddenError` | `FORBIDDEN` | **403** |
| `PermissionDeniedError` | `PERMISSION_DENIED` | **403** |
| `NotFoundError` | `NOT_FOUND` | **404** |
| `AuthError` (expired/invalid refresh) | `AUTH_ERROR` | **401** |
| Bootstrap already completed | `BOOTSTRAP_DONE` | **409** |
| Нет `X-Albedo-Client` при cookie | `CSRF_HEADER` | **403** |
| `Origin` есть и не совпал | `ORIGIN_MISMATCH` | **403** |
| Неизвестное | `ERROR_500` | 500 |

Маппинг: `modules/apiproxy/converter.py` + `modules/rest/dispatcher.py`. Не глотать `AuthError` в generic 500.

SPA при 401 на обычном RPC → один refresh (Web Locks / BroadcastChannel) → retry. Refresh 401 / `REUSE_DETECTED` → сервер сам шлёт twin Max-Age=0; клиент → `/login`. Не ждать успеха `logout` в БД.

---

## 7. AD-инварианты (сервер — истина)

### 7.1. Builtin Administrators

- Сид при initialize/apply schema: `name="Administrators"`, `is_builtin=true`. Группа **всегда** есть до первого bootstrap.
- `delete_group` builtin → `ForbiddenError`.
- Bootstrap: `find_group_by_name("Administrators")` находит группу, добавляет первого админа, ставит `is_primary=true`.

### 7.2. Superadmin

- Superadmin = пользователь `bootstrap`. Колонка `auth.users.is_bootstrap_admin BOOLEAN NOT NULL DEFAULT FALSE`.
- Не «любой `system_admin`».
- С superadmin **нельзя** снять Administrators → `ForbiddenError`.
- UI: Remove disabled + tooltip. UI не заменяет сервер.

### 7.3. Primary

- `auth.user_group_membership.is_primary BOOLEAN NOT NULL DEFAULT FALSE`.
- Partial unique index: `(user_id) WHERE is_primary`.
- Ровно одна primary на пользователя.
- `remove_user_from_group` если `is_primary` → `ForbiddenError`.
- Bootstrap-админ: primary = Administrators.

### 7.4. Чего фронт не выдумывает

Сейчас в коде нет сида, primary, защиты superadmin. `remove_user_from_group` безусловный. Пока Нора/Сона не вольют инварианты — Member Of в UI disabled, без фейковых групп.

---

## 8. Схема БД (контракт для Норы)

Не JSONB-свалка.

`auth.users` **добавить**:

| Колонка | Тип | NULL | Заметки |
|---------|-----|------|---------|
| `nickname` | `VARCHAR(255)` | да | display name ≠ username |
| `phone` | `VARCHAR(32)` | да | **не** NOT NULL |
| `user_prompt` | `TEXT` | да | |
| `chip_display_mode` | `VARCHAR(16)` | нет | default `'nickname'`; CHECK in (`nickname`,`full_name`) |
| `is_bootstrap_admin` | `BOOLEAN` | нет | default false |

`auth.user_group_membership` **добавить**: `is_primary BOOLEAN NOT NULL DEFAULT FALSE` + partial unique index.

`auth.groups`: сид Administrators (`is_builtin=true`). Колонка `is_builtin` уже есть.

Аватар: `auth.user_avatars (user_id PK FK users, bytes BYTEA NOT NULL, content_type VARCHAR(64) NOT NULL, updated_at)`.

Permission: `profile:self` в `AUTH_CORE_SCHEMA`; выдать всем ролям / любому authenticated в middleware self-методов.

---

## 9. Файлы бэка, которые тронут Сона и Нора

Конкретные пути (mia + rest; belle — только обёртка, код auth не дублировать):

### Нора (схема / DDL / сид)

| Файл | Что |
|------|-----|
| `/home/opencode/projects/mia/modules/auth/schemas.py` | колонки users, `is_primary`, таблица avatars |
| `/home/opencode/projects/mia/modules/auth/ddl/002_indexes.sql` | partial unique `is_primary`; индекс avatars |
| `/home/opencode/projects/mia/modules/auth/ddl/003_checks.sql` | CHECK `chip_display_mode`; запрет SVG не в SQL |
| `/home/opencode/projects/mia/modules/auth/schema.py` | permission `profile:self` |
| `/home/opencode/projects/mia/modules/auth/schema_registry.py` | сид группы Administrators builtin |
| `/home/opencode/projects/mia/modules/auth/bootstrap.py` | `is_bootstrap_admin=true`, primary membership |

Миграция существующей БД: отдельный DDL/apply через принятый механизм schema-first mia (не выдумывать Alembic, если его нет). Нора фиксирует идемпотентный apply.

### Сона (mia-auth + rest)

| Файл | Что |
|------|-----|
| `/home/opencode/projects/mia/modules/auth/provider.py` | get_me / update_me / …; инварианты remove; **grace 5–10 с** на повтор того же refresh-hash |
| `/home/opencode/projects/mia/modules/auth/repository.py` | SELECT/UPDATE новых колонок; avatar; is_primary; сид-хелперы |
| `/home/opencode/projects/mia/modules/auth/user.py` | доменные инварианты профиля, если жирнее DTO |
| `/home/opencode/projects/mia/modules/auth/validators.py` | email/phone/username/chip_display_mode/avatar MIME+size |
| `/home/opencode/projects/mia/modules/apiproxy/middleware.py` | cookie-credential для refresh/logout; не требовать живой access |
| `/home/opencode/projects/mia/modules/apiproxy/converter.py` | маппинг `AuthError.code` → HTTP ≠ 500 |
| `/home/opencode/projects/mia/modules/apiproxy/registry.py` | только если появится флаг `cookie_auth` в meta |
| `/home/opencode/projects/mia/modules/rest/dispatcher.py` | приоритет §3.1; подставить refresh из cookie; Origin; CSRF на каждом POST с cookie; twin Set-Cookie |
| `/home/opencode/projects/mia/modules/rest/factory.py` | GET `/api/v1/auth/avatar` + `no-store`/`nosniff`; **запрет** непустого CORS при cookie-сессии |
| `/home/opencode/projects/mia/modules/rest/cookie_auth.py` | **новый**: `__Host-` twin, Max-Age=0 всегда с полным набором атрибутов |
| `/home/opencode/projects/mia/modules/rest/envelope.py` | без токенов в логах meta |
| `/home/opencode/projects/mia/modules/rest/middleware.py` | не логировать Cookie / Set-Cookie значения |
| `/home/opencode/projects/mia/modules/auth/tests/test_provider.py` | refresh без Bearer; login errors; AD-инварианты |
| `/home/opencode/projects/mia/modules/auth/tests/test_repository.py` | колонки, primary unique |
| `/home/opencode/projects/mia/modules/auth/tests/test_critical_scenarios.py` | reuse + cookie |
| `/home/opencode/projects/mia/modules/rest/tests/test_dispatcher.py` | Set-Cookie, CSRF header, login ≠ 500 |
| `/home/opencode/projects/mia/modules/apiproxy/tests/test_middleware.py` | refresh без token |

Belle (`/home/opencode/projects/belle/app.py`) — не место для колонок и RPC. Не трогать, если только проксирует `Application()` mia.

---

## 10. Последствия для фронта (кратко)

См. `docs/ARCHITECTURE.md`. AuthStore **не** хранит токены. Сессия = «cookie есть и `get_me`/`refresh` прошёл».

---

## 11. Риски

| Риск | Митигация |
|------|-----------|
| `__Host-` не встанет без Secure | только `http://localhost:5173` / HTTPS. Не 127.0.0.1 |
| Refresh cookie уходит на все Path=/ | сервер игнорирует вне refresh/logout; SameSite=Strict |
| XSS мутирует от имени юзера | HttpOnly + `X-Albedo-Client` на каждом POST + Origin check |
| Две вкладки refresh | grace 5–10 с на сервере + Web Locks / BroadcastChannel |
| Cookie без header = CSRF | **403 CSRF_HEADER**, не machine fallback |
| Proxy схлопнул два Set-Cookie | разбор массивом; проверка DevTools |
| Аватар в кеше CDN | `Cache-Control: private, no-store` |
| Machine-клиенты | только если нет header и нет cookie |

---

## 12. Ревью Литы 2026-08-21: ok с правками

Схему cookies (`__Host-albedo_at` / `__Host-albedo_rt`, Path=/, без Domain) **не ломать**.

Вердикт: **ok с правками**. Пункты 1–7 **закрыты в этом ADR** (норма, не рекомендации):

| # | Тема | Где в ADR |
|---|------|-----------|
| 1 | CSRF: `X-Albedo-Client: spa` на каждом POST, читающем cookie; GET avatar = exception + `no-store`/`nosniff` | §4, §5.4 |
| 2 | Приоритет credential: spa → cookie wins; cookie без header → 403; иначе machine | §3.1 |
| 3 | Origin обязан совпасть; запрет cookie-сессия + непустой `MIA_REST_CORS_ORIGINS` | §1 |
| 4 | Reuse grace 5–10 с; клиент Web Locks / BroadcastChannel | §3.2 |
| 5 | Logout/401/REUSE всегда twin Set-Cookie Max-Age=0; БД не условие | §2.2 |
| 6 | Dev только `localhost:5173`; запрет cookieDomain/PathRewrite; два имени в DevTools | §2.5 |
| 7 | Dispatcher подставляет refresh из cookie; пустой kwargs ок | §3, §5.1 |

**P1 — не внедрять в P0** (только список):

- synchronizer CSRF (`__Host-albedo_csrf` + `X-CSRF-Token`)
- проверка `Sec-Fetch-Site`
- HSTS (prod TLS — контур Рэй после P0)
- закрытие machine Bearer-канала

Этап 1 **был** заблокирован, пока 1–7 не в ADR. Сейчас влиты. Код этим документом не пишется. Дальше: Нора → Сона → Катерина.

---

## 13. Статус внедрения

Принято Мастером (Q1–Q12 / M1–M10). Ревью Литы 2026-08-21 закрыто правками §12. Статус ADR: **accepted**.
