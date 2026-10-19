import { ANIMALS, type AnimalId } from '../sim/data/animals';

interface Props {
  chosen: readonly AnimalId[];
  onToggle: (id: AnimalId) => void;
}

export function AnimalRoster({ chosen, onToggle }: Props) {
  return (
    <section className="roster">
      <div className="roster-header">
        <h2>
          <span className="step">2</span> · Pick 3 to 5 animals
        </h2>
        <span className="muted">{chosen.length} chosen</span>
      </div>
      <div className="roster-grid">
        {ANIMALS.map((a) => {
          const selected = chosen.includes(a.id);
          return (
            <button
              key={a.id}
              className={`animal-card ${selected ? 'selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onToggle(a.id)}
            >
              <span className="badge">{a.short}</span>
              <span className="animal-name">{a.name}</span>
              <span className="animal-role">{a.role}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
