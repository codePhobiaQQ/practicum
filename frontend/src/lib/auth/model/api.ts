import { isAxiosError } from 'axios'
import { wordpressAxios } from '@shared/lib/api/wordpress-axios'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegistrationPayload extends LoginPayload {
  role?: string
  user_name: string
  group_number: string
}

type TokenResponse = string | { token?: string }

export interface WordPressRestErrorBody {
  code?: string
  message?: string
  data?: { status?: number }
}

/** Совпадает с кодами WP_Error из wp-api (Config / REST). */
const CODE_MESSAGES: Record<string, string> = {
  user_exists: 'Пользователь уже существует.',
  missing_params: 'Заполните все обязательные поля.',
  jwt_unavailable: 'Вход временно недоступен. Обратитесь к администратору.',
  'incorrect credentials': 'Неверный логин или пароль.',
  creation_failed: 'Не удалось завершить регистрацию. Попробуйте позже.',
  rest_missing_callback_param: 'Не переданы обязательные поля.',
  rest_invalid_param: 'Некорректные данные запроса.',
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function getWordPressAuthErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as WordPressRestErrorBody | undefined
    if (data && typeof data === 'object' && 'message' in data) {
      const raw = String(data.message ?? '')
      const cleaned = raw.includes('<') ? stripHtml(raw) : raw
      const code = data.code
      if (code && CODE_MESSAGES[code]) {
        return CODE_MESSAGES[code]
      }
      if (cleaned) {
        return cleaned
      }
    }
    return error.message || 'Запрос не выполнен'
  }
  const err = error as { message?: string }
  return err.message ?? 'Неизвестная ошибка'
}

function extractToken(response: TokenResponse): string {
  const token = typeof response === 'string' ? response : (response.token ?? '')
  if (!token) {
    throw new Error('Токен не получен')
  }
  return token
}

export async function login(payload: LoginPayload): Promise<string> {
  const { data } = await wordpressAxios.post<TokenResponse>('/custom/v2/auth/login', payload)
  return extractToken(data)
}

export async function registration(payload: RegistrationPayload): Promise<string> {
  const body = {
    ...payload,
    user_name: payload.user_name.trim(),
    group_number: payload.group_number.trim(),
  }
  const { data } = await wordpressAxios.post<TokenResponse>('/custom/v2/auth/registration', body)
  return extractToken(data)
}
