import cn from 'classnames'
import { ReactNode, useState } from 'react'
import type { MenuProps } from 'antd'
import { Menu } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

type MenuItem = Required<MenuProps>['items'][number]

interface PersonalAccountLayoutProps {
  children?: ReactNode
}

const items: MenuItem[] = [
  {
    key: '/personal-account',
    label: 'Главная',
    icon: <HomeOutlined />,
  },
]

export const PersonalAccountLayout = (props: PersonalAccountLayoutProps) => {
  const [current, setCurrent] = useState('1')
  const [collapsed, setCollapsed] = useState(false)
  const { children } = props
  const navigate = useNavigate()

  const onClick: MenuProps['onClick'] = (e) => {
    setCurrent(e.key)
    return navigate(e.key)
  }

  return (
    <div className={cn('flex h-screen overflow-x-hidden overflow-y-auto text-sm')}>
      <div
        className={cn(
          'flex flex-shrink-0 flex-col border-r border-light-border bg-white transition-all duration-300',
          collapsed ? 'w-20' : 'w-80'
        )}
      >
        <div className="flex items-center justify-between border-b border-light-border px-6 py-4">
          {!collapsed && <h1 className="text-xl font-bold text-accent1">Portal</h1>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center rounded-lg p-2 hover:bg-light-card"
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? (
              <MenuUnfoldOutlined className="text-lg" />
            ) : (
              <MenuFoldOutlined className="text-lg" />
            )}
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <Menu
            onClick={onClick}
            theme="light"
            selectedKeys={[current]}
            mode="inline"
            items={items}
            inlineCollapsed={collapsed}
            className="border-none"
          />
          <div className="mt-auto flex justify-center pb-4">
            <Link to="/courses" className="text-sm text-accent1 hover:underline">
              К курсам
            </Link>
          </div>
        </div>

        <div className="border-t border-light-border px-4 py-4">
          <div className="rounded-lg bg-light-card p-4">
            {!collapsed && (
              <>
                <p className="text-xs font-semibold text-light-text-secondary">Версия</p>
                <p className="text-sm text-light-text">1.0.0</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto bg-light-bg">
        {children}
      </div>
    </div>
  )
}
