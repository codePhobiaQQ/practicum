# Урок 1: Репликация и отказоустойчивость баз данных

## Введение

Репликация — механизм создания копий данных на нескольких серверах. Она решает две задачи: **отказоустойчивость** (failover при падении мастера) и **масштабирование чтения** (read replicas).

---

## 1. Типы репликации

### По синхронности

| Тип | Описание | Гарантии | Применение |
|---|---|---|---|
| **Синхронная** | Мастер ждёт подтверждения от реплики | Нет потери данных | Финансы, критические данные |
| **Асинхронная** | Мастер не ждёт реплику | Возможна потеря данных (lag) | Высокая производительность |
| **Полусинхронная** | Ждёт хотя бы одну реплику | Компромисс | MySQL semi-sync |

### По архитектуре

- **Primary-Replica (Master-Slave)** — один мастер для записи, реплики для чтения.
- **Multi-Master** — несколько мастеров; сложное разрешение конфликтов.
- **Leaderless** — нет выделенного мастера (Cassandra, DynamoDB).

---

## 2. Репликация в PostgreSQL

### Физическая потоковая репликация (Streaming Replication)

```bash
# На мастере: postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB   # хранить WAL на случай lag реплики

# Создать пользователя для репликации
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secret';

# pg_hba.conf мастера
host replication replicator replica-host md5
```

```bash
# На реплике: базовый бэкап с мастера
pg_basebackup -h master-host -U replicator -D /var/lib/postgresql/data \
              --wal-method=stream --write-recovery-conf --progress

# postgresql.conf реплики
hot_standby = on           # разрешить чтение с реплики
primary_conninfo = 'host=master-host port=5432 user=replicator password=secret'
```

### Мониторинг репликации

```sql
-- На мастере: состояние реплик
SELECT
  application_name,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  write_lag,
  flush_lag,
  replay_lag,
  sync_state
FROM pg_stat_replication;

-- Лаг в байтах
SELECT
  application_name,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- На реплике: статус
SELECT
  status,
  received_lsn,
  last_msg_send_time,
  last_msg_receipt_time,
  latency_ms
FROM pg_stat_wal_receiver;
```

### Синхронная репликация

```sql
-- postgresql.conf мастера
synchronous_standby_names = 'FIRST 1 (replica1, replica2)'
-- FIRST N — ждать N реплик из списка
-- ANY N   — ждать любые N реплик

-- Проверка durability записи с конкретным уровнем
SET synchronous_commit = 'remote_apply';  -- ждать применения на реплике
-- on (default) | remote_write | remote_apply | local | off
```

---

## 3. Автоматический Failover: Patroni

Patroni — решение для high-availability PostgreSQL с автоматическим выбором нового мастера.

```yaml
# patroni.yml
scope: my-cluster
namespace: /db/
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: node1:8008

etcd3:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1 MB — максимальный lag для промоции

  postgresql:
    parameters:
      wal_level: replica
      hot_standby: "on"
      max_wal_senders: 10
      max_replication_slots: 10
      synchronous_commit: "on"

postgresql:
  listen: 0.0.0.0:5432
  connect_address: node1:5432
  data_dir: /var/lib/postgresql/data

  authentication:
    replication:
      username: replicator
      password: secret
    superuser:
      username: postgres
      password: admin_secret
```

### Жизненный цикл failover

```
Нормальная работа:
  Master (node1) ──WAL──► Replica (node2)
                   ──WAL──► Replica (node3)
  etcd: leader = node1

Сбой node1:
  1. node2, node3 теряют связь с лидером
  2. Patroni на node2 и node3 замечают: TTL истёк в etcd
  3. Выбор нового лидера: node2 (меньший lag) → пишет в etcd
  4. node2 выполняет pg_ctl promote
  5. node3 переключается на node2 как новый мастер
  6. HAProxy/PgBouncer обновляют routing

Время failover: ~30 секунд (настраиваемо)
```

---

## 4. Логическая репликация

Физическая репликация копирует весь кластер. Логическая — только выбранные таблицы.

```sql
-- На мастере: создать публикацию
CREATE PUBLICATION pub_orders
FOR TABLE orders, order_items
WITH (publish = 'insert, update, delete');

-- На реплике: создать подписку
CREATE SUBSCRIPTION sub_orders
CONNECTION 'host=master-host dbname=shop user=replicator password=secret'
PUBLICATION pub_orders;

-- Мониторинг
SELECT * FROM pg_publication_tables;  -- что публикуется
SELECT * FROM pg_stat_subscription;   -- статус подписки
```

**Применения логической репликации:**
- Миграция без даунтайма (репликация на новую версию PostgreSQL).
- Репликация в другой датацентр/облако.
- Подача данных в аналитическую БД.
- Фильтрованная репликация (только часть таблиц).

---

## 5. Паттерны отказоустойчивости

### Read/Write Splitting

```python
import psycopg2
from contextlib import contextmanager

class DatabasePool:
    def __init__(self):
        self.master = psycopg2.connect(host="master", database="shop")
        self.replicas = [
            psycopg2.connect(host="replica1", database="shop"),
            psycopg2.connect(host="replica2", database="shop"),
        ]
        self._replica_idx = 0

    @contextmanager
    def write_conn(self):
        """Все записи — на мастер"""
        yield self.master

    @contextmanager
    def read_conn(self):
        """Чтение — round-robin по репликам"""
        replica = self.replicas[self._replica_idx % len(self.replicas)]
        self._replica_idx += 1
        yield replica
```

### Circuit Breaker для базы данных

```python
from enum import Enum
import time

class CircuitState(Enum):
    CLOSED = "closed"       # нормальная работа
    OPEN = "open"           # БД недоступна
    HALF_OPEN = "half_open" # проверяем, восстановилась ли

class DatabaseCircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.last_failure_time = None
        self.recovery_timeout = recovery_timeout

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker OPEN: БД недоступна")

        try:
            result = func(*args, **kwargs)
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
            raise
```

---

## Практическое задание

1. Настройте репликацию PostgreSQL (master + 2 replicas) используя Docker Compose.
2. Смоделируйте failover: остановите мастер и убедитесь, что реплика успешно промотирована.
3. Измерьте репликационный лаг при нагрузке 1000 TPS на мастере.

**Docker Compose шаблон:**

```yaml
version: '3.8'
services:
  postgres-master:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - ./master.conf:/etc/postgresql/postgresql.conf

  postgres-replica1:
    image: postgres:16
    depends_on: [postgres-master]
    environment:
      POSTGRES_PASSWORD: secret
      PGUSER: replicator
```

---

## Итоги урока

- Потоковая репликация PostgreSQL основана на передаче WAL-сегментов.
- Синхронная репликация гарантирует отсутствие потери данных ценой латентности.
- Patroni с etcd обеспечивает автоматический failover за ~30 секунд.
- Логическая репликация позволяет реплицировать отдельные таблицы между различными инсталляциями.

---

*Следующий урок: Шардирование — горизонтальное масштабирование данных.*
