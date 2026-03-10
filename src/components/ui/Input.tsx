import React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...rest }, ref) => {
    const uid = id || label?.toLowerCase().replace(/\s+/g, '_');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={uid} className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref} id={uid}
            className={clsx(
              'w-full bg-zinc-900 border text-white placeholder-zinc-600 rounded-lg px-4 py-2.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all',
              error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600',
              leftIcon && 'pl-10', className,
            )}
            {...rest}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
