# ADR-004: admin → system (модуль, схема, UI, overlay)

| Поле | Значение |
|------|----------|
| **Статус** | proposed |
| **Дата** | 2026-09-02 (вечер) |
| **Авторы** | Эна (architect) |
| **Проекты** | mia-admin→mia-system, mia (core/apiproxy), belle, albedo |
| **Связанные** | ADR-001 mia-admin (accepted, слои Hexagonal+Clean, схема `admin.*`); ADR-002 domain-on-state; belle ADR-004 schema-apply-once; albedo ADR-001 транспорт cookies |
| **Стандарты** | `docs/CODING_STANDARD.md`, `docs/LOGGING_STANDARD.md` |
| **Код не в этом ADR** | Сона не трогает репы до accepted Мастером |

---

## Решение (одна строка)

Модуль `admin` становится ядром **`system`**: PostgreSQL-схема `ALTER SCHEMA admin RENAME TO system`, фасад `state.system` (+ `.modules`, `.prefs`), RPC `POST /api/v1/system/{fn}` без алиаса `admin.*`, меню albedo **System** (Users & Roles / Modules / Preferences). Hot-update продукта — **volume overlay**, не `git pull` в слой образа; worker — `celery control pool_restart` после intent в БД. Один деплой-волна: migrate → belle+worker → spa.

---

## 1. Контекст

Приказ Мастера 02.09.2026: `admin` — имя продукта «панель», не ядра. Ядро управляет модулями и глобальными предпочтениями. Существующий Domain+Roles остаётся, переезжает в окно **Users & Roles**.

Факты из кода (инвентарь §2): схема PostgreSQL уже `admin` (`schemas.py` `"schema": "admin"`); RPC живёт как `admin.{fn}`; belle клонирует `Dek1m/mia-admin`; apiproxy whitelist содержит `admin`; роль AUTH `system_admin` и permission `system:force_delete` **уже есть** и **не** относятся к имени модуля.

Ограничения:

- Обратной совместимости RPC `admin.*` в проде **нет**.
- Один деплой-волна бэк+фронт. Локально: migrate → backend → spa.
- `git pull` в эфемерный слой образа запрещён как механизм update.
- Секреты не в GET.
- Имя окна **Users & Roles** утверждено (не Directory).
- `system_admin` (роль AUTH) ≠ модуль `system`.

---

## 2. Инвентарь (grep 02.09.2026)

### 2.1 Что переименовывается

