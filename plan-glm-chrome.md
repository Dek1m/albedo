# План: GLM-хром albedo + dock VS Code-like + закладка mia-term

| Поле | Значение |
|------|----------|
| **Тип** | фича (волна 1: UI/хром) + архитектура (волна 2: mia-term, код не писать) |
| **Сложность** | высокая |
| **Стандарт** | `/home/opencode/projects/docs/CODING_STANDARD.md` v3.1 (§5 слои, §8 TypeScript, §10 безопасность, §11 тесты) |
| **Контракт** | albedo `docs/ADR-001` cookies; `ADR-002` fs; `ADR-003` notification; `ADR-004` system; `ADR-005` discovery (ФС = каталог). Командного `ARCHITECTURE_STANDARD.md` нет |
| **Код приложения** | этим планом не пишется. `plan.md` P0 **не трогать** |
| **Дата канона** | 2026-09-03, Мастер |

Шрифт: **Carlito** (Google Fonts, открытый метрический аналог Calibri). Возражения нет: Calibri проприетарный, в продукт не кладём.

Отмена: хакер-минимализм (#6d28d9, IBM Plex Mono) и Discord-серый как канон. `ARCHITECTURE.md` ещё пишет «violet» — поправить в волне 1 (Тиамат), не оставлять ложью.

Запреты волны: Tailwind/MUI/Next; токены JWT в localStorage; Redis как каталог модулей; удаление Bootstrap; root-shell; полный интерактивный PTY; код `mia/modules/term` до `accepted` ADR-006 **и** вердикта Литы.

---

## 1. Цель и границы

**Цель волны 1:** визуальный язык GLM (чёрный, серые слои по глубине, оранжевый точечно), каркас AppShell с нижней панелью, ввод сообщения живёт в dock, Terminal — UI-заглушка.

**Цель волны 2 (после гейта):** продуктовый модуль `mia/modules/term` + живая вкладка. Не ядро.

| Волна | Делаем | Не делаем |
|-------|--------|-----------|
| **1 UI** | токены `--bg-1..5` / `--z-*`, Carlito, логотип α, логин крупнее, AppShell header/body/dock, Message tab + send, Terminal stub, grips, persist `dockHeight`, цвета+z-index Window | код mia-term, WebSocket, PTY, пайплайн-RPC, загрузка файла на бэк, рефактор Window (backdrop на весь экран остаётся), снос Bootstrap |
| **2 term** | ADR-006 accepted + Лита → модуль term по эталону notification → albedo `termApi` → живая вкладка | unload ядра; Redis-каталог; root; «полный bash как на хосте» |

Dock виден **всегда после логина** (внутри `AppShell`, не на `/login` `/bootstrap`). Send без focused-сессии — `disabled`.

---

## 2. Визуальный язык

Слои = и глубина цвета, и z-index. Номера совпадают.

### 2.1 Фон `--bg-1` … `--bg-5`

Заменить Discord (`--bg-base #1e1f22` и семейство) на GLM. Старые имена `--bg-base/elevated/surface/deep` оставить как **алиасы** на новые, чтобы не рвать 2500 строк за один проход: `--bg-base: var(--bg-1)` и т.д. Новые правила хрома сразу на `--bg-N`.

| Токен | Hex (канон) | Куда |
|-------|-------------|------|
| `--bg-1` | `#0a0a0b` | зад: `html/body/.albedo-stage/.albedo-shell`, пустой workspace |
| `--bg-2` | `#141416` | dock (уровень 2) |
| `--bg-3` | `#1a1a1d` | sidebar, только при открытом workspace |
| `--bg-4` | `#222226` | шапка, SessionTabs-полоска, дропдауны шапки |
| `--bg-5` | `#2c2c31` | `.albedo-window-frame`, карточки логина как «окно на сцене» |
| `--bg-hover` | `#333338` | hover рядов |
| `--bg-active` | `#3a3a40` | active tab/row |

Оранжевый **не** градиент фона.

### 2.2 Бренд и линии

| Токен | Значение | Где |
|-------|----------|-----|
| `--brand` | `#ff7a1a` | α, focus ring точечно, primary button |
| `--brand-dim` | `rgb(255 122 26 / 18%)` | hairline glow, α на логине |
| `--hairline` | `rgb(255 255 255 / 8%)` | 1px границы панелей |
| `--grip-dots` | `#6a6a70` | три точки / полоска grip |

Текст: `--text-primary #e8e8ea`, `--text-secondary #a8a8ae`, `--text-muted #7a7a80`. Danger/success не трогать (`#f23f43` / `#23a55a`).

`--shadow` пересчитать под чёрный: без «белой» inset-пыли Discord, глубина = слои серого + тонкая hairline.

### 2.3 z-index `--z-*`

Сейчас: header `40`, sidebar `2`, window `1050`, toast `9999`, ctx-menu `1080`. Канон: тосты **не** выше окон.

| Токен | Значение | Кто |
|-------|----------|-----|
| `--z-1` | `0` | зад |
| `--z-2` | `20` | `.albedo-dock` |
| `--z-3` | `30` | `.albedo-sidebar` |
| `--z-4` | `40` | `.albedo-header`, `.albedo-ws-drop` / `.albedo-ai-drop` (не ctx), `.albedo-toast-stack` |
| `--z-5` | `50` | `.albedo-window`, `.albedo-ws-drop.albedo-ctx`, `.albedo-confirm-backdrop` (если живёт вне Window — поднять до 5, не выше) |

`.albedo-toast-stack`: сейчас `bottom: 14px` + `z-index: 9999` — столкнётся с dock. Волна 1: `top` под шапкой, `right`, `z-index: var(--z-4)`. Окна выше тостов.

Window: **не** убирать per-window backdrop. Только `z-index: var(--z-5)` и цвета фрейма `--bg-5`.

### 2.4 Шрифт Carlito

- `index.html`: Google Fonts `Carlito:ital,wght@0,400;0,700;1,400;1,700` вместо Outfit. Весов 500/600 у Carlito нет — UI на `400`, акцент на `700`.
- `body`, `.albedo-brand`, bootstrap-overrides (`font-family: Outfit` в трёх местах): `Carlito, "Liberation Sans", "Segoe UI", system-ui, sans-serif`.
- Моно для markdown/term: без смены, `ui-monospace` как сейчас.

### 2.5 Логотип

Вместо текста `albedo` + `::after` подчёркивания:

```html
<span class="albedo-brand" aria-label="albedo">
  <span class="albedo-brand-alpha" aria-hidden="true">α</span>lbedo
</span>
```

α — `--brand`, без CSS-underline. Компонент `BrandMark` в шапке, логине, bootstrap, AuthGuard.

---

## 3. Каркас AppShell

Текущее (`AppShell.tsx`): header → SessionTabs? → `.albedo-body` (sidebar | ChatPane) → окна/тосты. Ввода внизу нет (он в `ChatPane`).

Целевое:

```
.albedo-shell (--bg-1, column, 100vh)
  header.albedo-header          (--bg-4, --z-4)
    .albedo-header-row          BrandMark + меню + chip/bell
    SessionTabs?                вторая строка, только если есть открытые вкладки
  .albedo-body                  (flex:1, row, min-height:0)
    WorkspaceSidebar?           (--bg-3, --z-3)  только active workspace
    ChatPane                    только лог
  Dock                          (--bg-2, --z-2)  всегда в AppShell
  окна / Share / Toast / Settings
```

**Решения Мастера 2026-09-03:**
1. SessionTabs — в шапке, под основным меню.
2. Тосты top-right под шапкой, `--z-4`. Можно перетащить позже.
3. Скрепка v1: **иконка файла из темы**, не bitmap-preview. Тема: **Material Icon Theme** (PKief, MIT) — самая сильная VS Code file-icon тема. Подмножество SVG в `public/file-icons/` + маппер по имени/расширению. Те же глифы в дереве слева и у прикреплённых в Message. Не тащить весь npm-пакет в runtime, если можно вендорнуть нужные svg.
4. Share: в hover-меню строки дерева — значок цепи (`bi-link-45deg` или SVG цепи из той же темы). Клик открывает Share. Если у узла есть гранты (расшарена) — та же иконка **постоянно справа** от имени, цвет `--brand`. Hover-цепь видна для shareable путей даже без грантов (приглушённый `--text-muted`).

| Состояние | Sidebar | Chat | Dock | Send |
|-----------|---------|------|------|------|
| залогинен, нет workspace | нет | «ready» | да, вкладка Message | disabled |
| workspace, нет focused session | да | «ready» | да | disabled |
| focused session | да | лог | да | enabled |

Высота dock: Zustand `dockHeight` (default `200`, clamp `120…min(480, 50vh)`), persist рядом с `sidebarWidth`.

---

## 4. Message tab

Вынести send из `ChatPane`. Лог остаётся.

### 4.1 UX

Верх dock — вкладки как VS Code: `Message` | `Terminal`.  
Контент Message:

- нижний `div` padding `3–5px`;
- слева в ряд: combobox агента, скрепка, combobox Pipeline, корзина (очистить **ввод**, не историю чата);
- поле с подсветкой markdown.

Enter без Shift — send (как сейчас в ChatPane).

### 4.2 Reuse markdown

Не копировать подсветку. Источник: `src/features/ai/markdownPrompt.ts` (`highlightMarkdown`, XSS-escape уже есть, тесты `markdownPrompt.test.ts`).

`MarkdownPrompt.tsx` сейчас тащит toolbar «Load file / Clear» — дубль скрепки и корзины. Волна 1:

- добавить `showToolbar?: boolean` (default `true`, чтобы AgentForm/WorkspaceModals не сломались);
- Message tab: `<MarkdownPrompt showToolbar={false} />`.

Не подключать сторонний highlighter.

### 4.3 Агент

`llmApi.listAgents()` уже есть (`POST llm/agents`). Combobox: список из RPC при монтировании Dock; пустой список — placeholder, send не блокировать из-за агента (агент опционален в v1 UI). Выбранный `agentId` — только клиентский стейт dock, в `workspaceApi.postMessage` **не** добавлять поля, пока бэк их не принимает. Сейчас сигнатура: `postMessage(workspaceId, sessionId, 'user', text)`.

### 4.4 Pipeline — слот

Пайплайнов в llm RPC нет. Combobox disabled, опций нет, `title="Pipelines: no RPC yet"`. Не выдумывать `llm.pipelines`.

### 4.5 Скрепка — слот

UI сразу: `input[type=file]` hidden + кнопка `bi-paperclip`. Нет готового RPC вложения → **не** звать бэк. Под композером: глиф Material Icon Theme + имя + размер; сброс корзиной. Bitmap-preview картинки нет. В `postMessage` файл не пихать. Текст файла в композер не лить.

### 4.6 Send

Логику `workspaceApi.postMessage` + toast ошибки перенести из `ChatPane` в Message tab (или тонкий `application/workspace/sendUserMessage.ts` — если выносить, один файл, без нового слоя-ради-слоя). После успеха: очистить draft + local attach preview. ChatPane подписан на focused session и сам перечитывает лог; после send либо callback в ChatPane, либо простой lift `messagesRev` в store. Предпочтение: `useWorkspaceStore` счётчик `chatRev`, ChatPane в deps `useEffect`.

---

## 5. Terminal tab: заглушка vs живая

### Волна 1 (обязательна в UI)

Файлы только albedo. Макет как продукт, данные фейковые **не** подсовывать.

- слева/центр: панель вывода, текст «Terminal waits for ADR-006»;
- справа: список linux-сессий (пустой `ul`);
- сверху справа списка: `+` (чистая сессия) и корзина (удалить выделенную) — кнопки **disabled**, `title` про гейт ADR-006;
- плюс/корзина не пишут в localStorage «фейковые сессии».

### Волна 2 (после accepted + Лита)

Живой UI на `termApi`, xterm.js **не** закладывать в волну 1. Транспорт albedo — HTTP POST RPC; интерактивный поток — отдельное решение ADR-006 (скорее всего не в v1 модуля).

Эталон модуля: `mia/modules/notification` — `ModuleMeta`, `schema.py`, `provider.py` (`@task`), `facade.py`, `ddl/`, `load_on`, `is_system=False`. Ядро unload запрещён: `log`, `db`, `auth`, `apiproxy`, `rest`, `system`. `term` — продукт, как `workspace` / `fs` / `notification`. Discovery — ADR-005 (папка `mia/modules/term/__init__.py`), не Redis.

Окружение исполнения: контейнер belle, не хост.

---

## 6. Grips

Сейчас `.albedo-sidebar-resizer` — 4px, без визуала (`tokens.css` ~1877). Dock resizer нет.

Общий компонент `src/shared/ui/PanelGrip.tsx`:

| Проп | Dock | Sidebar |
|------|------|---------|
| `axis` | `y` | `x` |
| положение | верхняя граница dock, по центру | правый край sidebar |
| визуал | полоска 1px `--hairline` + 3 точки по центру | то же, вертикально |
| pointer | drag, clamp | как сейчас 180–420, плюс визуал |
| клавиатура | `role="separator"` `tabIndex={0}` `aria-orientation` | то же |
| клавиши | ↑↓ шаг 16px | ←→ шаг 16px |
| `aria-valuenow/min/max` | height | width |

Не делать resize через невидимый 4px без фокуса. Hit-area ≥ 8px, точки не перехватывают клик по вкладкам.

---

## 7. ADR-006 черновик границ mia-term

**Статус этого раздела:** draft в плане. Тиамат+Эна вынесут в `albedo/docs/ADR-006-term.md` **или** `mia/docs/` на волне 2. Сона **не** создаёт `mia/modules/term` по этому черновику.

**Решение (одна строка):** продуктовый модуль `term` даёт пользователю **именованные linux-сессии внутри контейнера belle**, без root и без обещания полного интерактивного PTY в v1. Каталог модуля — ФС (ADR-005).

### 7.1 Мета

```
name: term
is_system: False
load_on: "all"          # list/create/delete на api; exec на worker
dependencies: ["db", "auth", "log"]
display_name: Terminal
```

Unload ядра не расширять. `term` не попадает в forbidden-unload.

### 7.2 Модель сессии (v1)

Таблица `term.session` (ddl, не Redis):

| Поле | Смысл |
|------|--------|
| `id` UUID | PK |
| `user_id` | FK `auth.users`, строгий self-scope |
| `title` | короткое имя |
| `cwd` | путь **внутри** контейнера, whitelist корня (не `/`, не docker.sock) |
| `status` | `idle` \| `running` \| `dead` |
| `created_at` / `updated_at` | timestamptz |

Нет: shared session между юзерами, attach к pid хоста, privileged.

### 7.3 RPC names (черновик)

Все `POST /api/v1/term/{function}`, envelope ADR-001, cookie + `X-Albedo-Client: spa`.

| function | v1 | Заметка |
|----------|----|---------|
| `sessions_list` | да | self-scope |
| `session_create` | да | пустая сессия, cwd по умолчанию из конфига модуля |
| `session_delete` | да | только своя; running → сначала kill worker-side |
| `exec` | да, **не streaming** | `{session_id, argv: string[]}` → `{stdout, stderr, exit_code}` буфер с лимитом |
| `write` / `read_stream` / `resize` / `ws` | **нет в v1** | интерактивный PTY |

`argv` — массив, не `shell=True` строка. Запрет интерполяций.

### 7.4 Worker

`@task` на worker (как notification.distribute_job по роли, не type=database). Exec в контейнере belle от **непривилегированного** uid. Timeout + cap stdout (порядок 1 MiB, точная цифра — Лита). Метрики: duration, exit, denied.

### 7.5 Что НЕ в v1

- root / sudo / `CAP_SYS_ADMIN`
- PTY allocate, tmux, sshd, docker.sock
- WebSocket/SSE из albedo (клиент умеет только POST RPC)
- произвольный бинарь с хоста; только allowlist или фиксированный `/bin/sh` **без** `-c` от сырой строки — решение Литы (предложение плана: только `argv[]` без shell)
- интерактивные TUI (htop, vim fullscreen)
- обещание «как GLM в браузере с живым курсором»
- код модуля до accepted + вердикт Литы

### 7.6 Гейт

Эна уточняет ADR → Лита security review → Мастер accepted → Сона код term → Катерина тесты → Рэй не открывает порт PTY наружу.

---

## 8. Список файлов albedo (волна 1)

### Создать

| Файл | Зачем |
|------|--------|
| `src/features/shell/BrandMark.tsx` | α + lbedo, aria-label |
| `src/features/dock/Dock.tsx` | оболочка панели, вкладки, высота, grip |
| `src/features/dock/MessageTab.tsx` | агент, скрепка, pipeline-слот, корзина, MarkdownPrompt, send |
| `src/features/dock/TerminalTab.tsx` | заглушка + пустой список сессий |
| `src/features/dock/dockTypes.ts` | `'message' \| 'terminal'` |
| `src/shared/ui/PanelGrip.tsx` | общий grip x/y + клавиатура |
| `src/features/dock/Dock.test.tsx` | вкладки, send disabled, pipeline disabled |
| `src/features/shell/BrandMark.test.tsx` | aria-label albedo, α в DOM |
| `src/shared/ui/PanelGrip.test.tsx` | clamp + keydown |
| `src/workspace/layoutPersist.test.ts` | если нет — roundtrip `dockHeight` |

### Изменить

| Файл | Что |
|------|-----|
| `index.html` | Outfit → Carlito |
| `src/theme/tokens.css` | `:root` токены, z-index, brand без ::after, dock/grip/chat без input, login card глубина, toast top |
| `src/theme/bootstrap-overrides.scss` | font-family Carlito (3 места Outfit) |
| `src/features/shell/AppShell.tsx` | BrandMark, SessionTabs во второй строке header, `<Dock />` |
| `src/shared/ui/FileGlyph.tsx` | SVG Material Icon Theme вместо SETI-букв |
| `src/shared/ui/ContextMenu.tsx` | опциональный `icon` у пункта |
| `src/features/workspace/WorkspaceDiskTree.tsx` / `HomeTree.tsx` | hover-цепь + оранжевая цепь грантов |
| `src/features/workspace/context/WorkspaceFolderMenu.ts` | Share с иконкой цепи |
| `src/features/login/LoginPage.tsx` | BrandMark; графика сцены |
| `src/features/login/LoginForm.tsx` | убрать `form-control-sm` с username/password → `form-control`; кнопка не обязательно sm |
| `src/features/bootstrap/BootstrapPage.tsx` | BrandMark |
| `src/auth/AuthGuard.tsx` | BrandMark |
| `src/features/workspace/ChatPane.tsx` | удалить form/draft/send; лог + `chatRev` |
| `src/features/workspace/WorkspaceSidebar.tsx` | resizer → `PanelGrip axis="x"` |
| `src/workspace/WorkspaceStore.ts` | `dockHeight`, `dockTab`, `chatRev`, setters |
| `src/workspace/layoutPersist.ts` | поле `dockHeight` (не JWT) |
| `src/features/ai/MarkdownPrompt.tsx` | `showToolbar?: boolean` |
| `src/shared/ui/Window.tsx` | не ломать API; класс/стиль только если z не из CSS |
| `src/app/App.test.tsx` | бренд через `getByLabelText('albedo')` |
| `docs/ARCHITECTURE.md` | violet → GLM слои, AppShell+dock, Carlito; MSW/violet ложь убрать точечно |

### Не трогать

`plan.md`; `mia/modules/**`; Window backdrop-логика; `llmApi` (нет pipeline); `apiClient` cookies.

Оценка объёма: ~12 новых, ~16 правок. `tokens.css` — главный риск регрессии.

---

## 9. Цепочка агентов и шаги

Порядок жёсткий. Код term — не в этой цепочке.

### Волна 1

**Шаг A — Эна (architect), ~30 мин, сложность низкая**  
Проверить §2 hex и §3 сетку. Если hex сдвинуть — правка только таблицы §2, не семантики слоёв.  
- **Файлы:** этот план (комментарий Афине, файл не обязателен).  
- **Зависимости:** —.  
- **Результат:** «канон слоёв ок» или дельта hex.

**Шаг B — Тиамат (tech-writer), сложность низкая**  
- **Файлы:** `docs/ARCHITECTURE.md` — тема не violet; AppShell = header/body/dock; бренд α; шрифт Carlito; ссылка на этот план.  
- **Зависимости:** шаг A.  
- **Не:** писать ADR-006 файл, пока Эна не вынесет волну 2.

**Шаг C — Сона (programmer), сложность высокая, ~6–10 ч**

C1. Токены и шрифт  
- **Файлы:** `index.html`, `src/theme/tokens.css` (`:root`, z-index замены по селекторам header/sidebar/window/toast/drop), `bootstrap-overrides.scss`.  
- **Стандарт:** CODING_STANDARD §8 (без CSS-in-JS).  
- **Результат:** Outfit нет в репо (grep), слои видны без JS.

C2. BrandMark + логин  
- **Файлы:** создать `BrandMark.tsx`; LoginPage, BootstrapPage, AuthGuard, AppShell; LoginForm без `form-control-sm`; CSS `.albedo-brand-alpha`, auth-card `--bg-5` + hairline.  
- **Зависимости:** C1.  
- **Результат:** α оранжевая, поля логина обычного размера.

C3. Store + persist  
- **Файлы:** `WorkspaceStore.ts`, `layoutPersist.ts`. Поля `dockHeight` (number), `dockTab` (`'message' | 'terminal'`), `bumpChatRev()`. Default height 200.  
- **Зависимости:** —. Можно параллельно C1.  
- **Результат:** read/write layout не теряет `sidebarWidth`; JWT по-прежнему нет.

C4. PanelGrip  
- **Файлы:** создать `PanelGrip.tsx`; вшить в `WorkspaceSidebar.tsx` вместо `.albedo-sidebar-resizer` onMouseDown.  
- **Зависимости:** C3 (setSidebarWidth уже есть).  
- **Результат:** видимый grip, стрелки меняют ширину.

C4b. FileGlyph + share-цепь  
- **Файлы:** заменить letter-badge в `FileGlyph.tsx` на SVG из `public/file-icons/` (Material Icon Theme subset: folder, folder-open, ts/tsx/js/py/rs/go/json/md/css/html/svg/yml/sh/txt + generic file). `WorkspaceDiskTree` / `HomeTree`: hover row-action цепь → `useShareStore.open`; если есть гранты — оранжевая цепь справа (не только `is-linked`). `WorkspaceFolderMenu`: пункт Share с иконкой цепи. `MenuItem` расширить опциональным `icon`.  
- **Зависимости:** C1.  
- **Результат:** дерево и attach-чип Message одного набора иконок; расшаренная папка видна без hover.

C5. ChatPane без ввода  
- **Файлы:** `ChatPane.tsx`, CSS `.albedo-chat-input` удалить или оставить мёртвым — удалить правила.  
- **Зависимости:** C6 должен сразу подхватить send, иначе регрессия «нельзя писать». Делать **в одном PR/сессии** с C6.  
- **Результат:** в ChatPane нет textarea.

C6. Dock + MessageTab  
- **Файлы:** `Dock.tsx`, `MessageTab.tsx`, `dockTypes.ts`; `AppShell.tsx` монтирует Dock; `MarkdownPrompt.tsx` `showToolbar`.  
- **Зависимости:** C3, C4, C5.  
- **Результат:** send пишет в ту же `postMessage`; без сессии кнопка disabled; pipeline disabled; скрепка показывает имя файла локально.

C7. TerminalTab stub  
- **Файлы:** `TerminalTab.tsx`, стили списка.  
- **Зависимости:** C6 (вкладки).  
- **Результат:** пустой список, + и корзина disabled.

C8. Window слой 5  
- **Файлы:** `tokens.css` `.albedo-window` z-index + фон фрейма.  
- **Зависимости:** C1.  
- **Результат:** backdrop как был; окна выше шапки и тостов.

**Шаг D — Катерина (tester), сложность средняя**  
- **Файлы:** тесты из §8; поправить `App.test.tsx`, `LoginForm.test.tsx` если лейблы живы (лейблы не менять).  
- **Как:** `npx tsc -b && npm test`.  
- **Зависимости:** шаг C.  
- **Проверки вручную:** логин поля; dock drag + Arrow; Message send; Terminal disabled; тост не под dock; дропдаун шапки кликабелен.

**Шаг E — Лита (security) на волне 1, сложность низкая, ~20 мин**  
Не блокер мержа UI. Смотрит: скрепка не читает файл в RPC; MarkdownPrompt XSS-тесты зелёные; persist только layout-ключи `albedo.layout.*`.  
- **Зависимости:** D.

**Шаг F — Тишь**  
Гранулы: канон GLM, отмена хакер-минимализма, dock, ADR-006 draft status=proposed.  
- **Зависимости:** после мержа волны 1 / фиксации ADR статуса.

### Волна 2 (не стартовать из волны 1)

1. Эна — файл ADR-006 из §7.  
2. Лита — вердикт (argv vs shell, cwd whitelist, caps, timeout).  
3. Мастер — accepted.  
4. Сона — `mia/modules/term` по notification + albedo `src/api/termApi.ts` + оживить TerminalTab.  
5. Катерина — pytest модуля + albedo stub→live.  
6. Рэй — без publish PTY-порта; только существующий `:8080` RPC.

---

## 10. Риски

1. **PTY / побег из контейнера** — высокий. Митигация: код term запрещён до Литы; v1 без PTY; argv массив; self-scope SQL.  
2. **Streaming vs HTTP RPC** — albedo `ApiClient` = POST envelope. Живой терминал как у VS Code на этом транспорте не сделать. Митигация: волна 1 заглушка; v1 модуля = `exec` buffered; WS только новым ADR, не контрабандой в UI.  
3. **Пайплайн-слот** — соблазн нарисовать фейковый список. Митигация: disabled, пусто, без RPC-имени.  
4. **tokens.css 2500 строк** — пропущенный Outfit/z-index. Митигация: grep `Outfit`, `#1e1f22`, `z-index: 9999`, `z-index: 1050` в конце C1.  
5. **C5 без C6** — чат без ввода. Митигация: один проход Соны.  
6. **Тосты vs dock** — митигация §2.3 top-right `--z-4`.  
7. **localStorage layout** — не путать с токенами. Ключ как сейчас `albedo.layout.${userId}`.  
8. **Carlito FOUT** — preconnect уже есть в `index.html`, сменить family в URL.

---

## 11. Критерии готовности волны 1

- [ ] Grep: нет `Outfit`; нет хакер-фиолетового `#6d28d9` в теме (если всплывёт).  
- [ ] `:root` содержит `--bg-1`…`--bg-5`, `--z-1`…`--z-5`, `--brand: #ff7a1a`.  
- [ ] Логотип: α оранжевая + «lbedo», нет `::after` underline.  
- [ ] Login username/password не `form-control-sm`.  
- [ ] После логина виден dock; без сессии Send disabled.  
- [ ] ChatPane без textarea; сообщение уходит из Message tab в тот же `postMessage`.  
- [ ] Markdown highlight в композере = `highlightMarkdown`.  
- [ ] Pipeline combobox disabled, опций 0.  
- [ ] Скрепка: имя локального файла, сети нет (DevTools).  
- [ ] Terminal: пустой список, +/trash disabled, **нет** вызовов `term.*`.  
- [ ] Grip dock и sidebar видимы; клавиши меняют размер; после reload высота dock из layout persist.  
- [ ] Window: backdrop на экран как был; z-index слой 5.  
- [ ] `npx tsc -b && npm test` зелёные.  
- [ ] `plan.md` без diff.  
- [ ] Нет Tailwind/MUI; Bootstrap на месте.  
- [ ] `ARCHITECTURE.md` не обещает violet.

Волна 2 **не** входит в эти галочки.

---

## Итого

| | |
|--|--|
| Шагов волны 1 | A Эна → B Тиамат → C1…C8 Сона → D Катерина → E Лита (UI) → F Тишь |
| Файлов albedo | ~12 новых, ~16 правок |
| Сложность волны 1 | высокая |
| Сложность волны 2 | высокая, отдельный гейт |
| Время волны 1 | ~8–12 часов чистой работы |
| Стандарт | CODING_STANDARD.md v3.1; ADR-001…005 |

### Решения Мастера (закрыты)

1. SessionTabs — шапка, под меню.  
2. Тосты top-right под шапкой.  
3. Иконки файлов — Material Icon Theme; скрепка = глиф+имя, не preview картинки. Цепь share в hover-меню; оранжевая цепь справа, если расшарена.
