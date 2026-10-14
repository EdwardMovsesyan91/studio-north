import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Container } from '../components/Container';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';
import { SectionNavigator } from '../components/public/SectionNavigator';

export function PublicLayout() {
  const location = useLocation();
  const previousRoute = useRef(location.key);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    if (previousRoute.current !== location.key) {
      main.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      previousRoute.current = location.key;
    }
  }, [location.key]);

  return (
    <div className="public-layout flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <PublicHeader />
      <main id="main" ref={main} tabIndex={-1} className="flex-1">
        <Container className={location.pathname === '/' ? 'home-container' : ''}><Outlet /></Container>
      </main>
      <PublicFooter />
      <SectionNavigator />
    </div>
  );
}
