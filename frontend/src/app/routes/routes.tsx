import { ReactNode } from 'react'
import { LayoutsType } from '@shared/types/layouts'
import { CourcesListPage, CourseDetailPage } from '@lib/courses'
import { ProfilePage } from '@lib/profile'
import { BOOKS_DETAIL_ROUTE_PATH, BOOKS_ROUTE_PATH } from '@shared/config/books'
import { BooksListPage } from '@/lib/books/components/books-list-page'
import { BookDetailsPage } from '@/lib/books/components/book-details-page'

export const getQuickNavigationRoute = () => "/personal-account"

export const routes: {
  path: string
  navLabel?: string
  navIcon?: ReactNode
  element: ReactNode
  layoutVariant?: LayoutsType
}[] = [
    {
      path: '/',
      element: <CourcesListPage />,
    },
    {
      path: BOOKS_ROUTE_PATH,
      element: <BooksListPage />,
    },
    // -----------------
    // PUBLIC — курсы (WordPress)
    // -----------------
    {
      path: '/courses/:slug',
      element: <CourseDetailPage />,
    },
    {
      path: BOOKS_DETAIL_ROUTE_PATH,
      element: <BookDetailsPage />,
    },
    {
      path: '/profile',
      element: <ProfilePage />,
    },
  ]