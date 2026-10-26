// Daily lore: one fact from the summary of the day's Daily building; it only depends on the day number,
// so the same fact shows all day and changes at midnight.

/** One fact for `day` from a summary (`funFacts`, then the description when there are none); '' when it has neither. */
export function loreFact(summary, day) {
  const facts = summary?.funFacts?.filter(Boolean) ?? []
  if (facts.length) return facts[day % facts.length]
  return summary?.description ?? ''
}
