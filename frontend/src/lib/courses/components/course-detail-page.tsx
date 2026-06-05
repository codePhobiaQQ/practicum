import { Breadcrumb, Spin, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { marked } from 'marked';
import { fetchCourseBySlug, fetchTaxonomyTerms } from '@/shared/api/courses'
import { fetchLessonsByCourseId } from '@/shared/api/lessons'
import {
  getFeaturedImageUrl,
  toCourseViewModel,
  type CourseTermMaps,
  type WpCoursePost,
  type WpTaxonomyTerm,
} from '@shared/types/wordpress-course'
import {
  LessonViewModel,
} from '@shared/types/wordpress-lesson'
import { OlympAppLayout } from '@/app/layouts'

const TAX_CATEGORY = 'cource-category'
const TAX_SUBJECT = 'cource-subject'
const TAX_STREAM = 'cource-tread'

const { Title, Paragraph } = Typography

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

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<WpCoursePost | null>(null)
  const [lessons, setLessons] = useState<LessonViewModel[]>([])
  const [termMaps, setTermMaps] = useState<CourseTermMaps | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      return
    }
    let cancelled = false
    setLoading(true)

    // Сначала получаем данные курса, так как нам нужен его ID для запроса уроков
    fetchCourseBySlug(slug)
      .then((p) => {
        if (cancelled) return
        if (!p) {
          setPost(null)
          setError('Курс не найден')
          setLoading(false)
          return
        }

        setPost(p)

        // Загружаем таксономии и уроки параллельно, зная точный ID курса
        return Promise.all([
          fetchTaxonomyTerms(TAX_CATEGORY).catch(() => [] as WpTaxonomyTerm[]),
          fetchTaxonomyTerms(TAX_SUBJECT).catch(() => [] as WpTaxonomyTerm[]),
          fetchTaxonomyTerms(TAX_STREAM).catch(() => [] as WpTaxonomyTerm[]),
          fetchLessonsByCourseId(p.id).catch(() => [] as LessonViewModel[]),
        ]).then(([cats, subs, streams, loadedLessons]) => {
          if (cancelled) return
          setTermMaps(toTermMaps(cats, subs, streams))
          setLessons(loadedLessons)
          setError(null)
        })
      })
      .catch(() => {
        if (!cancelled) {
          setError('Ошибка загрузки данных курса')
          setPost(null)
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
  }, [slug])

  const vm = useMemo(() => (post ? toCourseViewModel(post, termMaps) : null), [post, termMaps])
  const cover = post ? getFeaturedImageUrl(post) : undefined

  const lessonVms = lessons
  const firstLessonUrl = useMemo(() => {
    if (vm && lessonVms.length > 0) {
      return `/courses/${vm.slug}/lessons/${lessonVms[0].slug}`
    }
    return null
  }, [vm, lessonVms])

  // Функция для извлечения чистого текста из HTML-строки
  const parseMarkdownWithHtml = (htmlString: string) => {
    if (typeof window === 'undefined') return htmlString; // Защита для SSR (Next.js)
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    // doc.body.innerText вернет чистый текст, сохранив переносы строк
    // и убрав все теги <div>, мешающие маркдауну
    const cleanText = doc.body.innerText; 
    
    return marked.parse(cleanText);
  };


  return (
    <OlympAppLayout activeNav="labs">
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center py-24">
          <Spin size="large" />
        </div>
      ) : error || !vm ? (
        <div className="mx-auto max-w-[1100px] px-4 py-16 md:px-6">
          <Paragraph>{error ?? 'Нет данных'}</Paragraph>
          <Link to="/" className="font-medium text-accent1 hover:underline">
            ← К каталогу
          </Link>
        </div>
      ) : (
        <div className="catalog-page catalog-page_wide prisma prisma_theme_light min-h-screen">
          <section
            className="relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white text-[#0d062b]"
            style={
              cover
                ? {
                  backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%), url(${cover})`,
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
                  { title: <Link to="/">Курсы</Link> },
                  { title: <span className="text-[#0d062b]">{vm.title}</span> },
                ]}
              />
              <div className="mb-4 flex flex-wrap gap-2">
                {vm.categoryLabels.map((s) => (
                  <span
                    key={s}
                    className="inline-flex rounded-full bg-[#eeecff] px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#140f55]"
                  >
                    {s}
                  </span>
                ))}
                {vm.subjectLabels.map((s) => (
                  <span
                    key={s}
                    className="inline-flex rounded-md border border-black/[0.08] bg-white px-2.5 py-1 text-[12px] font-medium text-[#0d062b]/65"
                  >
                    {s}
                  </span>
                ))}
                {vm.streamLabels.map((s) => (
                  <span
                    key={`stream-${s}`}
                    className="inline-flex rounded-md border border-dashed border-[#140f55]/35 bg-[#140f55]/[0.06] px-2.5 py-1 text-[12px] font-medium text-[#140f55]"
                  >
                    {s}
                  </span>
                ))}
              </div>
              
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <Title level={1} className="!mb-4 !text-[1.75rem] !font-bold !leading-[1.15] !text-[#0d062b] md:!text-4xl lg:!text-[2.5rem]">
                    {vm.title}
                  </Title>
                  {vm.subtitle ? (
                    <Paragraph className="!mb-3 !text-lg !leading-relaxed !text-[#0d062b]/70 md:!text-xl">
                      {vm.subtitle}
                    </Paragraph>
                  ) : null}
                  {vm.duration ? (
                    <Paragraph className="!mb-0 !text-base !text-[#0d062b]/70">Срок: {vm.duration}</Paragraph>
                  ) : null}
                </div>

                {/* Динамическая кнопка «Начать курс» */}
                {firstLessonUrl && (
                  <div className="shrink-0">
                    <Link
                      to={firstLessonUrl}
                      className="inline-flex items-center justify-center rounded-xl bg-[#140f55] px-6 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-[#140f55]/90 hover:shadow-lg active:scale-[0.98]"
                    >
                      Начать курс →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-[1100px] px-1 py-8 md:py-10">
            {vm.teaser ? (
              <div className="mb-6 rounded-2xl border border-black/[0.08] bg-white p-6 md:p-8">
                <p className="text-[17px] leading-relaxed text-[#0d062b]/75">{vm.teaser}</p>
              </div>
            ) : null}

          {post?.acf?.description ? (
            <div className="mb-6 rounded-2xl border border-black/[0.08] bg-white p-6 md:p-10">
              <h2 className="mb-4 text-xl font-bold text-[#0d062b] md:text-2xl">О курсе</h2>
              <div
                className="max-w-none text-[15px] leading-relaxed text-[#0d062b] 
                          [&_a]:text-[#140f55] 
                          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5
                          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4
                          [&_p]:mb-3 [&_ul]:mb-3 [&_li]:list-disc [&_li]:ml-5"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: parseMarkdownWithHtml(post.acf.description) }} 
              />
            </div>
          ) : null}

            {/* НОВЫЙ БЛОК: Уроки курса */}
            <div className="mb-6 rounded-2xl border border-black/[0.08] bg-white p-6 md:p-10">
              <h2 className="mb-6 text-xl font-bold text-[#0d062b] md:text-2xl">Программа обучения</h2>
              
              {lessonVms.length === 0 ? (
                <p className="text-[15px] text-[#0d062b]/60">В данном курсе еще нет опубликованных уроков.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {lessonVms.map((lesson) => (
                    <Link
                      key={lesson.id}
                      to={`/courses/${vm.slug}/lessons/${lesson.slug}`}
                      className="group flex items-start gap-4 rounded-xl border border-black/[0.04] bg-neutral-50/50 p-4 transition-all hover:border-black/[0.08] hover:bg-white hover:shadow-sm"
                    >
                      {/* Номер урока */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eeecff] text-[14px] font-bold text-[#140f55] group-hover:bg-[#140f55] group-hover:text-white transition-colors">
                        {lesson.order}
                      </div>
                      
                      {/* Заголовок и Тизер */}
                      <div className="flex-1 pt-0.5">
                        <h4 className="text-[16px] font-semibold text-[#0d062b] group-hover:text-[#140f55] transition-colors">
                          {lesson.title}
                        </h4>
                        {lesson.teaser ? (
                          <p className="mt-1 text-[14px] leading-relaxed text-[#0d062b]/60">
                            {lesson.teaser}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 text-center md:text-left">
              <Link
                to="/"
                className="inline-flex items-center text-[15px] font-medium text-accent1 hover:underline"
              >
                ← Все курсы
              </Link>
            </div>
          </div>
        </div>
      )}
    </OlympAppLayout>
  )
}
