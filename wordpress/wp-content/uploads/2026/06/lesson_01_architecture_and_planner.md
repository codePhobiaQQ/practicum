# Урок 1: Архитектура PostgreSQL и планировщик запросов

## Введение

Понимание внутреннего устройства PostgreSQL — ключ к эффективной оптимизации. В этом уроке разберём, как PostgreSQL обрабатывает запрос от момента получения до возврата результата.

---

## 1. Архитектура сервера

```
Клиент
  │  TCP/Unix socket
  ▼
Postmaster (главный процесс)
  │  fork()
  ▼
Backend process (один на соединение)
  ├── Parser      ← SQL → Parse Tree
  ├── Analyzer    ← Parse Tree → Query Tree (с типами)
  ├── Rewriter    ← применение правил и VIEW
  ├── Planner     ← Query Tree → Plan Tree
  └── Executor    ← Plan Tree → результат
```

### Ключевые процессы

| Процесс | Роль |
|---|---|
| `postgres` (backend) | Обслуживает одно соединение |
| `checkpointer` | Периодически сбрасывает dirty pages на диск |
| `bgwriter` | Записывает страницы в фоне |
| `wal writer` | Записывает WAL буфер на диск |
| `autovacuum` | Очищает мёртвые строки (dead tuples) |
| `stats collector` | Собирает статистику pg_stat_* |

---

## 2. Структура хранения данных

### MVCC (Multi-Version Concurrency Control)

PostgreSQL хранит несколько версий каждой строки:

```
Строка таблицы (tuple):
┌──────────┬──────────┬───────────────────────────────┐
│  xmin    │  xmax    │  данные                       │
│ (создана │ (удалена │                               │
│  txid)   │  txid)   │                               │
└──────────┴──────────┴───────────────────────────────┘

xmin = 100, xmax = 0   → строка создана транзакцией 100, живая
xmin = 100, xmax = 200 → строка удалена транзакцией 200 (dead tuple)
```

### Структура страницы (8 КБ по умолчанию)

```
┌─────────────────────────────────────────────┐
│  Page Header (24 байта)                     │
├─────────────────────────────────────────────┤
│  Item ID array (4 байта × кол-во строк)     │
├─────────────────────────────────────────────┤
│  Free space                                 │
├─────────────────────────────────────────────┤
│  Tuple data (строки, снизу вверх)           │
└─────────────────────────────────────────────┘
```

---

## 3. Планировщик запросов

### EXPLAIN и EXPLAIN ANALYZE

```sql
-- EXPLAIN показывает план без выполнения
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;

-- EXPLAIN ANALYZE реально выполняет запрос и показывает фактические данные
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, c.name, SUM(oi.amount)
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= '2024-01-01'
GROUP BY o.id, c.name;
```

### Чтение плана выполнения

```
Gather  (cost=1000.43..75234.88 rows=5012 width=48)
        (actual time=45.2..1823.4 rows=4891 loops=1)
  Workers Planned: 4
  Workers Launched: 4
  ->  Parallel Hash Join  (cost=0.43..74234.88 rows=1253 width=48)
        Hash Cond: (o.customer_id = c.id)
        ->  Parallel Seq Scan on orders o
              Filter: (created_at >= '2024-01-01')
              Rows Removed by Filter: 187234
        ->  Hash  (cost=2100.00..2100.00 rows=100000)
              ->  Seq Scan on customers c
```

**Ключевые поля:**
- `cost=start..total` — оценка стоимости планировщика
- `rows` — ожидаемое / фактическое число строк
- `actual time` — реальное время в мс
- `loops` — сколько раз выполнялся узел

---

## 4. Методы доступа к данным

### Sequential Scan
Читает все страницы таблицы. Эффективен при `> 5-10%` выборке строк.

### Index Scan
Обходит индекс, затем fetches heap по ctid. Эффективен при малой выборке.

### Index Only Scan
Возвращает данные прямо из индекса (без обращения к heap). Требует покрывающего индекса.

```sql
-- Покрывающий индекс
CREATE INDEX idx_orders_covering
ON orders (customer_id, created_at)
INCLUDE (status, amount);

-- Index Only Scan возможен для:
SELECT status, amount FROM orders
WHERE customer_id = 42 AND created_at >= '2024-01-01';
```

### Bitmap Scan
Используется при умеренной выборке или объединении нескольких индексов.

```sql
-- PostgreSQL может объединить два индекса через Bitmap AND
SELECT * FROM orders
WHERE customer_id = 42 AND status = 'pending';
-- → BitmapAnd(Bitmap Heap Scan на idx_customer, Bitmap Heap Scan на idx_status)
```

---

## 5. Статистика и оценки планировщика

Планировщик использует статистику, собранную командой `ANALYZE`:

```sql
-- Обновить статистику таблицы
ANALYZE orders;

-- Посмотреть статистику столбца
SELECT
  attname,
  n_distinct,
  correlation,
  most_common_vals,
  most_common_freqs,
  histogram_bounds
FROM pg_stats
WHERE tablename = 'orders' AND attname = 'status';
```

### Управление точностью статистики

```sql
-- Увеличить количество собираемых значений для столбца с высокой кардинальностью
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 500;
-- По умолчанию: 100 (диапазон: 1-10000)
ANALYZE orders;
```

### Ошибки оценки — главная причина плохих планов

```sql
-- Диагностика: большое расхождение rows (plan) vs rows (actual) = проблема
-- plan rows = 10, actual rows = 100000 → планировщик ошибся в 10000 раз
```

---

## 6. Конфигурация планировщика

```sql
-- Переключить метод для диагностики
SET enable_seqscan = off;     -- принудительно использовать индексы
SET enable_hashjoin = off;    -- отключить hash join
SET enable_mergejoin = off;   -- отключить merge join

-- Настройка cost-параметров
SET random_page_cost = 1.1;   -- SSD (по умолчанию 4.0 для HDD)
SET effective_cache_size = '12GB';  -- доступная память под кэш ОС
```

---

## Практическое задание

Создайте тестовую БД и исследуйте планы:

```sql
-- Создать тестовые данные
CREATE TABLE test_orders AS
SELECT
  generate_series(1, 1000000) AS id,
  (random() * 10000)::int AS customer_id,
  now() - (random() * 365 * interval '1 day') AS created_at,
  (ARRAY['pending','paid','shipped','cancelled'])[ceil(random()*4)] AS status,
  (random() * 1000)::numeric(10,2) AS amount;

-- 1. Выполните EXPLAIN ANALYZE для запроса без индекса
-- 2. Создайте индекс и сравните планы
-- 3. Найдите запрос, где планировщик ошибается в оценке rows
```

---

## Итоги урока

- Backend PostgreSQL проходит через парсер → анализатор → перезаписчик → планировщик → исполнитель.
- MVCC хранит несколько версий строк; мёртвые туплы очищает autovacuum.
- `EXPLAIN ANALYZE` — главный инструмент диагностики производительности.
- Планировщик опирается на статистику; её точность критична для правильного выбора плана.

---

*Следующий урок: Индексы в PostgreSQL — B-Tree, GIN, GiST, BRIN и стратегии индексирования.*
