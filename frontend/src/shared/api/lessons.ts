import axios, { AxiosInstance } from 'axios'
import type { WpLessonPost } from '@shared/types/wordpress-lesson'
import { sortLessonsByOrder, toLessonViewModel, type LessonViewModel } from '@shared/types/wordpress-lesson'

function getBaseUrl(): string {
  const raw = import.meta.env.VITE_WORDPRESS_URL as string | undefined
  if (!raw) {
    console.warn('VITE_WORDPRESS_URL is not set; WordPress API calls will fail.')
  }
  return raw ? raw.replace(/\/$/, '') : ''
}

function createClient(): AxiosInstance {
  const base = getBaseUrl()
  return axios.create({
    baseURL: base ? `${base}/wp-json/wp/v2` : '/wp-json/wp/v2',
    timeout: 20000,
  })
}

const client = createClient()

/**
 * Загружает все уроки курса по ID курса.
 * Фильтрует по мета-полю `lesson_course` через WP REST API.
 * Возвращает уроки отсортированные по `lesson_order` (возрастание).
 *
 * Эндпоинт: GET /wp-json/wp/v2/lesson?meta_key=lesson_course&meta_value={courseId}&per_page=100
 *
 * Важно: фильтрация по мета-полям требует чтобы поле было зарегистрировано
 * через `register_meta` или `register_rest_field` в WordPress.
 * Если фильтрация не работает — см. комментарий в теле функции.
 */
export async function fetchLessonsByCourseId(courseId: number): Promise<LessonViewModel[]> {
  if (!courseId) {
    return []
  }

  const { data } = await client.get<WpLessonPost[]>('/lesson', {
    params: {
      // Фильтрация по мета-полю lesson_course
      meta_key: 'lesson_course',
      meta_value: courseId,
      per_page: 100,
      orderby: 'meta_value_num',  // сортировка на стороне WP как fallback
      meta_key_orderby: 'lesson_order',
      order: 'asc',
    },
  })

  // Финальная сортировка на стороне фронтенда
  const viewModels = data.map(toLessonViewModel)
  return sortLessonsByOrder(viewModels)
}

/**
 * Загружает один урок по WP slug записи.
 * Используется на странице урока `/courses/:courseSlug/lessons/:lessonSlug`.
 *
 * Эндпоинт: GET /wp-json/wp/v2/lesson?slug={lessonSlug}&per_page=1
 */
export async function fetchLessonBySlug(lessonSlug: string): Promise<WpLessonPost | null> {
  const q = lessonSlug.trim()
  if (!q) {
    return null
  }

  const { data } = await client.get<WpLessonPost[]>('/lesson', {
    params: {
      slug: q,
      per_page: 1,
    },
  })

  return data[0] ?? null
}

/**
 * Загружает текстовое содержимое .md-файла по URL.
 * MD-файл лежит в wp-content/uploads/ и запрашивается напрямую,
 * не через REST API.
 *
 * Используется в LessonPage когда `lesson.mdFileUrl` задан.
 */
export async function fetchMdContent(url: string): Promise<string> {
  // Используем axios без baseURL — передаём абсолютный URL напрямую
  const { data } = await axios.get<string>(url, {
    timeout: 10000,
    // Возвращаем текст как есть, без попытки парсить JSON
    transformResponse: [(d) => d],
  })
  return data
}