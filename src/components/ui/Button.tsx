import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  full?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', loading = false, full = false, className, disabled, ...rest
}) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        primary:   'bg-white text-black hover:bg-zinc-200 focus:ring-white',
        secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 focus:ring-zinc-600',
        danger:    'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
        ghost:     'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800 focus:ring-zinc-700',
        outline:   'bg-transparent text-white border border-zinc-600 hover:border-white focus:ring-zinc-500',
      }[variant],
      { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }[size],
      full && 'w-full',
      className,
    )}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? (
      <>
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Processing…
      </>
    ) : children}
  </button>
);
