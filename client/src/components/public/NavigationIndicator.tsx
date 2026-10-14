import { useLayoutEffect, useRef } from 'react';
import { isDesktopNavigation } from './navigation';

type NavigationIndicatorProps = { routeKey: string };

export function NavigationIndicator({ routeKey }: NavigationIndicatorProps) {
  const indicator = useRef<HTMLLIElement>(null);

  useLayoutEffect(() => {
    const line = indicator.current;
    const parent = line?.parentElement;
    if (!parent || !line) return;
    let disposed = false;

    function measure() {
      if (disposed || !parent || !line) return;
      const active = parent.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      if (!isDesktopNavigation() || !active) {
        line.dataset.visible = 'false';
        line.dataset.ready = 'false';
        return;
      }
      const bounds = parent.getBoundingClientRect();
      const target = active.getBoundingClientRect();
      // Physical coordinates match DOM rectangles in both LTR and RTL.
      line.style.setProperty('--indicator-x', `${target.left - bounds.left}px`);
      line.style.setProperty('--indicator-y', `${target.bottom - bounds.top + 2}px`);
      line.style.setProperty('--indicator-width', `${target.width}px`);
      line.dataset.visible = 'true';
      if (line.dataset.ready !== 'true') {
        // Snap initial placement before enabling subsequent route transitions.
        line.getBoundingClientRect();
        line.dataset.ready = 'true';
      }
    }

    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(parent);
    parent.querySelectorAll('a').forEach((link) => sizes.observe(link));
    const direction = new MutationObserver(measure);
    direction.observe(document.documentElement, { attributes: true, attributeFilter: ['dir', 'style', 'class'] });
    window.addEventListener('resize', measure);
    document.fonts.addEventListener('loadingdone', measure);
    void document.fonts.ready.then(measure);
    return () => {
      disposed = true;
      sizes.disconnect();
      direction.disconnect();
      window.removeEventListener('resize', measure);
      document.fonts.removeEventListener('loadingdone', measure);
    };
  }, [routeKey]);

  return <li ref={indicator} aria-hidden="true" className="navigation-indicator" />;
}
