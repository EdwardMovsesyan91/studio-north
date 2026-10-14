import { useState } from 'react';
import { Link } from 'react-router';

export function HomeHero() {
  const [imageUnavailable, setImageUnavailable] = useState(false);

  return (
    <section id="home-hero" tabIndex={-1} aria-labelledby="home-title" className="home-hero py-section">
      <div className="hero-copy">
        <p className="type-label text-accent">Studio North / The art of grooming</p>
        <h1 id="home-title" className="type-display hero-title mt-6">
          <span className="block">Good grooming.</span>{' '}
          <span className="block">No shortcuts.</span>
        </h1>
        <p className="mt-6 max-w-sm text-lead text-secondary">
          Precision cuts, considered details, and time well spent in the chair.
        </p>
        <div className="hero-actions mt-8">
          <Link to="/book" className="button" data-variant="primary" aria-describedby="hero-booking-note">Explore booking</Link>
          <Link to="/services" className="button" data-variant="secondary">Discover our services</Link>
        </div>
        <p id="hero-booking-note" className="type-caption mt-4 text-secondary">Fictional demo bookings only. No real appointment is made.</p>
      </div>

      <figure className="min-w-0">
        <div className="hero-image-frame">
          {imageUnavailable ? (
            <div className="hero-image-placeholder" role="img" aria-label="Barbershop atmosphere photograph unavailable">
              <span className="type-label text-accent">Studio North</span>
              <p className="type-subtitle mt-4">A space for the details.</p>
              <p className="type-caption mt-4 text-secondary">Photograph unavailable.</p>
            </div>
          ) : (
            <img src="/images/barber-chair-1200.webp"
              srcSet="/images/barber-chair-640.webp 640w, /images/barber-chair-1200.webp 1200w"
              sizes="(min-width: 64rem) 60rem, (min-width: 40rem) calc(100vw - 5rem), calc(100vw - 2.5rem)"
              width={1200} height={800} loading="eager" fetchPriority="high" decoding="async"
              alt="A brown leather barber chair beneath tall mirrors in a warmly lit barbershop."
              onError={() => setImageUnavailable(true)} />
          )}
        </div>
      </figure>
    </section>
  );
}
