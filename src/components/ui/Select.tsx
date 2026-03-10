import React from 'react';
import { clsx } from 'clsx';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...rest }, ref) => {
    const uid = id || label?.toLowerCase().replace(/\s+/g, '_');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={uid} className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">
            {label}
          </label>
        )}
        <select
          ref={ref} id={uid}
          className={clsx(
            'w-full bg-zinc-900 border text-white rounded-lg px-4 py-2.5 text-sm appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-white transition-all',
            error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600', className,
          )}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
