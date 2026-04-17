import { Route, Routes } from 'react-router-dom'
import { routes } from '@app/routes'
import { PersonalAccountLayout } from '@/app/layouts/personal-account-layout'
import { AuthOnly } from '@app/providers'
import { Suspense } from 'react'
import { PageLoader } from '@/shared/components/loaders/PageLoader/PageLoader'
import '@shared/styles/index.scss'

const RoutesItems = routes.map((route) => {
  let finalComponent = route.element

  if (route.layoutVariant === 'personalAccount') {
    finalComponent = (
      <AuthOnly>
        <PersonalAccountLayout>{route.element}</PersonalAccountLayout>
      </AuthOnly>
    )
  }

  return (
    <Route
      key={route.path}
      path={route.path}
      element={<Suspense fallback={<PageLoader />}>{finalComponent}</Suspense>}
    />
  )
})

function App() {
  return (
    <Routes>{RoutesItems}</Routes>
  )
}

export default App
