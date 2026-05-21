import { Col, Empty, Input, Row, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { fetchCourses, fetchTaxonomyTerms, searchCourses  } from '@shared/api/wordpress'
import {
  toCourseViewModel,
  type CourseTermMaps,
  type CourseViewModel,
  type WpTaxonomyTerm,
} from '@shared/types/wordpress-course'
import { CourseCard } from './course-card'
import { PracticumLayout } from './practicum-layout'

const TAX_CATEGORY = 'cource-category'
const TAX_SUBJECT = 'cource-subject'

/** Потоки курса (в WP slug: cource-tread). */
const TAX_STREAM = 'cource-tread'

// function stripHtml(html: string): string {
//   const div = document.createElement('div')
//   div.innerHTML = html
//   return div.textContent ?? ''
// }

function sortTermsRu(terms: WpTaxonomyTerm[]): WpTaxonomyTerm[] {
  return [...terms].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

function toTermMaps(
  cats: WpTaxonomyTerm[],
  subs: WpTaxonomyTerm[],
  streams: WpTaxonomyTerm[],
): CourseTermMaps {
  return {
    categories: new Map(cats.map((t) => [t.id, { name: t.name, slug: t.slug }])),
    subjects: new Map(subs.map((t) => [t.id, { name: t.name, slug: t.slug }])),
    streams: new Map(streams.map((t) => [t.id, { name: t.name, slug: t.slug }])),
  }
}

function courseMatchesFilters(
  course: CourseViewModel,
  categoryId: number | 'all',
  subjectId: number | 'all',
  streamId: number | 'all',
): boolean {
  if (categoryId !== 'all' && !course.categoryIds.includes(categoryId)) {
    return false
  }
  if (subjectId !== 'all' && !course.subjectIds.includes(subjectId)) {
    return false
  }
  if (streamId !== 'all' && !course.streamIds.includes(streamId)) {
    return false
  }
  return true
}

// function courseMatchesSearch(course: CourseViewModel, q: string): boolean {
//   const needle = q.trim().toLowerCase()
//   if (!needle) {
//     return true
//   }
//   const blob = [
//     course.title,
//     course.subtitle,
//     course.teaser,
//     stripHtml(course.excerptHtml),
//     course.categoryLabel,
//     ...course.subjectLabels,
//     ...course.streamLabels,
//   ]
//     .filter(Boolean)
//     .join(' ')
//     .toLowerCase()
//   return blob.includes(needle)
// }

const navBtn =
  'w-full shrink-0 rounded-full border px-3.5 py-2 text-left text-[14px] transition-colors md:rounded-l-none md:rounded-r-lg md:py-2.5 md:pl-4 md:pr-3'
const navBtnActive =
  `${navBtn} border-accent1 bg-practicum-mist font-semibold text-accent1 md:border-l-4 md:border-l-accent1 md:border-y md:border-r md:border-light-border md:bg-white`
const navBtnIdle =
  `${navBtn} border-transparent font-medium text-light-text hover:bg-practicum-mist/80 md:border-y md:border-r md:border-transparent`

export function CourcesListPage() {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<CourseViewModel[]>([])
  const [categoryTerms, setCategoryTerms] = useState<WpTaxonomyTerm[]>([])
  const [subjectTerms, setSubjectTerms] = useState<WpTaxonomyTerm[]>([])
  const [streamTerms, setStreamTerms] = useState<WpTaxonomyTerm[]>([])
  const [error, setError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<number | 'all'>('all')
  const [subjectId, setSubjectId] = useState<number | 'all'>('all')
  const [streamId, setStreamId] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchCourses(),
      fetchTaxonomyTerms(TAX_CATEGORY).catch(() => [] as WpTaxonomyTerm[]),
      fetchTaxonomyTerms(TAX_SUBJECT).catch(() => [] as WpTaxonomyTerm[]),
      fetchTaxonomyTerms(TAX_STREAM).catch(() => [] as WpTaxonomyTerm[]),
    ])
      .then(([posts, cats, subs, streams]) => {
        if (cancelled) {
          return
        }
        const maps = toTermMaps(cats, subs, streams)
        setCategoryTerms(sortTermsRu(cats))
        setSubjectTerms(sortTermsRu(subs))
        setStreamTerms(sortTermsRu(streams))
        setCourses(posts.map((p) => toCourseViewModel(p, maps)))
        setError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Не удалось загрузить курсы. Проверьте WordPress и переменную VITE_WORDPRESS_URL.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Debounce: ждём 400мс после последнего нажатия клавиши
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 400)
  return () => clearTimeout(timer)
}, [search])

// Поиск через ElasticSearch при изменении запроса
useEffect(() => {
  if (debouncedSearch.trim() === '') {
    // запрос очищен — восстанавливаем полный список
    let cancelled = false
    setSearchLoading(true)
    fetchCourses().then((posts) => {
      if (cancelled) return
      const maps = toTermMaps(categoryTerms, subjectTerms, streamTerms)
      setCourses(posts.map((p) => toCourseViewModel(p, maps)))
    })
    .finally(() => {
      if (!cancelled) setSearchLoading(false)
    })
    return () => { cancelled = true }
  }
  let cancelled = false
  setSearchLoading(true)
  searchCourses(debouncedSearch)
    .then(({ courses: found }) => {
      if (cancelled) return
      const maps = toTermMaps(categoryTerms, subjectTerms, streamTerms)
      setCourses(found.map((p) => toCourseViewModel(p, maps)))
    })
    .catch(() => {
      if (!cancelled) setError('Ошибка поиска. Попробуйте ещё раз.')
    })
    .finally(() => {
      if (!cancelled) setSearchLoading(false)
    })
  return () => { cancelled = true }
}, [debouncedSearch])

const filteredCourses = useMemo(
  () => courses.filter((c) => courseMatchesFilters(c, categoryId, subjectId, streamId)),
  [courses, categoryId, subjectId, streamId],
)

  const heroTitle = useMemo(() => {
    if (categoryId !== 'all') {
      const t = categoryTerms.find((x) => x.id === categoryId)
      if (t) {
        return t.name
      }
    }
    return 'Курсы'
  }, [categoryId, categoryTerms])

  return (
    <PracticumLayout>
      <div className="page catalog-page catalog-page_wide prisma prisma_theme_light bg-practicum-page min-h-screen">
        <section className="border-b border-black/[0.06] bg-white" aria-labelledby="catalog-intro-title">
          <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-10">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-accent1/90">Каталог</p>
            <h1
              id="catalog-intro-title"
              className="max-w-[48rem] text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-light-text md:text-3xl"
            >
              {heroTitle}
            </h1>
          </div>
        </section>

        <div className="flex flex-col items-center gap-4 px-4 py-8">
          <div className="w-full flex justify-center">
            <Input
              size="large"
              allowClear
              placeholder="Поиск по курсам"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined className="text-light-text-secondary" aria-hidden />}
              className="max-w-full md:max-w-xl [&_.ant-input]:text-[15px]"
            />
          </div>

          <div
            id="courses-catalog"
            className="mx-auto grid max-w-[1320px] scroll-mt-24 gap-8 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-10 md:px-6 md:py-10 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-14"
          >
            <aside className="min-w-0 md:sticky md:top-[4.5rem] md:self-start">
              <div className="mb-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-light-text-secondary">
                  Категории
                </p>
                <nav
                  className="flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0"
                  aria-label="Категории курсов"
                >
                  <button
                    type="button"
                    className={categoryId === 'all' ? navBtnActive : navBtnIdle}
                    onClick={() => setCategoryId('all')}
                  >
                    Все курсы
                  </button>

                  {categoryTerms.map((t) => {
                    const active = categoryId === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={active ? navBtnActive : navBtnIdle}
                        onClick={() => setCategoryId(t.id)}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div className="mb-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-light-text-secondary">
                  Предметы
                </p>
                <nav
                  className="flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0"
                  aria-label="Предметы курсов"
                >
                  <button
                    type="button"
                    className={subjectId === 'all' ? navBtnActive : navBtnIdle}
                    onClick={() => setSubjectId('all')}
                  >
                    Все предметы
                  </button>
                  {subjectTerms.map((t) => {
                    const active = subjectId === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={active ? navBtnActive : navBtnIdle}
                        onClick={() => setSubjectId(t.id)}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-light-text-secondary">
                  Потоки
                </p>
                <nav
                  className="flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0"
                  aria-label="Потоки курсов"
                >
                  <button
                    type="button"
                    className={streamId === 'all' ? navBtnActive : navBtnIdle}
                    onClick={() => setStreamId('all')}
                  >
                    Все потоки
                  </button>

                  {streamTerms.map((t) => {
                    const active = streamId === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={active ? navBtnActive : navBtnIdle}
                        onClick={() => setStreamId(t.id)}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </aside>

            <div className="min-w-0">
              {loading || searchLoading ? (
                <div className="flex justify-center py-20">
                  <Spin size="large" />
                </div>
              ) : error ? (
                <Empty description={error} />
              ) : courses.length === 0 ? (
                <Empty description="Пока нет опубликованных курсов в WordPress" />
              ) : filteredCourses.length === 0 ? (
                <Empty description="Ничего не нашлось. Смените фильтры или запрос в поиске." />
              ) : (
                <Row gutter={[20, 20]}>
                  {filteredCourses.map((c) => (
                    <Col xs={24} sm={12} xl={8} key={c.id}>
                      <CourseCard course={c} />
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </div>
        </div>
      </div>
    </PracticumLayout>
  )
}
