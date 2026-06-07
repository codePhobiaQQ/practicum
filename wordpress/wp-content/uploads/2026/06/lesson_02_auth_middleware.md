# Урок 2: Аутентификация и авторизация — JWT, RBAC и middleware

## Введение

Аутентификация отвечает на вопрос «кто ты?», авторизация — «что тебе разрешено?». В этом уроке реализуем полный стек: JWT-аутентификацию, refresh-токены и ролевую авторизацию.

---

## 1. JWT — структура и принцип работы

```
JWT = Header.Payload.Signature

Header:  { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub": "user-id-123",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1710000000,   // issued at
  "exp": 1710003600    // expires (через 1 час)
}
Signature: HMAC_SHA256(base64(header) + "." + base64(payload), SECRET_KEY)
```

> **Важно:** JWT только подписан, но не зашифрован. Не храните секреты в payload!

### Access + Refresh токены

```
Access Token:  короткий срок (15 мин), используется в каждом запросе
Refresh Token: длинный срок (30 дней), хранится в httpOnly cookie

Схема:
1. POST /auth/login → access_token (в JSON) + refresh_token (в cookie)
2. API запрос с access_token в Authorization header
3. Access истёк → POST /auth/refresh (с refresh cookie) → новый access_token
4. POST /auth/logout → инвалидировать refresh_token в БД
```

---

## 2. Реализация JWT-аутентификации

```typescript
// src/config/jwt.ts
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'moderator']),
  iat: z.number(),
  exp: z.number(),
});

type JwtPayload = z.infer<typeof JwtPayloadSchema>;

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const jwtService = {
  signAccess(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
  },

  signRefresh(userId: string): string {
    return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: '30d' });
  },

  verifyAccess(token: string): JwtPayload {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    return JwtPayloadSchema.parse(decoded);
  },

  verifyRefresh(token: string): { sub: string } {
    return jwt.verify(token, REFRESH_SECRET) as { sub: string };
  },
};
```

---

## 3. Auth Service

```typescript
// src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

export class AuthService {
  constructor(
    private usersRepo: UsersRepository,
    private tokensRepo: RefreshTokensRepository,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.usersRepo.findByEmail(input.email);
    if (existing) throw new ApiError(409, 'Email уже используется');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.usersRepo.create({
      ...input,
      password: passwordHash,
    });

    return this.generateTokens(user);
  }

  async login(input: LoginInput) {
    const user = await this.usersRepo.findByEmail(input.email);
    if (!user) throw new ApiError(401, 'Неверный email или пароль');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new ApiError(401, 'Неверный email или пароль');

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = jwtService.verifyRefresh(refreshToken);
    } catch {
      throw new ApiError(401, 'Невалидный refresh token');
    }

    // Проверить в БД (защита от повторного использования)
    const storedToken = await this.tokensRepo.findByToken(refreshToken);
    if (!storedToken || storedToken.revoked) {
      throw new ApiError(401, 'Token отозван');
    }

    const user = await this.usersRepo.findById(payload.sub);
    if (!user) throw new ApiError(401, 'Пользователь не найден');

    // Ротация токенов: отозвать старый, выдать новый
    await this.tokensRepo.revoke(storedToken.id);
    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    await this.tokensRepo.revokeByToken(refreshToken);
  }

  private async generateTokens(user: UserRecord) {
    const accessToken = jwtService.signAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = jwtService.signRefresh(user.id);

    // Сохранить refresh token с хешем
    await this.tokensRepo.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }
}
```

---

## 4. Middleware: аутентификация

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';

// Расширяем тип Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'user' | 'admin' | 'moderator';
      };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'Токен авторизации обязателен' },
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwtService.verifyAccess(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Токен истёк' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Невалидный токен' },
    });
  }
}
```

---

## 5. RBAC — ролевая авторизация

```typescript
// src/middleware/authorize.middleware.ts
type Role = 'user' | 'admin' | 'moderator';

// Иерархия ролей
const ROLE_HIERARCHY: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
};

// Фабрика middleware для проверки роли
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Не авторизован' } });
    }

    const hasAccess = roles.some(
      role => ROLE_HIERARCHY[req.user!.role] >= ROLE_HIERARCHY[role]
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Недостаточно прав' },
      });
    }

    next();
  };
}

// Проверка "свой ресурс"
export function requireOwnerOrAdmin(getUserId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const resourceOwnerId = getUserId(req);
    const isOwner = req.user?.id === resourceOwnerId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Нет доступа к этому ресурсу' },
      });
    }
    next();
  };
}
```

---

## 6. Auth Router

```typescript
// src/modules/auth/auth.router.ts
import { Router } from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 минут
  max: 5,                      // 5 попыток
  message: { success: false, error: { message: 'Слишком много попыток входа' } },
});

export const authRouter = Router();
authRouter.use(cookieParser());

// POST /auth/register
authRouter.post('/register', validate(RegisterSchema), asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.register(req.body);
  res
    .cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 дней
    })
    .status(201)
    .json({ success: true, data: { accessToken } });
}));

// POST /auth/login
authRouter.post('/login', loginLimiter, validate(LoginSchema), asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.login(req.body);
  res
    .cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' })
    .json({ success: true, data: { accessToken } });
}));

// POST /auth/refresh
authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) throw new ApiError(401, 'Refresh token отсутствует');
  const { accessToken, refreshToken: newRefresh } = await authService.refresh(refreshToken);
  res
    .cookie('refresh_token', newRefresh, { httpOnly: true, secure: true, sameSite: 'strict' })
    .json({ success: true, data: { accessToken } });
}));

// POST /auth/logout
authRouter.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  await authService.logout(refreshToken);
  res.clearCookie('refresh_token').json({ success: true });
}));
```

---

## 7. Применение в маршрутах

```typescript
// src/modules/users/users.router.ts
import { Router } from 'express';

export const usersRouter = Router();

// Публичные маршруты
usersRouter.get('/', validate(GetUsersSchema), controller.getUsers);

// Только авторизованные
usersRouter.get('/me', authenticate, controller.getMe);

// Только Admin
usersRouter.delete('/:id', authenticate, requireRole('admin'), controller.deleteUser);

// Владелец или Admin
usersRouter.patch('/:id',
  authenticate,
  requireOwnerOrAdmin(req => req.params.id),
  validate(UpdateUserSchema),
  controller.updateUser,
);
```

---

## Практическое задание

1. Реализуйте полный флоу: регистрация → логин → обновление токена → логаут.
2. Добавьте в БД таблицу `refresh_tokens` с полями: `id, user_id, token, expires_at, revoked, revoked_at`.
3. Реализуйте эндпоинт `POST /auth/logout-all` — отзывает все refresh токены пользователя.
4. Добавьте rate limiting на `/auth/login` (5 попыток за 15 минут) и напишите тест, который проверяет 429 на 6-й попытке.

---

## Итоги урока

- JWT: access (15 мин) + refresh (30 дней) в httpOnly cookie — оптимальный паттерн.
- Ротация refresh токенов при каждом обновлении защищает от компрометации.
- RBAC с иерархией ролей выразителен и легко расширяется.
- Rate limiting на auth-эндпоинтах — обязательная защита от брутфорса.

---

*Следующий урок: Тестирование API — unit-тесты, интеграционные тесты и документация с OpenAPI.*
