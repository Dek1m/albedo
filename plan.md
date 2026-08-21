# albedo P0 — React-фронтенд к belle/mia

| Поле | Значение |
|------|----------|
| **Тип** | фича + архитектура + контракт с бэком |
| **Сложность** | высокая |
| **Статус** | ADR+архитектура приняты (2026-08-21); код приложения ещё не писать до Норы/Соны |
| **Стандарт кода** | `docs/CODING_STANDARD.md` v3.1 (§3 ООП, §5 слои, §8 TypeScript, §10 безопасность, §11 тесты) |
| **Стандарт архитектуры** | `docs/ARCHITECTURE.md` + `docs/ADR-001-auth-contract.md` (accepted). Командного `ARCHITECTURE_STANDARD.md` по-прежнему нет |
| **Стандарт логов** | `docs/LOGGING_STANDARD.md` v2.0 (клиент: без секретов в логах) |
| **Репозиторий** | `/home/opencode/projects/albedo` — пустой git (только `.git/`) |
| **Бэкенд** | belle = обёртка `Application()` mia. REST RPC `:8080`, health `:8000` |

Это **не** «форма логина». Это каркас продукта albedo + контракт с mia-auth. Без фазы контракта фронт на фейковых данных **запрещён**. MSW допустим только как временный слой поверх **согласованного** контракта (явно помечен `TEMPORARY`).

**Цепочка исполнения (после утверждения плана Мастером):**

```
Эна (архитектура фронта + ADR контракта)
  → Нора (миграция users/groups)
    → Сона (фронт + api=True на mia-auth)
      → Катерина (тесты фронта и контракта)
```

Лита — review cookies / CSRF-слота и AD-правил **до** реализации Этапа 1. Рэй — Vite-прокси (Cookie/Set-Cookie), не CORS продукта.

---

## 1. Цель и границы P0

### Цель

Первый экран продукта: вход в belle через RPC mia-auth, каркас приложения (AppShell), объект UserChip и окно настроек пользователя (вкладки «Общая» + «Member Of») в тёмно-фиолетовом визуальном языке.

### В P0 входит

1. Каркас Vite + React + TypeScript + тема.
2. Login (и Bootstrap, если `needs_bootstrap === true`).
3. AppShell + UserChip (аватар, никнейм ≠ логин, email с ярким `@доменом`).
4. Модалка настроек: вкладка «Общая» (реквизиты в духе AD).
5. Вкладка «Member Of» (группы, Add/Remove, AD-ограничения).
6. API-клиент под envelope `{data, error, meta}` и **HttpOnly cookies** (`ADR-001`). Fetch `credentials: 'include'`, без `Authorization`.
7. Контракт с mia-auth: новые RPC + поля БД + правила групп. Без контракта UI настроек **не** подключается к фейковым данным.

### В P0 не входит

См. §11.

### Жёсткие запреты

- Keycloak / OIDC / внешний IdP — local auth уже принят (argon2id + JWT).
- Токены в `localStorage` / `sessionStorage` / JSON SPA. Транспорт сессии — HttpOnly cookies, см. `docs/ADR-001-auth-contract.md`.
- Писать фронт на выдуманном CRUD REST (`GET /users/me`) — транспорт только `POST /api/v1/{module}/{function}`.
- Хранить credentials в коде / логировать токены.

### Честный раскол: что фронт может сейчас vs что ломается без бэка

| Возможность | На текущем API | Требует доработки mia-auth |
|-------------|----------------|----------------------------|
| Форма логина `username` + `password` | да, `auth.login` | — |
| Первый админ, если БД пустая | да, `needs_bootstrap` + `bootstrap` | сид группы Administrators (сейчас bootstrap ищет группу **если есть**) |
| Сессия SPA (cookies) | **нет**. Сейчас JSON Bearer, cookies нет | `ADR-001`: Set-Cookie `__Host-albedo_at`/`__Host-albedo_rt`; refresh **без** живого access |
| Logout | да, Bearer + `refresh_token` | — |
| CORS из браузера напрямую на `:8080` | **нет** (`MIA_REST_CORS_ORIGINS` пуст) | либо прокси Vite, либо whitelist origin |
| UserChip: никнейм, email, аватар | **нет**. `login` возвращает только `{access_token, refresh_token, user_id, username}` | `get_me` + поля профиля |
| Настройки: first/last, телефон, промпт, смена username | **нет** HTTP. Python CRUD есть **без** `api=True` | RPC + схема |
| Member Of | **нет** HTTP. `get_user_groups` / `add_user_to_group` / `remove_user_from_group` без `api=True` | RPC + AD-инварианты |
| Primary group / защита суперадмина | **нет в коде** | миграция + серверные проверки |

**Вывод:** Этап 1 (Login) можно делать на текущем API + Vite-прокси. Этапы 2–4 без ADR контракта — макет с отключёнными полями, не продукт.

---

## 2. Стек

Конкретные библиотеки. Версии — актуальный stable на момент Этапа 0; не тащить альфы.

| Слой | Выбор | Зачем |
|------|-------|--------|
| Сборка | **Vite** + `@vitejs/plugin-react` | SPA к belle. SSR не нужен |
| UI | **React 19** + **TypeScript strict** | требование Мастера; `CODING_STANDARD.md` §8 |
| Роутинг | **react-router** (data router) | `/login`, `/bootstrap`, `/` (shell). Без Next.js |
| Серверный стейт | **TanStack Query** | `get_me`, группы; retry/cache под RPC |
| Клиентский стейт | **Zustand** | `AuthStore`: session flag + profile. **Токенов нет**. Без Redux |
| HTTP | нативный **fetch** в `ApiClient` | envelope, cookies, 401→refresh, без axios |
| Формы | **react-hook-form** + **zod** | валидация login/profile на границе |
| CSS-фреймворк | **bootstrap 5** (css + js только для modal/tab если нужно) | элементы: `form-control`, `form-check`, `btn`, `nav-tabs`, `list-group`, `modal`, сетка |
| Иконки | **bootstrap-icons** | ручка, плюс, крест — в том же языке |
| Стили продукта | **свои CSS variables + SCSS overrides** | тёмные тона + фиолетовые градиенты. Bootstrap **не** задаёт «вид сайта» |
| Тесты | **Vitest** + **Testing Library** + **MSW** | MSW = `TEMPORARY`, контрактные хендлеры |
| Линт | **eslint** + **typescript-eslint** + **prettier** | единый стиль |

