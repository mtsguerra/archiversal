// Daily lore: one unlocked building a day, and one fact from its summary. Both only depend on the day
// number, so the same building and fact show all day and change at midnight.

/** The building of the day among the unlocked ids (sorted, so the pick does not depend on unlock order); null when none. */
export function loreId(openIds, day) {
  if (!openIds.length) return null
  const sorted = [...openIds].sort()
  return sorted[day % sorted.length]
}

/** One fact for `day` from a summary (`funFacts`, then the description when there are none); '' when it has neither. */
export function loreFact(summary, day) {
  const facts = summary?.funFacts?.filter(Boolean) ?? []
  if (facts.length) return facts[day % facts.length]
  return summary?.description ?? ''
}
