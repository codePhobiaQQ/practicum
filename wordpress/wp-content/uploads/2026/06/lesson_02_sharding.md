# Урок 2: Шардирование — горизонтальное масштабирование данных

## Введение

Когда один сервер (даже с репликацией) не справляется с объёмом данных или нагрузкой на запись, применяют **шардирование** — разбиение данных на независимые разделы (шарды), хранящиеся на разных серверах.

---

## 1. Стратегии шардирования

### Hash Sharding (по хешу)

```python
def get_shard(key: str, num_shards: int) -> int:
    import hashlib
    hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return hash_val % num_shards

# user_id → shard
shard_id = get_shard(str(user_id), 4)
# Равномерное распределение, но нельзя делать range-запросы
```

**Плюсы:** равномерное распределение данных.
**Минусы:** range-запросы требуют scatter-gather (запрос ко всем шардам).

### Range Sharding (по диапазону)

```
Shard 0: user_id   1    — 1 000 000
Shard 1: user_id   1 000 001 — 2 000 000
Shard 2: user_id   2 000 001 — 3 000 000

Для временных данных:
Shard Jan-2024: created_at [2024-01-01, 2024-02-01)
Shard Feb-2024: created_at [2024-02-01, 2024-03-01)
```

**Плюсы:** эффективные range-запросы, архивирование целых шардов.
**Минусы:** hotspot при монотонно растущих ключах (все новые записи в один шард).

### Directory Sharding (по каталогу)

```python
# Таблица маршрутизации хранится в Redis или отдельной БД
SHARD_MAP = {
    "customer_A": "shard-0",
    "customer_B": "shard-1",
    "customer_C": "shard-0",  # мультитенантность
}

def route(tenant_id: str) -> str:
    return SHARD_MAP.get(tenant_id, "shard-default")
```

**Плюсы:** гибкое переназначение шардов, поддержка мультитенантности.
**Минусы:** таблица маршрутизации — единая точка отказа.

---

## 2. Consistent Hashing

Проблема наивного hash sharding: при добавлении шарда `N+1` меняется хеш **всех** ключей, нужно перебалансировать все данные.

```
Consistent Hashing:
  Ключи и узлы размещаются на кольце хешей [0, 2^32)
  Ключ → ближайший узел по часовой стрелке

  Добавление узла: перераспределяется только 1/N данных
  Удаление узла: данные переходят к следующему узлу на кольце

  Виртуальные узлы (vnodes): каждый физический узел занимает
  150-200 позиций на кольце для равномерности
```

```python
import bisect
import hashlib

class ConsistentHashRing:
    def __init__(self, nodes: list[str], replicas: int = 150):
        self.replicas = replicas
        self.ring: dict[int, str] = {}
        self.sorted_keys: list[int] = []

        for node in nodes:
            self.add_node(node)

    def _hash(self, key: str) -> int:
        return int(hashlib.sha256(key.encode()).hexdigest(), 16)

    def add_node(self, node: str):
        for i in range(self.replicas):
            vnode_key = self._hash(f"{node}-{i}")
            self.ring[vnode_key] = node
            bisect.insort(self.sorted_keys, vnode_key)

    def remove_node(self, node: str):
        for i in range(self.replicas):
            vnode_key = self._hash(f"{node}-{i}")
            del self.ring[vnode_key]
            self.sorted_keys.remove(vnode_key)

    def get_node(self, key: str) -> str:
        if not self.ring:
            raise Exception("Нет доступных узлов")
        h = self._hash(key)
        idx = bisect.bisect(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]

# Использование
ring = ConsistentHashRing(["shard-0", "shard-1", "shard-2"])
print(ring.get_node("user:12345"))  # → "shard-1"
print(ring.get_node("user:67890"))  # → "shard-0"
```

---

## 3. Шардирование в PostgreSQL через Citus

