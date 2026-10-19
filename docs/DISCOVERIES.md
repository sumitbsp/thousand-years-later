# Thousand Years Later — Discoveries

> Special creatures players can evolve by accident or on purpose. When a new species matches a discovery's conditions, it gets a special name, a discovery card on the reveal screen, and a permanent spot in the Bestiary.
> Part of the full game design. Build this when the step that adds it says so.

## Why this exists

Discoveries reward experimenting. "Put an elephant in an Ice World and see what happens" becomes a goal, and "You re-evolved the mammoth" is the kind of moment people share. They also give the Bestiary something to fill and unlock rewards.

## Real Earth notes

- The game now uses the real Earth map. "Island" conditions mean the real islands and island regions: Madagascar, Japan, the British Isles, New Zealand, Greenland, Iceland, Borneo, Sumatra, New Guinea, and Australia (big enough to count as a continent, but isolated enough to trigger island effects).
- Biome conditions use the region's biome after Earth variant changes (Ice Age Earth turns northern Europe to ice, etc.).
- Discovery cards and headlines use real place names: "You re-evolved the mammoth in Siberia."
- Every discovery must be **visible**: its creature art is the base animal with the matching mutation overlays, and a first-time discovery triggers a Moment (see DESIGN.md).

## Three tiers

| Tier | What it is | How often (target) |
| --- | --- | --- |
| **Re-evolved** | Echoes a real extinct animal or a real evolutionary pattern | Common: 10–30% of runs where the setup makes it possible |
| **Oddity** | Strange but plausible-feeling creatures that are this game's own | Uncommon: 5–15% |
| **Legend** | Creatures from myth (dragons, yetis, mermaids) | Rare: 1–3% |

The balancing script should report how often each discovery happens, and conditions get tuned until the rates land roughly here.

## How a discovery is matched

Each discovery is a rule in a data file, checked whenever a new species is created:

```ts
type Discovery = {
  id: string;                 // "woolly-mammoth"
  name: string;               // the special species name
  tier: "reevolved" | "oddity" | "legend";
  lineage: AnimalId;          // must descend from this starting animal
  requires: MutationId[];     // all of these mutations
  env?: {
    biomes?: Biome[];         // living mostly in one of these biomes
    island?: boolean;         // population isolated on a small land mass
    afterEvent?: EventId;     // appeared after this event
  };
  minSize?: number;           // size stat threshold
  hint: string;               // shown in the Bestiary before it's found
  card: string;               // one-line text on the discovery card
};
```

Rules:
- Keep each rule to **2 or 3 conditions**, so players can find them by experimenting.
- Undiscovered entries show only their **hint** in the Bestiary, never the conditions.
- A discovery's name replaces the generated name ("Woolly Elephant" becomes "Woolly Mammoth").
- First-time discoveries get a big card on the reveal screen. Repeats get a small badge.
- Some discoveries need mutations not yet in the catalog. These are marked **(new mutation)** and should be added to the catalog when this is built.

## Discoveries by starting animal

### Elephant
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Woolly Mammoth** | Re-evolved | Thick fur + tusks, ice or tundra | You re-evolved the mammoth. |
| **Dwarf Elephant** | Re-evolved | Tiny size, island | Island life shrank the elephant to pony size, just like real ones did. |
| **Snorkel Elephant** | Oddity | Swimming + webbed feet, coast | It walks the sea floor and breathes through its trunk. |

### Wolf
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Dire Wolf** | Re-evolved | Giant size + thick fur, cold biomes | A bigger, heavier wolf, like the one that hunted in the last ice age. |
| **Sabre-toothed Wolf** | Re-evolved | Fangs + giant size | Fangs so long it can barely close its mouth. |
| **Sea Wolf** | Oddity | Swimming + webbed feet, coast | A wolf that hunts fish in packs along the shore. |

### Rabbit
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Giant Island Rabbit** | Re-evolved | Giant size, island | A real giant rabbit once lived on a Mediterranean island. Now yours does too. |
| **Killer Rabbit** | Oddity | Fangs + meat-eater **(new mutation)** | Rabbits became the top predator. |
| **Jackalope** | Legend | Horns + long legs, grassland or desert | The legend of the horned rabbit is real here. |

### Deer
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Giant Elk** | Re-evolved | Giant size + horns | Antlers wider than a car, like the giant deer of the ice age. |
| **Swamp Deer** | Oddity | Webbed feet + swimming, swamp | A deer that wades and dives for water plants. |
| **Unicorn** | Legend | Horns + glowing skin, forest | One horn, faint glow, deep forest. The legend lives. |

### Bear
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Cave Bear** | Re-evolved | Burrowing + thick fur, ice or tundra | It sleeps through the winters in caves, like its ice-age cousins. |
| **Sea Bear** | Oddity | Swimming + webbed feet + thick fur | Lives more in the water than on land. |
| **Armored Bear** | Oddity | Armor plates + giant size | A bear covered in plates. Nothing hunts it. |

### Owl
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Giant Running Owl** | Re-evolved | Giant size + flightless **(new mutation)**, island | A real metre-tall owl once ran through Cuban forests. |
| **Dodo-like Owl** | Re-evolved | Flightless + tiny size, island with no predators | No predators, no need to fly. It forgot how. |
| **Burrow Owl** | Oddity | Flightless + burrowing + big eyes | Digs tunnels and hunts in the dark. |

