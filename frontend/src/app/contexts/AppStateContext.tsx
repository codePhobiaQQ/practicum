import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { notification } from 'antd'
import { jwtDecode } from 'jwt-decode'
import { getWordPressAuthErrorMessage, login as authLogin } from '@lib/auth/model/api'
import { USER_LOCALSTORAGE_KEY } from '@shared/config/storage'
import type { AuthSchema, UserSchema } from './types'

export interface AppStateContextValue {
  auth: AuthSchema
  setAuthData: (data: UserSchema | undefined) => void
  setIsInit: (value: boolean) => void
  setPopupVisible: (visible: boolean) => void
  login: (credentials: { username: string; password: string }) => Promise<string | void>
  logout: () => Promise<void>
  initAuthData: () => Promise<void>
}

const initialState: AuthSchema = {
  _inited: false,
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

interface AppStateProviderProps {
  children?: ReactNode
}

function getErrorMessage(e: unknown): string {
  const msg = getWordPressAuthErrorMessage(e)
  notification.error({ message: msg })
  return msg
}

export function AppStateProvider(props: AppStateProviderProps) {
  const { children } = props
  const [auth, setAuthState] = useState<AuthSchema>(initialState)

  const setAuthData = useCallback((authData: UserSchema | undefined) => {
    setAuthState((s) => ({ ...s, authData }))
  }, [])

  const setIsInit = useCallback((_inited: boolean) => {
    setAuthState((s) => ({ ...s, _inited }))
  }, [])

  const setPopupVisible = useCallback((authPopupOpen: boolean) => {
    setAuthState((s) => ({ ...s, authPopupOpen }))
  }, [])

  const initAuthData = useCallback(async () => {
    const token = localStorage.getItem(USER_LOCALSTORAGE_KEY)
    if (!token) {
      setAuthState((s) => ({ ...s, _inited: true }))
      return
    }
    try {
      const decoded = jwtDecode<{ sub?: string; data?: { user_login?: string } }>(token)
      const username =
        decoded.data?.user_login ?? decoded.sub ?? (decoded as { user_login?: string }).user_login ?? ''
      setAuthState((s) => ({ ...s, _inited: true, authData: { username } }))
    } catch {
      setAuthState((s) => ({ ...s, _inited: true }))
    }
  }, [])

  const login = useCallback(
    async (credentials: { username: string; password: string }) => {
      try {
        const token = await authLogin(credentials)
        localStorage.setItem(USER_LOCALSTORAGE_KEY, token)
        notification.success({ message: 'Авторизация успешно пройдена' })
        await initAuthData()
      } catch (e: unknown) {
        return getErrorMessage(e)
      }
    },
    [initAuthData]
  )

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(USER_LOCALSTORAGE_KEY)
      setAuthState((s) => ({ ...s, authData: undefined }))
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    initAuthData()
  }, [initAuthData])

  const value = useMemo<AppStateContextValue>(
    () => ({
      auth,
      setAuthData,
      setIsInit,
      setPopupVisible,
      login,
      logout,
      initAuthData,
    }),
    [auth, setAuthData, setIsInit, setPopupVisible, login, logout, initAuthData]
  )

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}
