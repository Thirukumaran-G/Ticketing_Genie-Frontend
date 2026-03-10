import React from 'react';
import { clsx } from 'clsx';

export type BadgeVariant = 'default' | 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning';

const badgeCls: Record<BadgeVariant, string> = {
  default:  'bg-zinc-800 text-zinc-300 border-zinc-700',
  critical: 'bg-red-950 text-red-400 border-red-800',
  high:     'bg-orange-950 text-orange-400 border-orange-800',
  medium:   'bg-yellow-950 text-yellow-400 border-yellow-800',
  low:      'bg-blue-950 text-blue-400 border-blue-800',
  success:  'bg-green-950 text-green-400 border-green-800',
  warning:  'bg-yellow-950 text-yellow-400 border-yellow-800',
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => (
  <span className={clsx(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide border',
    badgeCls[variant as BadgeVariant], className
  )}>
    {children}
  </span>
);
