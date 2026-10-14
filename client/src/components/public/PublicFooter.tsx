import { NavLink } from 'react-router';
import { Container } from '../Container';
import { publicLinks } from './navigation';
import { BusinessHours } from '../BusinessHours';
import { business, businessLocation } from '../../data/business';
import { useBusiness } from '../../api';

export function PublicFooter() {
  const config = useBusiness();
  return (
    <footer className="inverse-surface py-12 sm:py-16">
      <Container>
        <div className="grid gap-10 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.2fr_1fr]">
          <section aria-labelledby="footer-studio">
            <h2 id="footer-studio" className="font-display text-subtitle">{business.name}.</h2>
            <p className="type-caption mt-4 max-w-xs">An independent barbershop concept with a considered approach to craft.</p>
            <p className="type-caption mt-4">{businessLocation}<br />Fictional location. No physical shop.</p>
          </section>
          <section aria-labelledby="footer-hours">
            <h2 id="footer-hours" className="type-label text-copper">Business hours</h2>
            <p className="type-caption mt-4">Fictional sample schedule</p>
            <div className="mt-3"><BusinessHours /></div>
            <p className="type-caption mt-4">Portland local time ({business.timezone}).</p>
          </section>
          <nav aria-label="Footer navigation">
            <h2 className="type-label text-copper">Explore</h2>
            <ul className="mt-2">
              {publicLinks.map(({ to, label }) => (
                <li key={to}>
                  <NavLink to={to} end className="footer-link">
                    {label}
                  </NavLink>
                </li>
              ))}
              {config.data?.demoMode && <li><NavLink to="/admin" className="footer-link">Explore demo administration</NavLink></li>}
            </ul>
          </nav>
        </div>
        <p className="type-caption mt-10 border-t border-ivory/25 pt-6">Fictional portfolio demo · No services, appointments, or payments are offered.</p>
      </Container>
    </footer>
  );
}
