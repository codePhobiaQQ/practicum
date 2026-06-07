# Урок 1: TypeScript в React — типизация компонентов и хуков

## Введение

TypeScript радикально улучшает опыт разработки на React: автодополнение, раннее обнаружение ошибок, самодокументирующийся код. В этом уроке разберём практические паттерны типизации.

---

## 1. Типизация Props

### Базовая типизация

```tsx
// ✗ Плохо — нет типов
function Button({ label, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// ✓ Хорошо — явный интерфейс Props
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;               // опциональное поле
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size}`}
    >
      {label}
    </button>
  );
};
```

### Типизация children

```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;        // любой рендерабельный контент
  footer?: React.ReactElement;      // только React элемент (не строка, не число)
  actions?: React.ReactNode[];      // массив nodes
}

// Компонент высшего порядка с children как функцией (render prop)
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, idx) => (
        <li key={keyExtractor(item)}>{renderItem(item, idx)}</li>
      ))}
    </ul>
  );
}

// Использование — TypeScript выведет T из items
<List
  items={users}
  keyExtractor={(user) => user.id}
  renderItem={(user) => <span>{user.name}</span>}
/>
```

---

## 2. Типизация useState и useReducer

### useState

```tsx
// TypeScript выводит тип из начального значения
const [count, setCount] = useState(0);               // number
const [name, setName] = useState("");                 // string

// Явная типизация нужна для сложных типов
interface User { id: string; name: string; email: string; }

const [user, setUser] = useState<User | null>(null);
const [users, setUsers] = useState<User[]>([]);

// Функциональное обновление
setUsers(prev => [...prev, newUser]);
setUsers(prev => prev.filter(u => u.id !== userId));
```

### useReducer

```tsx
// Определяем типы действий через дискриминированное объединение
type UserAction =
  | { type: "SET_USER"; payload: User }
  | { type: "UPDATE_NAME"; payload: string }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean };

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = { user: null, loading: false, error: null };

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, loading: false };
    case "UPDATE_NAME":
      if (!state.user) return state;
      return { ...state, user: { ...state.user, name: action.payload } };
    case "LOGOUT":
      return initialState;
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      // TypeScript гарантирует exhaustive check
      const _exhaustive: never = action;
      return state;
  }
}

// Использование
const [state, dispatch] = useReducer(userReducer, initialState);
dispatch({ type: "SET_USER", payload: { id: "1", name: "Ivan", email: "i@i.ru" } });
```

---

## 3. Типизация useRef и событий

```tsx
// Типизация DOM refs
const inputRef = useRef<HTMLInputElement>(null);
const divRef = useRef<HTMLDivElement>(null);

// Доступ — нужна проверка на null
const focusInput = () => inputRef.current?.focus();

// Типизация событий
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") submit();
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // обработка формы
};

const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  const files = e.dataTransfer.files;
};
```

---

## 4. Кастомные хуки с TypeScript

```tsx
// Хук для fetch данных с полной типизацией
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useFetch<T>(url: string): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data: T = await res.json();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// Использование — TypeScript выводит тип из дженерика
interface Product { id: string; name: string; price: number; }

const { data: products, loading, error } = useFetch<Product[]>("/api/products");
// products: Product[] | null — полная типизация!
```

---

## 5. Generic компоненты

```tsx
// Типизированный Select
interface SelectProps<T> {
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
  getValue: (option: T) => string;
  placeholder?: string;
}

function Select<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  placeholder = "Выберите...",
}: SelectProps<T>) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = options.find(o => getValue(o) === e.target.value);
    if (selected) onChange(selected);
  };

  return (
    <select value={value ? getValue(value) : ""} onChange={handleChange}>
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={getValue(opt)} value={getValue(opt)}>
          {getLabel(opt)}
        </option>
      ))}
    </select>
  );
}

// Использование
<Select<User>
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getLabel={u => u.name}
  getValue={u => u.id}
/>
```

---

## 6. Типизация Context

```tsx
interface ThemeContextValue {
  theme: "light" | "dark";
  toggleTheme: () => void;
  primaryColor: string;
}

// Создание контекста с undefined как дефолтом (для корректной проверки)
const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

// Хук для безопасного использования контекста
function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme должен использоваться внутри ThemeProvider");
  }
  return ctx;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const value: ThemeContextValue = {
    theme,
    toggleTheme: () => setTheme(t => t === "light" ? "dark" : "light"),
    primaryColor: theme === "light" ? "#1a73e8" : "#8ab4f8",
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## Практическое задание

Реализуйте типизированный компонент `DataTable<T>`:
- Generic по типу данных.
- Props: `data: T[]`, `columns: ColumnDef<T>[]`, `onRowClick?: (row: T) => void`.
- `ColumnDef<T>`: `key: keyof T`, `header: string`, `render?: (value: T[keyof T], row: T) => ReactNode`.
- Сортировка по столбцу — только по кликабельным заголовкам.

---

## Итоги урока

- Интерфейсы Props дают автодополнение и защиту от ошибок во время разработки.
- Дискриминированные объединения в `useReducer` обеспечивают exhaustive checking.
- Generic компоненты и хуки — ключ к переиспользуемому типизированному коду.
- Кастомные хуки должны возвращать стабильные типы — TypeScript это проверит.

---

*Следующий урок: Управление состоянием — Zustand, React Query и архитектурные паттерны.*
