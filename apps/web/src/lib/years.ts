export const MIN_YEAR = 1980;
export const MAX_YEAR = 2100;
export const MAX_YEARS_PER_MODEL = 80;

/** "2012-2015, 2018" -> [2012, 2013, 2014, 2015, 2018]. Returns null when the text is not a valid list of years or ranges. */
export function parseYears(text: string): number[] | null {
  const tokens = text.split(/[,،;\s]+/).filter(Boolean);
  if (!tokens.length) return null;
  const years = new Set<number>();
  for (const token of tokens) {
    const m = /^(\d{4})(?:\s*[-–—]\s*(\d{4}))?$/.exec(token);
    if (!m) return null;
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    if (from > to || from < MIN_YEAR || to > MAX_YEAR) return null;
    for (let y = from; y <= to; y++) years.add(y);
  }
  return years.size <= MAX_YEARS_PER_MODEL ? [...years].sort((a, b) => a - b) : null;
}

/** [2012, 2013, 2014, 2018] -> "2012-2014, 2018". */
export function formatYears(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j > i ? `${sorted[i]}-${sorted[j]}` : String(sorted[i]));
    i = j + 1;
  }
  return parts.join(', ');
}
