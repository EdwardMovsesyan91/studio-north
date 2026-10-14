import { Link } from 'react-router';
import { SectionHeading } from '../SectionHeading';
import { BusinessHours } from '../BusinessHours';
import { business, businessLocation } from '../../data/business';

export function BusinessLocation() {
  return (
    <section id="home-location" tabIndex={-1} aria-labelledby="location-title" className="marketing-section pb-section">
      <div className="location-grid border-t border-line pt-section">
        <div>
          <SectionHeading id="location-title" eyebrow="Portland / A fictional place"
            title="Make a little time." description="An independent barbershop concept imagined for Portland, Oregon. A quieter moment in the city, with attention to the details." />
          <p className="type-caption text-secondary">{businessLocation}<br />Fictional location. No physical shop or contact service.</p>
        </div>
        <div className="min-w-0">
          <h3 className="type-label text-accent">Sample opening hours</h3>
          <div className="mt-6"><BusinessHours /></div>
          <p className="type-caption mt-4 text-secondary">Fictional hours in Portland local time ({business.timezone}).</p>
          <div className="mt-8 border-t border-line pt-8">
            <p id="location-booking-note" className="type-body text-secondary">Explore a fictional demo booking. No real appointment, payment or notification is provided.</p>
            <Link to="/book" className="button mt-6" data-variant="primary" aria-describedby="location-booking-note">Explore booking</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
