/**
 * Standard page size for list UIs and CMS list API requests.
 *
 * Server-backed lists: first HTTP request uses `limit=LIST_PAGE_SIZE`; each
 * "Показать ещё" issues the next request with `cursor` — the full dataset is
 * never loaded upfront.
 *
 * Snapshot-embedded lists (scope board sections): data may already be in the
 * board payload; use `useListDisplayWindow` to render in chunks without extra
 * network calls until a dedicated sub-resource API exists.
 */
export const LIST_PAGE_SIZE = 10;
