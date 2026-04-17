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
  preview?: string | number | false
  course_name?: string
  description?: string
  course_category?: CourseCategoryTerm | number | number[]
  duration?: string
  teaser?: string
  /** Программа: модули → уроки → блоки */
  materials?: ModuleRow[]
  /** Старое имя repeater */
  modules?: ModuleRow[]
  attachments?: GalleryItem[]
  subtitle?: string
  hero_image?: string | number | false
}

export interface WpEmbeddedMedia {
  source_url?: string
}

export interface WpCoursePost {
  id: number
  slug: string
  title: { rendered: string }
  excerpt?: { rendered: string }
  content?: { rendered: string }
  acf?: CourseAcf
  course_category?: number[]
  _embedded?: {
    'wp:featuredmedia'?: Array<WpEmbeddedMedia>
  }
}

export interface CourseViewModel {
  id: number
  slug: string
  title: string
  excerptHtml: string
  subtitle?: string
  duration?: string
  teaser?: string
  categoryLabel?: string
  coverUrl?: string
  modules: ModuleRow[]
}

export function getProgramModules(acf: CourseAcf | undefined): ModuleRow[] {
  if (!acf) {
    return []
  }
  if (acf.materials?.length) {
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

export function toCourseViewModel(post: WpCoursePost): CourseViewModel {
  const rawTitle =
    typeof post.title?.rendered === 'string' ? post.title.rendered.replace(/<[^>]+>/g, '') : String(post.id)
  const acfName = post.acf?.course_name?.trim()
  const title = acfName || rawTitle
  const excerptHtml = post.excerpt?.rendered ?? ''
  return {
    id: post.id,
    slug: post.slug,
    title,
    excerptHtml,
    subtitle: post.acf?.subtitle,
    duration: post.acf?.duration,
    teaser: post.acf?.teaser,
    categoryLabel: getCategoryLabel(post.acf),
    coverUrl: getFeaturedImageUrl(post),
    modules: getProgramModules(post.acf),
  }
}