| Было | Станет | Где |
|------|--------|-----|
| PostgreSQL schema `admin` | `system` | `schemas.py` `"schema"`, DDL, SQL в repos |
| `admin.ou` | `system.ou` | таблицы **имена не меняем**, только схема |
| `admin.user_ou` | `system.user_ou` | то же |
| `admin.group_ou` | `system.group_ou` | то же |
| `admin.ou_prevent_cycle_fn` | `system.ou_prevent_cycle_fn` | уедет вместе с `ALTER SCHEMA` |
| indexes `ON admin.*` | `ON system.*` | `ddl/001_indexes.sql` |
| seed `INSERT INTO admin.*` | `system.*` | `ddl/003_seed_ou.sql` |
| `admin:domain_read` | `system:domain_read` | `schema.py` AUTH_SCHEMA + `provider.py` permission= + `auth.permissions` |
| `admin:domain_write` | `system:domain_write` | то же |
| роль `admin_operator` | `system_operator` | `schema.py` roles; `auth.roles` |
| `register_sync("admin", …)` | `register_sync("system", …)` | `__init__.py` |
| `state.admin` | `state.system` | `on_load` |
| `AdminModule` / `AdminProvider` / `AdminConfig` / `AdminRepository` / `ADMIN_SCHEMA` | `System*` / `SYSTEM_SCHEMA` | пакет модуля |
| `name="admin"` | `name="system"` | ModuleBase |
| `modules/admin/` | `modules/system/` | локальный путь |
| GitHub `Dek1m/mia-admin` | `Dek1m/mia-system` | Рэй `gh repo rename` |
| Dockerfile clone `mia-admin.git …/modules/admin` | `mia-system.git …/modules/system` | `belle/Dockerfile` |
| `_REQUIRED_MODULES` `"admin"` | `"system"` | `belle/app.py` |
| `_MODULES` `…, "admin"` | `…, "system"` | `belle/migrate.py` |
| `MIA_WORKER_MODULES=…,admin,…` | `…,system,…` | `belle/docker-compose.yml` (оба сервиса) |
| `MIA_APIPROXY_WHITELIST=…,admin,…` | `…,system,…` | compose, `.env.example`, `apiproxy` default |
| `_DEFAULT_WHITELIST` `"admin"` | `"system"` | `apiproxy/__init__.py`, `apiproxy/config.py` |
| `mapping["admin"] = AdminProvider` | `mapping["system"] = SystemProvider` | `_resolve_provider_class` |
| `from modules.admin.provider import …` | `modules.system.provider` | apiproxy, тесты |
| albedo `src/api/adminApi.ts` | `systemApi.ts` | `apiClient.call('system', fn, …)` |
| `src/features/admin/` | `src/features/system/` | папка фичи |
| кнопка «Admin Panel» | меню **System** | `AdminMenu` → `SystemMenu` |
| `AdminWindow` title «Admin Panel» | окно **Users & Roles** | UX вкладок Domain/Roles **без смены** |
| windowId `albedo-admin*` | `albedo-system*` | `Window.tsx` иконки |
| тесты `modules/admin/tests/*` | `modules/system/tests/*` | импорты + SQL `admin.` → `system.` |
| `hash.json` модуля | пересчитать | после переименования файлов |

RPC-имена методов (**префикс модуля меняется, имена функций нет**):

`caps`, `domain_tree`, `create_ou`, `rename_ou`, `delete_ou`, `delete_directory_user`, `delete_directory_group`, `create_user_in_ou`, `create_group_in_ou`, `rename_user`, `rename_group`, `list_roles`, `get_role`, `upsert_role_mask`, `get_directory_user`, `update_directory_user`, `set_directory_avatar`, `list_user_groups`, `clone_role`, `create_role`, `list_role_groups`, `list_group_roles`, `assign_group_role`, `remove_group_role`.

Новые RPC (тот же провайдер): `modules_list`, `modules_reload`, `modules_update`, `modules_unload`, `modules_disable`, `modules_delete`, `modules_install` (заглушка), `pref_list`, `pref_get`, `pref_set`.

### 2.2 Что НЕ трогаем

| Имя | Почему |
|-----|--------|
| роль AUTH `system_admin` | зарезервирована `_RESERVED_ROLES`; bootstrap; не имя модуля |
| `system:force_delete` | уже в `auth/schema.py`; сосед в NS `system:`, не конфликт |
| колонка `ou.is_system` | флаг builtin-узла дерева, не схема |
| `get_admin_dsn`, `DB_ADMIN_HOST`, lock-коммент «admin-DSN» | postgres superuser, не модуль |
| `pgbouncer.ini` `admin_users` | PgBouncer |
| `is_user_admin` / `get_active_admin_count` | AUTH: «есть ли роль system_admin» |
| `is_superadmin` / `is_bootstrap_admin` | контракт albedo ADR-001 |
| тесты `username == "admin"` (запрет гейта) | остаются как запрет |
| CSS `.albedo-admin-*` | UX не меняем; токены визуала |

### 2.3 Права `admin:*` → `system:*`

Сейчас в модуле только две:

- `admin:domain_read` → **`system:domain_read`**
- `admin:domain_write` → **`system:domain_write`**

Новые (модуль `system`, не AUTH core):

- `system:modules_read` / `system:modules_write`
- `system:prefs_read` / `system:prefs_write`

`system_operator` = бывший `admin_operator` (domain + `users:*` `groups:*` `roles:*`). **Модули и prefs оператору не выдаём** — только `system_admin` (`*:*`) или явный грант.

