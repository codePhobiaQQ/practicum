# Урок 1: Elasticsearch — архитектура и полнотекстовый поиск

## Введение

Elasticsearch — распределённый поисковый движок на основе Apache Lucene. Он оптимизирован для полнотекстового поиска, аналитики в реальном времени и хранения документов.

---

## 1. Ключевые концепции

| Elasticsearch | Аналог в СУБД | Описание |
|---|---|---|
| Index | База данных | Коллекция документов |
| Document | Строка | JSON-объект |
| Field | Столбец | Поле документа |
| Mapping | Schema | Определение типов полей |
| Shard | - | Физическая единица хранения (Lucene index) |

### Архитектура кластера

```
Cluster: my-cluster
├── Node 1 (Master + Data)
│   ├── Shard 0 (Primary)   ← index "articles"
│   └── Shard 2 (Replica)
├── Node 2 (Data)
│   ├── Shard 1 (Primary)
│   └── Shard 0 (Replica)
└── Node 3 (Data)
    ├── Shard 2 (Primary)
    └── Shard 1 (Replica)
```

---

## 2. Создание индекса с маппингом

```bash
# Создать индекс с явным маппингом
PUT /articles
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "russian_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "russian_stop", "russian_stemmer"]
        }
      },
      "filter": {
        "russian_stop": {
          "type": "stop",
          "stopwords": "_russian_"
        },
        "russian_stemmer": {
          "type": "stemmer",
          "language": "russian"
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "russian_analyzer",
        "fields": {
          "keyword": {"type": "keyword"}   // для сортировки и агрегаций
        }
      },
      "body": {
        "type": "text",
        "analyzer": "russian_analyzer"
      },
      "author": {"type": "keyword"},
      "published_at": {"type": "date"},
      "tags": {"type": "keyword"},
      "views": {"type": "integer"},
      "location": {"type": "geo_point"}
    }
  }
}
```

---

## 3. Индексирование документов

```bash
# Добавить документ с указанным ID
PUT /articles/_doc/1
{
  "title": "Введение в Elasticsearch",
  "body": "Elasticsearch — мощный поисковый движок для обработки больших объёмов данных.",
  "author": "ivanov",
  "published_at": "2024-03-15",
  "tags": ["elasticsearch", "поиск", "nosql"],
  "views": 1240
}

# Bulk API — для массового импорта
POST /articles/_bulk
{"index": {"_id": "2"}}
{"title": "Оптимизация запросов", "body": "...", "author": "petrov", "views": 890}
{"index": {"_id": "3"}}
{"title": "Агрегации в ES", "body": "...", "author": "sidorov", "views": 2100}
```

---

## 4. Полнотекстовый поиск

### match — основной запрос для полнотекстового поиска

```bash
GET /articles/_search
{
  "query": {
    "match": {
      "body": {
        "query": "оптимизация запросов",
        "operator": "and",   # оба слова должны присутствовать
        "fuzziness": "AUTO"  # допускает опечатки
      }
    }
  }
}
```

### multi_match — поиск по нескольким полям

```bash
GET /articles/_search
{
  "query": {
    "multi_match": {
      "query": "elasticsearch поиск",
      "fields": ["title^3", "body", "tags^2"],  // ^N — буст поля
      "type": "best_fields"   // cross_fields | most_fields | phrase
    }
  }
}
```

### bool — составные запросы

```bash
GET /articles/_search
{
  "query": {
    "bool": {
      "must": [
        {"match": {"body": "elasticsearch"}}
      ],
      "should": [
        {"match": {"tags": "nosql"}},
        {"range": {"views": {"gte": 1000}}}
      ],
      "filter": [
        {"term": {"author": "ivanov"}},
        {"range": {"published_at": {"gte": "2024-01-01"}}}
      ],
      "must_not": [
        {"term": {"tags": "deprecated"}}
      ]
    }
  }
}
```

> **Ключевое отличие must vs filter:**
> - `must` — влияет на relevance score (оценку релевантности).
> - `filter` — бинарное включение/исключение, кешируется, быстрее.

---

## 5. Relevance Scoring — BM25

Elasticsearch использует алгоритм **BM25** для оценки релевантности:

```
score(D, Q) = Σ IDF(tᵢ) · (f(tᵢ,D) · (k₁+1)) / (f(tᵢ,D) + k₁·(1-b+b·|D|/avgdl))

Где:
  IDF(t) = log(1 + (N - n(t) + 0.5) / (n(t) + 0.5))
  f(t,D) = частота термина t в документе D
  |D|    = длина документа
  avgdl  = средняя длина документа
  k₁, b  = параметры настройки (по умолчанию k₁=1.2, b=0.75)
```

```bash
# Посмотреть объяснение score для конкретного документа
GET /articles/_explain/1
{
  "query": {"match": {"body": "elasticsearch"}}
}
```

---

## 6. Агрегации

```bash
GET /articles/_search
{
  "size": 0,   // не возвращать документы, только агрегации
  "aggs": {
    "by_author": {
      "terms": {"field": "author", "size": 10},
      "aggs": {
        "avg_views": {"avg": {"field": "views"}},
        "total_views": {"sum": {"field": "views"}}
      }
    },
    "views_histogram": {
      "histogram": {
        "field": "views",
        "interval": 500
      }
    },
    "published_over_time": {
      "date_histogram": {
        "field": "published_at",
        "calendar_interval": "month"
      }
    }
  }
}
```

---

## 7. Highlight — подсветка результатов

```bash
GET /articles/_search
{
  "query": {"match": {"body": "elasticsearch"}},
  "highlight": {
    "fields": {
      "body": {
        "fragment_size": 150,
        "number_of_fragments": 3,
        "pre_tags": ["<mark>"],
        "post_tags": ["</mark>"]
      }
    }
  }
}
```

---

## Практическое задание

1. Создайте индекс `news` с русскоязычным анализатором.
2. Загрузите 1000 статей через Bulk API (можно использовать генератор данных).
3. Реализуйте поиск с:
   - Полнотекстовым поиском по заголовку и телу с бустингом заголовка.
   - Фильтрацией по дате и автору.
   - Агрегацией по топ-10 авторам по количеству статей.
   - Подсветкой найденных фрагментов.

---

## Итоги урока

- Elasticsearch строится на шардах Lucene; понимание архитектуры критично для оптимизации.
- Маппинг с явными типами и анализаторами — основа корректного поиска на русском языке.
- `bool` запрос с `filter` для точных условий и `must` для релевантности — универсальный шаблон.
- BM25 учитывает частоту термина и длину документа; score можно настраивать через boost.

---

*Следующий урок: MongoDB — документная модель данных, агрегационный pipeline и индексирование.*
