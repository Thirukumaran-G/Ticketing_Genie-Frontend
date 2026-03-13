import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxW?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxW = 'max-w-lg',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* ── Backdrop ── */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Panel ── */}
      <div
        ref={panelRef}
        className={clsx(
          'relative w-full flex flex-col',
          'bg-white border border-slate-200/80',
          'rounded-2xl shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18)]',
          'animate-modal-in',
          maxW,
        )}
        style={{ maxHeight: 'min(90vh, 860px)' }}
      >
        {/* ── Top accent line ── */}
        <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-blue-400/60 to-transparent pointer-events-none" />

        {/* ── Header ── */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {/* Small blue accent bar */}
              <span className="w-1 h-4 rounded-full bg-blue-500 flex-shrink-0" />
              <h2
                id="modal-title"
                className="text-slate-900 font-semibold text-[15px] tracking-tight leading-none"
              >
                {title}
              </h2>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className={clsx(
                'flex items-center justify-center w-7 h-7 rounded-lg',
                'text-slate-400 hover:text-slate-700',
                'bg-transparent hover:bg-slate-100',
                'transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {children}
        </div>
      </div>

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-modal-in {
          animation: modal-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
};