`permission="admin"` как строка — в коде нет (тест запрещает). Остальные permission RPC (`users:*`, `roles:*`, `groups:*`) не меняются.

### 2.4 Файлы модуля (текущие)

`__init__.py`, `config.py`, `provider.py`, `repository.py`, `folder_repository.py`, `mask.py`, `schema.py`, `schemas.py`, `hash.json`, `ddl/001_indexes.sql`, `ddl/002_ou_cycle.sql`, `ddl/003_seed_ou.sql`, `tests/{conftest,test_domain_tree,test_ou,test_mask,test_provider}.py`.

Albedo: `adminApi.ts`, `features/admin/*` (AdminWindow/Menu, Domain*, Roles*, Directory*, Role*), `AppShell`, `Window.tsx` иконки.

---

## 3. Целевой API

**Рекомендация (принята в этом ADR):** модуль `system`; имена методов **без** префикса `admin`; directory-методы остаются короткими (`domain_tree`, не `system_domain_tree`). Транспорт сам даёт префикс: `POST /api/v1/system/domain_tree`.

```
state.system              # SystemProvider — фасад, единственный RPC-класс
state.system.modules      # ModuleControl (не отдельный apiproxy-модуль)
state.system.prefs        # PrefStore
```

Слои как ADR-001/002: albedo → rest → apiproxy whitelist `system` → worker `@task` → SystemProvider → `state.domain` / AUTH repo / ModuleManager. REST CRUD `/system/*` кроме RPC-формы — запрещён. SQL только `@task type=database`. Nested `@task` — запрещён.

`system` **нельзя unload**. Зависимости модуля: `log`, `db`, `auth`, `workspace` (directory как сейчас).

---

## 4. Миграция БД (belle ADR-004 schema-apply-once)

**Решение: `ALTER SCHEMA admin RENAME TO system`.** Таблицы `ou` / `user_ou` / `group_ou` не переименовываем. FK, indexes, trigger, function переезжают со схемой.

Идемпотентно, под тем же `pg_advisory_lock(hashtext('mia.schema.system'))`, one-shot `belle-migrate`:

```sql
-- ddl/004_rename_admin_schema.sql (новый, первый в прогоне system)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'admin')
     AND NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'system') THEN
    EXECUTE 'ALTER SCHEMA admin RENAME TO system';
  END IF;
END $$;

UPDATE auth.permissions SET name = 'system:domain_read'
 WHERE name = 'admin:domain_read';
UPDATE auth.permissions SET name = 'system:domain_write'
 WHERE name = 'admin:domain_write';
UPDATE auth.roles SET name = 'system_operator'
 WHERE name = 'admin_operator';
```

Дальше `apply_schema` модуля `system`: `schemas.py` `"schema": "system"`, CREATE IF NOT EXISTS для новых таблиц.

Новые таблицы:

```
system.pref
  key            TEXT PK
  value          JSONB NOT NULL
  needs_restart  BOOLEAN NOT NULL DEFAULT FALSE
  is_secret      BOOLEAN NOT NULL DEFAULT FALSE
  updated_at     TIMESTAMPTZ DEFAULT NOW()
  updated_by     UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL

system.module
  name           VARCHAR(64) PK
  status         VARCHAR(16) NOT NULL  -- loaded|unloaded|disabled|failed
  source         VARCHAR(16) NOT NULL  -- image|overlay
  version        VARCHAR(32)
  intent         VARCHAR(16) NULL      -- reload|update|unload|disable|delete
  last_error     TEXT NULL
  updated_at     TIMESTAMPTZ DEFAULT NOW()
```

`register_schema` после rename: `schema_name="system"`. Seed OU (`003`) — квалифицировать `system.`; идемпотентность сохраняется.

Альтернатива «переименовать только таблицы в схеме `admin`» отклонена: модуль и схема должны совпадать (`fs`/`notification`/`auth`).

Обратной совместимости SQL `admin.*` нет: код и DDL переезжают в той же волне, что migrate.

