import axios, { AxiosInstance } from 'axios'
import type { WpBookPost } from '@shared/types/wordpress-book'
import { toBookViewModel, type BookViewModel } from '@shared/types/wordpress-book'

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
 * Загружает список всех пособий.
 * Возвращает сырые WP-посты — маппинг через `toBookViewModel` на стороне компонента.
 *
 * Эндпоинт: GET /wp-json/wp/v2/book?per_page=50&orderby=date&order=desc&_embed=true
 */
export async function fetchBooks(perPage = 50): Promise<WpBookPost[]> {
  const { data } = await client.get<WpBookPost[]>('/book', {
    params: {
      per_page: perPage,
      orderby: 'date',
      order: 'desc',
      _embed: true,
    },
  })
  return data
}

/**
 * Загружает одно пособие по WP slug записи.
 * Используется на странице пособия `/books/:slug`.
 *
 * Эндпоинт: GET /wp-json/wp/v2/book?slug={slug}&per_page=1&_embed=true
 */
export async function fetchBookBySlug(slug: string): Promise<WpBookPost | null> {
  const q = slug.trim()
  if (!q) {
    return null
  }
  const { data } = await client.get<WpBookPost[]>('/book', {
    params: {
      slug: q,
      per_page: 1,
      _embed: true,
    },
  })
  return data[0] ?? null
}

/**
 * Загружает и маппит все пособия в BookViewModel[].
 * Удобная обёртка над fetchBooks + toBookViewModel для использования в компонентах.
 */
export async function fetchBookViewModels(perPage = 50): Promise<BookViewModel[]> {
  const posts = await fetchBooks(perPage)
  return posts.map(toBookViewModel)
}