import type { Barber } from '../../api';
import { BarberPortrait } from './BarberPortrait';

type BarberProfilesProps = { items: readonly Barber[]; preview?: boolean };

export function BarberProfiles({ items, preview = false }: BarberProfilesProps) {
  const Heading = preview ? 'h3' : 'h2';
  return (
    <ul className="barber-profiles">
      {items.map((barber) => (
        <li key={barber.id} className="min-w-0" data-barber-id={barber.id}>
          <BarberPortrait barber={barber} />
          <div className="barber-profile-copy">
            <p className="type-label mb-3 text-accent">{barber.title}</p>
            <Heading className="type-subtitle">{barber.name}</Heading>
            <p className="type-caption mt-3 text-secondary">Focus: {barber.specialty}</p>
            {!preview && <p className="barber-bio type-body mt-5 text-secondary">{barber.biography}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
