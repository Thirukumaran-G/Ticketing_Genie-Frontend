// src/features/tickets/components/teamlead/ReopenWarningModal.tsx
import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { ticketsService } from '../../services/ticketsService';

interface Template {
  id: string; key: string; name: string; subject: string; body: string; variables: string[];
}

interface Props {
  ticketId:      string;
  ticketNumber:  string;
  reopenCount:   number;
  customerName?: string;
  onClose:       () => void;
  onSent:        () => void;
}

export const ReopenWarningModal: React.FC<Props> = ({
  ticketId, ticketNumber, reopenCount, customerName, onClose, onSent,
}) => {
  const [templates, setTemplates]         = useState<Template[]>([]);
  const [selectedId, setSelectedId]       = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [preview, setPreview]             = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [showPreview, setShowPreview]     = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ticketsService.listNotificationTemplates();
        const filtered = data.filter((t: Template) => t.key === 'reopen_warning');
        setTemplates(filtered);
        if (filtered.length > 0) setSelectedId(filtered[0].id);
      } catch {
        toast.error('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedId);
    if (!tpl) { setPreview(''); return; }
    let body = tpl.body;
    const vars: Record<string, string> = {
      customer_name:  customerName || 'Customer',
      ticket_number:  ticketNumber,
      ticket_title:   '',
      reopen_count:   String(reopenCount),
      custom_message: customMessage || '',
      team_lead_name: 'Support Team Lead',
    };
    Object.entries(vars).forEach(([k, v]) => { body = body.replaceAll(`{${k}}`, v); });
    setPreview(body);
  }, [selectedId, customMessage, templates, ticketNumber, customerName, reopenCount]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const onSend = async () => {
    if (!selectedId) { toast.error('No template available'); return; }
    try {
      setSending(true);
      const result = await ticketsService.sendReopenWarning(ticketId, selectedId, customMessage || undefined);
      toast.success(result.sent ? `Warning sent via ${result.channel}` : 'Warning logged (send failed — check logs)');
      onSent();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to send warning');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white border border-[#dfe1e6] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dfe1e6] flex-shrink-0">
          <div>
            <h3 className="text-[#172b4d] text-sm font-semibold">Send reopen warning to customer</h3>
            <p className="text-[#6b778c] text-xs mt-0.5 font-mono">{ticketNumber} · reopened {reopenCount}×</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f4f5f7] text-[#44546f] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#44546f] text-sm">No reopen warning template found.</p>
              <p className="text-[#8993a4] text-xs mt-1">Run the reopen warning seed script first.</p>
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-800">
                  This ticket has been reopened <span className="font-semibold">{reopenCount} times</span>. The customer will be advised to raise a new ticket for further issues.
                </p>
              </div>

              {/* Custom message */}
              <div>
                <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
                  Additional note
                  <span className="ml-1 text-[#8993a4] font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any additional context for the customer…"
                  rows={3}
                  className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2 text-sm text-[#172b4d] placeholder:text-[#8993a4] resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
                />
              </div>

              {/* Preview toggle */}
              <div>
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-[#0052cc] hover:text-[#0747a6] transition-colors"
                >
                  <svg className={clsx('w-3 h-3 transition-transform', showPreview && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showPreview ? 'Hide preview' : 'Show message preview'}
                </button>
                {showPreview && preview && (
                  <div className="mt-2 px-4 py-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded text-xs text-[#172b4d] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {preview}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-[#8993a4]">Sent via customer's notification preference</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={sending} className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors">
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={sending || !selectedId || loading}
              className="h-8 px-4 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {sending && <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />}
              Send warning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};