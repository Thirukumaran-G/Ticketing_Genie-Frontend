import React from 'react';
import { clsx } from 'clsx';

export interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; }

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => (
  <svg
    className={clsx('animate-spin text-white', { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size])}
    fill="none" viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
