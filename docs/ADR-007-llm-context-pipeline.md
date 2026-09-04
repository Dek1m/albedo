# ADR-007: Context pipeline и LLM-loop в модуле llm

| Поле | Значение |
|------|----------|
| **Статус** | proposed |
| **Дата** | 2026-09-04 |
| **Авторы** | Афина (оркестрация), по канону диалога с Мастером |
| **Проекты** | mia-llm (рантайм, схема, RPC), albedo (dock: Pipeline / Context / composer) |
| **Связанные** | `docs/lib/agents/loops-tools-pipelines.md`; ishtar PLAN (дыра, не реализация); albedo `plan-llm-loop.md` |
| **Стандарты** | `docs/CODING_STANDARD.md`, `docs/LOGGING_STANDARD.md` |
| **Код бэка не в этом ADR** | Сона не пишет mia-llm, пока Мастер не **accepted**. UI-хром albedo (вкладка Context, оценка токенов composer, пикер агента) — волна без выдуманного RPC. |

---

## Решение (одна строка)

Один **loop** в коде `mia/modules/llm` на network-воркере. Именованный **pipeline** — рецепт сборки окна (`TurnCtx`) из каталожных **middleware** (source параллельно, transform по порядку). Не отдельный модуль mia. Ishtar — пустые хуки `before_run` / `after_run`. Память — порт `MemoryPort`, не бренд selti. Albedo: combobox Pipeline; вкладка **Context** — usage хода; composer показывает оценку токенов черновика локально.

---

## 1. Контекст

Composer albedo уже имеет слот Pipeline (`disabled`, `title="Pipelines: no RPC yet"`) и пикер агентов. Chat без tool-loop. Tool-loop сознательно после homes. Compaction в v1 loop откладывали — **разрез** под него нужен сейчас.

Три слоя нельзя смешивать:

| Слой | Что | Сжимать |
|------|-----|---------|
| Working window | то, что уходит в LLM на turn | каждый ход |
| Session transcript | история в БД / UI | реже, другой компрессор |
| Long-term | факты между тредами | JIT через порт, не dump |

Ishtar (эпизоды → evaluator → роутер; shadow → advisory → binding) — контроллер **маршрута**, не шаг сборки. Решение 28.08: loop не мозг ishtar.

---

## 2. Сущности (всё в llm)

### D1. Loop — не таблица

Один рантайм:

```
before_run (дыра ishtar, identity)
  turn:
    pipeline.gather (sources, parallel)
    pipeline.transform (sequential, compressor хвостом)
    pack (стабильный префикс, не middleware пользователя)
    LLM
    tool_calls → firewall → execute → observation → снова turn
after_run (дыра ishtar, identity)
```

Стоп: нет tool_calls | max_turns | wall | token budget | cancel | одинаковый fingerprint тула N раз.

Belle только диспатчит `run_id`. SPA не крутит loop.

### D2. `TurnCtx` — общий аккумулятор

Не unix-pipe blob. Middleware читает/пишет ключи:

- идентичность: `workspace_id`, `session_id`, `branch_id`, `agent_id`, `user`
- `query`, `retrieved[]` (`text`, `score`, `source`, `id`)
- `window`, `budget`, `usage`
- `cancel`

Контракт шага: `requires` / `provides` по ключам.

### D3. Middleware — каталог кода, не загрузка с админки

| id | kind | порт |
|----|------|------|
| `workspace_rag` | source | (позже) workspace index |
| `files_catalog` | source | WorkspaceIndexPort / homes |
| `chat_branch` | source | SessionPort |
| `memory_recall` | source | **MemoryPort** (default: selti adapter) |
| `compress_window` | transform | — |

Пользователь не пишет Python. Выбирает из `list_middleware` (read-only).

**Запрещено в цепочке:** LLM, tool-loop, firewall, system/policy, произвольный код, `compress_session` (это after_run).

### D4. Pipeline + PipelineStep — данные в БД llm

`Pipeline`: `id`, `name`, `purpose` (человеческое; в system prompt само не попадает), `agent_id?`, `caps`, `rev`.

`PipelineStep`: `pipeline_id`, `ord`, `middleware_id`, `config` JSON, `enabled`, `phase` (`gather` | `transform`).

