import { Breadcrumb, Collapse, Spin, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchCourseBySlug } from '@shared/api/wordpress'
import {
  getFeaturedImageUrl,
  getLessonBlocks,
  toCourseViewModel,
  type WpCoursePost,
} from '@shared/types/wordpress-course'
import { MaterialBlock } from './material-block'
import { PracticumLayout } from './practicum-layout'

const { Title, Paragraph } = Typography

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<WpCoursePost | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      return
    }
    let cancelled = false
    setLoading(true)
    fetchCourseBySlug(slug)
      .then((p) => {
        if (!cancelled) {
          setPost(p)
          setError(p ? null : 'Курс не найден')
        }
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

  const vm = useMemo(() => (post ? toCourseViewModel(post) : null), [post])
  const cover = post ? getFeaturedImageUrl(post) : undefined

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
            className={`relative overflow-hidden text-white ${cover ? '' : 'bg-practicum-hero'}`}
            style={
              cover
                ? {
                  backgroundImage: `linear-gradient(105deg, rgba(12,12,26,0.94) 0%, rgba(30,16,71,0.72) 45%, rgba(12,12,26,0.55) 100%), url(${cover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
                : undefined
            }
          >
            <div className="pointer-events-none absolute inset-0 bg-practicum-hero-glow opacity-90" aria-hidden />
            <div className="relative mx-auto max-w-[1100px] px-4 py-12 md:px-6 md:py-16 lg:py-20">
              <Breadcrumb
                className="!mb-8 text-[13px] text-white/75 [&_a]:text-white/90 [&_a:hover]:text-white [&_span]:text-white/95"
                items={[
                  { title: <Link to="/courses">Курсы</Link> },
                  { title: <span className="text-white">{vm.title}</span> },
                ]}
              />
              {vm.categoryLabel ? (
                <Paragraph className="!mb-3 !text-[12px] !font-semibold !uppercase !tracking-wider !text-white/70">
                  {vm.categoryLabel}
                </Paragraph>
              ) : null}
              <Title level={1} className="!mb-4 !text-[1.75rem] !font-bold !leading-[1.15] !text-white md:!text-4xl lg:!text-[2.5rem]">
                {vm.title}
              </Title>
              {vm.subtitle ? (
                <Paragraph className="!mb-3 !text-lg !leading-relaxed !text-white/92 md:!text-xl">{vm.subtitle}</Paragraph>
              ) : null}
              {vm.duration ? (
                <Paragraph className="!mb-0 !text-base !text-white/78">Срок: {vm.duration}</Paragraph>
              ) : null}
            </div>
          </section>

          <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-6 md:py-12">
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

            {vm.teaser ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-8">
                <p className="text-[17px] leading-relaxed text-light-text-secondary">{vm.teaser}</p>
              </div>
            ) : null}

            {post?.acf?.attachments && post.acf.attachments.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-8">
                <h2 className="mb-4 text-lg font-bold text-light-text">Материалы и файлы</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {post.acf.attachments.map((img, i) => (
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

            {!post?.acf?.description && post?.content?.rendered ? (
              <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-10">
                <div
                  className="max-w-none text-[15px] leading-relaxed text-light-text-secondary [&_p]:mb-3"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: post.content.rendered }}
                />
              </div>
            ) : null}

            <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-practicum-card md:p-8">
              <h2 className="mb-6 text-xl font-bold tracking-tight text-light-text md:text-2xl">Программа и материалы</h2>
              {collapseItems.length === 0 ? (
                <Paragraph type="secondary">Программа курса ещё не заполнена в WordPress.</Paragraph>
              ) : (
                <Collapse
                  bordered={false}
                  defaultActiveKey={collapseItems[0]?.key ? [String(collapseItems[0].key)] : undefined}
                  className="bg-transparent [&_.ant-collapse-header]:!items-center [&_.ant-collapse-header]:!py-4 [&_.ant-collapse-item]:!mb-2 [&_.ant-collapse-item]:overflow-hidden [&_.ant-collapse-item]:rounded-xl [&_.ant-collapse-item]:border [&_.ant-collapse-item]:border-light-border [&_.ant-collapse-content-box]:!bg-practicum-page/50 [&_.ant-collapse-content-box]:!pt-2"
                  items={collapseItems}
                />
              )}
            </div>

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
