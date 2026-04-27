# Инициализация проекта (Windows / macOS)

Кратко: репозиторий поднимает **MySQL**, **WordPress**, **phpMyAdmin** и **фронтенд (Vite)** через Docker. База **`wordpress`** создаётся контейнером автоматически при первом запуске.

---

## 1. Что установить

| Инструмент | Зачем |
|------------|--------|
| **Git** | Клонирование репозитория |
| **Docker Desktop** | Запуск контейнеров (см. ниже) |

Опционально (если не используете Docker для фронта): **Node.js 20+** и **pnpm** — для локального `pnpm dev` в каталоге `frontend/`.

---

## 2. Установка Docker

### macOS

1. Скачайте **Docker Desktop for Mac**: [https://docs.docker.com/desktop/install/mac-install/](https://docs.docker.com/desktop/install/mac-install/)
2. Установите и запустите приложение (в строке меню должен быть значок Docker).
3. На **Apple Silicon** (M1/M2/M3) при проблемах с образами в `docker-compose.yaml` иногда раскомментируют строку `platform: linux/amd64` у сервисов — ориентируйтесь на сообщения об ошибках при `docker compose up`.

### Windows

1. Включите **WSL 2** (рекомендуется): [инструкция Microsoft](https://learn.microsoft.com/windows/wsl/install).
2. Установите **Docker Desktop for Windows**: [https://docs.docker.com/desktop/install/windows-install/](https://docs.docker.com/desktop/install/windows-install/)
3. В настройках Docker включите интеграцию с вашим дистрибутивом WSL2.
4. Работайте с репозиторием из файловой системы **Linux в WSL** (например `\\wsl$\Ubuntu\home\...`), а не только из `C:\`, чтобы монтирование томов и права были предсказуемы.

После установки в терминале должны работать команды:

```bash
docker --version
docker compose version
```

---

## 3. Клонирование и переход в каталог

```bash
git clone <url-репозитория>
cd practicum
```

Дальше все команды Docker выполняйте **из корня репозитория** (где лежит `docker-compose.yaml`).

---

## 4. Переменные окружения фронтенда

1. Скопируйте пример env:

   **macOS / Linux / WSL:**

   ```bash
   cp frontend/.env.example frontend/.env
   ```

   **Windows (cmd):**

   ```cmd
   copy frontend\.env.example frontend\.env
   ```

2. Откройте `frontend/.env` и при необходимости измените URL WordPress (по умолчанию совпадает с `docker-compose`):

   ```env
   VITE_WORDPRESS_URL=http://localhost:9091
   ```

   Этот адрес должен указывать на тот же хост и порт, что и сервис **wordpress** в Docker (см. раздел про порты).

В `docker-compose.yaml` для сервиса `frontend` те же значения могут задаваться через `environment` (при запуске фронта в контейнере они перекрывают локальный `.env` в рантайме — ориентируйтесь на актуальный `docker-compose.yaml`).

---

## 5. Запуск стека (БД + WordPress + фронт)

Из **корня репозитория**:

```bash
docker compose up --build
```

- Первый запуск скачает образы и соберёт фронт (`Dockerfile.dev`).
- Том **`db_data`** хранит данные MySQL между перезапусками.

Остановка: `Ctrl+C` или в другом терминале:

```bash
docker compose down
```

Чтобы удалить и **базу** (том), осторожно:

```bash
docker compose down -v
```

---

## 6. База данных (создание и доступ)

Контейнер **`db`** (MySQL 5.7) при старте сам создаёт базу и пользователя согласно `docker-compose.yaml`:

| Параметр | Значение в репозитории |
|----------|-------------------------|
| Хост внутри Docker | `db` (для сервисов в сети `wpsite`) |
| Порт на вашей машине | **не проброшен наружу** — подключение к MySQL с хоста обычно через **phpMyAdmin** или `docker compose exec` |
| Имя базы | `wordpress` |
| Пользователь приложения | `admin` |
| Пароль пользователя | `admin` |
| Пароль root MySQL | `admin` |

Отдельно создавать базу вручную не нужно: переменная `MYSQL_DATABASE: wordpress` делает это при инициализации пустого тома.

### Проверка из консоли

```bash
docker compose exec db mysql -uadmin -padmin -e "SHOW DATABASES;"
```

Должна отображаться база `wordpress`.

### phpMyAdmin

В `docker-compose.yaml` сервис слушает порт **9001**. В браузере: [http://localhost:9001](http://localhost:9001)

Выберите сервер **`db`**, затем войдите, например:

- пользователь **`admin`**, пароль **`admin`** — для работы с БД `wordpress`,  
  или  
- **`root`** / пароль из `MYSQL_ROOT_PASSWORD` в сервисе **`db`** (в репозитории это **`admin`**).

Если в UI phpMyAdmin указан другой пароль root в `environment` — ориентируйтесь на блок **`db`**: фактические учётные данные для MySQL задаются там.

---

## 7. Сервисы и порты

| URL | Назначение |
|-----|------------|
| [http://localhost:5174](http://localhost:5174) | Фронтенд (Vite) |
| [http://localhost:9091](http://localhost:9091) | WordPress (REST API: `/wp-json/wp/v2/...`) |
| [http://localhost:9001](http://localhost:9001) | phpMyAdmin |

Убедитесь, что порты **5174**, **9091**, **9001** свободны.

---

## 8. WordPress после первого запуска

1. Откройте [http://localhost:9091](http://localhost:9091).
2. Если сайт ещё не настроен, пройдите мастер установки WordPress (язык, логин администратора и т.д.).
3. Установите нужные плагины (например **ACF**), тип записи `course`, таксономии и поля — как в вашей схеме данных.
4. В `frontend` везде, где используется API курсов, базовый URL задаётся **`VITE_WORDPRESS_URL`** (см. выше).

---

## 9. Запуск фронтенда без Docker (опционально)

Если хотите крутить только WordPress/MySQL в Docker, а Vite — локально:

```bash
cd frontend
corepack enable
pnpm install
cp .env.example .env   # при необходимости отредактируйте VITE_WORDPRESS_URL
pnpm dev
```

Сайт откроется на [http://localhost:5174](http://localhost:5174) (порт задан в `vite.config.ts`).

---

## 10. Типичные проблемы

- **Порт занят** — остановите другой сервис или измените маппинг `ports` в `docker-compose.yaml`.
- **Фронт не видит WordPress** — проверьте `VITE_WORDPRESS_URL`, что WordPress отвечает по этому URL, и CORS/доступ к REST, если вы разносите хосты.
- **Права на файлы (Windows)** — проект лучше держать в WSL, если `wordpress/wp-content` монтируется с ошибками.
- **ARM Mac / образ MySQL** — при ошибках архитектуры см. комментарий `platform: linux/amd64` в `docker-compose.yaml`.

---

Документ описывает текущее состояние репозитория; при изменении `docker-compose.yaml` или переменных окружения обновите соответствующие разделы.
