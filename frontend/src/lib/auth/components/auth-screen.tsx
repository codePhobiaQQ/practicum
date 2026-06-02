import { Button, Form, Input, Typography, notification } from 'antd'
import { useState } from 'react'
import { useAppState } from '@app/contexts/AppStateContext'
import { USER_LOCALSTORAGE_KEY } from '@shared/config/storage'
import { getWordPressAuthErrorMessage, login, registration } from '../model/api'
import bg from '@assets/bg.jpg'

const { Title, Text } = Typography

interface AuthFormValues {
  email: string
  password: string
}

interface RegistrationFormValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  groupNumber: string
}

function HeroPanel() {
  return (
    <section
      className="hidden bg-[#140d63] bg-cover bg-center bg-no-repeat lg:block"
      style={{ backgroundImage: `url(${bg})` }}
    />
  )
}

function ScreenHeader() {
  return (
    <>
      <Title level={1} className="!mb-4 !text-center !text-[32px] !leading-tight !text-[#333333]">
        Добро пожаловать
        <br />
        на учебный портал!
      </Title>
      <Text className="!mx-auto !mb-16 !block !max-w-[543px] !text-center !text-[20px] !leading-7 !text-[#333333]">
        Пройдите процедуру авторизации и получите доступ к учебным пособиям и лабораторным работам
      </Text>
    </>
  )
}

function LoginForm({
  onSubmit,
  onSwitch,
  loading,
}: {
  onSubmit: (values: AuthFormValues) => Promise<void>
  onSwitch: () => void
  loading: boolean
}) {
  return (
    <Form<AuthFormValues> layout="vertical" onFinish={onSubmit} requiredMark={false}>
      <Form.Item
        label={<span className="text-[20px] text-[#333333]">Логин</span>}
        name="email"
        rules={[
          { required: true, message: 'Введите логин' },
          { type: 'email', message: 'Некорректный email' },
        ]}
      >
        <Input
          size="large"
          autoComplete="email"
          placeholder="example"
          className="!h-12 !rounded-md !border-[#e5e5e5] !bg-[#f2f2f2]"
        />
      </Form.Item>

      <Form.Item
        label={<span className="text-[20px] text-[#333333]">Пароль</span>}
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
        className="!mb-1"
      >
        <Input.Password
          size="large"
          autoComplete="current-password"
          placeholder="Мин 4 символа"
          className="!h-12 !rounded-md !border-[#e5e5e5] !bg-[#f2f2f2]"
        />
      </Form.Item>

      <Button
        type="primary"
        htmlType="submit"
        size="large"
        loading={loading}
        className="mt-14 !mx-auto !mb-12 !block !h-14 !w-full !max-w-[260px] !rounded-[20px] !bg-[#090651] !text-base hover:!bg-[#090651]/95"
      >
        Войти
      </Button>

      <div className="text-center">
        <button type="button" onClick={onSwitch} className="text-[20px] text-[#1677ff] underline">
          Впервые на портале? Зарегистрироваться
        </button>
      </div>
    </Form>
  )
}

