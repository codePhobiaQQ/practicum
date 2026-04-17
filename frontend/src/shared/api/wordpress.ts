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
