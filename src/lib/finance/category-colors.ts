const CATEGORY_COLOR_COUNT = 6;

function hashName(name: string): number {
  let hash = 0;
  for (const character of name.toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

/**
 * Deterministic, collision-free category colour tokens.
 *
 * Each name keeps its hash-derived token, but within one breakdown a collision
 * steps to the next free token. Donut segments, list dots, and analytics bars
 * therefore share exactly the same colour for the same category set.
 */
export function assignCategoryColors(names: string[]): Record<string, string> {
  const uniqueNames = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  const used = new Set<number>();
  const colors: Record<string, string> = {};

  for (const name of uniqueNames) {
    let index = hashName(name) % CATEGORY_COLOR_COUNT;
    while (used.has(index) && used.size < CATEGORY_COLOR_COUNT) {
      index = (index + 1) % CATEGORY_COLOR_COUNT;
    }
    used.add(index);
    colors[name] = `var(--chart-cat-${index + 1})`;
  }

  return colors;
}