---

## 5. Overlay и hot-reload

Ядро в **образе** (unload запрещён): `log`, `db`, `auth`, `apiproxy`, `rest`, `system`.  
Продукт можно снимать: `workspace`, `llm`, `fs`, `notification`.

1. Volume `mia-modules-overlay:/var/lib/mia/overlay` на **belle и worker**. Overlay перекрывает image **только для продукта**; ядро всегда из `/app/mia/modules`.
2. `ModuleManager`: путь модуля = `overlay/{name}` если есть `__init__.py`, иначе image. `git pull` в слой образа — не механизм update.
3. Hot-reload REST (belle): записать `system.module.intent` → `unload_module` + drop `sys.modules['modules.{name}*']` → `load_module` → apiproxy `collect` заново. `on_load` продукта упал → статус `failed`, **ядро живо** (не `raise` из REST-процесса).
4. Worker prefork: после intent — `celery control pool_restart(reload=True)`: дети умирают, `worker_process_init` грузит модули с диска overlay заново.
5. `modules_update`: кладёт артефакт в overlay (не в image), затем reload. `modules_install` — заглушка (`not_implemented`). `modules_delete` — только overlay+unload, ядро нельзя.

`hash.json` на reload проверяется как при старте (STRICT).

---

## 6. Preferences

Таблица `system.pref`. RPC:

- `pref_list` / `pref_get` — **без** строк `is_secret=true` (нет ключа, нет значения, нет намёка).
- `pref_set` — пишет; секреты можно set, нельзя get.

Живые без рестарта: TTL, квоты, лог-уровень, баннер.  
Порты (`rest.port` и аналоги) — `needs_restart=true`; UI помечает «нужен restart». Применение портов в этом ADR не автоматическое.

Каркас ключей в UI Preferences: `log.level`, `banner.text`, `ttl.*`, `quota.*`, `rest.port` (restart). Полный каталог — волна N+1; каркас живой.

---

## 7. UI-контракт

Меню хедера **System** (паттерн `WorkspaceMenu`, не одна кнопка):

1. **Users & Roles** — текущий `AdminWindow` (вкладки Domain / Roles), UX не менять, только заголовки и `systemApi`.
2. **Modules** — каркас: список из `modules_list` (name, version, status, source), кнопки reload/update/unload/disable/delete; install — disabled/stub; ядро — unload disabled.
3. **Preferences** — каркас живых ключей + пометка restart на портах; секреты не рендерить.

CSS `.albedo-admin-*` не переименовываем в этой волне.

---

## 8. Схема компонентов

```mermaid
graph TD
    UI[albedo SystemMenu] -->|POST /api/v1/system/fn cookie SPA| REST[mia-rest]
    REST --> AP[apiproxy whitelist system]
    AP -->|@task database/cpu| W[belle-worker prefork]
    W --> SP[SystemProvider state.system]
    SP --> DOM[state.domain OU/users/roles]
    SP --> MC[state.system.modules]
    SP --> PF[state.system.prefs]
    MC -->|unload+load| MM[ModuleManager overlay>image]
    MC -->|intent + pool_restart| W
    PF -->|SQL| PREF[(system.pref)]
    MC -->|SQL| MOD[(system.module)]
    DOM -->|SQL| OU[(system.ou user_ou group_ou)]
```

---

## 9. План Соны (строго последовательность, не параллель)

Код — после accepted. Рэй — только шаг 3 (gh rename) и шаг 10 (деплой), не раньше предыдущего.

