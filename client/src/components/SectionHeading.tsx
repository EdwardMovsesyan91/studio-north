import type { ReactNode } from 'react';

type SectionHeadingProps = {
  id: string;
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  level?: 2 | 3;
};

export function SectionHeading({ id, title, eyebrow, description, level = 2 }: SectionHeadingProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div className="mb-10 max-w-2xl">
      {eyebrow && <p className="type-label mb-3 text-accent">{eyebrow}</p>}
      <Heading id={id} className={level === 2 ? 'type-title' : 'type-subtitle'}>{title}</Heading>
      {description && <p className="type-body mt-4 text-secondary">{description}</p>}
    </div>
  );
}
