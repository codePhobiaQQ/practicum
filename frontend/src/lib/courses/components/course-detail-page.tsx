import { Breadcrumb, Collapse, Spin, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchCourseBySlug, fetchTaxonomyTerms } from '@shared/api/wordpress'
import {
  getAttachmentsHtml,
  getFeaturedImageUrl,
  getLessonBlocks,
  getMaterialsHtml,
  getProgramModules,
  toCourseViewModel,
  type CourseTermMaps,
  type WpCoursePost,
  type WpTaxonomyTerm,
} from '@shared/types/wordpress-course'
import { MaterialBlock } from './material-block'
import { PracticumLayout } from './practicum-layout'

const TAX_CATEGORY = 'cource-category'
const TAX_SUBJECT = 'cource-subject'
const TAX_STREAM = 'cource-tread'

const { Title, Paragraph } = Typography

const proseCourse =
  'max-w-none text-[15px] leading-relaxed text-light-text [&_a]:text-accent1 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3 [&_p]:mb-3 [&_ul]:mb-3'

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
  const [termMaps, setTermMaps] = useState<CourseTermMaps | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchCourseBySlug(slug),
      fetchTaxonomyTerms(TAX_CATEGORY).catch(() => [] as WpTaxonomyTerm[]),
      fetchTaxonomyTerms(TAX_SUBJECT).catch(() => [] as WpTaxonomyTerm[]),
      fetchTaxonomyTerms(TAX_STREAM).catch(() => [] as WpTaxonomyTerm[]),
    ])
      .then(([p, cats, subs, streams]) => {
        if (cancelled) {
          return
        }
        setPost(p)
        setTermMaps(toTermMaps(cats, subs, streams))
        setError(p ? null : 'Курс не найден')
      })
      .catch(() => {
        if (!cancelled) {
          setError('Ошибка загрузки курса')
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

  const materialsHtml = post?.acf ? getMaterialsHtml(post.acf) : undefined
  const attachmentsHtml = post?.acf ? getAttachmentsHtml(post.acf) : undefined
  const programModules = post?.acf ? getProgramModules(post.acf) : []

  const collapseItems = useMemo(() => {
    if (!vm?.modules.length) {
      return []
    }
    return vm.modules.map((mod, mi) => ({
      key: String(mi),
      label: (
        <span className="text-[15px] font-semibold text-light-text md:text-base">
          Модуль {mi + 1}. {mod.module_title}
        </span>
      ),
      children: (
        <div className="space-y-8">
          {(mod.lessons ?? []).map((lesson, li) => (
            <div
              key={`${mi}-${li}`}
              id={lesson.lesson_slug ? `lesson-${lesson.lesson_slug}` : `lesson-${mi}-${li}`}
              className="rounded-xl border border-light-border bg-practicum-page/80 p-5 shadow-practicum-section md:p-6"
            >
              <Title level={4} className="!mb-4 !text-lg !font-bold md:!text-xl">
                {lesson.lesson_title}
              </Title>
              <div className="space-y-6">
                {getLessonBlocks(lesson).map((mat, bi) => (
                  <MaterialBlock key={`${mi}-${li}-${bi}`} block={mat} index={bi} />
                ))}
              </div>
              {getLessonBlocks(lesson).length === 0 && (
                <Paragraph type="secondary" className="!mb-0">
                  Материалы появятся позже
                </Paragraph>
              )}
            </div>
          ))}
        </div>
      ),
    }))
  }, [vm])

  const legacyGallery =
    post?.acf &&
    Array.isArray(post.acf.attachments) &&
    post.acf.attachments.length > 0
      ? post.acf.attachments
      : null

  const showEditorFallback =
    Boolean(post?.content?.rendered?.trim()) &&
    !post?.acf?.description?.trim() &&
    !materialsHtml &&
    programModules.length === 0

  const showProgramPlaceholder =
    !materialsHtml && collapseItems.length === 0 && !showEditorFallback

  return (
    <PracticumLayout>
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center bg-practicum-page py-24">
          <Spin size="large" />
        </div>
      ) : error || !vm ? (
        <div className="mx-auto max-w-[1100px] bg-practicum-page px-4 py-16 md:px-6">
          <Paragraph>{error ?? 'Нет данных'}</Paragraph>
          <Link to="/courses" className="font-medium text-accent1 hover:underline">
            ← К каталогу
          </Link>
        </div>
      ) : (
        <div className="catalog-page catalog-page_wide prisma prisma_theme_light min-h-screen bg-practicum-page">
          <section
            className="relative overflow-hidden border-b border-light-border bg-gradient-to-b from-white via-practicum-mist/70 to-practicum-page text-light-text"
            style={
              cover
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,246,247,0.98) 100%), url(${cover})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <div className="relative mx-auto max-w-[1100px] px-4 py-12 md:px-6 md:py-16 lg:py-20">
              <Breadcrumb
                className="!mb-8 text-[13px] text-light-text-secondary [&_a]:text-accent1 [&_a:hover]:underline [&_span]:text-light-text"
                items={[
                  { title: <Link to="/courses">Курсы</Link> },
                  { title: <span className="text-light-text">{vm.title}</span> },
                ]}
              />
              <div className="mb-4 flex flex-wrap gap-2">
                {vm.categoryLabel ? (
                  <span className="inline-flex rounded-full bg-practicum-mist px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-accent1">
                    {vm.categoryLabel}
                  </span>
                ) : null}
                {vm.subjectLabels.map((s) => (
                  <span
                    key={s}
                    className="inline-flex rounded-md border border-black/[0.08] bg-white px-2.5 py-1 text-[12px] font-medium text-light-text-secondary"
                  >
                    {s}
                  </span>
                ))}
                {vm.streamLabels.map((s) => (
                  <span
                    key={`stream-${s}`}
                    className="inline-flex rounded-md border border-dashed border-accent1/35 bg-accent1/[0.06] px-2.5 py-1 text-[12px] font-medium text-accent1"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <Title level={1} className="!mb-4 !text-[1.75rem] !font-bold !leading-[1.15] !text-light-text md:!text-4xl lg:!text-[2.5rem]">
                {vm.title}
              </Title>
              {vm.subtitle ? (
                <Paragraph className="!mb-3 !text-lg !leading-relaxed !text-light-text-secondary md:!text-xl">
                  {vm.subtitle}
                </Paragraph>
              ) : null}
              {vm.duration ? (
                <Paragraph className="!mb-0 !text-base !text-light-text-secondary">Срок: {vm.duration}</Paragraph>
              ) : null}
            </div>
          </section>

          <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-6 md:py-12">
            {vm.teaser ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-8">
                <p className="text-[17px] leading-relaxed text-light-text-secondary">{vm.teaser}</p>
              </div>
            ) : null}

            {post?.acf?.description ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-10">
                <h2 className="mb-4 text-xl font-bold text-light-text md:text-2xl">О курсе</h2>
                <div
                  className="max-w-none text-[15px] leading-relaxed text-light-text [&_a]:text-accent1 [&_p]:mb-3 [&_ul]:mb-3"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: post.acf.description }}
                />
              </div>
            ) : null}

            {materialsHtml ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-10">
                <h2 className="mb-4 text-xl font-bold text-light-text md:text-2xl">Материал</h2>
                <div
                  className={proseCourse}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: materialsHtml }}
                />
              </div>
            ) : null}

            {collapseItems.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-practicum-card md:p-8">
                <h2 className="mb-6 text-xl font-bold tracking-tight text-light-text md:text-2xl">
                  Программа и материалы
                </h2>
                <Collapse
                  bordered={false}
                  defaultActiveKey={collapseItems[0]?.key ? [String(collapseItems[0].key)] : undefined}
                  className="bg-transparent [&_.ant-collapse-header]:!items-center [&_.ant-collapse-header]:!py-4 [&_.ant-collapse-item]:!mb-2 [&_.ant-collapse-item]:overflow-hidden [&_.ant-collapse-item]:rounded-xl [&_.ant-collapse-item]:border [&_.ant-collapse-item]:border-light-border [&_.ant-collapse-content-box]:!bg-practicum-page/50 [&_.ant-collapse-content-box]:!pt-2"
                  items={collapseItems}
                />
              </div>
            ) : null}

            {showProgramPlaceholder ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-8">
                <h2 className="mb-4 text-xl font-bold text-light-text md:text-2xl">Программа курса</h2>
                <Paragraph type="secondary" className="!mb-0">
                  Программа будет опубликована позже.
                </Paragraph>
              </div>
            ) : null}

            {attachmentsHtml ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-10">
                <h2 className="mb-4 text-xl font-bold text-light-text md:text-2xl">Полезные материалы</h2>
                <div
                  className={proseCourse}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: attachmentsHtml }}
                />
              </div>
            ) : null}

            {legacyGallery ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-8">
                <h2 className="mb-4 text-lg font-bold text-light-text">Материалы и файлы</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {legacyGallery.map((img, i) => (
                    <a
                      key={img.id ?? i}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border border-light-border bg-practicum-mist transition-shadow hover:shadow-practicum-card"
                    >
                      <img src={img.url} alt="" className="h-32 w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {showEditorFallback && post?.content?.rendered ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-10">
                <h2 className="mb-4 text-xl font-bold text-light-text md:text-2xl">О курсе</h2>
                <div
                  className="max-w-none text-[15px] leading-relaxed text-light-text-secondary [&_p]:mb-3"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: post.content.rendered }}
                />
              </div>
            ) : null}

            <div className="mt-8 text-center md:text-left">
              <Link
                to="/courses"
                className="inline-flex items-center text-[15px] font-medium text-accent1 hover:underline"
              >
                ← Все курсы
              </Link>
            </div>
          </div>
        </div>
      )}
    </PracticumLayout>
  )
}
