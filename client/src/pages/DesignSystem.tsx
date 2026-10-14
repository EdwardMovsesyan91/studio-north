import { useState } from 'react';
import { Button } from '../components/Button';
import { SectionHeading } from '../components/SectionHeading';
import { VisuallyHidden } from '../components/VisuallyHidden';

const palette = [
  { name: 'Warm ivory', hex: '#F5F2EB', background: 'bg-ivory', purpose: 'Primary canvas' },
  { name: 'Charcoal', hex: '#242827', background: 'bg-charcoal', purpose: 'Headings and primary actions' },
  { name: 'Slate blue', hex: '#364B59', background: 'bg-slate', purpose: 'Links, focus and control borders' },
  { name: 'Muted copper', hex: '#B58C69', background: 'bg-copper', purpose: 'Decorative accents on ivory' },
  { name: 'Stone', hex: '#DDD7CE', background: 'bg-stone', purpose: 'Quiet surfaces and dividers' },
  { name: 'Copper ink', hex: '#805735', background: 'bg-copper-ink', purpose: 'Accessible accent text on ivory' },
  { name: 'Muted text', hex: '#565F5B', background: 'bg-muted', purpose: 'Supporting text' },
] as const;

const spacing = [
  { step: '1', value: '4px', width: 'w-1' },
  { step: '2', value: '8px', width: 'w-2' },
  { step: '3', value: '12px', width: 'w-3' },
  { step: '4', value: '16px', width: 'w-4' },
  { step: '6', value: '24px', width: 'w-6' },
  { step: '8', value: '32px', width: 'w-8' },
  { step: '12', value: '48px', width: 'w-12' },
  { step: '16', value: '64px', width: 'w-16' },
] as const;