### Frog
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Devil Frog** | Re-evolved | Giant size + armor plates | A frog big enough to eat small animals, like the real "devil frog" of old. |
| **Glowing Swamp Frog** | Oddity | Glowing skin + venom, swamp | Its glow warns everything: don't eat me. |
| **Gliding Frog** | Oddity | Webbed feet + tree-climbing, jungle | Glides from tree to tree on webbed feet. |

### Crocodile
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Super Croc** | Re-evolved | Giant size, swamp or coast | Twelve metres long, like the giant crocodiles of the past. |
| **Sea Crocodile** | Re-evolved | Gills + swimming, ocean | It left land for good, like ancient sea crocodiles did. |
| **Running Crocodile** | Re-evolved | Long legs, grassland or desert | Long legs, upright stance, chases prey on land. |

### Penguin
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Giant Penguin** | Re-evolved | Giant size, ice or coast | As tall as a person, like real giant penguins of the past. |
| **Flying Penguin** | Oddity | Wings | Penguins learned to fly again. |
| **Desert Penguin** | Oddity | Survives in desert for 200+ years | Nobody knows how. It just works. |

### Rat
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Giant Rat** | Re-evolved | Giant size | The size of a bull, like a real giant rodent from the past. |
| **Naked Mole Rat** | Oddity | Burrowing + no fur | Lives underground in huge colonies. Practically immortal. |
| **Last Rats Standing** | Oddity | Rats are the only survivors after a meteor | After the meteor, only the rats remained. |

### Shark
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Megalodon** | Re-evolved | Giant size, ocean | You re-evolved the megalodon. |
| **Walking Shark** | Re-evolved | Extra legs or long legs, coast | It walks between tide pools on its fins, like some real sharks do. |
| **Land Shark** | Legend | Lives mostly on land | Sharks crawled out of the sea. Nowhere is safe. |

### Lizard
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Dragon Lizard** | Re-evolved | Giant size + venom | A giant venomous lizard, like the ancient Megalania. |
| **Frilled Glider** | Oddity | Big ears **(acts as frills)** + tree-climbing, jungle | Spreads its frills and glides between trees. |
| **Dragon** | Legend | Wings + giant size + volcanic | It flies. It's huge. It lives in volcanoes. You made a dragon. |

### Beetle
| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **Titan Beetle** | Re-evolved | Giant size | The size of a dog, like the giant insects of the ancient past. |
| **Firefly Swarm** | Oddity | Glowing skin + wings | At night, the whole forest glows. |
| **Tank Beetle** | Oddity | Armor plates + horns + giant size | Nothing can bite through it. |

### Humans (weak, strong, smart)
| Discovery | Tier | From | Conditions | Card |
| --- | --- | --- | --- | --- |
| **Little Island Folk** | Re-evolved | Any human | Tiny size, island | Island humans shrank, like the real "hobbit" people of Flores. |
| **Cold Folk** | Re-evolved | Strong humans | Thick fur + cold biomes | Stocky, hairy, built for the cold, like Neanderthals. |
| **Yeti** | Legend | Strong humans | Giant size + thick fur, mountains or ice | Something big walks the snow. |
| **Merfolk** | Legend | Smart humans | Gills + webbed feet + swimming | Humans returned to the sea. |
| **Cave Folk** | Oddity | Smart humans | Big eyes + burrowing | They live underground and see in the dark. |
| **Swarm Folk** | Oddity | Weak humans | Population over a high threshold for 300+ years | Billions of tiny humans. They're everywhere. |

## Special discoveries (any animal)

| Discovery | Tier | Conditions | Card |
| --- | --- | --- | --- |
| **The Awakening** | Legend | A **non-human** species crosses the intelligence threshold | Something new is thinking. (The rare "became intelligent" ending.) |
| **Island Giant** | Oddity | Any species with giant size, island | Islands make small things big. |
| **Island Dwarf** | Oddity | Any big starting animal with tiny size, island | Islands make big things small. |
| **Back to the Sea** | Oddity | Any land animal gains gills | It left the land behind. |
| **Convergence** | Oddity | Two different lineages end up with the same 3 mutations | Different animals, same answer. Evolution repeats itself. |
| **Apex Prey** | Oddity | A starting plant-eater becomes the top predator | The hunted became the hunter. |
| **Silent World** | Oddity | Every starting animal goes extinct | Nothing made it. Try again? |

## New mutations needed

These discoveries need mutations not yet in the catalog:

- **Flightless:** loses flight, gains size or speed on the ground. Owls and other flyers.
- **Meat-eater:** shifts diet toward meat. Lets plant-eaters become predators.

## Bestiary hints (examples)

Shown for undiscovered entries, never the conditions:

- Woolly Mammoth: "Something big and hairy roams the ice."
- Dragon: "Smoke rises from the volcano. Something moves inside."
- Merfolk: "There are stories of people beneath the waves."
- Jackalope: "A rabbit… with horns?"
- The Awakening: "One day, something else will start to think."
