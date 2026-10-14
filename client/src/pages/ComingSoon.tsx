import { Link } from 'react-router';

type ComingSoonProps = { title: string; booking?: boolean };

export function ComingSoon({ title, booking = false }: ComingSoonProps) {
  return (
    <section aria-labelledby="coming-soon-title" className="max-w-2xl py-section">
      <p className="type-label mb-6 text-accent">Coming in a future milestone</p>
      <h1 id="coming-soon-title" className="type-title">{title}</h1>
      <p className="text-lead mt-6 text-secondary">
        {booking ? 'Booking is not available. No appointments can be requested or confirmed.' : `The ${title.toLowerCase()} page has not been built yet.`}
      </p>
      <p className="type-body mt-4 text-secondary">This is a fictional portfolio demo. This page marks a future destination, with no services offered.</p>
      <Link to="/" className="text-link mt-8 inline-flex min-h-11 items-center">Return home</Link>
    </section>
  );
}