### Отклонённые альтернативы

| Вариант | Почему нет |
|---------|------------|
| Next.js / Remix | SSR, RSC, свой сервер — лишний контур рядом с belle `:8080` |
| Vue / Svelte / Solid | Мастер сказал React |
| Redux Toolkit | бойлерплейт на auth-store из трёх полей |
| axios | лишняя зависимость; envelope всё равно свой |
| Tailwind / DaisyUI | Мастер просил **элементы Bootstrap**, не utility-css |
| MUI / Ant / Chakra | чужой визуальный язык, тяжёлые темы |
| react-bootstrap как «весь сайт» | получится админка Bootstrap 2015. Берём **классы**, оболочку рисуем сами |
| Keycloak / oidc-client | local auth принят |
| Bearer JSON + sessionStorage | XSS читает JS. Мастер выбрал cookies (`ADR-001`) |
| BFF / opaque server session | лишний сервер на P0 |
| CORS `*` | запрещено; same-origin proxy/nginx |
| CSS-in-JS (emotion/styled) | конфликт с Bootstrap-классами, лишний runtime |

### Dev-транспорт (обязателен, иначе браузер не взлетит)

`MIA_REST_CORS_ORIGINS` по умолчанию пуст, CORSMiddleware в rest **не вешается**. Варианты:

1. **Vite `server.proxy`**: `/api` → `http://127.0.0.1:8080` (рекомендуется для dev). Браузер бьёт в origin albedo, CORS не нужен.
2. Выставить `MIA_REST_CORS_ORIGINS=http://localhost:5173` на belle — отдельное решение Мастера, не дефолт.

Vite proxy **обязан** проксировать `Cookie` / `Set-Cookie` (имена `__Host-albedo_at`, `__Host-albedo_rt`, без Domain).

Прод: albedo и `/api` с одного origin (nginx). В P0 продукт — Vite-прокси. Не делать production CORS «*». Credentials только first-party.

---

## 3. Визуальный язык

**Не** «сайт на бутстрапе». Bootstrap даёт контролы (инпут, чекбокс, табы, список). Хром продукта — свой.

### Палитра (токены в `src/theme/tokens.css`)

| Токен | Роль | Ориентир |
|-------|------|----------|
| `--bg-base` | фон приложения | почти чёрный с фиолетовым подтоном `#0b0614` |
| `--bg-elevated` | shell, модалка | `#140a22` |
| `--bg-chip` | UserChip | полупрозрачный слой + blur |
| `--grad-violet` | акценты, кнопка primary, обводка chip | `#2e1064 → #6d28d9 → #a78bfa` |
| `--text-primary` | заголовки, ник | `#f5f3ff` |
| `--text-muted` | подписи | `#a89bbf` |
| `--email-domain` | `@домен` в Chip | яркий `#c4b5fd` / `#e9d5ff` |
| `--danger` | ошибки логина, запрет remove | не bootstrap-red из коробки — приглушённый `#f87171` |
| `--radius-chip` | Chip | полная скруглённость аватара, chip `12px` |
| `--shadow-glow` | Chip / primary btn | фиолетовое свечение `0 0 24px rgba(109,40,217,.35)` |

### Правила

- Фон login: глубокий градиент (не картинка), лёгкий vignette, без стоковых паттернов.
- Primary-кнопка «Войти»: градиент, не `.btn-primary` Bootstrap.
- `.form-control` — перекрасить через CSS variables (тёмный фон, светлый текст, фиолетовый focus-ring).
- UserChip: компактный объект справа в шапке, hover = усиление glow, курсор pointer на **весь** объект.
- Модалка настроек: тёмная, широкая (~720px), вкладки `nav-tabs` перекрашены, не белые.
- Аватар без файла: инициалы из display name на круге с градиентом. Не серый placeholder Bootstrap.
- Никакого светлого navbar, никакого `.bg-dark` как единственной «темы».

### Адаптив P0

Desktop-first (ширина ≥ 1100px). Login центрирован. Модалка на узком экране — на весь viewport. Mobile-polish — не P0.

---

## 4. Карта экранов P0

```
[приложение стартует]
        │
        ├─ нет cookie-сессии ──► POST auth.needs_bootstrap
        │                       │
        │                       ├─ true  → /bootstrap  (BootstrapPage)
        │                       └─ false → /login      (LoginPage)
        │
        └─ cookie refresh ──► POST auth.refresh_token (без Bearer)
                                │
                                ├─ ok → get_me → /  AppShell
                                └─ fail → /login
```

### 4.1. LoginPage (`/login`)

- По центру карточка: бренд **Albedo** (Q1), поле username, поле password, кнопка «Войти».
- Ошибки из envelope (в т.ч. когда HTTP 500 — см. §10), не «Request failed».
- Ссылка на bootstrap **не** показывается, если `needs_bootstrap === false`.
- После успеха: cookies ставит бэк → `get_me` → `/`.

### 4.2. BootstrapPage (`/bootstrap`)

- Только если `needs_bootstrap` true. Иначе redirect на `/login`.
- Поля: username, password, email (опционально, как в RPC).
- После успеха: **не** логинить молча, если бэк не вернул токены (сейчас `bootstrap` → `{user_id, username}`). Дальше — `/login` с подсказкой «админ создан».
- Повторный bootstrap → ошибка бэка «already completed». Показать её, не падать.

