import { Link } from 'react-router';
import { SectionHeading } from '../SectionHeading';
import { BarberProfiles } from '../barbers/BarberProfiles';
import { useBarbers, profileDisclosure } from '../../api';
import { QueryMessage } from '../QueryMessage';

export function TeamPreview() {
  const query = useBarbers();
  return (
    <section id="home-barbers" tabIndex={-1} aria-labelledby="team-preview-title" className="team-preview pb-section">
      <SectionHeading id="team-preview-title" eyebrow="The people / A shared approach"
        title="Individual style. Considered craft." description="Meet the three fictional characters behind the Studio North concept." />
      <p className="profile-disclosure type-caption mb-8 max-w-2xl text-secondary">{profileDisclosure}</p>
      <QueryMessage pending={query.isPending} error={query.error} onRetry={() => { void query.refetch(); }} /><BarberProfiles items={query.data?.barbers ?? []} preview />
      <Link to="/barbers" className="button mt-8" data-variant="secondary">Meet the barbers</Link>
    </section>
  );
}