function RegistrationForm({
  onSubmit,
  onSwitch,
  loading,
}: {
  onSubmit: (values: RegistrationFormValues) => Promise<void>
  onSwitch: () => void
  loading: boolean
}) {
  return (
    <Form<RegistrationFormValues> layout="vertical" onFinish={onSubmit} requiredMark={false}>
      <Form.Item
        label={<span className="text-[20px] text-[#333333]">ФИО пользователя</span>}
        name="fullName"
        rules={[{ required: true, message: 'Введите ФИО' }]}
      >
        <Input
          size="large"
          autoComplete="name"
          placeholder="Иванов Иван Иванович"
          className="!h-12 !rounded-md !border-[#e5e5e5] !bg-[#f2f2f2]"
        />
      </Form.Item>

      <Form.Item
        label={<span className="text-[20px] text-[#333333]">Логин</span>}
        name="email"
        rules={[
          { required: true, message: 'Введите логин' },
          { type: 'email', message: 'Некорректный email' },
        ]}
      >
        <Input
          size="large"
          autoComplete="email"
          placeholder="example"
          className="!h-12 !rounded-md !border-[#e5e5e5] !bg-[#f2f2f2]"
        />
      </Form.Item>

      <Form.Item
        label={<span className="text-[20px] text-[#333333]">Пароль</span>}
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password
          size="large"
          autoComplete="new-password"
          placeholder="Мин 4 символа"
          className="!h-12 !rounded-md !border-[#e5e5e5] !bg-[#f2f2f2]"
        />
      </Form.Item>

      <Form.Item
        label={<span className="text-[20px] text-[#333333]">Повторите пароль</span>}
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Повторите пароль' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }
              return Promise.reject(new Error('Пароли не совпадают'))
            },
          }),
        ]}
      >
        <Input.Password
          size="large"
          autoComplete="new-password"
          placeholder="Мин 4 символа"
          className="!h-12 !rounded-md !border-[#e5e5e5] !bg-[#f2f2f2]"
        />
      </Form.Item>

      <Form.Item
        label={<span className="text-[20px] text-[#333333]">№ группы (потока ПК)</span>}
        name="groupNumber"
        rules={[{ required: true, message: 'Введите номер группы' }]}
      >
        <Input
          size="large"
          placeholder="Мин 4 символа"
          className="!h-12 !rounded-md !border-[#e5e5e5] !bg-[#f2f2f2]"
        />
      </Form.Item>

      <Button
        type="primary"
        htmlType="submit"
        size="large"
        loading={loading}
        className="!mx-auto !mb-12 !mt-2 !block !h-14 !w-full !max-w-[260px] !rounded-[20px] !bg-[#090651] !text-base hover:!bg-[#090651]/95"
      >
        Регистрация
      </Button>

      <div className="text-center">
        <button type="button" onClick={onSwitch} className="text-[20px] text-[#1677ff] underline">
          Уже зарегистрированы? Войти
        </button>
      </div>
    </Form>
  )
}

export function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'registration'>('login')
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isRegistrationLoading, setIsRegistrationLoading] = useState(false)
  const { initAuthData } = useAppState()

  const handleLoginSubmit = async (values: AuthFormValues) => {
    setIsLoginLoading(true)
    try {
      const token = await login({
        username: values.email,
        password: values.password,
      })

      localStorage.setItem(USER_LOCALSTORAGE_KEY, token)
      await initAuthData()
      notification.success({ message: 'Авторизация успешно пройдена' })
    } catch (e) {
      notification.error({ message: getWordPressAuthErrorMessage(e) })
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleRegistrationSubmit = async (values: RegistrationFormValues) => {
    setIsRegistrationLoading(true)
    try {
      const token = await registration({
        username: values.email,
        password: values.password,
        user_name: values.fullName,
        group_number: values.groupNumber,
      })

      localStorage.setItem(USER_LOCALSTORAGE_KEY, token)
      await initAuthData()
      notification.success({ message: 'Регистрация успешно завершена' })
    } catch (e) {
      notification.error({ message: getWordPressAuthErrorMessage(e) })
    } finally {
      setIsRegistrationLoading(false)
    }
  }

  return (
    <div className="auth-screen-font grid min-h-screen bg-[#f7f7ff] lg:grid-cols-[1.03fr_1fr]">
      <HeroPanel />

      <section className="flex items-center justify-center px-6 py-10 md:px-10">
        <div className="w-full max-w-[642px]">
          <div className="overflow-hidden">
            <div
              className="flex w-[200%] transition-transform duration-500 ease-in-out"
              style={{ transform: activeTab === 'login' ? 'translateX(0%)' : 'translateX(-50%)' }}
            >
              <div className="w-1/2 shrink-0 pr-1">
                <ScreenHeader />
                <LoginForm
                  onSubmit={handleLoginSubmit}
                  onSwitch={() => setActiveTab('registration')}
                  loading={isLoginLoading}
                />
              </div>

              <div className="w-1/2 shrink-0 pl-1">
                <Title level={1} className="!mb-12 !text-center !text-[42px] !leading-tight !text-[#333333]">
                  Регистрация
                </Title>
                <RegistrationForm
                  onSubmit={handleRegistrationSubmit}
                  onSwitch={() => setActiveTab('login')}
                  loading={isRegistrationLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
