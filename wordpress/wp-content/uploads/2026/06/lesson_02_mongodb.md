# Урок 2: MongoDB — документная модель, агрегации и индексирование

## Введение

MongoDB — документная СУБД, хранящая данные в формате BSON (Binary JSON). Гибкая схема и мощный агрегационный pipeline делают MongoDB популярным выбором для приложений с непредсказуемой структурой данных.

---

## 1. Модель данных и проектирование схемы

### Embedding vs Referencing

**Embedding (встраивание)** — храним связанные данные в одном документе:

```javascript
// Заказ с встроенными позициями
{
  _id: ObjectId("..."),
  order_number: "ORD-001",
  customer: {
    name: "Иван Иванов",
    email: "ivan@example.com"
  },
  items: [
    { product_id: ObjectId("..."), name: "Ноутбук", qty: 1, price: 75000 },
    { product_id: ObjectId("..."), name: "Мышь", qty: 2, price: 1500 }
  ],
  total: 78000,
  created_at: ISODate("2024-03-15T10:30:00Z")
}
```

**Referencing (ссылки)** — нормализованная модель:

```javascript
// Коллекция orders — только ссылки
{ _id: ObjectId("..."), customer_id: ObjectId("..."), item_ids: [ObjectId("..."), ...] }

// Коллекция customers — отдельно
{ _id: ObjectId("..."), name: "Иван Иванов", email: "ivan@example.com" }
```

### Когда что использовать

| Критерий | Embedding | Referencing |
|---|---|---|
| Связь | One-to-few | One-to-many/many-to-many |
| Доступ | Всегда вместе | Независимо |
| Размер | < 16 MB | Без ограничений |
| Обновление | Редко | Часто |

---

## 2. CRUD операции

```javascript
// Вставка
db.orders.insertOne({ customer_id: ObjectId("..."), status: "pending", amount: 5000 });
db.orders.insertMany([{...}, {...}, {...}]);

// Чтение
db.orders.find({ status: "pending", amount: { $gte: 1000 } })
         .sort({ created_at: -1 })
         .limit(20)
         .projection({ customer_id: 1, amount: 1, status: 1 });

// Обновление
db.orders.updateOne(
  { _id: ObjectId("...") },
  {
    $set: { status: "paid" },
    $currentDate: { updated_at: true },
    $inc: { version: 1 }
  }
);

// Атомарное найти-и-обновить
db.orders.findOneAndUpdate(
  { status: "pending", locked_at: { $exists: false } },
  { $set: { locked_at: new Date(), worker: "worker-1" } },
  { returnDocument: "after", sort: { created_at: 1 } }
);

// Удаление
db.orders.deleteMany({ status: "cancelled", created_at: { $lt: ISODate("2023-01-01") } });
```

---

## 3. Агрегационный Pipeline

Pipeline — последовательность стадий обработки документов:

```javascript
db.orders.aggregate([
  // Стадия 1: фильтрация (аналог WHERE)
  { $match: {
    status: { $in: ["paid", "shipped"] },
    created_at: { $gte: ISODate("2024-01-01") }
  }},

  // Стадия 2: JOIN с коллекцией customers
  { $lookup: {
    from: "customers",
    localField: "customer_id",
    foreignField: "_id",
    as: "customer"
  }},
  { $unwind: "$customer" },

  // Стадия 3: вычисляемые поля
  { $addFields: {
    month: { $month: "$created_at" },
    vip: { $gte: ["$amount", 10000] }
  }},

  // Стадия 4: группировка (аналог GROUP BY)
  { $group: {
    _id: { month: "$month", customer_city: "$customer.city" },
    total_revenue: { $sum: "$amount" },
    order_count: { $sum: 1 },
    avg_check: { $avg: "$amount" },
    customers: { $addToSet: "$customer_id" }
  }},

  // Стадия 5: фильтрация после группировки (аналог HAVING)
  { $match: { total_revenue: { $gte: 50000 } } },

  // Стадия 6: сортировка
  { $sort: { total_revenue: -1 } },

  // Стадия 7: форматирование вывода
  { $project: {
    _id: 0,
    month: "$_id.month",
    city: "$_id.customer_city",
    revenue: "$total_revenue",
    orders: "$order_count",
    avg_check: { $round: ["$avg_check", 2] },
    unique_customers: { $size: "$customers" }
  }}
]);
```

