// Guards the determinism rules: nothing in src/sim may use non-deterministic
// APIs or depend on the DOM / React.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SIM_DIR = __dirname;
const FORBIDDEN: [RegExp, string][] = [
  [/Math\.random/, 'Math.random'],
  [/\bDate\b/, 'Date'],
  [/performance\.now/, 'performance.now'],
  [/\b(window|document)\./, 'DOM globals'],
  [/from ['"]react/, 'React'],
  [/from ['"]\.\.\/(render|ui)/, 'render/ui imports'],
];

describe('src/sim purity', () => {
  const files = readdirSync(SIM_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

  it.each(files)('%s uses no forbidden APIs', (file) => {
    const source = readFileSync(join(SIM_DIR, file), 'utf8');
    for (const [pattern, name] of FORBIDDEN) {
      expect(pattern.test(source), `${file} uses ${name}`).toBe(false);
    }
  });
});
