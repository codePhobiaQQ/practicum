import { Route, Routes } from 'react-router-dom'
import { routes } from '@app/routes'
import { Suspense } from 'react'
import { PageLoader } from '@shared/components/loaders/PageLoader/PageLoader'
import { AuthScreen } from '@/lib/auth'
import { useIsAuth } from '@shared/lib/hooks/useIsAuth'
import '@shared/styles/index.scss'

const RoutesItems = routes.map((route) => {
  let finalComponent = route.element

  return (
    <Route
      key={route.path}
      path={route.path}
      element={<Suspense fallback={<PageLoader />}>{finalComponent}</Suspense>}
    />
  )
})

function App() {
  const { isAuth, isReady } = useIsAuth()

  if (!isReady) {
    return <PageLoader />
  }

  if (!isAuth) {
    return <AuthScreen />
  }

  return <Routes>{RoutesItems}</Routes>
}

export default App
