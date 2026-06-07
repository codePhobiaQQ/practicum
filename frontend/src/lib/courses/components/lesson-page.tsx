import { Breadcrumb, Spin, Typography } from 'antd'
import { useEffect, useMemo, useState, useRef  } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import React from 'react'

import { fetchCourseBySlug } from '@shared/api/courses'
import { fetchLessonsByCourseId, fetchLessonBySlug, fetchMdContent } from '@shared/api/lessons'
import {
  getLessonContentSource,
  getLessonNavigation,
  toLessonViewModel,
  type LessonViewModel,
} from '@shared/types/wordpress-lesson'
import type { WpCoursePost } from '@shared/types/wordpress-course'
import { OlympAppLayout } from '@/app/layouts'

const { Title, Paragraph } = Typography

// Стили prose — аналог proseCourse из course-detail-page
const proseLesson =
  'max-w-none text-[15px] leading-relaxed text-light-text [&_a]:text-accent1 [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3 [&_p]:mb-3 [&_ul]:mb-3 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-practicum-mist [&_pre]:p-4 [&_code]:rounded [&_code]:bg-practicum-mist [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-4 [&_blockquote]:border-accent1/30 [&_blockquote]:pl-4 [&_blockquote]:text-light-text-secondary'

export function LessonPage() {
  const { slug: courseSlug, lessonSlug } = useParams<{ slug: string; lessonSlug: string }>()

  const [loading, setLoading] = useState(true)
  const [mdLoading, setMdLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [course, setCourse] = useState<WpCoursePost | null>(null)
  const [lesson, setLesson] = useState<LessonViewModel | null>(null)
  const [siblings, setSiblings] = useState<LessonViewModel[]>([])
  const [mdContent, setMdContent] = useState<string | null>(null)

  // --- Загрузка курса, урока и списка уроков ---
  useEffect(() => {
    if (!courseSlug || !lessonSlug) {
      return
    }
    let cancelled = false
    setLoading(true)
    setMdContent(null)

    // Загружаем курс и урок параллельно
    Promise.all([
      fetchCourseBySlug(courseSlug),
      fetchLessonBySlug(lessonSlug),
    ])
      .then(([coursePost, lessonPost]) => {
        if (cancelled) return

        setCourse(coursePost)

        if (!lessonPost) {
          setError('Урок не найден')
          return
        }

        const vm = toLessonViewModel(lessonPost)
        setLesson(vm)

        // Загружаем все уроки курса для навигации prev/next
        const courseId = vm.courseId
        if (courseId) {
          fetchLessonsByCourseId(courseId)
            .then((all) => {
              if (!cancelled) setSiblings(all)
            })
            .catch(() => {
              // Навигация недоступна — не критично
            })
        }

        // Загружаем MD-файл если он есть
        const src = getLessonContentSource(lessonPost)
        if (src.type === 'md') {
          setMdLoading(true)
          fetchMdContent(src.url)
            .then((text) => {
              if (!cancelled) setMdContent(text)
            })
            .catch(() => {
              if (!cancelled) setError('Не удалось загрузить содержимое урока')
            })
            .finally(() => {
              if (!cancelled) setMdLoading(false)
            })
        }
      })
      .catch(() => {
        if (!cancelled) setError('Ошибка загрузки урока')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [courseSlug, lessonSlug])

  // --- Навигация prev / next ---
  const { prev, next } = useMemo(
    () =>
      lesson && siblings.length
        ? getLessonNavigation(siblings, lesson.slug)
        : { prev: null, next: null },
    [lesson, siblings],
  )

  const courseTitle =
    course?.acf?.course_name?.trim() ||
    course?.title?.rendered?.replace(/<[^>]+>/g, '').trim() ||
    'Курс'


  mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

  interface MermaidBlockProps {
    children: string;
  }

  function MermaidBlock({ children }: MermaidBlockProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (ref.current) {
        mermaid.run({ nodes: [ref.current] });
      }
    }, [children]);

    return (
      <div
        ref={ref}
        className="mermaid"
        style={{ textAlign: 'center', margin: '1.5rem 0' }}
      >
        {children}
      </div>
    );
  }

  const components: Components = {
    code({ className, children }) {
      const lang = (className || '').replace('language-', '');
      if (lang === 'mermaid') {
        return <MermaidBlock>{String(children).trim()}</MermaidBlock>;
      }
      return <code className={className}>{children}</code>;
    },
    blockquote({ children }) {
      const childArray = React.Children.toArray(children);
      
      const firstParagraph = childArray.find((c) => React.isValidElement(c));

      if (React.isValidElement(firstParagraph)) {
        const paragraphChildren = React.Children.toArray(firstParagraph.props.children);
        
        const firstText = paragraphChildren
          .map((c) => (typeof c === 'string' ? c : ''))
          .join('');

        const match = firstText.match(/^\[!([\w]+)\]\s*(.*)/s);
        if (match) {
          const type = match[1].toLowerCase();
          const title = match[2].split('\n')[0].trim(); // только первая строка — заголовок
          const bodyText = match[2].split('\n').slice(1).join('\n').trim(); // остальное — тело

          const styles: Record<string, { border: string; background: string; label: string }> = {
            attention: { border: '#f59e0b', background: '#fffbeb', label: '⚠ Важно' },
            summary:   { border: '#3b82f6', background: '#eff6ff', label: '📋 Кратко' },
            note:      { border: '#8b5cf6', background: '#f5f3ff', label: '📝 Примечание' },
            warning:   { border: '#ef4444', background: '#fef2f2', label: '🚨 Предупреждение' },
          };

          const s = styles[type] ?? { border: '#6b7280', background: '#f9fafb', label: type };

          return (
            <div style={{
              borderLeft: `4px solid ${s.border}`,
              background: s.background,
              borderRadius: '0 6px 6px 0',
              padding: '12px 16px',
              margin: '1rem 0',
            }}>
              <div style={{ fontWeight: 500, marginBottom: bodyText ? 8 : 0 }}>
                {title || s.label}
              </div>
              {bodyText && <p style={{ margin: 0 }}>{bodyText}</p>}
            </div>
          );
        }
      }

      return <blockquote>{children}</blockquote>;
    },
  };

  // --- Рендер ---
  return (
    <OlympAppLayout>
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center bg-practicum-page py-24">
          <Spin size="large" />
        </div>
      ) : error || !lesson ? (
        <div className="mx-auto max-w-[1100px] bg-practicum-page px-4 py-16 md:px-6">
          <Paragraph>{error ?? 'Нет данных'}</Paragraph>
          <Link to={`/courses/${courseSlug}`} className="font-medium text-accent1 hover:underline">
            ← К курсу
          </Link>
        </div>
      ) : (
        <div className="catalog-page catalog-page_wide prisma prisma_theme_light min-h-screen bg-practicum-page">

          {/* Шапка урока */}
          <section className="border-b border-light-border bg-gradient-to-b from-white via-practicum-mist/70 to-practicum-page">
            <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-6 md:py-14">
              <Breadcrumb
                className="!mb-6 text-[13px] text-light-text-secondary [&_a]:text-accent1 [&_a:hover]:underline [&_span]:text-light-text"
                items={[
                  { title: <Link to="/courses">Курсы</Link> },
                  { title: <Link to={`/courses/${courseSlug}`}>{courseTitle}</Link> },
                  { title: <span className="text-light-text">{lesson.title}</span> },
                ]}
              />

              {/* Номер урока */}
              {lesson.order > 0 && (
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-accent1">
                  Урок {lesson.order}
                </p>
              )}

              <Title
                level={1}
                className="!mb-3 !text-[1.75rem] !font-bold !leading-[1.15] !text-light-text md:!text-4xl"
              >
                {lesson.title}
              </Title>

              {lesson.teaser && (
                <Paragraph className="!mb-0 !text-base !leading-relaxed !text-light-text-secondary md:!text-lg">
                  {lesson.teaser}
                </Paragraph>
              )}
            </div>
          </section>

          {/* Контент урока */}
          <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-6 md:py-12">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-practicum-card md:p-10">
              {mdLoading ? (
                <div className="flex justify-center py-16">
                  <Spin />
                </div>
              ) : mdContent !== null ? (
                // MD-файл загружен — рендерим через ReactMarkdown
                <div className={proseLesson}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={components}
                  >
                    {mdContent}
                  </ReactMarkdown>
                </div>
              ) : lesson.contentHtml ? (
                // Fallback — HTML из post_content
                <div
                  className={proseLesson}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
                />
              ) : (
                // Нет ни MD-файла ни HTML
                <Paragraph type="secondary" className="!mb-0">
                  Содержимое урока появится позже.
                </Paragraph>
              )}
            </div>

            {/* Навигация prev / next */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <div>
                {prev ? (
                  <Link
                    to={`/courses/${courseSlug}/lessons/${prev.slug}`}
                    className="inline-flex items-center gap-1.5 text-[15px] font-medium text-accent1 hover:underline"
                  >
                    ← {prev.title}
                  </Link>
                ) : (
                  // Первый урок — ссылка назад к курсу
                  <Link
                    to={`/courses/${courseSlug}`}
                    className="inline-flex items-center gap-1.5 text-[15px] font-medium text-accent1 hover:underline"
                  >
                    ← К курсу
                  </Link>
                )}
              </div>

              <div className="text-right">
                {next ? (
                  <Link
                    to={`/courses/${courseSlug}/lessons/${next.slug}`}
                    className="inline-flex items-center gap-1.5 text-[15px] font-medium text-accent1 hover:underline"
                  >
                    {next.title} →
                  </Link>
                ) : (
                  // Последний урок — ссылка к курсу
                  <Link
                    to={`/courses/${courseSlug}`}
                    className="inline-flex items-center gap-1.5 text-[15px] font-medium text-light-text-secondary hover:text-accent1 hover:underline"
                  >
                    Завершить курс →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </OlympAppLayout>
  )
}