### 4.3. AppShell + UserChip (`/`)

- Каркас: верхняя полоса (без bootstrap-navbar), справа UserChip, центр — заглушка «рабочая область» (чат/workspace **не** в P0).
- **UserChip** (весь кликабелен → UserSettingsModal):
  - слева текст: **никнейм** (не username);
  - под ним email: local-part обычным цветом, `@домен` ярким;
  - справа круглая небольшая аватарка.
- Если контракт ещё не влит: Chip показывает username как временный fallback **только** с пометкой в коде `FALLBACK_UNTIL_GET_ME`, не как продуктовую норму.

### 4.4. UserSettingsModal

- Открытие кликом по Chip. Закрытие: крест, overlay, Escape.
- Вкладки: **Общая** | **Member Of**.

#### Вкладка «Общая»

Макет как в AD-пользователе:

```
[ аватар крупнее ]   Никнейм ✏️          [☐ отображать]
                     Firstname    Lastname
                     [☐ отображать]  ← на всю строку имени
                     E-mail
                     Телефон
                     Логин (username)  [сменить]
                     Пользовательский промпт
                       [загрузить .txt/.md]  или textarea
```

Mutex отображения в Chip: **либо** nickname, **либо** First+Last. Два чекбокса «отображать» взаимоисключающие (включение одного снимает второй). В сторе/API — одно поле `chip_display_mode: "nickname" | "full_name"`. Не два независимых boolean.

Ручка у никнейма: inline-edit display name (это **не** username).

Промпт: `accept=".txt,.md,text/plain,text/markdown"`, чтение FileReader на клиенте → текст в поле. Сохранение — RPC, не «файл на диск сервера» в P0.

#### Вкладка «Member Of»

- `list-group` групп пользователя.
- Выделение одной строки → Remove.
- Add — диалог/вторая колонка со списком доступных групп (не свободный текстовый ввод имени, если есть `list_groups`).
- Группа по умолчанию: **Administrators** (всегда существует после сида).
- Нельзя снять Administrators с главного суперадмина (bootstrap-первый `system_admin`).
- У остальных нельзя снять **primary** группу.

Сервер — источник истины. UI дизейблит кнопки, но не «защищает» вместо бэка.

---

## 5. Контракт с бэком: UI-поле → API сейчас → что сделать

Транспорт RPC **без изменения:** `POST /api/v1/{module}/{function}`, JSON = kwargs, envelope `{data, error, meta}`. Успех RPC = HTTP 200.

Сессия SPA (**ADR-001**, принято): HttpOnly cookies `__Host-albedo_at` / `__Host-albedo_rt`. Токены не в JSON. Fetch `credentials: 'include'`, заголовка Authorization нет. Refresh **не** public Bearer: middleware валидирует refresh-cookie.

Сейчас на бэке ещё Bearer JSON — Сона меняет rest/apiproxy по ADR. Machine-клиенты без `X-Albedo-Client: spa` сохраняют старое поведение.

Публичные методы: `needs_bootstrap`, `bootstrap`, `login`. Cookie-credential (без живого access): `refresh_token`, `logout`.

Python CRUD (`get_user`, `update_user`, `list_groups`, `add_user_to_group`, …) живёт в `mia/modules/auth/provider.py` **без** `api=True` — в REST не торчит.

Таблица `auth.users` сейчас: `username, first_name, last_name, email, description, custom_fields JSONB, …`. Нет `nickname`, `phone`, `avatar`, `prompt`.

| UI-поле / действие | API сейчас | Что сделать |
|--------------------|------------|-------------|
| Логин | `POST /api/v1/auth/login` `{username, password}` → `{access_token, refresh_token, user_id, username}` | Использовать как есть. Клиент обязан разбирать `error` при любом HTTP |
| Нужен ли первый админ | `auth.needs_bootstrap` → `bool` | Как есть |
| Создать первого админа | `auth.bootstrap` `{username, password, email?}` → `{user_id, username}` | Как есть + сид Administrators (блок согласования) |
| Обновить access | `auth.refresh_token` `{refresh_token}` **требует живой Bearer** | **Баг P0:** cookie-credential, **не** `public=True`. Middleware читает `__Host-albedo_rt`, живой access не нужен |
| Выход | `auth.logout` `{refresh_token}` + Bearer | SPA: cookie + Max-Age=0 обеих; живой access не нужен |
| Email в Chip | нет в ответе login | `auth.get_me` |
| Никнейм | колонки нет | колонка / профиль + `get_me` / `update_me` |
| Firstname / Lastname | колонки есть, HTTP нет | `get_me` / `update_me` |
| Чекбокс «отображать» (mutex) | нет | поле `chip_display_mode` |
| Телефон | колонки нет | колонка `phone` или запретить поле до ADR |
| Аватар | нет | P0: инициалы **или** upload (`set_avatar` + GET `/api/v1/auth/avatar`) |
| Смена username | HTTP нет; uniqueness в БД есть | `auth.change_username` |
| Промпт | нет | колонка `user_prompt TEXT` + `update_me` |
| Список своих групп | `get_user_groups` без api | `auth.get_my_groups` `api=True` |
| Список всех групп для Add | `list_groups` без api | `auth.list_groups` `api=True` + permission |
| Add / Remove | `add_user_to_group` / `remove_user_from_group` без api, **без** AD-защит | RPC + инварианты §7 |
| Primary group | нет в `user_group_membership` | колонка `is_primary` или `users.primary_group_id` |
| Группа Administrators | сида нет; bootstrap делает `find_group_by_name` если есть | сид builtin-группы |
| «Нельзя снять Administrators с суперадмина» | нет в коде | серверная проверка |
| CORS | `cors_origins=[]` | Vite-прокси в dev + nginx same-origin в prod. CORS `*` не открывать |

`custom_fields JSONB` **не** использовать как свалку профиля без ADR. Нетипизированный JSON ломает контракт и индексы.

