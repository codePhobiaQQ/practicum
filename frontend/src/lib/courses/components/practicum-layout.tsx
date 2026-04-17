import { BookOutlined } from '@ant-design/icons'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PracticumLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-practicum-page font-sans text-light-text antialiased">
      <header className="sticky top-0 z-50 border-b border-light-border bg-white/95 shadow-practicum-section backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-3.5 md:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight text-light-text hover:text-accent1"
          >
            <BookOutlined className="text-xl text-accent1" aria-hidden />
            Практикум
          </Link>

          <nav className="flex items-center gap-8 text-[15px]">
            <Link to="/courses" className="text-light-text-secondary transition-colors hover:text-accent1">
              Список курсов
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-light-border bg-white py-10 text-center text-sm text-light-text-secondary">
        Учебный проект
      </footer>
    </div>
  )
}
