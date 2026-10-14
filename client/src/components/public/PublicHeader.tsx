import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Button } from '../Button';
import { ThemeToggle } from '../ThemeToggle';
import { Container } from '../Container';
import { desktopNavigationQuery, isDesktopNavigation, publicLinks, subscribeDesktopNavigation } from './navigation';
import { NavigationIndicator } from './NavigationIndicator';

export function PublicHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [routeKey, setRouteKey] = useState(location.key);
  const desktop = useSyncExternalStore(subscribeDesktopNavigation, isDesktopNavigation, () => false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Reset route-local disclosure state without remounting the shared indicator.
  if (routeKey !== location.key) {
    setRouteKey(location.key);
    setOpen(false);
  }

  useEffect(() => {
    const desktop = window.matchMedia(desktopNavigationQuery);
    function handleResize(event: MediaQueryListEvent) {
      // A breakpoint can hide or inert the focused element before this event runs.
      const previous = lastFocused.current;
      const active = document.activeElement === document.body && previous &&
        (!previous.getClientRects().length || previous.closest('[inert]'))
        ? previous : document.activeElement;
      setOpen(false);
      if (event.matches && active === toggle.current) {
        header.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();
      } else if (!event.matches && active instanceof Element && active.closest('#public-navigation')) {
        toggle.current?.focus();
      }
    }
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape' && toggle.current?.getClientRects().length) {
        setOpen(false);
        toggle.current.focus();
      }
    }
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);

  function closeAfterNavigation() {
    setOpen(false);
    document.getElementById('main')?.focus({ preventScroll: true });
  }

  return (
    <header ref={header} className="public-header" onFocus={(event) => { lastFocused.current = event.target; }} onBlur={(event) => {
      if (event.relatedTarget && !header.current?.contains(event.relatedTarget)) {
        lastFocused.current = null;
        setOpen(false);
      }
    }}>
      <Container>
        <div className="header-row">
          <Link to="/" onClick={closeAfterNavigation} className="wordmark" aria-label="Studio North home">
            <span className="font-display text-subtitle">Studio North<span aria-hidden="true" className="text-accent">.</span></span>
            <span className="type-label text-secondary">Barbershop concept</span>
          </Link>
          <Button ref={toggle} variant="secondary" size="compact" className="navigation-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}
            aria-controls="public-navigation" onClick={() => setOpen((current) => !current)}>
            {open ? 'Close' : 'Menu'}
            <span aria-hidden="true" className="menu-icon"><span /><span /><span /></span>
          </Button>
          <nav id="public-navigation" className="public-navigation" data-open={open} aria-label="Main navigation"
            inert={!desktop && !open} aria-hidden={!desktop && !open}>
            <div className="navigation-clip"><div className="navigation-content">
              <p className="type-label mobile-navigation-label text-accent">Explore the studio</p>
              <ul>
                {publicLinks.map(({ to, label }) => (
                  <li key={to} className={to === '/book' ? 'booking-navigation-item' : undefined}>
                    {to === '/book' && <ThemeToggle />}
                    <NavLink to={to} end onClick={closeAfterNavigation}
                      tabIndex={!desktop && !open ? -1 : undefined}
                      className={to === '/book' ? 'button booking-link' : 'navigation-link'}
                      {...(to === '/book' ? { 'data-variant': 'primary' } : {})}>
                      {label}

                    </NavLink>
                  </li>
                ))}
                <NavigationIndicator routeKey={location.key} />
              </ul>
            </div></div>
          </nav>
        </div>
      </Container>
      <div className="demo-notice">
        <Container>
          <p className="type-caption text-interactive">
            <strong>Fictional portfolio demo.</strong>{' '}Studio North is a concept. No real services or bookings.
          </p>
        </Container>
      </div>
    </header>
  );
}
