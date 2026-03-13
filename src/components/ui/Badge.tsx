import React from 'react';
import { clsx } from 'clsx';

export type BadgeVariant = 'default' | 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning';

const badgeCls: Record<BadgeVariant, string> = {
  default:  'bg-slate-100 text-slate-600 border-slate-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  high:     'bg-orange-50 text-orange-700 border-orange-200',
  medium:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  low:      'bg-blue-50 text-blue-700 border-blue-200',
  success:  'bg-green-50 text-green-700 border-green-200',
  warning:  'bg-amber-50 text-amber-700 border-amber-200',
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => (
  <span className={clsx(
    'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wide border',
    badgeCls[variant as BadgeVariant], className
  )}>
    {children}
  </span>
);