### Оконные функции ($setWindowFields, MongoDB 5.0+)

```javascript
db.sales.aggregate([
  { $setWindowFields: {
    partitionBy: "$category",
    sortBy: { date: 1 },
    output: {
      running_total: {
        $sum: "$amount",
        window: { documents: ["unbounded", "current"] }
      },
      rank_in_category: { $rank: {} }
    }
  }}
]);
```

---

## 4. Индексирование в MongoDB

```javascript
// Простой индекс
db.orders.createIndex({ customer_id: 1 });

// Составной индекс
db.orders.createIndex({ customer_id: 1, status: 1, created_at: -1 });

// Уникальный индекс
db.customers.createIndex({ email: 1 }, { unique: true });

// Частичный индекс
db.orders.createIndex(
  { created_at: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "processing"] } } }
);

// TTL индекс — автоудаление через N секунд
db.sessions.createIndex({ created_at: 1 }, { expireAfterSeconds: 3600 });

// Текстовый индекс
db.articles.createIndex({ title: "text", body: "text" },
                        { weights: { title: 10, body: 1 },
                          default_language: "russian" });

// Поиск по текстовому индексу
db.articles.find({ $text: { $search: "elasticsearch оптимизация" } },
                 { score: { $meta: "textScore" } })
           .sort({ score: { $meta: "textScore" } });
```

---

## 5. Explain и диагностика

```javascript
// Анализ плана выполнения
db.orders.find({ status: "pending" }).explain("executionStats");

// Ключевые поля в выводе:
// executionStats.nReturned        — возвращено документов
// executionStats.totalDocsExamined — проверено документов
// executionStats.totalKeysExamined — проверено ключей индекса
// executionStats.executionTimeMillis — время выполнения

// Хороший план:
// nReturned ≈ totalDocsExamined (индекс используется эффективно)

// Плохой план (Collection Scan):
// nReturned = 100, totalDocsExamined = 1000000 ← нет индекса!
```

---

## 6. Транзакции (MongoDB 4.0+)

```javascript
const session = db.getMongo().startSession();
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});

try {
  const orders = session.getDatabase("shop").orders;
  const inventory = session.getDatabase("shop").inventory;

  // Создать заказ
  orders.insertOne({ product_id: ObjectId("..."), qty: 5 }, { session });

  // Уменьшить остаток на складе
  const result = inventory.updateOne(
    { _id: ObjectId("..."), stock: { $gte: 5 } },
    { $inc: { stock: -5 } },
    { session }
  );

  if (result.modifiedCount === 0) {
    throw new Error("Недостаточно товара на складе");
  }

  session.commitTransaction();
} catch (error) {
  session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## Практическое задание

1. Спроектируйте схему для интернет-магазина: коллекции `products`, `customers`, `orders`. Обоснуйте выбор embedding vs referencing.
2. Напишите агрегационный pipeline, который для каждого месяца показывает: выручку, количество заказов, топ-3 продукта по продажам.
3. Создайте необходимые индексы и проверьте через `explain`, что они используются.

---

## Итоги урока

- Правильная схема в MongoDB — баланс между embedding (скорость чтения) и referencing (гибкость обновлений).
- Агрегационный pipeline заменяет SQL GROUP BY, JOIN, HAVING и оконные функции.
- Индексы MongoDB аналогичны PostgreSQL: составные, частичные, TTL, текстовые.
- Транзакции с 4.0 обеспечивают ACID на уровне нескольких документов и коллекций.

---

*Следующий урок: Highload-архитектура — репликация и шардирование в MongoDB и PostgreSQL.*
