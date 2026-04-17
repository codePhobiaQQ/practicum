import axios, { AxiosInstance } from 'axios'
import type { WpCoursePost } from '@shared/types/wordpress-course'

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

export async function fetchCourseBySlug(slug: string): Promise<WpCoursePost | null> {
  const { data } = await client.get<WpCoursePost[]>('/course', {
    params: {
      slug,
      per_page: 1,
      _embed: true,
    },
  })
  return data[0] ?? null
}
