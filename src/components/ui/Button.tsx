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
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        primary:   'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-white shadow-sm shadow-blue-500/20',
        secondary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 focus:ring-blue-400 focus:ring-offset-white',
        danger:    'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 focus:ring-offset-white',
        ghost:     'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:ring-slate-300 focus:ring-offset-white',
        outline:   'bg-transparent text-blue-600 border border-blue-300 hover:bg-blue-50 focus:ring-blue-400 focus:ring-offset-white',
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
