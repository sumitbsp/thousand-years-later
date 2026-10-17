// Display helpers for the UI. Not part of the simulation, so Math.random() is fine here.

import type { ClimateSettings } from '../sim/presets';

const SCALES: Record<keyof ClimateSettings, string[]> = {
  temperature: ['Frozen', 'Cold', 'Mild', 'Warm', 'Hot'],
  rainfall: ['Parched', 'Dry', 'Moderate', 'Wet', 'Soaked'],
  seaLevel: ['Very low', 'Low', 'Medium', 'High', 'Flooded'],
  chaos: ['Calm', 'Low', 'Medium', 'High', 'Wild'],
};

/** Word for a 0–1 slider value, e.g. temperature 0.55 → "Mild". */
export function describe(key: keyof ClimateSettings, value: number): string {
  const words = SCALES[key];
  return words[Math.min(words.length - 1, Math.floor(value * words.length))]!;
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
