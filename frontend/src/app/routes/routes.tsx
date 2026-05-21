import { ReactNode } from 'react'
import { LayoutsType } from '@shared/types/layouts'
import { CourcesListPage, CourseDetailPage } from '@lib/courses'

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
    // -----------------
    // PUBLIC — курсы (WordPress)
    // -----------------
    {
      path: '/courses/:slug',
      element: <CourseDetailPage />,
    },
    {
    path: '/courses',
    element: <CourcesListPage />,
  },
  ]
