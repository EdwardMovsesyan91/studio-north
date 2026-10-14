import { Link } from 'react-router';
import { SectionHeading } from '../components/SectionHeading';
import { ServiceList } from '../components/services/ServiceList';
import { useServices } from '../api';
import { QueryMessage } from '../components/QueryMessage';

export function Services() {
  const query = useServices();
  return (
    <div className="services-page pb-section">
      <section aria-labelledby="services-title" className="py-section">
        <p className="type-label mb-6 text-accent">Studio North / Services</p>
        <h1 id="services-title" className="type-display max-w-3xl">The details make the difference.</h1>
        <p className="mt-6 max-w-xl text-lead text-secondary">From a considered cut to a carefully shaped beard. A simple menu, with time set aside for the work.</p>
      </section>
      <section aria-labelledby="service-menu-title">
        <SectionHeading id="service-menu-title" title="Services & pricing" description="Fictional sample prices in USD. Durations show the time set aside for each service." />
        <QueryMessage pending={query.isPending} error={query.error} onRetry={() => { void query.refetch(); }} /><ServiceList items={query.data?.services ?? []} />
      </section>
      <section aria-labelledby="services-booking-title" className="services-booking mt-12 sm:mt-16">
        <div className="max-w-xl">
          <h2 id="services-booking-title" className="type-subtitle">A little time for yourself.</h2>
          <p id="services-booking-note" className="type-body mt-4 text-secondary">Try the fictional booking experience. No real service or appointment is provided.</p>
        </div>
        <Link to="/book" className="button" data-variant="primary" aria-describedby="services-booking-note">Explore booking</Link>
      </section>
    </div>
  );
}
