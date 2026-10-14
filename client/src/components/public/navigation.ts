export const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/barbers', label: 'Barbers' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/book', label: 'Book' },
] as const;

export const desktopNavigationQuery = '(min-width: 64rem)';

export function subscribeDesktopNavigation(listener: () => void) {
  const media = window.matchMedia(desktopNavigationQuery);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

export function isDesktopNavigation() {
  return window.matchMedia(desktopNavigationQuery).matches;
}
