/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Routine deep-link URL helper. A routine "Log now" / "Next →" navigation
 * tags the destination with ?routine=<id> so the global RoutineFlowBar appears.
 *
 * The gotcha this fixes: Command Zone steps navigate to hash anchors like
 * "/#survival". Naively appending "?routine=X" produces "/#survival?routine=X",
 * which buries the query INSIDE the fragment — useSearchParams never sees it and
 * the flow bar never shows. The query must go BEFORE the hash: "/?routine=X#survival".
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 */

/** Append ?routine=<id> to an href, correctly placing it before any #hash. */
export function withRoutineParam(href: string, routineId: string): string {
  const param = `routine=${encodeURIComponent(routineId)}`
  const hashIndex = href.indexOf('#')

  if (hashIndex === -1) {
    // No hash — simple append, respecting an existing query
    const sep = href.includes('?') ? '&' : '?'
    return `${href}${sep}${param}`
  }

  // Split path?query from #hash, insert the param into the path/query side
  const beforeHash = href.slice(0, hashIndex)
  const hash = href.slice(hashIndex) // includes the leading '#'
  const sep = beforeHash.includes('?') ? '&' : '?'
  return `${beforeHash}${sep}${param}${hash}`
}
