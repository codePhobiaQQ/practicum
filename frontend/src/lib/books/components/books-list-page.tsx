import { SearchOutlined } from '@ant-design/icons'
import { Button, Modal, Progress } from 'antd'
import { useMemo, useState } from 'react'
import { OlympAppLayout } from '@/app/layouts'

interface BookProgramItem {
  id: string
  title: string
  status: 'done' | 'current' | 'planned'
}

interface BookItem {
  slug: string
  title: string
  authors: string
  progressPercent: number
  program: BookProgramItem[]
}

const BOOKS: BookItem[] = [
  {
    slug: 'electronic-signature-and-cas',
    title: 'Лабораторный практикум. Электронная подпись и удостоверяющие центры',
    authors: 'Иванов И.И., Петров П.П.',
    progressPercent: 82,
    program: [
      { id: 'intro', title: 'Лабораторная работа 1. Введение', status: 'done' },
      { id: 'goskey', title: 'Лабораторная работа 2. Госключ', status: 'done' },
      { id: 'cryptopro', title: 'Лабораторная работа 3. КриптоПро УЦ', status: 'current' },
    ],
  },
]

function statusLabel(status: BookProgramItem['status']): string {
  if (status === 'done') return 'Пройден'
  if (status === 'current') return 'Текущий блок'
  return 'Запланирован'
}

export function BooksListPage() {
  const [query, setQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null)

  const books = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return BOOKS
    return BOOKS.filter((book) => `${book.title} ${book.authors}`.toLowerCase().includes(q))
  }, [query])

  return (
    <OlympAppLayout activeNav="books">
      <div className="min-h-screen">
        <div className="mb-8 w-full max-w-[580px]">
          <label className="group flex h-14 items-center gap-3 rounded-[15px] border border-[#e2e8f0] px-4 focus-within:border-[#140f55]/30">
            <SearchOutlined className="text-[18px] text-[#a0aec0]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по пособиям"
              className="h-full w-full border-0 bg-transparent text-[18px] text-[#2d3748] outline-none placeholder:text-[#a0aec0]"
            />
          </label>
        </div>

        {books.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-[18px] text-[#a0aec0]">Ничего не найдено. Измените запрос.</div>
        ) : (
          <div className="space-y-8">
            {books.map((book) => (
              <section
                key={book.slug}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBook(book)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedBook(book)
                  }
                }}
                className="cursor-pointer rounded-2xl bg-white px-5 py-6 transition-shadow hover:shadow-md md:px-8 md:py-8"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="mb-3 text-[14px] font-medium text-[#a0aec0] md:text-[16px]">{book.authors}</p>
                    <h1 className="mb-6 max-w-[980px] text-[30px] font-bold leading-[1.2] text-[#140f55] md:text-[40px]">
                      {book.title}
                    </h1>
                    <Progress
                      percent={book.progressPercent}
                      showInfo={false}
                      strokeColor="#319f43"
                      trailColor="#d9d9d9"
                      strokeLinecap="round"
                      className="!mb-1 !max-w-[860px]"
                    />
                    <p className="text-[14px] font-medium text-[#a0aec0]">Прогресс</p>
                  </div>

                  <Button
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedBook(book)
                    }}
                    className="!h-14 !rounded-[20px] !border-[#090651] !px-10 !text-[22px] !font-normal !text-[#090651] hover:!border-[#140f55] hover:!text-[#140f55]"
                  >
                    Открыть программу
                  </Button>
                </div>

                <div className="mt-10">
                  <h2 className="mb-5 text-[30px] font-medium leading-[1.2] text-[#140f55] md:text-[36px]">Программа пособия</h2>
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    {book.program.map((item) => (
                      <article key={item.id} className="flex min-h-[280px] flex-col justify-between rounded-2xl bg-[#fcfcff] p-5">
                        <h3 className="text-[32px] font-normal leading-[1.15] text-[#140f55]">{item.title}</h3>
                        <p className="text-[16px] font-medium text-[#140f55]">{statusLabel(item.status)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(selectedBook)}
        onCancel={() => setSelectedBook(null)}
        footer={null}
        width={920}
        title={
          <div className="pr-8">
            <p className="mb-1 text-[14px] font-medium text-[#a0aec0]">{selectedBook?.authors}</p>
            <p className="text-[22px] font-semibold leading-[1.2] text-[#140f55]">{selectedBook?.title}</p>
          </div>
        }
      >
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selectedBook?.program.map((item) => (
            <article key={item.id} className="flex min-h-[220px] flex-col justify-between rounded-2xl bg-[#fcfcff] p-5">
              <h3 className="text-[24px] font-normal leading-[1.2] text-[#140f55]">{item.title}</h3>
              <p className="text-[15px] font-medium text-[#140f55]">{statusLabel(item.status)}</p>
            </article>
          ))}
        </div>
      </Modal>
    </OlympAppLayout>
  )
}
