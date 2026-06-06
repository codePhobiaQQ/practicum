import { Link } from 'react-router-dom'
import { Typography } from 'antd'
import type { BookViewModel } from '@shared/types/wordpress-book'
import { getBookRoute } from '@shared/config/books'

const { Title, Paragraph } = Typography

export function BookCard({ book }: { book: BookViewModel }) {
  return (
    <Link
      to={getBookRoute(book.slug)}
      className="group block h-full rounded-2xl bg-white shadow-practicum-card outline-none ring-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-practicum-card-hover focus-visible:ring-2 focus-visible:ring-accent1/40"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.04]">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-practicum-mist">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-practicum-mist via-[#ece8ff] to-[#e0f7fa]" />
          )}
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          <Title
            level={4}
            className="!mb-2 !text-[1.125rem] !font-bold !leading-snug !text-light-text md:!text-xl"
          >
            {book.title}
          </Title>

          {book.duration ? (
            <Paragraph className="!mb-2 !text-[13px] !font-medium !text-light-text-secondary">
              {book.duration}
            </Paragraph>
          ) : null}

          {book.teaser ? (
            <Paragraph className="!mb-0 line-clamp-3 !text-[15px] !leading-relaxed !text-light-text-secondary">
              {book.teaser}
            </Paragraph>
          ) : null}

          <span className="mt-4 text-[15px] font-medium text-accent1 transition-opacity group-hover:opacity-100">
            Открыть пособие →
          </span>
        </div>
      </article>
    </Link>
  )
}