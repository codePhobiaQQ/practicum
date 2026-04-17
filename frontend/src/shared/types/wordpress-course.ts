/** Блок материала в ACF (repeater lesson_blocks). */
export type MaterialBlockType = 'text' | 'video' | 'file' | 'quiz_ref'

export interface MaterialRow {
  block_type: MaterialBlockType
  text_content?: string
  video_url?: string
  file?: string | number | { url?: string }
  quiz_ref?: string
}

export interface LessonRow {
  lesson_title: string
  lesson_slug?: string
  /** Новое имя в ACF */
  blocks?: MaterialRow[]
  /** Старый ключ */
  materials?: MaterialRow[]
}

export interface ModuleRow {
  module_title: string
  lessons?: LessonRow[]
}

export interface CourseCategoryTerm {
  term_id?: number
  name?: string
  slug?: string
}

export interface GalleryItem {
  id?: number
  url?: string
  sizes?: Record<string, string | undefined>
}

export interface CourseAcf {
  /** Публичный slug из ACF; для ссылок. Загрузка курса: см. `fetchCourseBySlug` в API (сначала WP slug, затем поиск по этому полю). */
  slug?: string
  preview?: string | number | false
  course_name?: string
  description?: string
  course_category?: CourseCategoryTerm | number | number[]
  duration?: string
  teaser?: string
  /**
   * Программа курса: в ACF — WYSIWYG (HTML).
   * Ранее мог быть repeater модулей — см. `getProgramModules`.
   */
  materials?: ModuleRow[] | string
  /** Старое имя repeater */
  modules?: ModuleRow[]
  /** Вложения: в ACF — WYSIWYG (HTML); ранее — галерея файлов */
  attachments?: GalleryItem[] | string
  subtitle?: string
  hero_image?: string | number | false
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
  course_category?: number[]
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

export interface CourseViewModel {
  id: number
  /** Slug для маршрута `/courses/:slug` — из ACF `slug`, иначе slug записи WP. */
  slug: string
  title: string
  excerptHtml: string
  subtitle?: string
  duration?: string
  teaser?: string
  /** ID терминов `cource-category` */
  categoryIds: number[]
  /** ID терминов `cource-subject` */
  subjectIds: number[]
  /** ID терминов `cource-tread` (потоки) */
  streamIds: number[]
  categoryLabel?: string
  subjectLabels: string[]
  streamLabels: string[]
  coverUrl?: string
  modules: ModuleRow[]
}

/** HTML программы из поля `materials` (WYSIWYG в ACF). */
export function getMaterialsHtml(acf: CourseAcf | undefined): string | undefined {
  const m = acf?.materials
  if (typeof m === 'string' && m.trim()) {
    return m
  }
  return undefined
}

/** HTML вложений из поля `attachments` (WYSIWYG в ACF). */
export function getAttachmentsHtml(acf: CourseAcf | undefined): string | undefined {
  const a = acf?.attachments
  if (typeof a === 'string' && a.trim()) {
    return a
  }
  return undefined
}

export function getProgramModules(acf: CourseAcf | undefined): ModuleRow[] {
  if (!acf) {
    return []
  }
  if (typeof acf.materials === 'string') {
    return []
  }
  if (Array.isArray(acf.materials) && acf.materials.length) {
    return acf.materials
  }
  if (acf.modules?.length) {
    return acf.modules
  }
  return []
}

export function getLessonBlocks(lesson: LessonRow): MaterialRow[] {
  return lesson.blocks ?? lesson.materials ?? []
}

export function getCategoryLabel(acf: CourseAcf | undefined): string | undefined {
  if (!acf?.course_category) {
    return undefined
  }
  const c = acf.course_category
  if (typeof c === 'object' && !Array.isArray(c) && 'name' in c && typeof c.name === 'string') {
    return c.name
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

function resolveCategoryLabel(post: WpCoursePost, maps: CourseTermMaps | undefined): string | undefined {
  const ids = getTaxonomyTermIds(post, 'cource-category')
  if (maps && ids.length) {
    const n = maps.categories.get(ids[0])?.name
    if (n) {
      return n
    }
  }
  return getCategoryLabel(post.acf)
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

export function toCourseViewModel(post: WpCoursePost, maps?: CourseTermMaps): CourseViewModel {
  const rawTitle =
    typeof post.title?.rendered === 'string' ? post.title.rendered.replace(/<[^>]+>/g, '') : String(post.id)
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
    categoryLabel: resolveCategoryLabel(post, maps),
    subjectLabels: resolveSubjectLabels(post, maps),
    streamLabels: resolveStreamLabels(post, maps),
    coverUrl: getFeaturedImageUrl(post),
    modules: getProgramModules(post.acf),
  }
}