```sql
-- Установка расширения Citus
CREATE EXTENSION citus;

-- Добавить рабочие узлы
SELECT citus_add_node('worker-1', 5432);
SELECT citus_add_node('worker-2', 5432);
SELECT citus_add_node('worker-3', 5432);

-- Создать шардированную таблицу
CREATE TABLE orders (
  id BIGSERIAL,
  customer_id BIGINT NOT NULL,
  amount NUMERIC(12, 2),
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Шардировать по customer_id (hash sharding, 32 шарда)
SELECT create_distributed_table('orders', 'customer_id', shard_count => 32);

-- Справочная таблица — реплицируется на все узлы
CREATE TABLE statuses (code TEXT PRIMARY KEY, description TEXT);
SELECT create_reference_table('statuses');

-- Запрос выполняется только на нужном шарде (если есть фильтр по sharding key)
SELECT * FROM orders WHERE customer_id = 42;
-- → Citus отправляет запрос только на shard с customer_id = 42

-- Запрос без sharding key → scatter-gather на все шарды
SELECT COUNT(*) FROM orders WHERE status = 'pending';
```

---

## 4. Проблемы шардирования

### Cross-Shard Joins

```sql
-- Проблема: orders и customers на разных шардах
SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id  -- разные шарды!
WHERE o.status = 'pending';

-- Решение 1: co-locate таблицы по одному sharding key
SELECT create_distributed_table('customers', 'id');
SELECT create_distributed_table('orders', 'customer_id',
  colocate_with => 'customers');  -- customer.id = orders.customer_id → один шард

-- Решение 2: broadcast join (для маленьких таблиц)
SELECT create_reference_table('statuses');  -- реплика на всех узлах
```

### Distributed Transactions

```python
# Проблема: транзакция затрагивает несколько шардов
# Citus использует 2PC (Two-Phase Commit)

# Шаг 1 (Prepare): координатор спрашивает все шарды о готовности
# Шаг 2 (Commit): если все ответили OK — commit; иначе rollback

# Это медленно! Проектируйте, чтобы транзакции оставались в одном шарде.
```

### Hotspot и Rebalancing

```sql
-- Мониторинг распределения данных
SELECT
  shardid,
  nodename,
  nodeport,
  pg_size_pretty(sum(shard_size)) AS total_size
FROM citus_shards
GROUP BY shardid, nodename, nodeport
ORDER BY sum(shard_size) DESC;

-- Ребалансировка при добавлении нового узла
SELECT citus_rebalance_start();
SELECT * FROM citus_rebalance_status();
```

---

## 5. Паттерн: Multi-tenant архитектура

```sql
-- Все таблицы шардируются по tenant_id
CREATE TABLE tenant_orders (
  tenant_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  ...
  PRIMARY KEY (tenant_id, order_id)
);

SELECT create_distributed_table('tenant_orders', 'tenant_id');

-- Изоляция тенантов: запросы автоматически попадают на нужный шард
SET search_path TO tenant_schema;
SELECT citus_set_node_property('worker-1', 'shouldhaveshards', false);  -- вывод узла из ротации
```

---

## Практическое задание

1. Разверните Citus кластер через Docker: 1 координатор + 3 worker.

```yaml
version: '3.8'
services:
  coordinator:
    image: citusdata/citus:12.1
    ports: ["5432:5432"]
    environment: {POSTGRES_PASSWORD: secret}

  worker1:
    image: citusdata/citus:12.1
    environment: {POSTGRES_PASSWORD: secret}

  worker2:
    image: citusdata/citus:12.1
    environment: {POSTGRES_PASSWORD: secret}
```

2. Создайте таблицы `orders` (распределённая по `customer_id`) и `customers` (collocated).
3. Загрузите 5 млн заказов и проверьте:
   - Распределение по шардам (должно быть равномерным).
   - Время запроса с фильтром по sharding key vs без него.
4. Добавьте четвёртый worker и запустите rebalancing.

---

## Итоги урока

- Hash sharding даёт равномерность, range sharding — эффективные диапазонные запросы.
- Consistent hashing минимизирует перераспределение данных при изменении числа шардов.
- Citus расширяет PostgreSQL до распределённой СУБД с colocation и 2PC транзакциями.
- Основные боли шардирования: cross-shard joins, distributed transactions, hotspot.

---

*Следующий урок: Connection Pooling, кеширование и оптимизация Highload-систем.*
