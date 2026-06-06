import { Col, Empty, Input, Row, Spin } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { OlympAppLayout } from '@/app/layouts'
import { fetchBooks } from '@/shared/api/books'
import { toBookViewModel, type BookViewModel } from '@shared/types/wordpress-book'
import { BookCard } from './book-card'

export function BooksListPage() {
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<BookViewModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchBooks()
      .then((posts) => {
        if (cancelled) return
        setBooks(posts.map(toBookViewModel))
        setError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Не удалось загрузить пособия. Проверьте WordPress и переменную VITE_WORDPRESS_URL.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return books
    return books.filter((b) =>
      `${b.title} ${b.teaser ?? ''}`.toLowerCase().includes(q),
    )
  }, [books, search])

  return (
    <OlympAppLayout activeNav="books">
      <div className="catalog-page prisma prisma_theme_light">
        <div className="mb-6">
          <Input
            size="large"
            allowClear
            placeholder="Поиск по пособиям..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={[
              '[&_.ant-input]:!text-[18px]',
              '[&_.ant-input]:!font-medium',
              '[&_.ant-input]:!text-[#0d062b]',
              '[&_.ant-input-affix-wrapper]:!h-[50px]',
              '[&_.ant-input-affix-wrapper]:!rounded-lg',
              '[&_.ant-input-affix-wrapper]:!border-0',
              '[&_.ant-input-affix-wrapper]:!bg-[#e4e4e4]',
              '[&_.ant-input-affix-wrapper]:!px-5',
              '[&_.ant-input-affix-wrapper]:!shadow-none',
            ].join(' ')}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Empty description={error} />
        ) : books.length === 0 ? (
          <Empty description="Пока нет опубликованных пособий в WordPress" />
        ) : filtered.length === 0 ? (
          <Empty description="Ничего не нашлось. Измените запрос." />
        ) : (
          <Row gutter={[20, 20]}>
            {filtered.map((book) => (
              <Col xs={24} sm={12} xl={8} key={book.id}>
                <BookCard book={book} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </OlympAppLayout>
  )
}