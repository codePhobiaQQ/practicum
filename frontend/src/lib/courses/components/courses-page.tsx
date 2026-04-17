import { Col, Empty, Row, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { fetchCourses } from '@shared/api/wordpress'
import { toCourseViewModel, type CourseViewModel } from '@shared/types/wordpress-course'
import { CourseCard } from './course-card'
import { PracticumLayout } from './practicum-layout'

export function CoursesPage() {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<CourseViewModel[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCourses()
      .then((posts) => {
        if (!cancelled) {
          setCourses(posts.map(toCourseViewModel))
          setError(null)
        }
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

  return (
    <PracticumLayout>
      {/* catalog-page + prisma_theme_light — как у Практикума: светлый фон, широкая колонка */}
      <div className="catalog-page catalog-page_wide prisma prisma_theme_light bg-practicum-page">
        {/* Блок как ai-courses-block: тёмный hero + подложка */}
        <section className="relative overflow-hidden bg-practicum-hero text-white">
          <div className="pointer-events-none absolute inset-0 bg-practicum-hero-glow" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(12,12,26,0.4)_100%)]" aria-hidden />
          <div className="relative mx-auto max-w-[1100px] px-4 py-14 md:px-6 md:py-20 lg:py-24">
            <h1 className="mb-5 max-w-[48rem] text-[1.75rem] font-bold leading-[1.2] tracking-[-0.02em] text-white md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Профессии и навыки — в одном месте
            </h1>
            <p className="max-w-[36rem] text-base leading-relaxed text-white/88 md:text-xl md:leading-relaxed">
              Выбирайте курс под свои задачи, изучайте материалы в удобном темпе и добавляйте компетенции в свой
              профиль.
            </p>
          </div>
        </section>

        <section className="lpc-section mx-auto max-w-[1100px] px-4 py-10 md:px-6 md:py-14">
          <div className="lc-group mb-10 md:mb-12">
            <h2 className="lc-group__title text-2xl font-bold tracking-tight text-light-text md:text-[1.75rem]">
              Курсы
            </h2>
            <p className="mt-2 max-w-2xl text-base text-light-text-secondary md:text-[17px]">
              Нажмите на карточку, чтобы открыть программу и материалы.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Spin size="large" />
            </div>
          ) : error ? (
            <Empty description={error} />
          ) : courses.length === 0 ? (
            <Empty description="Пока нет опубликованных курсов в WordPress" />
          ) : (
            <Row gutter={[20, 20]}>
              {courses.map((c) => (
                <Col xs={24} sm={12} lg={8} key={c.id}>
                  <CourseCard course={c} />
                </Col>
              ))}
            </Row>
          )}
        </section>
      </div>
    </PracticumLayout>
  )
}
