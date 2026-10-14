import { Link, Route, Routes } from 'react-router';
import { DesignSystem } from './pages/DesignSystem';
import { Booking, BookingConfirmation } from './pages/Booking';
import { PublicLayout } from './layouts/PublicLayout';
import { SpecimenLayout } from './layouts/SpecimenLayout';
import { Home } from './pages/Home';
import { Services } from './pages/Services';
import { Barbers } from './pages/Barbers';
import { Gallery } from './pages/Gallery';
import { Admin } from './pages/admin/Admin';
import { RouteMetadata } from './components/RouteMetadata';

function NotFound() {
  return (
    <section aria-labelledby="not-found-title" className="py-section">
      <p className="type-label mb-4 text-accent">404</p>
      <h1 id="not-found-title" className="type-title">Page not found</h1>
      <p className="type-body mt-6 text-secondary">This page does not exist in the Studio North demo.</p>
      <Link to="/" className="text-link mt-8 inline-flex min-h-11 items-center">Return home</Link>
    </section>
  );
}

export function App() {
  return (
    <><RouteMetadata /><Routes>
      <Route path="/admin/*" element={<Admin />} />
      <Route element={<SpecimenLayout />}>
        <Route path="/design-system" element={<DesignSystem />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/barbers" element={<Barbers />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/book" element={<Booking />} />
        <Route path="/book/confirmation/:reference" element={<BookingConfirmation />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes></>
  );
}
