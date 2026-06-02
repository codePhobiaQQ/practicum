import { Col, Empty, Row, Select, Spin } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { fetchCourses, fetchTaxonomyTerms } from '@shared/api/wordpress'
import { OlympAppLayout } from '@/app/layouts'
import {
  toCourseViewModel,
  type CourseTermMaps,
  type CourseViewModel,
  type WpTaxonomyTerm,
} from '@shared/types/wordpress-course'
import { CourseCard } from './course-card'

const TAX_CATEGORY = 'cource-category'
const TAX_SUBJECT = 'cource-subject'

/** Потоки курса (в WP slug: cource-tread). */
const TAX_STREAM = 'cource-tread'

const filterSelectClassName = [
  /* selector box */
  '[&_.ant-select-selector]:!h-[50px]',
  '[&_.ant-select-selector]:!min-h-[50px]',
  '[&_.ant-select-selector]:!rounded-lg',
  '[&_.ant-select-selector]:!border-0',
  '[&_.ant-select-selector]:!bg-[#e4e4e4]',
  '[&_.ant-select-selector]:!px-5',
  '[&_.ant-select-selector]:!shadow-none',
  /* center the inner wrap so placeholder/value sit in the middle */
  '[&_.ant-select-selector]:!flex',
  '[&_.ant-select-selector]:!items-center',
  /* placeholder */
  '[&_.ant-select-selection-placeholder]:!text-[18px]',
  '[&_.ant-select-selection-placeholder]:!font-medium',
  '[&_.ant-select-selection-placeholder]:!leading-none',
  '[&_.ant-select-selection-placeholder]:!text-[#0d062b]',
  '[&_.ant-select-selection-placeholder]:!top-auto',
  '[&_.ant-select-selection-placeholder]:!transform-none',
  '[&_.ant-select-selection-placeholder]:!inset-y-auto',
  /* selected value */
  '[&_.ant-select-selection-item]:!text-[18px]',
  '[&_.ant-select-selection-item]:!font-medium',
  '[&_.ant-select-selection-item]:!leading-none',
  '[&_.ant-select-selection-item]:!text-[#0d062b]',
  '[&_.ant-select-selection-item]:!top-auto',
  '[&_.ant-select-selection-item]:!transform-none',
].join(' ')

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

  const filteredCourses = useMemo(
    () => courses.filter((c) => courseMatchesFilters(c, categoryId, subjectId, streamId)),
    [courses, categoryId, subjectId, streamId],
  )

  const courseFilters = (
    <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5" aria-label="Фильтры каталога">
      <Select
        size="large"
        allowClear
        placeholder="Поток"
        className={`w-full ${filterSelectClassName}`}
        popupClassName="!rounded-xl [&_.ant-select-item]:!min-h-[48px] [&_.ant-select-item]:!flex [&_.ant-select-item]:!items-center [&_.ant-select-item]:!px-5 [&_.ant-select-item]:!py-0 [&_.ant-select-item-option-content]:!text-[18px] [&_.ant-select-item-option-content]:!font-medium [&_.ant-select-item-option-content]:!text-[#0d062b]"
        value={streamId === 'all' ? undefined : streamId}
        onChange={(v) => setStreamId(v ?? 'all')}
        options={streamTerms.map((t) => ({ value: t.id, label: t.name }))}
      />
      <Select
        size="large"
        allowClear
        placeholder="Предмет"
        className={`w-full ${filterSelectClassName}`}
        popupClassName="!rounded-xl [&_.ant-select-item]:!min-h-[48px] [&_.ant-select-item]:!flex [&_.ant-select-item]:!items-center [&_.ant-select-item]:!px-5 [&_.ant-select-item]:!py-0 [&_.ant-select-item-option-content]:!text-[18px] [&_.ant-select-item-option-content]:!font-medium [&_.ant-select-item-option-content]:!text-[#0d062b]"
        value={subjectId === 'all' ? undefined : subjectId}
        onChange={(v) => setSubjectId(v ?? 'all')}
        options={subjectTerms.map((t) => ({ value: t.id, label: t.name }))}
      />
      <Select
        size="large"
        allowClear
        placeholder="Семестр"
        className={`w-full ${filterSelectClassName}`}
        popupClassName="!rounded-xl [&_.ant-select-item]:!min-h-[48px] [&_.ant-select-item]:!flex [&_.ant-select-item]:!items-center [&_.ant-select-item]:!px-5 [&_.ant-select-item]:!py-0 [&_.ant-select-item-option-content]:!text-[18px] [&_.ant-select-item-option-content]:!font-medium [&_.ant-select-item-option-content]:!text-[#0d062b]"
        value={categoryId === 'all' ? undefined : categoryId}
        onChange={(v) => setCategoryId(v ?? 'all')}
        options={categoryTerms.map((t) => ({ value: t.id, label: t.name }))}
      />
    </div>
  )

  return (
    <OlympAppLayout activeNav="labs">
      <div className="catalog-page prisma prisma_theme_light">
        {courseFilters}

        <div id="courses-catalog" className="scroll-mt-24">
          {loading ? (
            <div className="flex justify-center py-20">
              <Spin size="large" />
            </div>
          ) : error ? (
            <Empty description={error} />
          ) : courses.length === 0 ? (
            <Empty description="Пока нет опубликованных курсов в WordPress" />
          ) : filteredCourses.length === 0 ? (
            <Empty description="Ничего не нашлось. Смените фильтры." />
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
    </OlympAppLayout>
  )
}
