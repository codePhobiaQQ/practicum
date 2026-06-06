import { Breadcrumb, Col, Row, Spin, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { OlympAppLayout } from '@/app/layouts'
import { fetchBookBySlug } from '@/shared/api/books'
import { fetchCoursesByBookId } from '@/shared/api/courses'
import {
  toBookViewModel,
  getBookCoverUrl,
  type BookViewModel,
} from '@shared/types/wordpress-book'
import {
  sortCoursesByBookOrder,
} from '@shared/types/wordpress-course'
import {
  toCourseViewModel,
  type CourseViewModel,
  type WpCoursePost,
} from '@shared/types/wordpress-course'
import { BOOKS_ROUTE_PATH } from '@shared/config/books'
import { CourseCard } from '@lib/courses/components/course-card'

const { Title, Paragraph } = Typography

export function BookDetailsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [book, setBook] = useState<BookViewModel | null>(null)
  const [rawCourses, setRawCourses] = useState<WpCoursePost[]>([])
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)

    fetchBookBySlug(slug)
      .then((post) => {
        if (cancelled) return
        if (!post) {
          setError('Пособие не найдено')
          setLoading(false)
          return
        }

        setBook(toBookViewModel(post))
        setCoverUrl(getBookCoverUrl(post))

        return fetchCoursesByBookId(post.id).then((courses) => {
          if (!cancelled) setRawCourses(courses)
        })
      })
      .catch(() => {
        if (!cancelled) setError('Ошибка загрузки данных пособия')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug])

  const courses: CourseViewModel[] = useMemo(() => {
    const vms = rawCourses.map((p) => toCourseViewModel(p))
    return sortCoursesByBookOrder(vms)
  }, [rawCourses])

  return (
    <OlympAppLayout activeNav="books">
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center py-24">
          <Spin size="large" />
        </div>
      ) : error || !book ? (
        <div className="mx-auto max-w-[1100px] px-4 py-16 md:px-6">
          <Paragraph>{error ?? 'Нет данных'}</Paragraph>
          <Link to={BOOKS_ROUTE_PATH} className="font-medium text-accent1 hover:underline">
            ← К пособиям
          </Link>
        </div>
      ) : (
        <div className="catalog-page catalog-page_wide prisma prisma_theme_light min-h-screen">
          {/* Шапка */}
          <section
            className="relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white text-[#0d062b]"
            style={
              coverUrl
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%), url(${coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <div className="relative mx-auto max-w-[1100px] px-5 py-10 md:px-8 md:py-12 lg:py-14">
              <Breadcrumb
                className="!mb-6 text-[13px] text-[#0d062b]/60 [&_a]:text-[#140f55] [&_a:hover]:underline [&_span]:text-[#0d062b]"
                items={[
                  { title: <Link to={BOOKS_ROUTE_PATH}>Пособия</Link> },
                  { title: <span className="text-[#0d062b]">{book.title}</span> },
                ]}
              />

              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <Title
                    level={1}
                    className="!mb-4 !text-[1.75rem] !font-bold !leading-[1.15] !text-[#0d062b] md:!text-4xl lg:!text-[2.5rem]"
                  >
                    {book.title}
                  </Title>

                  {book.duration ? (
                    <Paragraph className="!mb-0 !text-base !text-[#0d062b]/70">
                      Длительность: {book.duration}
                    </Paragraph>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-[1100px] px-1 py-8 md:py-10">
            {/* Краткий анонс */}
            {book.teaser ? (
              <div className="mb-6 rounded-2xl border border-black/[0.08] bg-white p-6 md:p-8">
                <p className="text-[17px] leading-relaxed text-[#0d062b]/75">{book.teaser}</p>
              </div>
            ) : null}

            {/* Описание */}
            {book.descriptionHtml ? (
              <div className="mb-6 rounded-2xl border border-black/[0.08] bg-white p-6 md:p-10">
                <h2 className="mb-4 text-xl font-bold text-[#0d062b] md:text-2xl">О пособии</h2>
                <div
                  className="max-w-none text-[15px] leading-relaxed text-[#0d062b]
                    [&_a]:text-[#140f55]
                    [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold
                    [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold
                    [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_ul]:mb-3"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: book.descriptionHtml }}
                />
              </div>
            ) : null}

            {/* Курсы пособия — карточки */}
            <div className="mb-6 rounded-2xl border border-black/[0.08] bg-white p-6 md:p-10">
              <h2 className="mb-6 text-xl font-bold text-[#0d062b] md:text-2xl">
                Курсы пособия
              </h2>

              {courses.length === 0 ? (
                <p className="text-[15px] text-[#0d062b]/60">
                  В данном пособии ещё нет опубликованных курсов.
                </p>
              ) : (
                <Row gutter={[20, 20]}>
                  {courses.map((course) => (
                    <Col xs={24} sm={12} xl={8} key={course.id}>
                      <CourseCard course={course} />
                    </Col>
                  ))}
                </Row>
              )}
            </div>

            <div className="mt-8 text-center md:text-left">
              <Link
                to={BOOKS_ROUTE_PATH}
                className="inline-flex items-center text-[15px] font-medium text-accent1 hover:underline"
              >
                ← Все пособия
              </Link>
            </div>
          </div>
        </div>
      )}
    </OlympAppLayout>
  )
}