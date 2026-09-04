# План: context pipeline + loop (llm) и хром albedo

Канон: `docs/ADR-007-llm-context-pipeline.md`. P0 `plan.md` не трогать. `mia/modules/**` бэка не писать, пока ADR не **accepted**.

---

## §0. Волна хрома (сейчас, без RPC loop)

Цель: дыра под наблюдаемость и удобный composer. Не выдумывать `llm.pipelines` / `llm.run_usage`.

| ID | Что | Где |
|----|-----|-----|
| U1 | Вкладка **Context** справа от Terminal | `dockTypes`, `Dock`, `WorkspaceStore`, `ContextTab` |
| U2 | Context: idle, tokens in/out = 0, cache = 0, cache hits = 0 | без фейкового RPC |
| U3 | `Tokens: N` над верхним правым углом поля ввода, onChange | `MessageTab` + `estimatePromptTokens` |
| U4 | Пикер агента: без опции «Agent»; last-used → is_default → первый | `localStorage` `albedo.dock.lastAgentId` |
| U5 | Тесты Dock / оценка токенов / пикер | vitest |

Оценка токенов: локальная эвристика, **не** эмбеддер, **не** новая npm-зависимость. Истина провайдера — позже во вкладке Context.

Pipeline combobox остаётся disabled до бэка.

---

## §1. После accepted ADR-007 (бэк в mia-llm)

Не отдельный модуль. Всё в `llm`.

1. **Нора** — DDL: `llm.pipelines`, `llm.pipeline_steps` (JSONB config, phase, ord). Caps / rev. Миграция обратимая.
2. **Сона** — каталог middleware (identity-реализации), `TurnCtx`, loop skeleton, хуки ishtar = noop, `MemoryPort` + заглушка/selti adapter.
3. **Сона** — RPC: `list_middleware`, `list_pipelines`, CRUD, `run_usage` (или события в сессию) для вкладки Context.
4. **Катерина** — фикстуры ADR §6.
5. **Albedo** — включить combobox Pipeline; Context подписаться на usage.
6. **Тишь** — гранулы ADR + схема.
7. **Ishtar** — не в этой цепочке.

Порядок gather по умолчанию (дефолтный пайплайн `chat`):

```
gather:  workspace_rag │ files_catalog │ chat_branch │ memory_recall
transform: compress_window (identity, пока нет длинных сессий)
harness: pack → llm
```

files_* не исполнять, пока нет homes — шаг `enabled=false` или adapter empty.

---

## §2. Запреты

- Код loop в albedo / belle REST
- Middleware `ishtar`
- Имя шага `selti_*`
- Эмбеддер на onChange composer
- Выдуманный RPC usage до таблиц
- Трогать `plan.md` P0
