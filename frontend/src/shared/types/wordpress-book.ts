export interface BookAcf {
  /**
   * URL обложки пособия.
   * ACF поле: preview, type: image, return_format: "url".
   */
  preview?: string | false

  /**
   * Отображаемое название пособия.
   * ACF поле: book_name, type: text.
   * Приоритет перед post_title в UI.
   */
  book_name?: string

  /**
   * Полное описание (HTML из wysiwyg).
   * ACF поле: description, type: wysiwyg.
   */
  description?: string

  /**
   * Краткий анонс для карточки в списке.
   * ACF поле: teaser, type: textarea.
   */
  teaser?: string

  /**
   * Длительность в произвольном формате ("3 месяца").
   * ACF поле: duration, type: text.
   */
  duration?: string
}

export interface WpBookPost {
  id: number
  slug: string

  title: { rendered: string }
  excerpt?: { rendered: string }
  content?: { rendered: string }

  acf?: BookAcf

  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>
  }
}

export interface BookViewModel {
  id: number

  /** WP slug — сегмент URL пособия. */
  slug: string

  /** Название: acf.book_name → title.rendered (без тегов). */
  title: string

  /** HTML-описание из wysiwyg. */
  descriptionHtml?: string

  /** Краткий анонс для карточки. */
  teaser?: string

  /** Длительность, например "3 месяца". */
  duration?: string

  /** URL обложки: featured media → acf.preview. */
  coverUrl?: string
}

export function getBookTitle(post: WpBookPost): string {
  const acfName = post.acf?.book_name?.trim()
  if (acfName) return acfName

  const raw = post.title?.rendered
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/<[^>]+>/g, '').trim()
  }

  return String(post.id)
}

export function getBookCoverUrl(post: WpBookPost): string | undefined {
  const embedded = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
  if (embedded) return embedded

  const preview = post.acf?.preview
  if (typeof preview === 'string' && preview.trim()) return preview

  return undefined
}

export function toBookViewModel(post: WpBookPost): BookViewModel {
  return {
    id: post.id,
    slug: post.slug,
    title: getBookTitle(post),
    descriptionHtml: post.acf?.description || post.content?.rendered || undefined,
    teaser: post.acf?.teaser?.trim() || undefined,
    duration: post.acf?.duration?.trim() || undefined,
    coverUrl: getBookCoverUrl(post),
  }
}