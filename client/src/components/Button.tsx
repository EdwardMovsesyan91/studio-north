import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'standard' | 'compact';
};

export function Button({ variant = 'primary', size = 'standard', type = 'button', className = '', ...props }: ButtonProps) {
  return <button {...props} type={type} data-variant={variant} data-size={size} className={`button ${className}`} />;
}
