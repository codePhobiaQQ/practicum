import { ReactNode } from 'react'

interface AuthOnlyProps {
  children?: ReactNode
}

/** Раньше ограничивал доступ; приложение работает без входа. */
export const AuthOnly = (props: AuthOnlyProps) => {
  const { children } = props
  return children
}
