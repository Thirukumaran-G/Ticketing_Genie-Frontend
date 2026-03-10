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
          <label htmlFor={uid} className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">
            {label}
          </label>
        )}
        <textarea
          ref={ref} id={uid}
          className={clsx(
            'w-full bg-zinc-900 border text-white placeholder-zinc-600 rounded-lg px-4 py-2.5 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-white transition-all resize-y min-h-28',
            error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600', className,
          )}
          {...rest}
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
