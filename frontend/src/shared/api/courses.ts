import axios, { AxiosInstance } from 'axios'
import type { WpCoursePost, WpTaxonomyTerm } from '@shared/types/wordpress-course'

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

export async function fetchCourses(perPage = 50): Promise<WpCoursePost[]> {
  const { data } = await client.get<WpCoursePost[]>('/course', {
    params: {
      per_page: perPage,
      orderby: 'date',
      order: 'desc',
      _embed: true,
    },
  })
  return data
}

/** Ищет курс по `acf.slug` среди страниц ответа (без учёта регистра). */
async function fetchCourseByAcfSlug(routeSlug: string): Promise<WpCoursePost | null> {
  const q = routeSlug.trim().toLowerCase()
  if (!q) {
    return null
  }
  let page = 1
  const perPage = 100
  const maxPages = 20
  while (page <= maxPages) {
    const { data } = await client.get<WpCoursePost[]>('/course', {
      params: {
        per_page: perPage,
        page,
        orderby: 'date',
        order: 'desc',
        _embed: true,
      },
    })
    if (!data.length) {
      break
    }
    const found = data.find((p) => p.acf?.slug?.trim().toLowerCase() === q)
    if (found) {
      return found
    }
    if (data.length < perPage) {
      break
    }
    page += 1
  }
  return null
}

/**
 * Курс по сегменту URL `/courses/:slug`.
 * Сначала запрос по slug записи WP (`?slug=`), затем по полю ACF `slug` (перебор страниц списка).
 */
export async function fetchCourseBySlug(routeSlug: string): Promise<WpCoursePost | null> {
  const q = routeSlug.trim()
  if (!q) {
    return null
  }
  const { data } = await client.get<WpCoursePost[]>('/course', {
    params: {
      slug: q,
      per_page: 1,
      _embed: true,
    },
  })
  if (data[0]) {
    return data[0]
  }
  return fetchCourseByAcfSlug(q)
}

/** Термины таксономии WP REST (`cource-category`, `cource-subject`, …). */
export async function fetchTaxonomyTerms(taxonomy: string, perPage = 100): Promise<WpTaxonomyTerm[]> {
  const { data } = await client.get<WpTaxonomyTerm[]>(`/${taxonomy}`, {
    params: {
      per_page: perPage,
      hide_empty: false,
    },
  })
  return data
}

export async function fetchCoursesByBookId(bookId: number): Promise<WpCoursePost[]> {
  if (!bookId) {
    return []
  }
  const { data } = await client.get<WpCoursePost[]>('/course', {
    params: {
      meta_key: 'course_book',
      meta_value: bookId,
      per_page: 100,
      orderby: 'meta_value_num',  // сортировка по book_order на стороне WP как fallback
      meta_key_orderby: 'book_order',
      order: 'asc',
      _embed: true,
    },
  })
  return data
}

// Отдельный клиент для кастомных эндпоинтов practicum
const elasticSearchClient = axios.create({
  baseURL: (() => {
    const base = getBaseUrl()
    return base ? `${base}/wp-json/practicum/v1` : '/wp-json/practicum/v1'
  })(),
  timeout: 20000,
})

export interface ElasticSearchResults {
  total: number
  pages: number
  page: number
  per_page: number
  courses: WpCoursePost[]
}

export async function elasticSearchCourses(
  q: string,
  perPage = 50,
  page = 1,
): Promise<ElasticSearchResults> {
  const { data } = await elasticSearchClient.get<ElasticSearchResults>('/search', {
    params: { q, per_page: perPage, page },
  })
  return data
}