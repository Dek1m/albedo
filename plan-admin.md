# План: llm + fs + админка albedo (люди, система, воркеры, MCP)

| Поле | Значение |
|------|----------|
| **Тип** | архитектура + фича |
| **Сложность** | высокая |
| **Статус** | черновик, код не писать до утверждения Мастером |
| **Рабочий файл** | `/home/opencode/projects/albedo/plan-admin.md` |
| **Не путать с** | `albedo/plan.md` (P0 логин/чип — уже в прошлом) |
| **Стандарты** | `docs/CODING_STANDARD.md`, `docs/LOGGING_STANDARD.md`, cookies/`ADR-001` |

**Репозитории:** albedo, mia-llm, mia-auth, mia-workspace → новый mia-fs, mia-worker, belle (compose + `MIA_WORKER_MODULES`).

**Цепочка после утверждения:**

```
Эна — ADR: state.llm (провайдеры/агенты), state.fs, админ-поверхность, права
  → Нора — llm.providers (+ секреты), позже MCP
    → Сона — сначала llm (модуль + админка провайдеров/агентов), затем fs/auth/worker
      → Лита — ключи провайдеров, права, песочница fs
        → Катерина — тесты пирамиды
          → Рэй — worker modules: llm,fs; volume /home
            → Мая — health провайдеров, модулей, очереди
```

Код только по шагам плана, без перестановки. Keycloak / Kerberos в этой волне **не реализовывать**.

---

## 1. Цель

Сначала мозг, потом диск, потом люди и эксплуатация.

1. **`state.llm`** — нормальный модуль: провайдеры (настройка, ключи, модели, health), агенты (определения + вызов с воркера). Без этого админка и fs — пустая оболочка.
2. **`state.fs`** — диск `/home/{логин}` только на воркере. Тулы агента не трогают FS сами.
3. **Админка в albedo** — LLM (провайдеры, агенты), люди, система (health, модули, MCP), очередь воркера.

Workspace — **проект** (сессии, какие папки прилинкованы). Диск — не его зона.

---

## 2. Инварианты

- Транспорт SPA: `POST /api/v1/{module}/{function}`, HttpOnly cookies, `X-Albedo-Client: spa`. Не REST CRUD `/admin/users`.
- Диск и тяжёлая работа — только Celery-воркер. Belle REST только диспатчит.
- Песочница fs: путь только внутри `/home/{unix_name}`. Нет `..`, нет выхода. Имя модуля `fs`, но скоуп — домашние каталоги; произвольной файловой системой модуль не становится.
- Админ-RPC проверяют permission из `AUTH_CORE_SCHEMA` (или новые, явно добавленные). Не «если username=admin».
- Не дублировать модель людей: таблицы `auth.users / groups / roles / permissions` уже есть.
- Local auth (argon2id + JWT) остаётся источником истины. SSO — отдельная волна.
- Секреты провайдеров и MCP не в коде, не в логах, не в ответе RPC (ключ — только write, в GET маска).
- Вызов модели (`llm.chat`) — задача воркера `type=network`, не из процесса belle.

---

## 3. Что уже есть (не изобретать)

| Есть | Где | Дыра |
|------|-----|------|
| Users/groups/roles/permissions + CRUD Python | `mia/modules/auth` | Большинство **без** `api=True`: `list_users`, `create_user`, `block_user`, роли |
| Self-профиль, login, cookies | `api=True`: get_me, update_me, list_groups, add/remove group | Нет админ-списка пользователей с SPA |
| `AUTH_CORE_SCHEMA` | users:*, groups:*, roles:*, user_state:*, passwords:manage, system:force_delete | Нет `fs:*`, `system:observe`, `mcp:*` |
| mia-llm скелет | агенты в БД, `chat`/`agents`/`get_providers` с `api=True`, OpenAI-compatible | Провайдеры **только из env** (`MIA_LLM_PROVIDERS` / `LLM_API_KEY`); нет CRUD провайдеров; `chat_stream` заглушка; воркер llm **не грузит**; в albedo экранов нет |
| `LLM_SCHEMA` | llm:chat, chat_stream, agent_manage, agent_list, config | Нет `llm:provider_manage` |
| Диск `~/` | workspace `homes.py` + `fs.py`, volume `user-homes:/home` | Смешано с проектом |
| Health belle | `GET :8000/health` | Нет сводки модулей/воркера в SPA |
| Очередь | Celery Redis `mia.run` | Нет RPC «что в полёте» |

