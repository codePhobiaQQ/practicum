import {
  ApiOutlined,
  BookOutlined,
  LogoutOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import logo from "@assets/logo.png"
import { Dropdown, Image } from 'antd'
import type { MenuProps } from 'antd'
import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppState } from '@app/contexts'
import { getProfileMetadata, type ProfileMetadata } from '@lib/profile'
import { BOOKS_ROUTE_PATH } from '@shared/config/books'

export type OlympNavKey = 'books' | 'labs' | 'useful' | 'profile'

export type OlympAppLayoutProps = {
  children: ReactNode
  /** Активный пункт левого меню (как в макете v-olymp). */
  activeNav?: OlympNavKey
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) {
    return (p[0]![0]! + p[1]![0]!).toUpperCase()
  }
  const one = p[0] ?? '?'
  return one.slice(0, 2).toUpperCase()
}

const navMeta: {
  key: OlympNavKey
  to: string
  label: ReactNode
  Icon: typeof ReadOutlined
}[] = [
    {
      key: 'books',
      to: BOOKS_ROUTE_PATH,
      label: (
        <span className="block leading-[1.1]">
          Пособия
        </span>
      ),
      Icon: BookOutlined,
    },
    {
      key: 'labs',
      to: '/',
      label: (
        <span className="block leading-[1.1]">
          Лабораторные
          <br />
          работы
        </span>
      ),
      Icon: ApiOutlined,
    },
    { key: 'profile', to: '/profile', label: 'Профиль', Icon: UserOutlined },
  ]

export function OlympAppLayout(props: OlympAppLayoutProps) {
  const { children, activeNav } = props
  const { auth, logout } = useAppState()
  const [metadata, setMetadata] = useState<ProfileMetadata | null>(null)

  const { pathname } = useLocation()

  const displayName = metadata?.user_name?.trim() || auth.authData?.username || 'Пользователь'
  const groupNumber = metadata?.group_number?.trim() || ''

  const resolvedActiveNav: OlympNavKey = (() => {
    if (activeNav) return activeNav
    return 'labs'
  })()

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined aria-hidden />,
      label: <Link to="/personal-account">Профиль</Link>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined aria-hidden />,
      danger: true,
      label: 'Выйти',
    },
  ]

  const onUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      void logout()
    }
  }

  useEffect(() => {
    let cancelled = false
    getProfileMetadata()
      .then((data) => {
        if (!cancelled) {
          setMetadata(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetadata(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7] font-sans antialiased">
      <header className="sticky top-0 z-40 bg-[#f7f7f7] px-4 pb-4 pt-4 lg:px-10 xl:px-[60px]">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="w-full min-w-0 lg:w-[297px] lg:max-w-[297px] lg:shrink-0">
            <Link to="/">
              <Image preview={false} src={logo} alt="logo" height={31} />
            </Link>
          </div>

          <div className="flex shrink-0 justify-end lg:self-start lg:pt-1">
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: onUserMenuClick,
                selectedKeys: pathname.startsWith('/personal-account') ? ['profile'] : [],
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button
                type="button"
                className="flex max-w-[220px] cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent p-1.5 text-left outline-none ring-[#3d33a9]/30 transition-opacity hover:opacity-90 focus-visible:ring-2 sm:max-w-none sm:gap-4"
                aria-haspopup="menu"
                aria-label="Меню аккаунта"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3d33a9] text-[12px] font-bold text-white sm:h-12 sm:w-12 sm:text-[13px]">
                  {initials(displayName)}
                </div>

                <p className="hidden truncate text-[18px] font-medium leading-tight text-[#0f0f0f] sm:block sm:text-[20px]">
                  {displayName}
                </p>
                {groupNumber ? (
                  <p className="hidden truncate text-[12px] font-medium text-[#0f0f0f]/65 sm:block">
                    {groupNumber}
                  </p>
                ) : null}
              </button>
            </Dropdown>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:gap-10 lg:px-10 lg:pb-12 lg:pt-8 xl:px-[60px]">
        <aside className="shrink-0 px-6 pt-2 lg:w-[297px] lg:px-0 lg:pt-0">

          <div className="h-px w-full bg-black/[0.08] mb-4" aria-hidden />

          <nav className="flex flex-col gap-2" aria-label="Разделы портала">
            {navMeta.map(({ key, to, label, Icon }) => {
              const active = resolvedActiveNav === key
              return (
                <Link
                  key={key}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[73px] items-center gap-4 rounded-[15px] px-4 py-3 transition-colors ${active
                    ? 'bg-white text-[#140f55] shadow-[0px_3.5px_5.5px_rgba(0,0,0,0.02)]'
                    : 'text-[#a0aec0] hover:bg-white/60'
                    }`}
                >
                  <span
                    className={`flex h-[41px] w-[41px] shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#140f55] text-white' : 'bg-white text-[#a0aec0] shadow-[0px_3.5px_5.5px_rgba(0,0,0,0.02)]'
                      }`}
                  >
                    <Icon className="text-[18px]" aria-hidden />
                  </span>

                  <span className={`text-[20px] font-bold leading-none ${active ? 'text-[#140f55]' : ''}`}>{label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-6 pb-10 lg:px-0 lg:pb-0">{children}</main>
      </div>
    </div>
  )
}
