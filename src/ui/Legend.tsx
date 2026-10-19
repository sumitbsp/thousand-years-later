import { BIOMES, BIOME_NAMES } from '../sim/biomes';
import type { World } from '../sim/worldMap';
import { BIOME_COLORS } from '../render/colors';

export function Legend({ world }: { world: World }) {
  // Only the biomes on this map: Earth variants add and remove some.
  const biomes = BIOMES.filter((b) => world.regions.some((r) => r.biome === b));
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