Gather в UI может быть линейным; рантайм параллелит sources одной фазы. Transform порядок священен. Compressor — последний transform перед pack.

Снимок `{pipeline_id, rev, steps}` на старте run. Живой ход админка не переписывает.

### D5. Порты, не бренды

```
MemoryPort.search(query, scopes, k) → chunks
```

Адаптер (selti / другой) — **system binding**, не поле шага. Смена памяти не трогает пайплайны. Fail soft: пустой `retrieved`, ход жив.

То же позже: WorkspaceIndexPort, SessionPort, ExperiencePort.

### D6. Дыра ishtar (не реализовывать в этой волне)

Харнесс вызывает identity:

- `before_run(ctx) -> ctx` — позже binding `{pipeline_id, agent_id}`
- `after_run(episode)` — позже учёба роутера

Не регистрировать middleware `ishtar`. Не класть контроллер внутрь gather. Опциональный source `experience_recall` — отдельное решение.

Режимы, когда дойдём: shadow / advisory / binding — снаружи пайплайна.

### D7. Настройка через llm RPC, не belle-процесс

Capability `llm:config`. CRUD pipeline/steps. Каталог middleware read-only. Системный cap бюджета агент не поднимает. Не конструктор графа из воздуха.

---

## 3. Наблюдаемость (albedo)

### Вкладка Context (справа от Terminal)

Показывает **фактический** usage текущего run / focused session, когда loop жив:

| Поле | Смысл |
|------|--------|
| tokens in | prompt_tokens провайдера |
| tokens out | completion_tokens |
| cache | cached / prefix-cache tokens |
| cache hits | число попаданий префикса за run |

Пока RPC нет — вкладка **есть**, цифры 0, статус `idle`, без выдуманного метода. Не эмбеддер.

События воркера → сессия / bus; SPA подписывается. Тела промптов в UI метрик нет (OTel: контент opt-in).

### Composer: `Tokens: N`

Над верхним правым углом поля ввода. Обновление на каждый `onChange`.

**Не эмбеддер:** сеть, другая единица, нельзя на каждый символ.

**Не tiktoken в браузере в v1:** вес словаря. Локальная синхронная оценка (латиница ~4 символа/токен, кириллица плотнее, CJK ≈ 1 символ/токен). Это **оценка черновика**, не счёт провайдера. Context tab — истина провайдера.

Позже можно сменить функцию на tokenizer модели агента, не меняя UI.

### Пикер агента

Без пункта-заглушки «Agent» / «No agents». Порядок выбора: last-used (`localStorage`) → `is_default` → первый visible+enabled. Пустой список — select disabled, без фейковой опции.

---

## 4. Отклонено

| Вариант | Почему |
|---------|--------|
| Отдельный модуль `mia/modules/pipeline` | дубль llm, два RPC |
| Loop строкой в БД | стопы и LLM станут «ещё шагом» |
| Unix-pipe вместо TurnCtx | RAG должен дописывать, не заменять |
| Sources строго последовательно | лишняя latency |
| LangGraph / ADK как зависимость | свой while + onion |
| `llm.pipelines` до этой модели | уже запрещали выдумывать; теперь сущность есть — RPC только после accepted |
| Loop в albedo / belle HTTP | песочница и timeout |
| Ishtar как middleware | ломает 28.08 |

---

## 5. Последствия

- Combobox Pipeline оживает после таблиц + `list_pipelines`, не раньше.
- Homes по-прежнему пререквизит tool-loop; pipeline сборки окна может стартовать на chat без тулов (chat_branch + compress identity).
- Selti можно заменить адаптером MemoryPort.
- Ishtar втыкается в хуки без миграции шагов.

---

## 6. DoD бэка (после accepted)

- [ ] Схема llm: pipelines, pipeline_steps; каталог middleware в коде
- [ ] Loop на воркере с identity compact и пустыми ishtar-хуками
- [ ] RPC: list_middleware, CRUD pipeline, get run usage для Context
- [ ] Никакого `open()` мимо homes, когда появятся files_* 
- [ ] Тесты: gather parallel, compressor last, unknown middleware, snapshot rev

DoD UI-хрома (эта волна, без бэка loop): см. `plan-llm-loop.md` §0.
