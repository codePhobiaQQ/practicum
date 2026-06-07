# Урок 1: Проектирование REST API — принципы и структура

## Введение

REST (Representational State Transfer) — архитектурный стиль для построения API. Грамотно спроектированный REST API интуитивен, предсказуем и легко поддерживается.

---

## 1. Принципы REST

### Ресурсы и URL

URL должны обозначать **существительные** (ресурсы), а не глаголы:

```
✗ Плохо (RPC-стиль):
GET  /getUsers
POST /createUser
POST /deleteUser?id=5
GET  /getUserOrders?userId=5

✓ Хорошо (REST):
GET    /users           — список пользователей
POST   /users           — создать пользователя
GET    /users/:id       — получить пользователя
PUT    /users/:id       — заменить пользователя (полностью)
PATCH  /users/:id       — обновить пользователя (частично)
DELETE /users/:id       — удалить пользователя
GET    /users/:id/orders — заказы конкретного пользователя
```

### Правила именования

```
✓ Множественное число для коллекций: /users, /products, /orders
✓ Вложенность максимум 2 уровня: /users/:id/orders (не /users/:id/orders/:orderId/items/:itemId)
✓ Для глубокой вложенности — отдельный ресурс: /order-items/:id
✓ Kebab-case для составных слов: /product-categories, /order-items
✗ Нет: /getProductCategories, /product_categories
```

### HTTP методы и коды ответов

```
GET    — получить ресурс              → 200 OK
POST   — создать ресурс              → 201 Created
PUT    — заменить ресурс             → 200 OK
PATCH  — частично обновить           → 200 OK
DELETE — удалить ресурс              → 204 No Content

400 Bad Request     — ошибка валидации, неверный запрос
401 Unauthorized    — нет аутентификации
403 Forbidden       — нет доступа (авторизация)
404 Not Found       — ресурс не найден
409 Conflict        — конфликт (дублирующий email)
422 Unprocessable   — семантическая ошибка валидации
429 Too Many Requests — rate limit
500 Internal Server Error — ошибка сервера
```

---

## 2. Структура проекта

```
src/
├── app.ts                 — Express приложение (без listen)
├── server.ts              — точка входа (listen, graceful shutdown)
├── config/
│   ├── index.ts           — конфигурация из env
│   └── database.ts        — подключение к БД
├── modules/
│   ├── users/
│   │   ├── users.router.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── users.schema.ts    — Zod схемы
│   │   └── users.types.ts
│   └── orders/
│       └── ...
├── middleware/
│   ├── auth.middleware.ts
│   ├── validate.middleware.ts
│   ├── errorHandler.middleware.ts
│   └── rateLimiter.middleware.ts
└── utils/
    ├── ApiError.ts
    └── asyncHandler.ts
```

---

## 3. Базовая настройка Express с TypeScript

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { usersRouter } from './modules/users/users.router';
import { ordersRouter } from './modules/orders/orders.router';
import { errorHandler } from './middleware/errorHandler.middleware';
import { notFound } from './middleware/notFound.middleware';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));

  // Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  // Routes
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/orders', ordersRouter);

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

  // 404
  app.use(notFound);

  // Error handler (должен быть последним)
  app.use(errorHandler);

  return app;
}
```

```typescript
// src/server.ts
import { createApp } from './app';
import { db } from './config/database';

async function bootstrap() {
  await db.connect();
  console.log('✅ База данных подключена');

  const app = createApp();
  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} получен, завершаю работу...`);
    server.close(async () => {
      await db.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(console.error);
```

---

## 4. Валидация с Zod

```typescript
// src/modules/users/users.schema.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    email: z.string().email().toLowerCase(),
    password: z.string()
      .min(8)
      .regex(/[A-Z]/, 'Минимум одна заглавная буква')
      .regex(/[0-9]/, 'Минимум одна цифра'),
    role: z.enum(['user', 'admin']).default('user'),
    birthDate: z.string().datetime().optional(),
  }),
});

export const GetUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role: z.enum(['user', 'admin']).optional(),
    sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>['body'];
export type GetUsersQuery = z.infer<typeof GetUsersSchema>['query'];
```

```typescript
// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.slice(1).join('.'),  // убираем первый сегмент ('body'/'query')
        message: e.message,
      }));
      return res.status(400).json({ success: false, errors });
    }

    // Кладём валидированные данные обратно
    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query as any;
    if (result.data.params) req.params = result.data.params as any;

    next();
  };
}
```

---

## 5. Слои: Controller → Service → Repository

```typescript
// Controller — HTTP-слой (req/res)
export class UsersController {
  constructor(private usersService: UsersService) {}

  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as GetUsersQuery;
    const result = await this.usersService.findMany(query);
    res.json({ success: true, data: result });
  });

  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.usersService.findById(req.params.id);
    res.json({ success: true, data: user });
  });

  createUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.usersService.create(req.body as CreateUserInput);
    res.status(201).json({ success: true, data: user });
  });
}

// Service — бизнес-логика
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async findMany(query: GetUsersQuery) {
    const { page, limit, search, sortBy, sortOrder, role } = query;
    const offset = (page - 1) * limit;

    const [users, total] = await this.usersRepo.findManyWithCount({
      offset, limit, search, sortBy, sortOrder, role,
    });

    return {
      items: users.map(this.toPublicUser),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new ApiError(404, 'Пользователь не найден');
    return this.toPublicUser(user);
  }

  // Убрать чувствительные поля
  private toPublicUser(user: UserRecord) {
    const { password, ...publicUser } = user;
    return publicUser;
  }
}
```

---

## 6. Единый формат ответов

```typescript
// Успешный ответ
{
  "success": true,
  "data": { ... },
  "meta": {           // для пагинации
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Ошибка
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Пользователь не найден",
    "details": []     // ошибки валидации
  }
}
```

---

## Практическое задание

Реализуйте CRUD API для ресурса `products`:
- `GET /api/v1/products` — список с пагинацией, фильтром по категории, сортировкой по цене.
- `GET /api/v1/products/:id`
- `POST /api/v1/products` — с валидацией через Zod.
- `PATCH /api/v1/products/:id`
- `DELETE /api/v1/products/:id`

Используйте трёхслойную архитектуру (Controller → Service → Repository).

---

## Итоги урока

- URL — существительные, HTTP-методы — глаголы. Ресурс — центральная концепция REST.
- Трёхслойная архитектура: Controller (HTTP), Service (бизнес-логика), Repository (данные).
- Zod — мощная валидация с автоматической типизацией TypeScript.
- Единый формат ответов упрощает работу фронтенда и отладку.

---

*Следующий урок: Аутентификация, авторизация и middleware в Express.*
