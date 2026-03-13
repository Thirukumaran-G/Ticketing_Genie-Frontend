import React from 'react';
import { clsx } from 'clsx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...rest }, ref) => {
    const uid = id || label?.toLowerCase().replace(/\s+/g, '_');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={uid} className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-widest">
            {label}
          </label>
        )}
        <textarea
          ref={ref} id={uid}
          className={clsx(
            'w-full bg-white border text-slate-900 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y min-h-28',
            error ? 'border-red-400' : 'border-slate-200 hover:border-blue-300', className,
          )}
          {...rest}
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
