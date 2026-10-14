import type { ComponentProps } from 'react';

export function VisuallyHidden({ className = '', ...props }: ComponentProps<'span'>) {
  return <span {...props} className={`sr-only ${className}`} />;
}
