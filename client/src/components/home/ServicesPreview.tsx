import { Link } from 'react-router';
import { SectionHeading } from '../SectionHeading';
import { ServiceList } from '../services/ServiceList';
import { useServices } from '../../api';
import { QueryMessage } from '../QueryMessage';

export function ServicesPreview() {
  const query = useServices();
  return (
    <section id="home-services" tabIndex={-1} aria-labelledby="services-preview-title" className="services-preview pb-section">
      <SectionHeading id="services-preview-title" eyebrow="Services / The essentials" title="Considered cuts. Clear pricing." description="A few ways to make time for the details. Explore the full menu to find your starting point." />
      <QueryMessage pending={query.isPending} error={query.error} onRetry={() => { void query.refetch(); }} />
      <ServiceList items={query.data?.services.slice(0, 3) ?? []} showDescriptions={false} />
      <Link to="/services" className="button mt-8" data-variant="secondary">View all services</Link>
    </section>
  );
}