---

## 6. Предлагаемые API для mia-auth

Имена в стиле существующего RPC. Поля как в БД: `username`, `first_name`, `last_name`. Не `displayName`, не `givenName`.

Все методы: `POST /api/v1/auth/{fn}`. Новые — `api=True`. Permissions из `AUTH_CORE_SCHEMA` (`users:read`, `users:update`, `groups:list`, `groups:manage_membership`, …) + новое `profile:self` для своих данных.

**Это предложение. Вливать в код только после блока «согласование Мастера».**

### 6.1. Существующие (не ломать сигнатуры)

```
auth.needs_bootstrap() → bool                                          public
auth.bootstrap(username, password, email?) → {user_id, username}       public
auth.login(username, password, user_agent?, ip?)                       public
    SPA: Set-Cookie + {user_id, username}  (токенов в JSON нет)
auth.refresh_token(refresh_token?, user_agent?, ip?)                   cookie-credential, НЕ public
auth.logout(refresh_token?) → bool                                     cookie-credential
```

### 6.2. Новые — профиль (себя)

`auth.get_me() → Profile` — cookie-сессия (SPA) / Bearer (machine), permission `profile:self`.

```
Profile {
  user_id: uuid
  username: str
  nickname: str | null
  first_name: str | null
  last_name: str | null
  email: str | null
  phone: str | null
  avatar_url: str | null          # URL на auth.get_avatar, не data: в JSON
  user_prompt: str | null
  chip_display_mode: "nickname" | "full_name"
  is_superadmin: bool             # первый bootstrap system_admin
  primary_group_id: uuid | null
}
```

`auth.update_me(nickname?, first_name?, last_name?, email?, phone?, user_prompt?, chip_display_mode?) → Profile`

- Не принимает `username` (отдельный метод).
- Не принимает группы.
- Санитизация длины / email.

`auth.change_username(new_username, password) → Profile` — текущий пароль обязателен (предложение, Q7).

`auth.set_avatar(image_b64, content_type) → {avatar_url}`  
`auth.clear_avatar() → Profile`  
GET `/api/v1/auth/avatar` — байты для `<img>` (исключение из RPC, ADR-001). SVG запрещён, лимит 256 KiB.

### 6.3. Новые — группы (Member Of)

Имена совпадают с уже существующими Python-методами, только выставить `api=True` и добавить инварианты:

```
auth.get_my_groups() → Group[]
auth.list_groups(offset?, limit?) → {items: Group[], total: int}
auth.add_user_to_group(user_id, group_id)           # для self: user_id из токена, если нет groups:manage_membership
auth.remove_user_from_group(user_id, group_id)
```

```
Group {
  id: uuid
  name: str
  description: str | null
  is_builtin: bool
  is_primary: bool
}
```

P0: пользователь правит **свои** группы. Админка всех юзеров — не P0. Если `groups:manage_membership` нет — Add/Remove только self, и всё равно действуют §7.

### 6.4. Обязательный фикс refresh (баг, не фича) — **принято: cookies, не public Bearer**

Сейчас `refresh_token` не public → apiproxy требует валидный access. Access TTL 15 мин → 401.

**M7 = да, реализация не `public=True`:**

- Middleware: `auth.refresh_token` / `auth.logout` не требуют живой access JWT.
- SPA: credential = cookie `__Host-albedo_rt`.
- Machine (без `X-Albedo-Client: spa`): по-прежнему `kwargs.refresh_token`.
- Клиентский таймер `exp-60s` + single-flight — **поверх** фикса, не замена.

См. `docs/ADR-001-auth-contract.md` §2–§3. Коллизия `__Host-` vs узкий Path: оба cookie `Path=/`, различаем именами, refresh `SameSite=Strict`.

### 6.5. Ошибки логина как 500

REST мапит неизвестные ошибки в HTTP 500 (`dispatcher` `status_code` default 500). `InvalidCredentialsError` / `AccountLockedError` должны отдавать стабильный `error.code` + корректный HTTP (401/403), не 500. Иначе форма логина показывает «ошибка сервера».

Фронт P0: парсить `envelope.error` **независимо** от HTTP. Бэк: починить маппинг (Сона + Катерина).

---

## 7. Правила AD-групп

Источник истины — сервер. UI повторяет правила для UX.

### 7.1. Builtin Administrators

- Группа `name = "Administrators"`, `is_builtin = true` **сидается** при apply schema / initialize auth, не «если кто-то создал».
- Bootstrap по-прежнему `find_group_by_name("Administrators")` и добавляет первого админа — после сида группа **всегда** есть.
- Builtin-группу нельзя удалить (`delete_group` → Forbidden).

### 7.2. Superadmin

- Superadmin = пользователь, созданный `bootstrap` (роль `system_admin`, член Administrators). Предложение: флаг `users.is_bootstrap_admin BOOLEAN` **или** «единственный пользователь с system_admin на момент проверки» — Q6.
- С superadmin **нельзя** снять группу Administrators (`remove_user_from_group` → `ForbiddenError`).
- UI: кнопка Remove disabled + tooltip.

### 7.3. Primary group

Как AD: у пользователя ровно одна primary.

- Предложение Норе: `auth.user_group_membership.is_primary BOOLEAN DEFAULT FALSE` + уникальный partial index `(user_id) WHERE is_primary`.
- При создании пользователя / bootstrap: primary = Administrators (для bootstrap-админа) либо явно назначенная.
- `remove_user_from_group`: если `is_primary` → Forbidden. Смена primary — отдельный метод `auth.set_primary_group` (можно вынести из P0, тогда primary назначается один раз и не снимается).
- UI: primary помечена, Remove disabled.

### 7.4. Чего нет в коде сейчас (не выдумывать защиты на фронте)

- Сида Administrators нет.
- Primary нет.
- Защиты «нельзя снять Administrators с суперадмина» нет.
- `remove_user_from_group` безусловный.

