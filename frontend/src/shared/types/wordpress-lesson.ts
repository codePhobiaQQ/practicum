export interface LessonAcf {
  /**
   * ID родительского курса (CPT course).
   * ACF поле: lesson_course, type: post_object, return_format: "id".
   */
  lesson_course: number

  /**
   * Порядковый номер урока внутри курса (1, 2, 3 …).
   * ACF поле: lesson_order, type: number, min: 1.
   */
  lesson_order: number

  /**
   * Краткое описание для карточки урока в оглавлении курса.
   * ACF поле: lesson_teaser, type: textarea.
   */
  lesson_teaser?: string

  /**
   * URL загруженного .md-файла с контентом урока.
   * ACF поле: lesson_md_file, type: file, return_format: "url".
   * Если присутствует — используется как основной источник контента.
   * Fallback — post_content записи.
   */
  lesson_md_file?: string

  /**
   * URL обложки урока (опционально).
   * ACF поле: lesson_preview, type: image, return_format: "url".
   */
  lesson_preview?: string
}

export interface WpLessonPost {
  id: number

  /** WP slug записи. Используется в маршруте `/courses/:courseSlug/lessons/:lessonSlug`. */
  slug: string

  title: { rendered: string }
  excerpt?: { rendered: string }

  /**
   * Резервный контент урока (WP editor).
   * Используется если `acf.lesson_md_file` не задан.
   */
  content?: { rendered: string }

  acf?: LessonAcf
}

export interface LessonViewModel {
  id: number

  /** WP slug — сегмент URL урока. */
  slug: string

  title: string
  teaser?: string

  /** Порядковый номер внутри курса. */
  order: number

  /** ID родительского курса. */
  courseId: number

  /**
   * URL .md-файла для загрузки контента.
   * Если undefined — рендерить `contentHtml`.
   */
  mdFileUrl?: string

  /**
   * HTML из post_content (fallback если нет MD-файла).
   */
  contentHtml?: string

  /** URL обложки урока. */
  previewUrl?: string
}

/**
 * Извлекает заголовок урока: сначала `title.rendered` (без HTML-тегов),
 * fallback — строковый ID.
 */
export function getLessonTitle(post: WpLessonPost): string {
  const raw = post.title?.rendered
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/<[^>]+>/g, '').trim()
  }
  return String(post.id)
}

/**
 * Возвращает URL обложки урока из ACF поля `lesson_preview`.
 * Возвращает `undefined` если поле не задано или пустое.
 */
export function getLessonPreviewUrl(post: WpLessonPost): string | undefined {
  const url = post.acf?.lesson_preview
  if (typeof url === 'string' && url.trim()) {
    return url
  }
  return undefined
}

/**
 * Определяет источник контента урока.
 * Возвращает `{ type: 'md', url }` если задан MD-файл,
 * иначе `{ type: 'html', html }` из post_content.
 */
export function getLessonContentSource(
  post: WpLessonPost,
): { type: 'md'; url: string } | { type: 'html'; html: string } | { type: 'empty' } {
  const mdUrl = post.acf?.lesson_md_file
  if (typeof mdUrl === 'string' && mdUrl.trim()) {
    return { type: 'md', url: mdUrl }
  }
  const html = post.content?.rendered
  if (typeof html === 'string' && html.trim()) {
    return { type: 'html', html }
  }
  return { type: 'empty' }
}

/**
 * Преобразует сырой WP REST ответ в LessonViewModel для UI.
 */
export function toLessonViewModel(post: WpLessonPost): LessonViewModel {
  const title = getLessonTitle(post)
  const contentSource = getLessonContentSource(post)

  return {
    id: post.id,
    slug: post.slug,
    title,
    teaser: post.acf?.lesson_teaser?.trim() || undefined,
    order: post.acf?.lesson_order ?? 0,
    courseId: post.acf?.lesson_course ?? 0,
    mdFileUrl: contentSource.type === 'md' ? contentSource.url : undefined,
    contentHtml: contentSource.type === 'html' ? contentSource.html : undefined,
    previewUrl: getLessonPreviewUrl(post),
  }
}

/**
 * Сортирует массив LessonViewModel по полю `order` (возрастание).
 * Возвращает новый массив, не мутирует исходный.
 */
export function sortLessonsByOrder(lessons: LessonViewModel[]): LessonViewModel[] {
  return [...lessons].sort((a, b) => a.order - b.order)
}

/**
 * Находит предыдущий и следующий урок относительно текущего slug.
 * Предполагает что массив уже отсортирован по `order`.
 */
export function getLessonNavigation(
  lessons: LessonViewModel[],
  currentSlug: string,
): { prev: LessonViewModel | null; next: LessonViewModel | null } {
  const idx = lessons.findIndex((l) => l.slug === currentSlug)
  if (idx === -1) {
    return { prev: null, next: null }
  }
  return {
    prev: idx > 0 ? lessons[idx - 1] : null,
    next: idx < lessons.length - 1 ? lessons[idx + 1] : null,
  }
}