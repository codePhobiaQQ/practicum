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
            <div className="h-full w-full bg-gradient-to-br from-practicum-mist via-[#ece8ff] to-[#e0f7fa]" />
          )}
        </div>
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {course.categoryLabels.map((s) => (
              <span
                key={s}
                className="inline-flex rounded-full bg-[#eeecff] px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#140f55]"
              >
                {s}
              </span>
            ))}
            {course.subjectLabels.map((s) => (
              <span
                key={s}
                className="inline-flex w-fit rounded-md border border-black/[0.06] bg-white px-2 py-0.5 text-[11px] font-medium text-light-text-secondary"
              >
                {s}
              </span>
            ))}
            {course.streamLabels.map((s) => (
              <span
                key={`stream-${s}`}
                className="inline-flex w-fit rounded-md border border-dashed border-accent1/30 bg-accent1/[0.05] px-2 py-0.5 text-[11px] font-medium text-accent1"
              >
                {s}
              </span>
            ))}
          </div>
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

          <span className="mt-4 text-[15px] font-medium text-accent1 transition-opacity group-hover:opacity-100">
            Подробнее →
          </span>
        </div>
      </article>
    </Link>
  )
}
