import type { Service } from '../../api';
import { money } from '../../api';
import { business } from '../../data/business';

type ServiceListProps = { items: readonly Service[]; showDescriptions?: boolean };

export function ServiceList({ items, showDescriptions = true }: ServiceListProps) {
  return (
    <ul className="service-list">
      {items.map((service) => (
        <li key={service.id} className="service-row" data-service-id={service.id}>
          <div className="min-w-0">
            <h3 className="type-subtitle">{service.name}</h3>
            {showDescriptions && <p className="type-body mt-3 max-w-lg text-secondary">{service.description}</p>}
          </div>
          <dl className="service-details">
            <div>
              <dt className="type-caption text-secondary">Duration</dt>
              <dd className="type-subtitle mt-2 tabular-nums">{service.durationMinutes} min</dd>
            </div>
            <div>
              <dt className="type-caption text-secondary">Price · {business.currency}</dt>
              <dd className="type-subtitle mt-2 tabular-nums">{money(service.priceCents)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
