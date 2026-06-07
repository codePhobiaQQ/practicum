# Урок 1: SOLID — принципы и практика

## Введение

SOLID — пять принципов объектно-ориентированного дизайна, сформулированных Робертом Мартином. Следование этим принципам делает код гибким, тестируемым и поддерживаемым.

---

## 1. Single Responsibility Principle (SRP)

**Класс должен иметь только одну причину для изменения.**

```typescript
// ✗ Нарушение: класс делает слишком много
class UserManager {
  async createUser(data: CreateUserDto) {
    // Валидация
    if (!data.email.includes('@')) throw new Error('Invalid email');

    // Сохранение в БД
    const user = await db.query('INSERT INTO users ...', data);

    // Отправка email
    await nodemailer.send({ to: data.email, subject: 'Welcome!' });

    // Логирование
    fs.appendFileSync('log.txt', `User created: ${user.id}`);

    return user;
  }
}

// ✓ Соблюдение SRP: каждый класс — одна ответственность
class UserValidator {
  validate(data: CreateUserDto): ValidationResult {
    const errors: string[] = [];
    if (!data.email.includes('@')) errors.push('Invalid email');
    if (data.password.length < 8) errors.push('Password too short');
    return { valid: errors.length === 0, errors };
  }
}

class UserRepository {
  async save(data: CreateUserDto): Promise<User> {
    return db.query('INSERT INTO users ...', data);
  }
}

class EmailService {
  async sendWelcome(email: string): Promise<void> {
    await mailer.send({ to: email, subject: 'Welcome!' });
  }
}

class Logger {
  info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  }
}

class UserService {
  constructor(
    private validator: UserValidator,
    private repository: UserRepository,
    private emailService: EmailService,
    private logger: Logger,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const { valid, errors } = this.validator.validate(data);
    if (!valid) throw new ValidationError(errors);

    const user = await this.repository.save(data);
    await this.emailService.sendWelcome(user.email);
    this.logger.info(`User created: ${user.id}`);

    return user;
  }
}
```

---

## 2. Open/Closed Principle (OCP)

**Код открыт для расширения, закрыт для изменения.**

```typescript
// ✗ Нарушение: при добавлении типа скидки нужно менять метод
class OrderService {
  calculateDiscount(order: Order, discountType: string): number {
    if (discountType === 'percentage') {
      return order.total * 0.1;
    } else if (discountType === 'fixed') {
      return 50;
    } else if (discountType === 'vip') {   // пришлось изменить класс!
      return order.total * 0.2;
    }
    return 0;
  }
}

// ✓ Соблюдение OCP: расширяем через полиморфизм
interface DiscountStrategy {
  calculate(order: Order): number;
  isApplicable(order: Order): boolean;
}

class PercentageDiscount implements DiscountStrategy {
  constructor(private percent: number) {}
  calculate(order: Order) { return order.total * (this.percent / 100); }
  isApplicable(order: Order) { return order.total > 0; }
}

class FixedDiscount implements DiscountStrategy {
  constructor(private amount: number) {}
  calculate(_order: Order) { return this.amount; }
  isApplicable(order: Order) { return order.total >= this.amount; }
}

class VipDiscount implements DiscountStrategy {
  calculate(order: Order) { return order.total * 0.2; }
  isApplicable(order: Order) { return order.customer.isVip; }
}

// Новый тип — добавляем класс, не трогаем OrderService!
class SeasonalDiscount implements DiscountStrategy {
  calculate(order: Order) { return order.total * 0.15; }
  isApplicable(_order: Order) {
    const month = new Date().getMonth();
    return month === 11 || month === 0;  // декабрь/январь
  }
}

class OrderService {
  constructor(private discounts: DiscountStrategy[]) {}

  getBestDiscount(order: Order): number {
    return Math.max(
      0,
      ...this.discounts
        .filter(d => d.isApplicable(order))
        .map(d => d.calculate(order))
    );
  }
}
```

---

## 3. Liskov Substitution Principle (LSP)

**Дочерние классы должны быть заменимы родительскими без нарушения корректности.**

```typescript
// ✗ Классический пример нарушения: Square ≠ Rectangle
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number) { this.width = w; }
  setHeight(h: number) { this.height = h; }
  getArea() { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w: number) { this.width = this.height = w; }   // нарушает LSP!
  setHeight(h: number) { this.width = this.height = h; }
}

function testRectangle(rect: Rectangle) {
  rect.setWidth(4);
  rect.setHeight(5);
  // Ожидается: 20. Для Square получим: 25 (height изменился при setWidth!)
  console.assert(rect.getArea() === 20, 'Нарушение LSP!');
}

// ✓ Решение: не наследовать, а использовать интерфейс Shape
interface Shape { getArea(): number; }

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  getArea() { return this.width * this.height; }
}

class Square implements Shape {
  constructor(private side: number) {}
  getArea() { return this.side ** 2; }
}
```

