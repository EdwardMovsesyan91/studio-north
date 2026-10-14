import { SectionHeading } from '../SectionHeading';
import { sampleTestimonials } from '../../data/testimonials';

export function SampleTestimonials() {
  return (
    <section id="home-testimonials" tabIndex={-1} aria-labelledby="testimonials-title" className="marketing-section pb-section">
      <div className="testimonial-surface">
        <SectionHeading id="testimonials-title" eyebrow="Sample voices / Portfolio demo"
          title="Time well spent." description="Fictional examples of the experience this concept imagines. These are not real customer reviews." />
        <div className="testimonial-grid">
          {sampleTestimonials.map(({ id, quote }, index) => (
            <figure key={id} className="sample-testimonial">
              <blockquote className="type-subtitle"><p>“{quote}”</p></blockquote>
              <figcaption className="type-caption mt-6 text-secondary">Sample testimonial {index + 1} · Fictional demo content</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
