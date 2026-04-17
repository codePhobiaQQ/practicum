import { Typography } from 'antd'
import { Link } from 'react-router-dom'
import type { CourseViewModel } from '@shared/types/wordpress-course'

const { Paragraph, Title } = Typography

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

export function CourseCard({ course }: { course: CourseViewModel }) {
  const blurb = course.teaser?.trim() || stripHtml(course.excerptHtml) || course.subtitle
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group block h-full rounded-2xl bg-white shadow-practicum-card outline-none ring-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-practicum-card-hover focus-visible:ring-2 focus-visible:ring-accent1/40"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.04]">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-practicum-mist">
          {course.coverUrl ? (
            <img
              src={course.coverUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-practicum-violet via-[#2d1b69] to-practicum-ink" />
          )}
        </div>
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          {course.categoryLabel ? (
            <span className="mb-2 inline-flex w-fit rounded-full bg-practicum-mist px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent1">
              {course.categoryLabel}
            </span>
          ) : null}
          <Title level={4} className="!mb-2 !text-[1.125rem] !font-bold !leading-snug !text-light-text md:!text-xl">
            {course.title}
          </Title>
          {course.duration ? (
            <Paragraph className="!mb-2 !text-[13px] !font-medium !text-light-text-secondary">{course.duration}</Paragraph>
          ) : null}
          {blurb ? (
            <Paragraph className="!mb-0 line-clamp-3 !text-[15px] !leading-relaxed !text-light-text-secondary">
              {blurb}
            </Paragraph>
          ) : null}
          <span className="mt-4 text-[15px] font-medium text-accent1 opacity-0 transition-opacity group-hover:opacity-100">
            Подробнее →
          </span>
        </div>
      </article>
    </Link>
  )
}
