import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

const homeSections = [
  { id: 'home-hero', label: 'Introduction' },
  { id: 'home-services', label: 'Services' },
  { id: 'home-barbers', label: 'Barbers' },
  { id: 'home-gallery', label: 'Gallery' },
  { id: 'home-testimonials', label: 'Testimonials' },
  { id: 'home-location', label: 'Location & booking' },
] as const;

export function SectionNavigator() {
  const location = useLocation();
  // Other public pages currently have one meaningful content collection.
  return location.pathname === '/' ? <DesktopSectionNavigator key={location.key} sections={homeSections} /> : null;
}

function DesktopSectionNavigator({ sections }: { sections: readonly { id: string; label: string }[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const desktop = matchMedia('(min-width: 64rem) and (hover: hover) and (pointer: fine)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const elements = sections.map(({ id }) => document.getElementById(id));
      const desktopTextFits = innerWidth / Number.parseFloat(getComputedStyle(document.documentElement).fontSize) >= 64;
      const usable = desktop.matches && desktopTextFits && sections.length >= 2 && elements.every(Boolean) &&
        document.documentElement.scrollHeight > innerHeight + 1;
      setAvailable(usable);
      if (!usable) {
        if (root.current?.contains(document.activeElement)) document.getElementById('main')?.focus({ preventScroll: true });
        setOpen(false);
        return;
      }
      // The last section crossing the upper third owns the reading position.
      let current: string = sections[0]?.id ?? '';
      elements.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= innerHeight * 0.33) current = sections[index]!.id;
      });
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = sections.at(-1)!.id;
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    desktop.addEventListener('change', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      desktop.removeEventListener('change', schedule);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [sections]);

  return (
    <aside ref={root} className="section-navigator" hidden={!available} data-open={open}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => { if (!root.current?.contains(document.activeElement)) setOpen(false); }}
      onFocus={() => setOpen(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          document.getElementById('main')?.focus({ preventScroll: true });
          setOpen(false);
        }
      }}>
      <button type="button" className="section-navigator-trigger" aria-label="Navigate homepage sections"
        aria-expanded={open} aria-controls="homepage-section-links" onClick={() => setOpen(true)}>
        <span className="section-lines" aria-hidden="true">
          {sections.map(({ id }) => <span key={id} data-active={id === active} />)}
        </span>
      </button>
      <nav id="homepage-section-links" aria-label="Homepage sections" className="section-navigator-panel" inert={!open}>
        <ol>
          {sections.map(({ id, label }) => (
            <li key={id}><a href={`#${id}`} aria-current={id === active ? 'location' : undefined}
              onClick={(event) => {
                const section = document.getElementById(id);
                if (!section) return;
                event.preventDefault();
                section.focus({ preventScroll: true });
                window.scrollTo({ top: scrollY + section.getBoundingClientRect().top,
                  behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
                setOpen(false);
              }}>{label}</a></li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
