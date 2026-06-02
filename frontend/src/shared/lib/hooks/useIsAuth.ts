import { useMemo } from 'react'
import { useAppState } from '@app/contexts'

/** `isReady` — `initAuthData` уже отработал; `isAuth` — есть валидный контекст пользователя по токену. */
export function useIsAuth(): { isAuth: boolean; isReady: boolean } {
  const { auth } = useAppState()

  return useMemo(
    () => ({
      isReady: auth._inited,
      isAuth: auth._inited && Boolean(auth.authData),
    }),
    [auth._inited, auth.authData],
  )
}