1. **SQL.** `ddl/004_rename_admin_schema.sql` + `schemas.py` `"schema": "system"` + новые `pref`/`module` + DDL 001–003 квалифицировать `system.`. Прогон только через `belle-migrate` под advisory lock. Проверка: `\dn` нет `admin`, есть `system`; `\dt system.*`.
2. **Пакет.** `mia/modules/admin` → `mia/modules/system`; классы `Admin*` → `System*`; `state.system`; AUTH_SCHEMA permissions/role; SQL в repos/тестах. Пересчитать `hash.json`.
3. **Репо.** Рэй: `gh repo rename Dek1m/mia-admin → mia-system` (не форк, не новый пустой). Remote origin обновить. Не путать с ролью `system_admin`.
4. **Проводка belle/mia.** `Dockerfile` clone `mia-system` → `/app/mia/modules/system`; `app.py` `_REQUIRED_MODULES`; `migrate.py` `_MODULES`; compose/`MIA_WORKER_MODULES`/`MIA_APIPROXY_WHITELIST`; volume overlay. Ядро стартует жёстко; продукт `on_load` fail → `failed`, процесс жив.
5. **apiproxy.** whitelist + `_resolve_provider_class` `system` → `SystemProvider`; тесты `test_collect_map`.
6. **Overlay в core.** `ModuleManager` + `MIA_MODULES_OVERLAY`; ядро игнорирует overlay; продукт — extra wins. Тесты пути.
7. **RPC modules_* / pref_*.** permission `system:modules_*` / `system:prefs_*`; unload ядра → 403; install-заглушка; секреты не в GET; fail-stop продукта. Worker: intent → `pool_restart(reload=True)`.
8. **Тесты модуля.** Перенести `tests/`; обновить импорты и `admin.` SQL; плюс тесты rename-schema идемпотентности, overlay, pref secret, unload core forbidden.
9. **albedo.** `adminApi.ts` → `systemApi.ts` (`call('system', …)`); `features/admin` → `features/system`; `SystemMenu` из трёх пунктов; Users & Roles = старый AdminWindow (заголовки); каркас Modules и Preferences; `AppShell` + windowId. CSS классы не трогать.
10. **Деплой одной волной.** migrate (exit 0) → belle+worker → spa albedo. Локально тот же порядок. Проверка: `/health` modules содержит `system` не `admin`; SPA бьёт только `/api/v1/system/*`. Откат волны — предыдущие образы + reverse SQL только если migrate не прошёл; после rename schema откат = `ALTER SCHEMA system RENAME TO admin` тем же lock (документировать в runbook Рэя, в проде не смешивать со SPA).

---

## 10. Риски

| Риск | Митигация |
|------|-----------|
| GitHub rename ломает clone CACHEBUST | шаг 3 до шага 4 Dockerfile; одна волна образов |
| `hash.json` stale после rename файлов | шаг 2 обязан пересчитать manifest |
| Путаница `system_admin` ↔ модуль `system` | роль не переименовывать; в UI не подписывать роль словом Module |
| Permission NS `system:` уже содержит `force_delete` | оставляем; новые имена `domain_*` / `modules_*` / `prefs_*` |
| `register_sync("system")` vs seed старого `"admin"` | SQL UPDATE names + новый register key; идемпотентный registry |
| Overlay подменяет ядро | ядро **игнорирует** overlay |
| `pool_restart` режет in-flight tasks | intent + late ack уже есть; UI предупреждение; не restart ядра |
| Рассинхрон SPA/бэк (уже болели list_role_groups) | **запрет** деплоя belle без albedo в этой волне |
| CSS rename сломает токены | не делаем |
| `admin` в PYTHONPATH после папки | удалить старый путь из образа (clone только system) |

---

## 11. Критерии приёмки

- `\dn` → `system`, не `admin`. Таблицы `system.ou|user_ou|group_ou|pref|module`.
- `POST /api/v1/admin/domain_tree` → нет модуля (4xx). `POST /api/v1/system/domain_tree` → дерево.
- `state.system` есть, `state.admin` нет.
- Меню System: Users & Roles / Modules / Preferences.
- Overlay файл продукта виден после reload без rebuild образа.
- Unload `system` → forbidden. `on_load` fs падает → status failed, `/health` ok.
- `pref_get` секрета → пусто/403 без значения.
- Роль `system_admin` и permission `system:force_delete` не изменены.

---

## 12. Открытые вопросы Мастеру

Нет. Users & Roles утверждено. Блокеров нет.
