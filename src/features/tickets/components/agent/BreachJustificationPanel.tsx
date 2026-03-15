// src/features/tickets/components/agent/BreachJustificationPanel.tsx
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { ticketsService } from '../../services/ticketsService';

interface BreachJustification {
  conversation_id: string;
  ticket_id:       string;
  agent_id:        string;
  breach_type:     'response' | 'resolution';
  justification:   string;
  submitted_at:    string;
}

interface Props {
  ticketId:                string;
  responseBreachedAt?:     string | null;
  slaBreachedAt?:          string | null;
  onSubmitted?:            () => void;
}

const MIN_CHARS = 30;

export const BreachJustificationPanel: React.FC<Props> = ({
  ticketId,
  responseBreachedAt,
  slaBreachedAt,
  onSubmitted,
}) => {
  const [existing, setExisting]     = useState<BreachJustification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [breachType, setBreachType] = useState<'response' | 'resolution'>(
    responseBreachedAt ? 'response' : 'resolution'
  );
  const [text, setText]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const hasResponseBreach    = !!responseBreachedAt;
  const hasResolutionBreach  = !!slaBreachedAt;
  const remaining            = MIN_CHARS - text.trim().length;

  const loadExisting = async () => {
    try {
      setLoading(true);
      const data = await ticketsService.getBreachJustifications(ticketId);
      setExisting(data);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExisting(); }, [ticketId]);

  // Check if this breach_type already has a submission
  const alreadySubmitted = (type: 'response' | 'resolution') =>
    existing.some((j) => j.breach_type === type);

  const allSubmitted =
    (!hasResponseBreach   || alreadySubmitted('response'))   &&
    (!hasResolutionBreach || alreadySubmitted('resolution'));

  const onSubmit = async () => {
    if (text.trim().length < MIN_CHARS) {
      setError(`Minimum ${MIN_CHARS} characters required.`);
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await ticketsService.submitBreachJustification(ticketId, breachType, text.trim());
      toast.success('Justification submitted — team lead notified');
      setText('');
      await loadExisting();
      onSubmitted?.();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string' && detail.includes('already been submitted')) {
        toast.error('Justification already submitted for this breach type.');
        await loadExisting();
      } else {
        toast.error(detail ?? 'Failed to submit justification');
        setError(detail ?? 'Submission failed — please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Nothing to show if no breaches
  if (!hasResponseBreach && !hasResolutionBreach) return null;

  return (
    <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4">

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-[#172b4d] text-sm font-semibold">
            SLA Breach — Justification Required
          </p>
          <p className="text-[#44546f] text-xs mt-0.5">
            Your team lead has been notified. Please explain what caused the breach.
          </p>
        </div>
      </div>

      {/* Already submitted justifications */}
      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-[#8993a4]">
          <div className="w-3.5 h-3.5 border border-[#8993a4] border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : existing.length > 0 && (
        <div className="mb-4 space-y-2">
          {existing.map((j) => (
            <div
              key={j.conversation_id}
              className="px-3 py-2.5 bg-purple-50 border border-purple-200 rounded"
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest">
                  {j.breach_type} breach — submitted
                </span>
                <span className="ml-auto text-[10px] text-purple-400">
                  {format(new Date(j.submitted_at), 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                {j.justification}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Form — only show if there are unsubmitted breaches */}
      {!allSubmitted && (
        <div className="space-y-3">

          {/* Breach type selector — only show if multiple breach types exist */}
          {hasResponseBreach && hasResolutionBreach && (
            <div className="flex items-center gap-1 p-0.5 bg-[#f4f5f7] rounded border border-[#dfe1e6] w-fit">
              {(['response', 'resolution'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setBreachType(type); setError(''); }}
                  disabled={alreadySubmitted(type)}
                  className={clsx(
                    'px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize',
                    breachType === type
                      ? 'bg-white text-[#de350b] border border-[#dfe1e6] shadow-sm'
                      : 'text-[#6b778c] hover:text-[#172b4d]',
                    alreadySubmitted(type) && 'opacity-40 cursor-not-allowed line-through',
                  )}
                >
                  {type}
                  {alreadySubmitted(type) && (
                    <span className="ml-1 text-[9px] normal-case">(done)</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Single breach type label when only one */}
          {!(hasResponseBreach && hasResolutionBreach) && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#de350b] uppercase tracking-widest">
                {hasResponseBreach ? 'Response' : 'Resolution'} breach justification
              </span>
            </div>
          )}

          {/* Check if selected type is already submitted */}
          {alreadySubmitted(breachType) ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Justification submitted for {breachType} breach.
            </div>
          ) : (
            <>
              {/* Textarea */}
              <div>
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(''); }}
                  placeholder={`Explain what caused the ${breachType} SLA breach — be specific about root cause and what steps are being taken…`}
                  rows={4}
                  className={clsx(
                    'w-full bg-[#fafbfc] border rounded px-3 py-2.5 text-sm text-[#172b4d]',
                    'placeholder:text-[#8993a4] resize-none outline-none transition-colors',
                    'focus:border-[#de350b] focus:ring-2 focus:ring-[#de350b]/10',
                    error ? 'border-[#de350b]' : 'border-[#dfe1e6] hover:border-[#b3bac5]',
                  )}
                />
                <div className="flex items-center justify-between mt-1 px-0.5">
                  {error ? (
                    <p className="text-xs text-[#de350b]">{error}</p>
                  ) : (
                    <p className={clsx(
                      'text-xs',
                      remaining > 0 ? 'text-[#8993a4]' : 'text-green-600',
                    )}>
                      {remaining > 0
                        ? `${remaining} more characters required`
                        : `${text.trim().length} characters`}
                    </p>
                  )}
                  <span className="text-xs text-[#8993a4]">
                    {text.trim().length} / {MIN_CHARS} min
                  </span>
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={onSubmit}
                disabled={submitting || text.trim().length < MIN_CHARS}
                className={clsx(
                  'h-8 px-4 rounded text-white text-sm font-medium transition-colors',
                  'flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed',
                  'bg-[#de350b] hover:bg-[#bf2600]',
                )}
              >
                {submitting && (
                  <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                )}
                Submit justification
              </button>
            </>
          )}
        </div>
      )}

      {/* All done state */}
      {allSubmitted && existing.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded mt-2">
          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-green-700 font-medium">
            All breach justifications submitted — team lead has been notified.
          </p>
        </div>
      )}
    </div>
  );
};