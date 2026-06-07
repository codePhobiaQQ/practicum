# Урок 2: Управление состоянием — Zustand, React Query и оптимизация

## Введение

Выбор стратегии управления состоянием — одно из ключевых архитектурных решений в React-приложении. Разберём современный подход: **серверное состояние** через React Query, **клиентское глобальное** через Zustand, **локальное** через useState/useReducer.

---

## 1. Типы состояния и где их хранить

```
Состояние приложения
├── Серверное (Server State)          → React Query / SWR
│   ├── Данные от API
│   ├── Кеш запросов
│   └── Статус загрузки / ошибок
├── Глобальное клиентское             → Zustand / Jotai
│   ├── Авторизация (user, token)
│   ├── Настройки (theme, language)
│   └── UI-состояние (sidebar open)
└── Локальное                         → useState / useReducer
    ├── Значения форм
    ├── Модальные окна (если не глобальные)
    └── Состояние конкретного компонента
```

---

## 2. Zustand — глобальное клиентское состояние

### Базовый стор

```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,

        login: (user, token) =>
          set({ user, token, isAuthenticated: true }, false, 'auth/login'),

        logout: () =>
          set({ user: null, token: null, isAuthenticated: false }, false, 'auth/logout'),

        updateUser: (updates) =>
          set(
            state => ({
              user: state.user ? { ...state.user, ...updates } : null,
            }),
            false,
            'auth/updateUser',
          ),
      }),
      {
        name: 'auth-storage',          // ключ в localStorage
        partialize: (state) => ({      // сохранять только token
          token: state.token,
        }),
      },
    ),
    { name: 'AuthStore' },
  ),
);

// Использование — только нужные поля (без лишних ре-рендеров)
const user = useAuthStore(state => state.user);
const { login, logout } = useAuthStore(state => ({ login: state.login, logout: state.logout }));
```

### Zustand со slice-паттерном (для крупных сторов)

```typescript
import { create, StateCreator } from 'zustand';

// Slice 1: корзина
interface CartSlice {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
}

const createCartSlice: StateCreator<CartSlice & UISlice, [], [], CartSlice> = (set, get) => ({
  items: [],
  addItem: (item) =>
    set(state => {
      const existing = state.items.find(i => i.id === item.id);
      if (existing) {
        return { items: state.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),
  clearCart: () => set({ items: [] }),
  get total() { return get().items.reduce((sum, i) => sum + i.price * i.qty, 0); },
});

// Slice 2: UI
interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const createUISlice: StateCreator<CartSlice & UISlice, [], [], UISlice> = (set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
});

// Объединённый стор
export const useStore = create<CartSlice & UISlice>()((...a) => ({
  ...createCartSlice(...a),
  ...createUISlice(...a),
}));
```

---

## 3. React Query — серверное состояние

### Настройка

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // данные свежие 5 минут
      gcTime: 10 * 60 * 1000,        // кеш хранится 10 минут
      retry: 2,                       // 2 попытки при ошибке
      refetchOnWindowFocus: true,     // обновить при возврате на вкладку
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### useQuery — получение данных

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// API-функция (отдельно от хука)
async function fetchProducts(filters: ProductFilters): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams(filters as Record<string, string>);
  const res = await fetch(`/api/products?${params}`);
  if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
  return res.json();
}

// Хук с типизацией и пагинацией
function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],   // ключ кеша — зависит от filters
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData, // показывать старые данные при смене страницы
    select: (data) => ({              // трансформация данных
      products: data.items,
      total: data.total,
      hasMore: data.page < data.totalPages,
    }),
  });
}

// Компонент
function ProductList() {
  const [filters, setFilters] = useState<ProductFilters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, error, isFetching } = useProducts(filters);

  if (isLoading) return <Skeleton count={20} />;
  if (isError) return <ErrorMessage message={error.message} />;

  return (
    <>
      {isFetching && <LoadingIndicator />}  {/* фоновое обновление */}
      {data?.products.map(p => <ProductCard key={p.id} product={p} />)}
    </>
  );
}
```

### useMutation — изменение данных

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: CreateOrderInput) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Order>;
    },

    onMutate: async (newOrder) => {
      // Optimistic update: показываем результат до ответа сервера
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previous = queryClient.getQueryData<Order[]>(['orders']);

      queryClient.setQueryData<Order[]>(['orders'], old =>
        [...(old ?? []), { ...newOrder, id: 'temp', status: 'pending' }]
      );

      return { previous }; // для откатки при ошибке
    },

    onError: (err, newOrder, context) => {
      // Откатить оптимистичное обновление
      queryClient.setQueryData(['orders'], context?.previous);
    },

    onSuccess: (createdOrder) => {
      // Инвалидировать кеш — React Query перезапросит данные
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Или точечное обновление
      queryClient.setQueryData<Order>(['orders', createdOrder.id], createdOrder);
    },
  });
}

// Использование
const { mutate: createOrder, isPending } = useCreateOrder();

<button onClick={() => createOrder(orderData)} disabled={isPending}>
  {isPending ? "Создаём..." : "Создать заказ"}
</button>
```

---

## 4. Оптимизация ре-рендеров

### useMemo и useCallback

```tsx
// ✗ Плохо — новая ссылка при каждом рендере
const sortedItems = items.sort((a, b) => a.price - b.price);

// ✓ Хорошо — вычисляется только при изменении items или sortOrder
const sortedItems = useMemo(
  () => [...items].sort((a, b) =>
    sortOrder === 'asc' ? a.price - b.price : b.price - a.price
  ),
  [items, sortOrder]
);

// useCallback — стабильная ссылка на функцию (для передачи в memo-компоненты)
const handleDelete = useCallback((id: string) => {
  deleteItem(id);
}, []); // пустой массив — функция никогда не меняется
```

### React.memo

```tsx
// Мемоизированный компонент — ре-рендерится только при изменении props
const ProductCard = React.memo(function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => onAddToCart(product)}>В корзину</button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения (опционально)
  return prevProps.product.id === nextProps.product.id
    && prevProps.product.price === nextProps.product.price;
});
```

---

## Практическое задание

Реализуйте мини-приложение "Список задач" с использованием:
1. **Zustand** — хранить задачи, фильтры и настройки UI.
2. **React Query** — синхронизировать с `/api/todos` (можно использовать `json-server`).
3. **Optimistic updates** — мгновенное отображение добавленной задачи.
4. Структура файлов:
   ```
   src/
   ├── stores/todoStore.ts
   ├── api/todos.ts
   ├── hooks/useTodos.ts
   └── components/TodoList.tsx
   ```

---

## Итоги урока

- Разделяйте состояние: серверное → React Query, глобальное → Zustand, локальное → useState.
- React Query решает кеширование, фоновое обновление и синхронизацию с сервером.
- Zustand минимален, не требует Provider и хорошо масштабируется через slice-паттерн.
- Оптимизируйте ре-рендеры через React.memo + useCallback, а не наоборот.

---

*Следующий урок: Архитектура React-приложения — Feature-Sliced Design и паттерны.*
