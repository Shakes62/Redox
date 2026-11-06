import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './Button';

interface LinkButtonProps {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
}

export function LinkButton({
  children,
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  onClick
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, fullWidth, className)} href={href} onClick={onClick}>
      {children}
    </Link>
  );
}
