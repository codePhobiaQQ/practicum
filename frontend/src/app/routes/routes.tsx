import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { LayoutsType } from '@shared/types/layouts'
import { HomeOutlined } from '@ant-design/icons'
import { CourseDetailPage, CoursesPage } from '@lib/courses'
import { PersonalAccountHome } from '@/app/pages/personal-account-home'

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
      element: <Navigate to="/courses" replace />,
    },
    // -----------------
    // PUBLIC — курсы (WordPress)
    // -----------------
    {
      path: '/courses',
      element: <CoursesPage />,
    },
    {
      path: '/courses/:slug',
      element: <CourseDetailPage />,
    },

    // -----------------
    // QUICK NAVIGATION
    // -----------------
    {
      path: '/personal-account',
      navIcon: <HomeOutlined />,
      element: <PersonalAccountHome />,
      layoutVariant: 'personalAccount',
    },
  ]
