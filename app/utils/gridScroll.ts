/** Where the router scrolls after a navigation. */
export type ScrollTarget = { left: number; top: number } | { el: string }

const GRID = '/posts'

/** The grid itself, `/posts`. */
export const isGridPath = (path: string): boolean =>
  path.replace(/\/$/, '') === GRID

/** A post page, `/posts/<id>`, not the grid itself. */
export const isPostPath = (path: string): boolean =>
  /^\/posts\/[^/]+\/?$/.test(path)

/**
 * Where to scroll after a navigation, in order: the browser's saved position
 * (back/forward); the grid's remembered offset when coming to the grid from a
 * post page (the X, the backdrop, or Back after prev/next); a hash's element;
 * otherwise the top.
 */
export const scrollTarget = (
  to: { path: string; hash: string },
  from: { path: string },
  savedPosition: { left: number; top: number } | null,
  gridScrollTop: number | null,
): ScrollTarget => {
  if (savedPosition) return savedPosition
  if (isGridPath(to.path) && isPostPath(from.path) && gridScrollTop !== null)
    return { left: 0, top: gridScrollTop }
  if (to.hash) return { el: to.hash }
  return { left: 0, top: 0 }
}
