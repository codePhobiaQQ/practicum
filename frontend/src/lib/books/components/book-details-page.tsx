import { LeftOutlined } from '@ant-design/icons'
import { Button, Progress } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { OlympAppLayout } from '@/app/layouts'
import { BOOKS_ROUTE_PATH } from '@shared/config/books'

interface BookChapter {
  id: string
  title: string
  status: 'done' | 'current' | 'planned'
  description: string
}

interface BookDetails {
  slug: string
  title: string
  authors: string
  progressPercent: number
  chapters: BookChapter[]
}

const BOOKS: BookDetails[] = [
  {
    slug: 'electronic-signature-and-cas',
    title: 'Лабораторный практикум. Электронная подпись и удостоверяющие центры',
    authors: 'Иванов И.И., Петров П.П.',
    progressPercent: 82,
    chapters: [
      {
        id: 'intro',
        title: 'Лабораторная работа 1. Введение',
        status: 'done',
        description: 'Базовые понятия электронной подписи, виды сертификатов и роль удостоверяющего центра.',
      },
      {
        id: 'goskey',
        title: 'Лабораторная работа 2. Госключ',
        status: 'done',
        description: 'Практика использования сервиса Госключ, выпуск и проверка подписанного документа.',
      },
      {
        id: 'cryptopro',
        title: 'Лабораторная работа 3. КриптоПро УЦ',
        status: 'current',
        description: 'Настройка рабочего места, выпуск сертификата и базовые операции в КриптоПро УЦ.',
      },
    ],
  },
]

function chapterBadge(status: BookChapter['status']): string {
  if (status === 'done') return 'Пройден'
  if (status === 'current') return 'Текущий блок'
  return 'Запланирован'
}

export function BookDetailsPage() {
  const { slug } = useParams<{ slug: string }>()
  const book = BOOKS.find((item) => item.slug === slug) ?? BOOKS[0]
  const currentChapter = book.chapters.find((ch) => ch.status === 'current') ?? book.chapters[0]

  return (
    <OlympAppLayout activeNav="books">
      <div className="catalog-page catalog-page_wide prisma prisma_theme_light min-h-screen">
        <div className="mb-5">
          <Link to={BOOKS_ROUTE_PATH} className="inline-flex items-center gap-2 text-[16px] font-medium text-[#140f55] hover:underline">
            <LeftOutlined className="text-[14px]" />
            К списку пособий
          </Link>
        </div>

        <section className="mb-6 rounded-2xl bg-white px-5 py-6 md:px-8 md:py-8">
          <p className="mb-3 text-[14px] font-medium text-[#a0aec0] md:text-[16px]">{book.authors}</p>
          <h1 className="mb-5 max-w-[1000px] text-[30px] font-bold leading-[1.2] text-[#140f55] md:text-[40px]">{book.title}</h1>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full max-w-[860px]">
              <Progress
                percent={book.progressPercent}
                showInfo={false}
                strokeColor="#319f43"
                trailColor="#d9d9d9"
                strokeLinecap="round"
                className="!mb-1"
              />
              <p className="text-[14px] font-medium text-[#a0aec0]">Прогресс</p>
            </div>
            <Button className="!h-14 !rounded-[20px] !border-[#090651] !px-10 !text-[22px] !font-normal !text-[#090651]">
              Продолжить
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-white p-5">
            <h2 className="mb-4 text-[24px] font-bold text-[#140f55]">Программа пособия</h2>
            <nav className="space-y-3">
              {book.chapters.map((chapter) => {
                const isCurrent = chapter.id === currentChapter.id
                return (
                  <button
                    type="button"
                    key={chapter.id}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${isCurrent
                      ? 'border-[#140f55]/20 bg-[#140f55]/5'
                      : 'border-black/[0.06] bg-white hover:bg-[#140f55]/[0.02]'
                      }`}
                  >
                    <p className="mb-1 text-[20px] leading-[1.15] text-[#140f55]">{chapter.title}</p>
                    <p className="text-[14px] font-medium text-[#140f55]/75">{chapterBadge(chapter.status)}</p>
                  </button>
                )
              })}
            </nav>
          </aside>

          <article className="rounded-2xl bg-white p-6 md:p-8">
            <p className="mb-2 text-[16px] font-medium text-[#140f55]/75">{chapterBadge(currentChapter.status)}</p>
            <h3 className="mb-4 text-[32px] leading-[1.2] text-[#140f55]">{currentChapter.title}</h3>
            <p className="mb-8 max-w-[900px] text-[20px] leading-[1.4] text-[#2d3748]">{currentChapter.description}</p>
            <Button
              type="primary"
              className="!h-12 !rounded-xl !border-0 !bg-[#140f55] !px-7 !text-[18px] !font-medium hover:!bg-[#0f0b45]"
            >
              Перейти к лабораторной работе
            </Button>
          </article>
        </div>
      </div>
    </OlympAppLayout>
  )
}