---

## 4. Вне скоупа этой волны

- Keycloak, OIDC, Kerberos, AD federation.
- Переписывать workspace UI / git-строку / линковку папок (кроме вызова fs из workspace).
- Произвольный FileSystem на State.
- Полноценный tool-loop агента (фаза после fs). В фазе llm — определения агентов + chat от имени агента без тулов.
- Flower как продукт. Свой экран в albedo, данные с воркера.

SSO фиксируем как **волну N+1**: Keycloak снаружи, Kerberos внутри Keycloak, belle по-прежнему JWT/OIDC. В план не кладём шаги кода.

---

## 5. Фазы

### Фаза 0 — ADR (Эна)

Документ в `albedo/docs/` или `belle/docs/adr/`:

- `state.llm`: провайдер (endpoint + ключ + модели) ≠ агент (промпт, модель, права, тулы).
- Провайдеры живут в системной БД, не в JSON env. Env — только bootstrap/override на крайний случай.
- `state.fs` vs `state.workspace`.
- Админка — раздел albedo, не отдельное приложение. Гейт: permission, не роль в лоб.
- Новые permissions: `llm:provider_manage`, `fs:read`, `fs:write`, `system:observe`, `mcp:manage` (имена уточнит Эна, не раздувать).
- MCP-конфиг — позже, системная БД, health с воркера.

**Стоп:** Мастер принимает ADR. Без этого код не начинать.

### Фаза 1 — модуль `llm`: провайдеры и агенты (Сона, сразу после ADR)

Не писать с нуля: довести `mia/modules/llm` до продукта. Воркер: `MIA_WORKER_MODULES` += `llm`.

**Провайдеры (настройка):**

- Таблица `llm.providers` (Нора): имя, base_url, default_model, timeout, enabled, default/fallback, секрет ключа.
- RPC `api=True`: list / get / create / update / delete / set_default / health / list_models.
- Ключ только write; в GET — `api_key_set: true` и маска. Health и list_models — с воркера (`type=network`).
- Реестр в рантайме перечитывает БД, не один раз из env при старте.
- Админка albedo: экран **Провайдеры** — список, форма, проверка связи, список моделей.

**Агенты:**

- Довести CRUD (уже есть) + привязка к провайдеру/модели, system prompt, settings, is_active.
- Запрет ломать system-агентов — уже есть; UI это уважает.
- RPC `chat` от имени агента: подставляет prompt/model/provider, идёт на воркер.
- Админка: экран **Агенты** — список + карточка. Чат в workspace можно подключить тонко, без tool-loop.

**Пункт меню (как Workspace), не внутри «Администрирование»:**

В хедере рядом: `albedo · Workspace · LLM`. Клик по **LLM** открывает каталог агентов (как клик Workspace → список проектов). Hover:

| Пункт | Что |
|-------|-----|
| Agents | определения агентов, карточка, привязка модели |
| Models | каталог моделей, группировка по провайдеру |
| Providers… | подключения: url, ключ, health, default/fallback |

Люди / health / MCP остаются в отдельном **Admin** (позже). LLM — продуктная поверхность, не закапывать в настройки. Пункты скрывать по `llm:agent_list` / `llm:config` / `llm:provider_manage`.

**Не делать в фазе 1:** тулы к диску, MCP, стриминг как отдельный протокол (оставить честный chat, stream — следующая итерация внутри llm, не блокер).

### Фаза 2 — модуль `fs` (Сона, после llm)

Новый модуль `mia/modules/fs` (репо как у workspace). Workspace перестаёт владеть unix home / list / mkdir / move / trash / git.

| RPC | Зачем |
|-----|--------|
| `list`, `stat`, `read`, `write`, `mkdir`, `touch`, `move`, `rename`, `trash` | диск `~/` |
| `git_status` (перенос `list_git`) | ветка над деревом |

- `state.fs` на Application.
- `ensure_unix_home` остаётся здесь.
- workspace.`link_home_path` вызывает fs только чтобы убедиться, что путь существует; membership — в workspace.
- Worker: `MIA_WORKER_MODULES` += `fs`. Volume `user-homes` без изменений.
- Агентные тулы позже — тонкие обёртки над этими RPC, без своего FS.

