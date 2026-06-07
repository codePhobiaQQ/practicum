# Урок 2: Индексы в PostgreSQL — типы, стратегии, обслуживание

## Введение

Правильное индексирование — наиболее эффективный способ ускорить запросы. PostgreSQL поддерживает несколько типов индексов, каждый оптимизирован для своего класса задач.

---

## 1. B-Tree индекс (по умолчанию)

Подходит для: `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN`, `LIKE 'prefix%'`.

```sql
-- Простой индекс
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- Составной индекс (порядок столбцов важен!)
CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at DESC);

-- Частичный индекс (только нужные строки)
CREATE INDEX idx_orders_pending ON orders (created_at)
WHERE status = 'pending';

-- Индекс на выражение
CREATE INDEX idx_orders_lower_email ON customers (lower(email));
-- Используется при: WHERE lower(email) = 'user@example.com'
```

### Правило ведущего столбца (Leading Column Rule)

```sql
CREATE INDEX idx_composite ON orders (customer_id, status, created_at);

-- Используется: ✓
WHERE customer_id = 1
WHERE customer_id = 1 AND status = 'paid'
WHERE customer_id = 1 AND status = 'paid' AND created_at > '2024-01-01'

-- НЕ используется: ✗
WHERE status = 'paid'
WHERE created_at > '2024-01-01'
```

---

## 2. GIN (Generalized Inverted Index)

Подходит для: массивы, JSONB, полнотекстовый поиск, `pg_trgm`.

```sql
-- Индекс на JSONB
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- Запрос
SELECT * FROM products WHERE attributes @> '{"color": "red", "size": "M"}';

-- Полнотекстовый поиск
CREATE INDEX idx_articles_fts ON articles
USING GIN (to_tsvector('russian', title || ' ' || body));

SELECT * FROM articles
WHERE to_tsvector('russian', title || ' ' || body) @@ to_tsquery('russian', 'PostgreSQL & оптимизация');

-- Поиск по подстроке (pg_trgm)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

SELECT * FROM customers WHERE name ILIKE '%иванов%';
```

---

## 3. GiST (Generalized Search Tree)

Подходит для: геометрия, диапазоны, IP-адреса (`inet`), PostGIS.

```sql
-- Диапазонные типы
CREATE INDEX idx_bookings_period ON bookings USING GiST (during);

-- Проверка перекрытия диапазонов
SELECT * FROM bookings
WHERE during && '[2024-06-01, 2024-06-15)'::daterange;

-- Для PostGIS (геопространственные запросы)
CREATE INDEX idx_locations_geom ON locations USING GiST (geom);
SELECT * FROM locations
WHERE ST_DWithin(geom, ST_MakePoint(37.6, 55.7)::geography, 1000);
```

---

## 4. BRIN (Block Range Index)

Подходит для: очень большие таблицы с **физически упорядоченными** данными (timestamp, serial id).

```sql
-- BRIN индекс занимает минимум места
CREATE INDEX idx_logs_timestamp ON logs USING BRIN (created_at)
WITH (pages_per_range = 128);

-- Эффективен только если данные физически отсортированы по created_at
-- (что типично для append-only таблиц логов)
```

### Сравнение типов индексов

| Тип | Размер | Случаи использования | Обновление |
|---|---|---|---|
| B-Tree | Средний | Скалярные сравнения | Быстрое |
| GIN | Большой | Массивы, JSONB, FTS | Медленное |
| GiST | Средний | Гео, диапазоны | Среднее |
| BRIN | Крошечный | Монотонные большие таблицы | Очень быстрое |
| Hash | Маленький | Только `=` | Быстрое |

---

## 5. Диагностика использования индексов

```sql
-- Статистика использования индексов
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,         -- количество сканирований через индекс
  idx_tup_read,     -- строк прочитано из индекса
  idx_tup_fetch,    -- строк получено из heap
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- Неиспользуемые индексы (кандидаты на удаление)
SELECT indexrelid::regclass AS index_name,
       relid::regclass AS table_name,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND NOT indisprimary
  AND NOT indisunique;

-- Дублирующие индексы
SELECT
  indrelid::regclass AS table_name,
  array_agg(indexrelid::regclass) AS indexes,
  array_agg(indkey) AS columns
FROM pg_index
GROUP BY indrelid, indkey
HAVING count(*) > 1;
```

---

## 6. Обслуживание индексов

### Bloat (раздутость)

```sql
-- Оценить раздутость индексов
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS current_size,
  round(100 * bloat_ratio) || '%' AS bloat
FROM (
  SELECT
    schemaname AS tablename,
    indexname,
    indexrelid,
    -- упрощённая оценка bloat через pg_stat_user_indexes
    1.0 - (idx_tup_read::float / NULLIF(idx_scan * relpages, 0)) AS bloat_ratio
  FROM pg_stat_user_indexes
  JOIN pg_class ON oid = indexrelid
) sub
WHERE bloat_ratio > 0.3;

-- Перестроить раздутый индекс (без блокировки таблицы)
REINDEX INDEX CONCURRENTLY idx_orders_customer;
```

### VACUUM и индексы

```sql
-- Настройка autovacuum для активной таблицы
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.01,  -- вакуум при 1% dead tuples (по умолчанию 20%)
  autovacuum_analyze_scale_factor = 0.005
);

-- Мониторинг работы autovacuum
SELECT
  relname,
  n_dead_tup,
  n_live_tup,
  round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

---

## 7. Практика: диагностика и исправление медленного запроса

```sql
-- Медленный запрос
EXPLAIN ANALYZE
SELECT u.email, COUNT(o.id) AS order_count, SUM(o.amount) AS total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= NOW() - INTERVAL '30 days'
  AND o.status = 'completed'
GROUP BY u.id, u.email
ORDER BY total DESC
LIMIT 10;

-- Шаг 1: Проверить, какие индексы используются
-- Шаг 2: Создать составной индекс
CREATE INDEX idx_orders_user_status ON orders (user_id, status)
INCLUDE (amount);  -- включить amount для Index Only Scan

-- Шаг 3: Индекс на users.created_at
CREATE INDEX idx_users_created ON users (created_at)
WHERE created_at >= '2024-01-01';  -- частичный для свежих записей

-- Шаг 4: Повторить EXPLAIN ANALYZE и сравнить
```

---

## Практическое задание

1. Создайте таблицу `products` с полями `id, name, price, category, tags (text[]), attributes (jsonb)`.
2. Добавьте 500 000 строк тестовых данных.
3. Создайте оптимальные индексы для следующих запросов:
   - `WHERE category = 'electronics' AND price BETWEEN 100 AND 500`
   - `WHERE tags @> ARRAY['sale', 'new']`
   - `WHERE attributes @> '{"brand": "Apple"}'`
   - `WHERE name ILIKE '%ноутбук%'`
4. Сравните планы до и после создания индексов.

---

## Итоги урока

- B-Tree — универсальный индекс для скалярных сравнений; правило ведущего столбца критично для составных индексов.
- GIN незаменим для массивов, JSONB и полнотекстового поиска.
- BRIN — минимальный overhead для монотонных append-only таблиц.
- Регулярно проверяйте неиспользуемые, дублирующие и раздутые индексы.

---

*Следующий урок: WAL, репликация и PITR — обеспечение надёжности данных.*