export function DesignSystem() {
  const [marked, setMarked] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [compact, setCompact] = useState(false);

  return (
    <div className="pb-section">
      <section aria-labelledby="design-title" className="py-section">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="type-label text-accent">Studio North / Visual foundation</p>
          <p className="type-caption text-secondary">Specimen 01 · Milestone 2A</p>
        </div>
        <h1 id="design-title" className="type-display mt-10 max-w-3xl">Quiet confidence.<br />Considered detail.</h1>
        <p className="mt-6 max-w-xl text-lead text-secondary">A visual language for Studio North: warm, precise, and grounded in the craft.</p>
        <p className="type-caption mt-8 max-w-xl text-secondary">Temporary design-system review. Fictional portfolio demo; no services or bookings are offered.</p>
      </section>

      <section aria-labelledby="typography-title" className="specimen-section">
        <SectionHeading id="typography-title" eyebrow="01 / Typography" title="A voice with character" description="An editorial serif for expressive moments. A clear system sans-serif for everything you need to read." />
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <div><p className="type-caption mb-3 text-secondary">Display · Georgia · fluid 44–88px</p><p className="type-display">The finer details.</p></div>
            <div><p className="type-caption mb-3 text-secondary">Heading · Georgia · fluid 32–56px</p><p className="type-title">Made with intention.</p></div>
            <div><p className="type-caption mb-3 text-secondary">Subheading · Georgia · 24px</p><p className="type-subtitle">Room for a slower moment.</p></div>
          </div>
          <div className="space-y-8 border-s border-line ps-6">
            <div><p className="type-label mb-3 text-accent">Label / 12px</p><p className="type-body">Body / 16px. Clear, unhurried language with comfortable line spacing. Keep long passages to a readable measure.</p></div>
            <p className="text-lead">Lead / 20px. Good craft begins with attention.</p>
            <p className="type-caption text-secondary">Caption / 14px. Supporting details should remain easy to read.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="palette-title" className="specimen-section">
        <SectionHeading id="palette-title" eyebrow="02 / Palette" title="Warmth, without excess" description="Ivory and charcoal lead. Slate grounds interactions; copper adds a restrained accent." />
        <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {palette.map((color) => (
            <li key={color.name}>
              <div aria-hidden="true" className={`mb-4 h-24 border border-line ${color.background}`} />
              <h3 className="type-body font-semibold">{color.name}</h3>
              <p className="type-caption font-mono text-secondary">{color.hex}</p>
              <p className="type-caption mt-2 text-secondary">{color.purpose}</p>
            </li>
          ))}
        </ul>
        <div className="inverse-surface mt-10 p-6 sm:p-10">
          <p className="type-label mb-4 text-copper">Inverse surface</p>
          <p className="type-subtitle">A little contrast. A clear point of view.</p>
          <p className="type-caption mt-4">Ivory text on charcoal. Copper may be used as text on this dark surface.</p>
        </div>
      </section>

      <section aria-labelledby="buttons-title" className="specimen-section">
        <SectionHeading id="buttons-title" eyebrow="03 / Interaction" title="Purpose in every action" description="These controls change this specimen only. Use Tab to inspect focus and Enter or Space to activate. Disabled examples are intentionally unavailable." />
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <h3 className="type-label">Primary</h3>
            <Button aria-pressed={marked} onClick={() => setMarked(!marked)}>Mark specimen</Button>
            <p role="status" className="type-caption text-secondary">{marked ? 'Specimen marked for review.' : 'Specimen not marked.'}</p>
            <Button disabled>Primary unavailable</Button>
          </div>
          <div className="space-y-4">
            <h3 className="type-label">Secondary</h3>
            <Button variant="secondary" aria-expanded={detailsVisible} aria-controls="specimen-details" onClick={() => setDetailsVisible(!detailsVisible)}>{detailsVisible ? 'Hide details' : 'Show details'}<VisuallyHidden> about the interaction specimen</VisuallyHidden></Button>
            <p id="specimen-details" hidden={!detailsVisible} className="type-caption text-secondary">Native buttons, explicit state, and a visible focus ring. No simulated business action.</p>
            <div><Button variant="secondary" disabled>Secondary unavailable</Button></div>
          </div>
          <div className="space-y-4">
            <h3 className="type-label">Quiet / size</h3>
            <Button variant="quiet" size={compact ? 'compact' : 'standard'} aria-pressed={compact} onClick={() => setCompact(!compact)}>Compact size</Button>
            <p role="status" className="type-caption text-secondary">{compact ? 'Compact: minimum 44px height.' : 'Standard: minimum 48px height.'}</p>
            <Button variant="quiet" disabled>Quiet unavailable</Button>
          </div>
        </div>
        <p className="type-caption mt-8 text-secondary">Hover changes the surface. Pressed toggles use a double border and explicit text; unavailable controls use native disabled behavior, dashed borders, and labels. Motion preference is respected.</p>
      </section>

      <section aria-labelledby="spacing-title" className="specimen-section">
        <SectionHeading id="spacing-title" eyebrow="04 / Rhythm" title="Give the craft room" description="A 4px spacing unit. Generous section gaps, simple borders, and nearly square controls." />
        <div className="grid gap-10 md:grid-cols-2">
          <ul className="space-y-4">
            {spacing.map((space) => (
              <li key={space.step} className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="type-caption w-24 shrink-0 font-mono">{space.step} / {space.value}</span>
                <span aria-hidden="true" className={`h-3 bg-slate ${space.width}`} />
              </li>
            ))}
          </ul>
          <dl className="type-body space-y-6">
            <div><dt className="font-semibold">Section rhythm</dt><dd className="text-secondary">48–96px, fluid with viewport width.</dd></div>
            <div><dt className="font-semibold">Borders & corners</dt><dd className="text-secondary">1px dividers; 2px control radius. No ornamental shadows.</dd></div>
            <div><dt className="font-semibold">Keyboard focus</dt><dd className="text-secondary">3px slate outline, offset by 4px. Ivory outline on dark surfaces.</dd></div>
            <div><dt className="font-semibold">Interaction</dt><dd className="text-secondary">150ms color transitions. No transition when reduced motion is requested.</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}
