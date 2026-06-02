export const BOOKS_ROUTE_PATH = '/books'
export const BOOKS_DETAIL_ROUTE_PATH = '/books/:slug'

export function getBookRoute(slug: string): string {
  return `/books/${slug}`
}
