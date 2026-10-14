import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { business } from '../data/business';

const pages: Record<string, { title: string; description: string }> = {
  '/': { title: 'Considered grooming', description: 'Discover Studio North, a fictional premium Portland barbershop concept. Explore sample services, fictional barbers, atmosphere and hours. No real bookings.' },
  '/services': { title: 'Services & pricing', description: 'Explore five fictional grooming services with sample USD prices and durations. Studio North is a portfolio demo with fictional bookings only.' },
  '/barbers': { title: 'Meet the barbers', description: 'Meet three fictional Studio North barber profiles. Licensed stock portraits illustrate sample identities, not actual employees.' },
  '/gallery': { title: 'Gallery & atmosphere', description: 'A curated collection of licensed barbershop, grooming-tool and haircut photographs for the fictional Studio North portfolio concept.' },
  '/book': { title: 'Book a demo appointment', description: 'Explore the fictional Studio North booking experience. No real services, appointments or notifications.' },
  '/design-system': { title: 'Design system', description: 'Typography, palette and accessible component specimens for the Studio North fictional portfolio demo.' },
};

export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = (pathname.startsWith('/admin') ? { title: 'Administration', description: 'Protected administration for the Studio North fictional demo.' } : pathname.startsWith('/book/confirmation/') ? { title: 'Demo confirmation', description: 'Privacy-limited fictional booking confirmation.' } : pages[pathname.replace(/\/$/, '') || '/']) ?? { title: 'Page not found', description: 'This page does not exist in the Studio North fictional portfolio demo.' };
    const title = `${page.title} | ${business.name} · Fictional demo`;
    document.title = title;
    function setMeta(attribute: 'name' | 'property', key: string, content: string) {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, key); document.head.append(tag); }
      tag.content = content;
    }
    setMeta('name', 'description', page.description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', page.description);
    setMeta('property', 'og:site_name', business.name);
    setMeta('property', 'og:type', 'website');
    // No canonical/public URL or business/review structured data for this demo.
  }, [pathname]);
  return null;
}
