// Display helpers for the UI. Not part of the simulation, so Math.random() is fine here.

const CHAOS_WORDS = ['Calm', 'Low', 'Medium', 'High', 'Wild'];

/** Word for the 0–1 chaos slider, e.g. 0.55 → "Medium". */
export function describeChaos(value: number): string {
  return CHAOS_WORDS[Math.min(CHAOS_WORDS.length - 1, Math.floor(value * CHAOS_WORDS.length))]!;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const ADJECTIVES = ['mossy', 'quiet', 'amber', 'frosty', 'misty', 'dusty', 'salty', 'hollow', 'tangled', 'sleepy', 'stormy', 'golden'];
const NOUNS = ['river', 'fern', 'ridge', 'marsh', 'dune', 'glacier', 'reef', 'grove', 'canyon', 'tundra', 'lagoon', 'burrow'];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function randomSeed(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${Math.floor(Math.random() * 100)}`;
}
