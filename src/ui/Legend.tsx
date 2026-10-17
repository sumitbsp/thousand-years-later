import { BIOMES, BIOME_NAMES } from '../sim/biomes';
import type { World } from '../sim/world';
import { BIOME_COLORS } from '../render/colors';

export function Legend({ world }: { world: World }) {
  // Volcanic is rare, so only list it when it is on the map.
  const hasVolcanic = world.regions.some((r) => r.biome === 'volcanic');
  const biomes = BIOMES.filter((b) => b !== 'volcanic' || hasVolcanic);
  return (
    <ul className="legend">
      {biomes.map((b) => (
        <li key={b}>
          <span className="swatch" style={{ background: BIOME_COLORS[b] }} />
          {BIOME_NAMES[b]}
        </li>
      ))}
    </ul>
  );
}