---

## 4. Interface Segregation Principle (ISP)

**Клиенты не должны зависеть от интерфейсов, которые не используют.**

```typescript
// ✗ Нарушение: "толстый" интерфейс
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  attendMeeting(): void;
}

// Робот вынужден реализовать eat() и sleep() — бессмысленно!
class Robot implements Worker {
  work() { /* ... */ }
  eat() { throw new Error('Роботы не едят!'); }
  sleep() { throw new Error('Роботы не спят!'); }
  attendMeeting() { /* ... */ }
}

// ✓ Соблюдение ISP: разделяем интерфейсы
interface Workable { work(): void; }
interface Eatable { eat(): void; }
interface Sleepable { sleep(): void; }
interface MeetingAttendee { attendMeeting(): void; }

class HumanWorker implements Workable, Eatable, Sleepable, MeetingAttendee {
  work() { /* ... */ }
  eat() { /* ... */ }
  sleep() { /* ... */ }
  attendMeeting() { /* ... */ }
}

class RobotWorker implements Workable, MeetingAttendee {
  work() { /* ... */ }
  attendMeeting() { /* ... */ }
}
```

---

## 5. Dependency Inversion Principle (DIP)

**Модули верхнего уровня не должны зависеть от модулей нижнего. Оба должны зависеть от абстракций.**

```typescript
// ✗ Нарушение: жёсткая зависимость от конкретного класса
class OrderService {
  private repo = new PostgresOrderRepository();   // прибито гвоздями!
  private mailer = new SendGridMailer();

  async create(data: CreateOrderDto) {
    const order = await this.repo.save(data);
    await this.mailer.send('order-confirmation', order);
    return order;
  }
}

// ✓ Соблюдение DIP: зависим от абстракций (интерфейсов)
interface OrderRepository {
  save(data: CreateOrderDto): Promise<Order>;
  findById(id: string): Promise<Order | null>;
}

interface Mailer {
  send(template: string, data: unknown): Promise<void>;
}

class OrderService {
  // Зависим от ИНТЕРФЕЙСОВ, не от реализаций
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly mailer: Mailer,
  ) {}

  async create(data: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepo.save(data);
    await this.mailer.send('order-confirmation', order);
    return order;
  }
}

// Реализации можно менять без изменения OrderService
class PostgresOrderRepository implements OrderRepository { /* ... */ }
class MongoOrderRepository implements OrderRepository { /* ... */ }
class SendGridMailer implements Mailer { /* ... */ }
class MockMailer implements Mailer {   // для тестов!
  sent: Array<{template: string; data: unknown}> = [];
  async send(template: string, data: unknown) { this.sent.push({template, data}); }
}

// Сборка в точке входа (IoC Container или вручную)
const orderService = new OrderService(
  new PostgresOrderRepository(db),
  new SendGridMailer(apiKey),
);

// В тестах
const mockMailer = new MockMailer();
const orderService = new OrderService(new PostgresOrderRepository(testDb), mockMailer);
```

---

## Итоговая таблица

| Принцип | Суть | Нарушение ведёт к |
|---|---|---|
| **SRP** | Одна причина изменения | God object, сложная поддержка |
| **OCP** | Расширять, не изменять | Хрупкий код, регрессии |
| **LSP** | Дочернее = родительское | Неожиданное поведение при подстановке |
| **ISP** | Мелкие интерфейсы | Классы с "пустыми" методами |
| **DIP** | Зависеть от абстракций | Невозможность тестирования |

---

## Практическое задание

Возьмите любой класс из своего проекта (или придумайте: `NotificationService`, `PaymentProcessor`) и:

1. Найдите нарушения SOLID.
2. Рефакторинг: выделите интерфейсы, разделите ответственности.
3. Напишите unit-тест, который стал возможным после применения DIP.

---

## Итоги урока

- SOLID — не жёсткие правила, а эвристики для принятия дизайн-решений.
- SRP и DIP — наиболее практически ценны и напрямую влияют на тестируемость.
- OCP достигается через стратегии, декораторы и полиморфизм.
- LSP — следите за инвариантами при наследовании.

---

*Следующий урок: Паттерны проектирования — порождающие, структурные, поведенческие.*