---

## 8. Архитектура фронта

Слои по `CODING_STANDARD.md` §5.1 и `docs/ARCHITECTURE.md`. Зависимости только внутрь. Domain не знает React. Токены не в JS (`ADR-001`).

```
src/
  main.tsx
  app/
    App.tsx                 # провайдеры
    router.tsx              # маршруты, AuthGuard
  theme/
    tokens.css
    bootstrap-overrides.scss
  domain/
    user.ts                 # User, DisplayName, chipLabel()
    group.ts                # Group, canRemove(user, group)
    chipDisplayMode.ts      # "nickname" | "full_name"
  infrastructure/api/
    envelope.ts             # типы {data, error, meta}
    client.ts               # ApiClient: POST, cookies, refresh mutex
    errors.ts               # map envelope.error → доменные ошибки
    authApi.ts              # needs_bootstrap, bootstrap, login, refresh, logout, get_me, …
    types.ts                # DTO = поля бэка (username, first_name)
  auth/
    AuthStore.ts            # Zustand: isAuthenticated + profile. Токенов нет
    AuthGuard.tsx
  features/
    login/
      LoginPage.tsx
      LoginForm.tsx
    bootstrap/
      BootstrapPage.tsx
    shell/
      AppShell.tsx
      UserChip.tsx
    settings/
      UserSettingsModal.tsx
      GeneralTab.tsx
      MemberOfTab.tsx
      displayMutex.ts       # chip_display_mode helper
  shared/
    ui/Avatar.tsx
    ui/Modal.tsx            # обёртка над bootstrap modal классами
  mocks/                    # TEMPORARY MSW, только после ADR
    handlers.ts
    browser.ts
```

Код на английском, комментарии на русском.

### 8.1. ApiClient (обязательный каркас)

Класс, не россыпь функций:

- `call(module, function, kwargs) → data`
- URL: `/api/v1/${module}/${function}` (через Vite-прокси).
- Заголовка `Authorization` **нет**. Всегда `credentials: "include"` и `X-Albedo-Client: spa`.
- Разбор envelope: `error != null` → throw доменной ошибки (даже при HTTP 200/500).
- На HTTP 401: один refresh (mutex / single-flight), повтор запроса. Если refresh 401 → logout → `/login`.
- Не логировать kwargs с `password`, не логировать cookie/токены (`LOGGING_STANDARD.md` + `CODING_STANDARD.md` §10).

Public: `needs_bootstrap`, `bootstrap`, `login`. Cookie-credential: `refresh_token`, `logout`.

### 8.2. AuthStore

- Токенов в JS **нет**. Cookies HttpOnly (`ADR-001`).
- `isAuthenticated` + `profile`. Reload переживают cookies, не sessionStorage.
- После login: `get_me` → profile в store.
- `chipLabel`: если `chip_display_mode === "nickname"` и nickname не пуст → nickname; иначе `first_name + last_name`; иначе username как последний fallback.

Лита ревьюит cookies / CSRF-слот до Этапа 1. Файл `tokenStorage.ts` **не создавать**.

### 8.3. Тема

`main.tsx` импортирует bootstrap css → `tokens.css` → `bootstrap-overrides.scss`. Overrides бьют по `.form-control`, `.form-check-input`, `.nav-tabs`, `.list-group-item`, `.modal-content`. Не форкать Bootstrap.

### 8.4. MSW (`TEMPORARY`)

Разрешён **после** ADR, когда типы DTO зафиксированы. Хендлеры повторяют RPC-пути, не REST CRUD. В `main.tsx`: включать только `import.meta.env.DEV && VITE_USE_MSW === "1"`. Комментарий `// TEMPORARY: удалить после живого mia-auth контракта`. Катерина не принимает тесты, которые зелёные только на MSW без контрактных фикстур.

---

## 9. Поэтапный план реализации

Код приложения не пишется, пока Мастер не утвердит §12 и блок согласования.

Гейт: **Этап 0 фронта можно параллельно с ADR Эны.** Этапы 2–4 без влитого контракта — только вёрстка с disabled + пустые DTO, без выдуманных ответов.

Кто: Эна / Нора / Сона / Катерина / Лита.

---

### Этап 0. Каркас Vite/React/TS + тема

**Сложность:** средняя. **Время:** ~3–4 ч. **Зависимости:** утверждённый стек §2.

