// The text a player shares from the Library ("Share my shelf"): totals and the stamps earned, no building names.

/**
 * @param stats    libraryStats(): discovered, total, mastered, erasComplete, erasTotal
 * @param stamps   names of the eras finished
 * @param t        strings.library.share
 */
export function shelfText(stats, stamps, t, url) {
  const lines = [t.title, t.line(stats.discovered, stats.total, stats.mastered, stats.erasComplete, stats.erasTotal)]
  if (stamps.length) lines.push(t.stamps(stamps.join(', ')))
  if (url) lines.push(url)
  return lines.join('\n')
}
