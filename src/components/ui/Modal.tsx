import React from 'react';
import { clsx } from 'clsx';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxW?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, maxW = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full mx-4', maxW)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-white font-bold text-base">{title}</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