**Не делать в фазе 2:** тулы LLM (фаза 7), админ-UI диска, обобщённый доступ к произвольным путям за пределами песочницы.

Админ-шелл albedo появляется уже в фазе 1 (пункты Провайдеры / Агенты). В фазе 3 добавляются Люди.

### Фаза 3 — админ: люди

Фронт: в уже существующий раздел **Администрирование** (фаза 1) добавить Пользователи, Группы, Роли. Скрыты без прав.

Бэк, `api=True` + `_session_user_id` + check_permission:

- `list_users`, `get_user`, `create_user`, `update_user`, `delete_user`
- `enable_user` / `disable_user` / `block_user` / `unblock_user`
- `set_password` (админский сброс)
- группы: CRUD + membership (часть уже RPC)
- роли: list/inspect/assign (сейчас Python-only)

UI в языке albedo (Discord-серый, бренд `#ff7a1a`), без сюсюканья. Список + карточка, не Excel на 40 колонок.

Последнего `system_admin` не удалять (уже в `delete_user`).

### Фаза 4 — система: health и модули

Новый тонкий модуль **или** методы на worker (Эна решит в ADR; не плодить пустышку):

- сводка: REST жив, Redis, Postgres/pgbouncer, worker heartbeat;
- список загруженных модулей + версия;
- без SSH с фронта, без docker API в браузере.

Мая: что считать красным (воркер молчит N секунд).

### Фаза 5 — задачи на воркерах

RPC с воркера: активные / зарезервированные / недавние failed (Celery inspect + результат бэкенда, если есть). Permission `system:observe`. Пагинация, без сырого traceback с секретами в UI.

Не встраивать Flower.

### Фаза 6 — MCP-подключения

После людей и health. Таблица (Нора) + RPC: list/add/disable/health-check. Health-check — задача воркера. URL/токены — секреты. Агент в фазе 1 уже есть: MCP подключается к нему, не наоборот.

### Фаза 7 — тулы агента → fs

Встроенные тулы только через `fs.*` на воркере. Не раньше фаз 1 и 2.

---

## 6. Порядок работ (зависимости)

```
Фаза 0 ADR
    └── Фаза 1 llm            (провайдеры + агенты + админ-экраны)  ← сначала
            ├── Фаза 2 fs
            └── Фаза 3 админ-люди
                    └── Фаза 4 health
                            └── Фаза 5 очередь
                                    └── Фаза 6 MCP
Фаза 7 тулы ── llm + fs
SSO ────────── вне плана
```

Не начинать MCP и SSO, пока llm живой и люди закрыты правами. fs не стартовать раньше llm.

---

## 7. Критерии приёмки (волна целиком — нет; по фазам)

**Фаза 1:** в админке создаётся провайдер, health зелёный, ключ в ответе не светится; создаётся агент; `llm.chat` с воркера отвечает выбранной моделью. Env-only провайдеры больше не единственный путь.

**Фаза 2:** albedo list/create/trash папок идёт в `fs.*`; workspace не содержит `ensure_unix_home`.

**Фаза 3:** system_admin создаёт пользователя из SPA; user без `users:list` получает отказ, не пустой список; пароль не светится в ответе.

**Фаза 4:** экран системы показывает belle/worker/redis/db без SSH.

**Фаза 5:** видна хотя бы одна живая `mia.run` задача после действия в UI.

**Фаза 6:** невалидный MCP URL помечается мёртвым с воркера.

---

## 8. Риски

| Риск | Что делать |
|------|------------|
| Ключи провайдеров в GET/логах | Лита; маска; audit кто менял |
| Провайдеры снова зашить в env | Запрещено после фазы 1; env только аварийный bootstrap |
| Вынести fs и сломать линковку | Фаза 2 — тонкий фасад, тесты list/link/trash до UI |
| Админ-RPC без permission check | Лита на каждый `api=True` |
| Celery inspect с REST-процесса | Только задача на воркере |
| Раздуть FileSystem до произвольной | Скоуп в инвариантах: только `~`, песочница `/home/{unix_name}`; имя `fs` — про утилиты, не про вседозволенность |
| Начать Keycloak «заодно» | Отказ. Волна N+1 |

---

## 9. Первый шаг после «да»

Эна пишет ADR (фаза 0). Сона не трогает репы до приёмки ADR Мастером.
