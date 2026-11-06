import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner and blocks repeat taps while something is in flight. */
  loading?: boolean;
}

export function buttonClasses(variant: ButtonVariant, size: ButtonSize, fullWidth: boolean, className?: string) {
  return [styles.button, styles[variant], styles[size], fullWidth ? styles.fullWidth : '', className || '']
    .filter(Boolean)
    .join(' ');
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={loading || undefined}
      className={`${buttonClasses(variant, size, fullWidth, className)} ${loading ? styles.loading : ''}`}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading && <span aria-hidden="true" className={styles.spinner} />}
      {children}
    </button>
  );
}
