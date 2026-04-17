import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PracticumLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-practicum-page font-sans text-light-text antialiased">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-practicum-ink text-white shadow-practicum-section">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3.5 md:px-6">
          <Link
            to="/courses"
            className="text-[17px] font-semibold tracking-tight text-white hover:text-white/90"
          >
            Курсы
          </Link>
          <nav className="flex items-center gap-8 text-[15px]">
            <Link to="/courses" className="text-white/85 transition-colors hover:text-white">
              Каталог
            </Link>
            <Link to="/personal-account" className="text-white/85 transition-colors hover:text-white">
              Личный кабинет
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
