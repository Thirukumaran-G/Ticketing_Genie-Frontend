// src/features/tickets/components/teamlead/ApologyModal.tsx
import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { ticketsService } from '../../services/ticketsService';

interface Template {
  id:        string;
  key:       string;
  name:      string;
  subject:   string;
  body:      string;
  variables: string[];
}

interface Props {
  ticketId:       string;
  ticketNumber:   string;
  customerName?:  string;
  onClose:        () => void;
  onSent:         () => void;
}

export const ApologyModal: React.FC<Props> = ({
  ticketId,
  ticketNumber,
  customerName,
  onClose,
  onSent,
}) => {
  const [templates, setTemplates]         = useState<Template[]>([]);
  const [selectedId, setSelectedId]       = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [commitTime, setCommitTime]       = useState('');
  const [preview, setPreview]             = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [showPreview, setShowPreview]     = useState(false);

  // Load templates on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await ticketsService.listNotificationTemplates();
        // Only show customer-facing templates (not internal warning ones)
        const customerTemplates = data.filter(
          (t: Template) => !t.key.includes('agent') && !t.key.includes('warning')
        );
        setTemplates(customerTemplates);
        if (customerTemplates.length > 0) {
          // Default to sla_apology if available
          const apology = customerTemplates.find((t: Template) => t.key === 'sla_apology');
          setSelectedId(apology?.id ?? customerTemplates[0].id);
        }
      } catch {
        toast.error('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build preview whenever selection or custom fields change
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedId);
    if (!tpl) { setPreview(''); return; }

    let body = tpl.body;
    const vars: Record<string, string> = {
      customer_name:   customerName || 'Customer',
      ticket_number:   ticketNumber,
      ticket_title:    '',
      commit_time:     commitTime || 'as soon as possible',
      custom_message:  customMessage || '',
      team_lead_name:  'Support Team Lead',
      hold_reason:     'pending investigation',
      resume_date:     'shortly',
      resolution_summary: 'Your issue has been resolved.',
    };
    Object.entries(vars).forEach(([k, v]) => {
      body = body.replaceAll(`{${k}}`, v);
    });
    setPreview(body);
  }, [selectedId, customMessage, commitTime, templates, ticketNumber, customerName]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const onSend = async () => {
    if (!selectedId) { toast.error('Select a template first'); return; }
    try {
      setSending(true);
      const result = await ticketsService.sendApology(
        ticketId,
        selectedId,
        customMessage || undefined,
        commitTime   || undefined,
      );
      toast.success(
        result.sent
          ? `Apology sent via ${result.channel}`
          : 'Apology logged (send failed — check logs)',
      );
      onSent();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to send apology');
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
            <h3 className="text-[#172b4d] text-sm font-semibold">Send apology to customer</h3>
            <p className="text-[#6b778c] text-xs mt-0.5 font-mono">{ticketNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f4f5f7] text-[#44546f] transition-colors"
          >
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
              <p className="text-[#44546f] text-sm">No templates available.</p>
              <p className="text-[#8993a4] text-xs mt-1">
                Add templates in Settings → Templates.
              </p>
            </div>
          ) : (
            <>
              {/* Template selector */}
              <div>
                <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
                  Template
                </label>
                <div className="space-y-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedId(tpl.id)}
                      className={clsx(
                        'w-full flex items-start gap-3 px-3 py-2.5 rounded border text-left transition-all',
                        selectedId === tpl.id
                          ? 'border-[#0052cc] bg-[#deebff]'
                          : 'border-[#dfe1e6] bg-white hover:border-[#b3bac5] hover:bg-[#f4f5f7]',
                      )}
                    >
                      <div className={clsx(
                        'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors',
                        selectedId === tpl.id
                          ? 'border-[#0052cc] bg-[#0052cc]'
                          : 'border-[#b3bac5]',
                      )} />
                      <div className="min-w-0">
                        <p className={clsx(
                          'text-sm font-medium',
                          selectedId === tpl.id ? 'text-[#0052cc]' : 'text-[#172b4d]',
                        )}>
                          {tpl.name}
                        </p>
                        <p className="text-xs text-[#6b778c] truncate mt-0.5">
                          {tpl.subject}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Commit time — only for sla_apology template */}
              {selectedTemplate?.key === 'sla_apology' && (
                <div>
                  <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
                    Commitment time
                    <span className="ml-1 text-[#8993a4] font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={commitTime}
                    onChange={(e) => setCommitTime(e.target.value)}
                    placeholder="e.g. within 2 hours, by end of day…"
                    className="w-full h-8 px-3 rounded border border-[#dfe1e6] text-sm text-[#172b4d] placeholder:text-[#8993a4] bg-[#fafbfc] outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
                  />
                </div>
              )}

              {/* Custom message */}
              <div>
                <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
                  Additional note
                  <span className="ml-1 text-[#8993a4] font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal note or context for this specific customer…"
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
                  <svg
                    className={clsx('w-3 h-3 transition-transform', showPreview && 'rotate-90')}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
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
          <p className="text-xs text-[#8993a4]">
            Sent via customer's notification preference
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="h-8 px-4 rounded text-sm text-[#42526e] hover:bg-[#ebecf0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={sending || !selectedId || loading}
              className="h-8 px-4 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {sending && (
                <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Send apology
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};