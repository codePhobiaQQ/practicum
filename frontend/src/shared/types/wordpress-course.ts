export interface CourseAcf {
  /** Публичный slug из ACF; для ссылок. Загрузка курса: см. `fetchCourseBySlug` в API (сначала WP slug, затем поиск по этому полю). */
  slug?: string
  preview?: string | number | false
  course_name?: string
  description?: string
  duration?: string
  teaser?: string
  subtitle?: string
  hero_image?: string | number | false

  course_book?: number
  book_order?: number
}

export interface WpEmbeddedMedia {
  source_url?: string
}

export interface WpTaxonomyTerm {
  id: number
  name: string
  slug: string
  count?: number
}

export interface WpCoursePost {
  id: number
  slug: string
  title: { rendered: string }
  excerpt?: { rendered: string }
  content?: { rendered: string }
  acf?: CourseAcf
  
  /** ACF / WP: таксономии (`cource-category`, `cource-subject`, `cource-tread` — потоки). */
  'cource-category'?: number[]
  'cource-subject'?: number[]
  'cource-tread'?: number[]

  _embedded?: {
    'wp:featuredmedia'?: Array<WpEmbeddedMedia>
  }
}

export interface CourseTermMaps {
  categories: Map<number, { name: string; slug: string }>
  subjects: Map<number, { name: string; slug: string }>
  streams: Map<number, { name: string; slug: string }>
}

export function getFeaturedImageUrl(post: WpCoursePost): string | undefined {
  const emb = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
  if (emb) {
    return emb
  }
  const acf = post.acf
  const preview = acf?.preview
  if (typeof preview === 'string' && preview.length > 0) {
    return preview
  }
  const hero = acf?.hero_image
  if (typeof hero === 'string' && hero.length > 0) {
    return hero
  }
  return undefined
}

type CourseTaxonomyKey = 'cource-category' | 'cource-subject' | 'cource-tread'

function getTaxonomyTermIds(post: WpCoursePost, key: CourseTaxonomyKey): number[] {
  const v = post[key]
  if (!Array.isArray(v)) {
    return []
  }
  return v
    .map((id) => (typeof id === 'number' ? id : Number(id)))
    .filter((id): id is number => Number.isFinite(id))
}

function resolveCategoryLabels(post: WpCoursePost, maps: CourseTermMaps | undefined): string[] {
  const ids = getTaxonomyTermIds(post, 'cource-category')
  if (maps && ids.length) {
    if (!maps || !ids.length) {
      return []
    }
  }
  return ids.map((id) => maps?.categories.get(id)?.name).filter((x): x is string => Boolean(x))
}

function resolveSubjectLabels(post: WpCoursePost, maps: CourseTermMaps | undefined): string[] {
  const ids = getTaxonomyTermIds(post, 'cource-subject')
  if (!maps || !ids.length) {
    return []
  }
  return ids.map((id) => maps.subjects.get(id)?.name).filter((x): x is string => Boolean(x))
}

function resolveStreamLabels(post: WpCoursePost, maps: CourseTermMaps | undefined): string[] {
  const ids = getTaxonomyTermIds(post, 'cource-tread')
  if (!maps || !ids.length) {
    return []
  }
  return ids.map((id) => maps.streams.get(id)?.name).filter((x): x is string => Boolean(x))
}

export interface CourseViewModel {
  id: number
  slug: string
  title: string
  excerptHtml: string
  subtitle?: string
  duration?: string
  teaser?: string

  /** ID таксономий */
  categoryIds: number[]
  subjectIds: number[]
  streamIds: number[]

  categoryLabels: string[]
  subjectLabels: string[]
  streamLabels: string[]

  coverUrl?: string

  bookId?: number
  bookOrder?: number
}

export function toCourseViewModel(post: WpCoursePost, maps?: CourseTermMaps): CourseViewModel {
  const rawTitle = typeof post.title?.rendered === 'string' ? post.title.rendered.replace(/<[^>]+>/g, '') : String(post.id)
  const acfName = post.acf?.course_name?.trim()
  const title = acfName || rawTitle
  const excerptHtml = post.excerpt?.rendered ?? ''
  const categoryIds = getTaxonomyTermIds(post, 'cource-category')
  const subjectIds = getTaxonomyTermIds(post, 'cource-subject')
  const streamIds = getTaxonomyTermIds(post, 'cource-tread')
  const acfSlug = post.acf?.slug?.trim()
  return {
    id: post.id,
    slug: acfSlug || post.slug,
    title,
    excerptHtml,
    subtitle: post.acf?.subtitle,
    duration: post.acf?.duration,
    teaser: post.acf?.teaser,
    categoryIds,
    subjectIds,
    streamIds,
    categoryLabels: resolveCategoryLabels(post, maps),
    subjectLabels: resolveSubjectLabels(post, maps),
    streamLabels: resolveStreamLabels(post, maps),
    coverUrl: getFeaturedImageUrl(post),

    bookId: post.acf?.course_book ?? undefined,
    bookOrder: post.acf?.book_order ?? undefined,
  }
}

export function sortCoursesByBookOrder(courses: CourseViewModel[]): CourseViewModel[] {
  return [...courses].sort((a, b) => (a.bookOrder ?? 0) - (b.bookOrder ?? 0))
}
 
export function getCourseNavigation(
  courses: CourseViewModel[],
  currentSlug: string,
): { prev: CourseViewModel | null; next: CourseViewModel | null } {
  const idx = courses.findIndex((c) => c.slug === currentSlug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? courses[idx - 1] : null,
    next: idx < courses.length - 1 ? courses[idx + 1] : null,
  }
}
