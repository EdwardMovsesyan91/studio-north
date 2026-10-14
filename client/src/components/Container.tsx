import type { ComponentProps } from 'react';

export function Container({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`mx-auto w-full max-w-6xl px-5 sm:px-10 ${className}`} />;
}
