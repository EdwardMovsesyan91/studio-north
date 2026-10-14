import { BarberProfiles } from '../components/barbers/BarberProfiles';
import { useBarbers, profileDisclosure } from '../api';
import { QueryMessage } from '../components/QueryMessage';

export function Barbers() {
  const query = useBarbers();
  return (
    <div className="pb-section">
      <section aria-labelledby="barbers-title" className="py-section">
        <p className="type-label mb-6 text-accent">Studio North / The people</p>
        <h1 id="barbers-title" className="type-display max-w-3xl">The hands behind the craft.</h1>
        <p className="mt-6 max-w-xl text-lead text-secondary">A considered approach to every cut, shaped by individual style and attention to detail.</p>
        <p className="profile-disclosure type-caption mt-6 max-w-2xl text-secondary">{profileDisclosure}</p>
      </section>
      <QueryMessage pending={query.isPending} error={query.error} onRetry={() => { void query.refetch(); }} /><BarberProfiles items={query.data?.barbers ?? []} />
    </div>
  );
}