| # | Шаг | Файлы | Кто | Сложн. | Зависит | Результат |
|---|-----|-------|-----|--------|---------|-----------|
| 0.1 | `npm create vite@latest` (react-ts), gitignore, engines | `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Сона | низкая | — | `npm run dev` на :5173 |
| 0.2 | Vite proxy `/api` → `127.0.0.1:8080` | `vite.config.ts` | Сона + Рэй | низкая | 0.1 | браузер не упирается в пустой CORS |
| 0.3 | Зависимости: react-router, zustand, @tanstack/react-query, react-hook-form, zod, bootstrap, bootstrap-icons | `package.json` | Сона | низкая | 0.1 | lockfile |
| 0.4 | Токены темы + overrides | `src/theme/tokens.css`, `src/theme/bootstrap-overrides.scss` | Сона | средняя | 0.3 | тёмный фон, фиолетовый focus на `.form-control` |
| 0.5 | Слои-заготовки (пустые модули, без бизнес-логики) | дерево §8 | Сона | низкая | 0.1 | импорты без циклов |
| 0.6 | ESLint/Prettier strict | `eslint.config.js` | Сона | низкая | 0.1 | `npm run lint` зелёный |
| 0.7 | Vitest smoke | `src/app/App.test.tsx` | Катерина | низкая | 0.1 | один тест «рендерит root» |

**Проверка:** `npm run dev`, экран тёмный с градиентом, не белый Bootstrap. `curl` с страницы на `/api/v1/auth/needs_bootstrap` через прокси не CORS-error.

**Стандарт:** `CODING_STANDARD.md` §8 TypeScript branded/union где уместно (`chip_display_mode`).

---

### Этап 0-B. ADR контракта (параллельно Этапу 0)

**Сложность:** высокая. **Время:** ~4–6 ч обсуждения + текст ADR. **Кто:** Эна. **Блокер** для Норы и для `api=True`.

| # | Шаг | Файлы | Кто | Сложн. | Зависит | Результат |
|---|-----|-------|-----|--------|---------|-----------|
| 0.B1 | ADR: RPC профиль + группы + cookies + refresh + ошибки login | `docs/ADR-001-auth-contract.md` + `docs/ARCHITECTURE.md` | Эна | высокая | ответы §12 | **сделано 2026-08-21** |
| 0.B2 | Security review cookies + CSRF-слот | комментарий в ADR | Лита | средняя | 0.B1 | ok/не ok `__Host-` cookies + `X-Albedo-Client` |
| 0.B3 | Согласование Мастера по полям БД | — | Афина → Мастер | высокая | 0.B1 | список «да» из блока согласования |

Без 0.B3 Нора и Сона **не** добавляют колонки и `api=True`.

---

### Этап 1. Login (+ bootstrap если needs_bootstrap)

**Сложность:** средняя (фронт) + высокая (баг refresh/ошибки). **Время:** фронт ~5 ч, бэк-фиксы ~4–6 ч.

| # | Шаг | Файлы | Кто | Сложн. | Зависит | Результат |
|---|-----|-------|-----|--------|---------|-----------|
| 1.1 | `ApiClient.call` + envelope + public methods | `src/api/client.ts`, `envelope.ts`, `errors.ts` | Сона | средняя | 0.5 | один POST, разбор `{data,error,meta}` |
| 1.2 | `authApi`: needs_bootstrap, bootstrap, login, logout, refresh | `src/api/authApi.ts` | Сона | низкая | 1.1 | типизированные kwargs |
| 1.3 | `AuthStore` без токенов | `src/auth/AuthStore.ts` | Сона | средняя | 1.2, 0.B2 | profile + isAuthenticated; cookies ставит бэк |
| 1.4 | LoginForm + LoginPage | `src/features/login/LoginForm.tsx`, `LoginPage.tsx` | Сона | средняя | 1.3, 0.4 | форма, ошибки envelope |
| 1.5 | BootstrapPage | `src/features/bootstrap/BootstrapPage.tsx` | Сона | низкая | 1.4 | создание первого админа |
| 1.6 | Router: `/login`, `/bootstrap`, guard | `src/app/router.tsx`, `AuthGuard.tsx` | Сона | средняя | 1.5 | редиректы по токену и needs_bootstrap |
| 1.7 | **Бэк:** cookie refresh без живого access (не public) | `mia/modules/apiproxy/middleware.py`, `mia/modules/rest/dispatcher.py`, `mia/modules/rest/cookie_auth.py` | Сона (mia) | высокая | ADR-001 | refresh после истечения access → 200 + новые Set-Cookie |
| 1.8 | **Бэк:** маппинг InvalidCredentials → не 500 | `mia/modules/rest/dispatcher.py` + коды ошибок auth | Сона (mia) | средняя | 1.7 | login bad password → 401 + `error.code` |
| 1.9 | Тесты login: success, bad password, bootstrap once, refresh single-flight | `src/features/login/*.test.tsx`, mia tests | Катерина | средняя | 1.6, 1.8 | красный если 500 на bad password |

**Ожидаемый результат этапа:** живой login против belle. После 15 мин без фикса 1.7 — ожидаемый красный (документированный баг), не «работает на моках».

**Проверка:**

```
# belle поднят, CORS пуст
npm run dev
# UI → needs_bootstrap → bootstrap → login → tokens в store
# DevTools: POST /api/v1/auth/login, без Access-Control ошибки
```

---

### Этап 2. AppShell + UserChip

**Сложность:** средняя. **Время:** ~4 ч вёрстки + блокер `get_me`.

| # | Шаг | Файлы | Кто | Сложн. | Зависит | Результат |
|---|-----|-------|-----|--------|---------|-----------|
| 2.1 | AppShell: шапка, слот chip, заглушка workspace | `src/features/shell/AppShell.tsx` | Сона | средняя | 0.4, 1.6 | тёмная оболочка |
| 2.2 | Avatar (инициалы / url) | `src/shared/ui/Avatar.tsx` | Сона | низкая | 2.1 | круг, градиент |
| 2.3 | UserChip по макету §4.3 | `src/features/shell/UserChip.tsx` | Сона | средняя | 2.2, domain/user.ts | ник слева, email+яркий домен, аватар справа |
| 2.4 | `chipLabel()` mutex | `src/domain/user.ts` | Сона | низкая | 2.3 | unit-тесты веток nickname / full_name / fallback |
| 2.5 | Подключить `get_me` в AuthStore после login и reload | `AuthStore.ts`, `authApi.ts` | Сона | средняя | 3.x бэк get_me | Chip не врёт username как ник |
| 2.6 | Клик по Chip → open settings | `UserChip.tsx`, store `settingsOpen` | Сона | низкая | 2.3 | открывает модалку Этапа 3 |

**Без `get_me`:** Chip собирается только из login DTO (username, нет email/ника). Не подставлять выдуманный email. Пустой email-ряд допустим до контракта.

**Проверка:** визуально Chip справа вверху; клик открывает модалку; `@домен` цветом `--email-domain`.

---

### Этап 3. Settings General

**Сложность:** высокая (фронт + схема). **Время:** Нора ~4 ч, Сона бэк ~6 ч, Сона фронт ~6 ч.

#### 3-A. Бэкенд (после согласования Мастера)

| # | Шаг | Файлы | Кто | Сложн. | Зависит | Результат |
|---|-----|-------|-----|--------|---------|-----------|
| 3.A1 | Колонки профиля (см. блок согласования) | `mia/modules/auth/schemas.py`, DDL/миграция | Нора | высокая | 0.B3 | колонки существуют |
| 3.A2 | Repository get/update профиля, без password_hash в DTO | `mia/modules/auth/repository.py` | Сона | средняя | 3.A1 | SELECT список полей |
| 3.A3 | `get_me` / `update_me` / `change_username` `api=True` | `mia/modules/auth/provider.py` | Сона | высокая | 3.A2 | RPC торчит в REST |
| 3.A4 | Avatar upload P0 | `provider.py` + `auth.user_avatars` + GET `/api/v1/auth/avatar` | Сона + Нора | высокая | Q3 да | url или инициалы |
| 3.A5 | Тесты репозитория и RPC | `mia/modules/auth/tests/` | Катерина | средняя | 3.A3 | uniqueness username, email |

#### 3-B. Фронт

| # | Шаг | Файлы | Кто | Сложн. | Зависит | Результат |
|---|-----|-------|-----|--------|---------|-----------|
| 3.B1 | Modal + tabs (Общая / Member Of) | `UserSettingsModal.tsx` | Сона | средняя | 2.6, 0.4 | bootstrap tabs перекрашены |
| 3.B2 | GeneralTab: аватар, ник+ручка, mutex чекбоксы, first+last в один ряд, email, phone, username, prompt+file | `GeneralTab.tsx` | Сона | высокая | 3.B1 | макет §4.4 |
| 3.B3 | `displayMutex.ts` | `features/settings/displayMutex.ts` | Сона | низкая | 3.B2 | два чекбокса → один enum |
| 3.B4 | Загрузка .txt/.md в textarea | `GeneralTab.tsx` | Сона | низкая | 3.B2 | FileReader, не upload на диск |
| 3.B5 | Submit → `update_me`, смена логина → `change_username` | `GeneralTab.tsx`, `authApi.ts` | Сона | средняя | 3.A3 | Chip обновляется без reload |
| 3.B6 | Тесты mutex и сабмита | `GeneralTab.test.tsx` | Катерина | средняя | 3.B3 | нельзя включить оба display |

**Проверка:** смена ника → Chip слева меняется; переключение mutex → Chip показывает First Last; username в Chip **не** появляется как основной заголовок.

---

### Этап 4. Member Of

**Сложность:** высокая. **Время:** Нора ~3 ч, Сона бэк ~5 ч, Сона фронт ~5 ч.

| # | Шаг | Файлы | Кто | Сложн. | Зависит | Результат |
|---|-----|-------|-----|--------|---------|-----------|
| 4.1 | Сид `Administrators` `is_builtin=true` | `mia/modules/auth/schema.py` или bootstrap/initialize, `schemas.py` | Нора + Сона | средняя | 0.B3 | группа есть до первого bootstrap |
| 4.2 | `is_primary` (или `primary_group_id`) + index | `schemas.py`, `user_group_membership` | Нора | высокая | 4.1 | ровно одна primary |
| 4.3 | Инварианты remove: builtin superadmin, primary | `mia/modules/auth/provider.py` `remove_user_from_group` | Сона | высокая | 4.2 | Forbidden, не тихий no-op |
| 4.4 | `api=True` на get_my_groups, list_groups, add/remove | `provider.py` | Сона | средняя | 4.3 | REST видит методы |
| 4.5 | MemberOfTab: list-group, select, Add, Remove | `MemberOfTab.tsx` | Сона | средняя | 3.B1, 4.4 | UX как AD |
| 4.6 | UI disabled + tooltip по `canRemove()` | `src/domain/group.ts` | Сона | низкая | 4.5 | дублирует сервер, не заменяет |
| 4.7 | Тесты: нельзя снять Administrators с bootstrap-админа; нельзя снять primary; можно снять вторичную | `test_provider.py`, `MemberOfTab.test.tsx` | Катерина | высокая | 4.3, 4.5 | регресс на инварианты |

**Проверка:** первый админ в Administrators (primary); Remove на этой строке мёртв; второй пользователь (если появится тестовый) — primary не снимается.

P0 не требует UI создания произвольных пользователей. Для теста 4.7 Катерина создаёт юзера через Python API / фикстуру БД, не через albedo.

---

### Этап 9.N. Проверка сквозная

- **Что:** login → chip с живым профилем → settings save → groups инварианты; refresh после 15 мин.
- **Как:**
  - фронт: `npm run test && npm run lint`
  - mia-auth: существующий pytest + новые кейсы get_me / remove_user_from_group
  - руками: Vite + живой belle, MSW выключен

---

## Согласование Мастера — **принято**

Архитектура, которая меняет бэкенд. Все M1–M10 = да (M7 = cookie refresh, не public Bearer). Детали: `docs/ADR-001-auth-contract.md`.

| ID | Решение | Рекомендация плана | Если «нет» |
|----|---------|-------------------|------------|
| M1 | Колонки `nickname`, `phone`, `user_prompt`, `chip_display_mode` в `auth.users` | **да** — отдельные колонки, не `custom_fields` | — |
| M2 | Хранение аватара | **да, P0 включает upload** + инициалы если нет файла | — |
| M3 | `api=True` на get_me / update_me / change_username / groups* | **да** | — |
| M4 | Сид группы Administrators builtin | **да** | — |
| M5 | Primary group в БД | **да** — `user_group_membership.is_primary` | — |
| M6 | Защита superadmin Administrators | **да** — серверный Forbidden | — |
| M7 | Фикс refresh | **да, не public Bearer:** cookie `__Host-albedo_rt`, middleware без живого access | — |
| M8 | HTTP-коды login ≠ 500 | **да** | — |
| M9 | Новая permission `profile:self` | **да** | — |
| M10 | Смена username через RPC | **да**, с паролем | — |

---

## 10. Риски

| Риск | Почему реален | Митигация |
|------|---------------|-----------|
| **refresh → 401 после 15 мин** | сейчас нужен живой Bearer; access TTL 15 мин | M7 cookie-credential (`ADR-001`) + таймер `exp-60s` + single-flight. Пока Сона не вольёт rest — ожидаемый красный |
| **CORS пустой** | `RestConfig.cors_origins=[]`, middleware не вешается | Vite proxy в Этапе 0. Не учить пользователей выключать CORS в браузере |
| **Ошибки логина как 500** | rest dispatcher default `status_code=500`; auth exceptions могут не мапиться | M8; фронт читает `envelope.error` всегда |
| **login DTO без профиля** | нет email/ника/аватара | не выдумывать; Chip бедный до `get_me` |
| **Administrators отсутствует** | сида нет; bootstrap только «если есть» | M4 |
| **AD-правила только на фронте** | пользователь снимет группу curl'ом | M5–M6, тесты Катерины на provider |
| **XSS → кража токенов** | SPA | токены только HttpOnly cookies; custom header CSRF; слот synchronizer для Литы. Не sessionStorage |
| **MSW залипнет как «бэк»** | удобно зеленеть тесты | флаг `VITE_USE_MSW`, Катерина гоняет хотя бы один прогон против belle |
| **Гонка двух refresh** | два 401 параллельно, reuse detection отзывает family | mutex в `ApiClient` |
| **Reuse detection** | повторный refresh тем же opaque → `ReuseDetectedError`, вся семья мертва | не ретраить refresh тем же телом; после fail — logout |
| **Нет ARCHITECTURE_STANDARD.md** | некуда повесить ADR | ADR лежит в `albedo/docs/ADR-001-auth-contract.md` |
| **Аватар в JSON b64** | раздувает envelope, max_body 1 MiB | 256 KiB + MIME allowlist; GET `/api/v1/auth/avatar` для `<img>` |

---

## 11. Что НЕ в P0

- Чат, сообщения, LLM-виджет.
- Workspace / файловое дерево.
- Админка всех пользователей (list_users в UI).
- CRUD ролей и permissions в UI.
- Смена пароля в settings (метод `set_password` есть без api — отдельный P1).
- Темы light, i18n, мобильная навигация.
- PWA, Electron.
- Production Docker образ albedo, nginx, TLS — контур Рэй после P0.
- Keycloak, SSO, WebAuthn.
- BFF / отдельный session-сервер (cookies first-party — **в P0**, `ADR-001`).
- `public=True` на refresh (заменено cookie-credential).
- Фейковый профиль «чтобы посмотреть красиво» без ADR.

---

## 12. Вопросы Мастеру — **отвечены 2026-08-21**

Нора и `api=True` разблокированы. Этап 0 каркаса можно параллельно. Этапы 2–4 — по `ADR-001`.

| # | Вопрос | Ответ |
|---|--------|-------|
| Q1 | Бренд на login: «belle» или «albedo»? | **Albedo** |
| Q2 | Колонки `nickname`, `phone`, `user_prompt`, `chip_display_mode` в `auth.users` (не JSONB)? | **да**, отдельные колонки |
| Q3 | Аватар в P0: только инициалы, upload — P1? | **нет.** Инициалы если нет картинки; **upload в P0** |
| Q4 | `auth.refresh_token` сделать `public=True`? | **чинить refresh, но не public Bearer.** Cookie-credential, см. Q12 |
| Q5 | Сид builtin-группы `Administrators`? | **да** |
| Q6 | Superadmin = запись bootstrap (`is_bootstrap_admin`)? | **да**, не «любой system_admin» |
| Q7 | Смена username в P0 с паролем? | **да** |
| Q8 | Телефон обязателен в схеме? | колонка **есть**, **NULL ок**, форма не required |
| Q9 | Member Of только **свои** группы? | **да** |
| Q10 | Primary = `user_group_membership.is_primary`? | **да** |
| Q11 | Vite-прокси, CORS в P0 не трогаем? | **да.** Dev = Vite `/api` → `:8080`. Prod = nginx same-origin. CORS `*` не открывать. credentials только first-party |
| Q12 | Где токены: sessionStorage или cookies? | **cookies.** Не sessionStorage/localStorage. `__Host-albedo_at` (Lax, 15 мин) + `__Host-albedo_rt` (Strict, 30d), оба `Path=/` из‑за `__Host-`. SPA: `credentials:'include'`, без Authorization. CSRF: SameSite + `X-Albedo-Client: spa`. Слот synchronizer для Литы. Подробно: `docs/ADR-001-auth-contract.md` |

---

## Итого

| | |
|--|--|
| Шагов реализации | 0.x + 0.B + 1.x + 2.x + 3.A/B + 4.x ≈ 35 конкретных действий |
| Новых файлов фронта (ориентир) | ~25 в `src/` после Этапа 0–4 |
| Файлов бэка | список в `docs/ADR-001-auth-contract.md` §9 (auth schemas/provider/repository/bootstrap + rest/cookie_auth.py + apiproxy middleware/converter) |
| Сложность | **высокая** |
| Время | не «вечер на форму»: ориентир **1.5–2 недели** команды при ответах на §12 в первый день |

**Это сложная задача: фронт продукта + доработка mia-auth.** Login на текущем API — только первый этаж. UserChip и AD-настройки без колонок, `get_me`, сида Administrators, primary и фикса refresh — декорация.

```
Эна (архитектура фронта + ADR контракта)
  → Нора (миграция users/groups)
    → Сона (фронт + api=True)
      → Катерина (тесты)
```

Q1–Q12 и M1–M10 закрыты. Код приложения — после ADR (готово: `docs/ADR-001-auth-contract.md`, `docs/ARCHITECTURE.md`). Дальше Нора → Сона → Катерина. Лита ревьюит cookies до Этапа 1.
