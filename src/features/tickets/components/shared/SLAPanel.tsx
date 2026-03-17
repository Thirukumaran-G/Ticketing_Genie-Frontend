// src/features/tickets/components/shared/SLAPanel.tsx
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import {
  SLATimer,
  SLAStatus,
  slaBarColor,
  slaTextColor,
  slaBgColor,
  computeResponseSLA,
  computeResolutionSLA,
} from '../../utils/slaUtils';

// ── Single SLA bar row ────────────────────────────────────────────────────────

const SLARow: React.FC<{ timer: SLATimer; showDue?: boolean }> = ({ timer, showDue = true }) => {
  const effectiveStatus: SLAStatus = timer.isMet && timer.wasBreached ? 'breached' : timer.status;
  const effectiveBarColor  = slaBarColor(effectiveStatus);
  const effectiveTextColor = slaTextColor(effectiveStatus);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#44546f] uppercase tracking-widest">
            {timer.label}
          </span>

          {/* Paused */}
          {timer.isPaused && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Paused
            </span>
          )}

          {/* Met cleanly — green */}
          {timer.isMet && !timer.wasBreached && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Met
            </span>
          )}

          {/* Met but was breached — red */}
          {timer.isMet && timer.wasBreached && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Breached (resolved late)
            </span>
          )}

          {/* Actively breached */}
          {!timer.isMet && timer.status === 'breached' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Breached
            </span>
          )}

          {/* Warning */}
          {!timer.isMet && timer.status === 'warning' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Warning
            </span>
          )}
        </div>

        <span className={clsx('text-xs font-medium whitespace-nowrap', effectiveTextColor)}>
          {timer.timeDisplay}
        </span>
      </div>

      {/* Progress bar */}
      {!timer.isPaused && (
        <div className="w-full h-1.5 rounded-full bg-[#ebecf0] overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', effectiveBarColor)}
            style={{ width: `${Math.max(timer.isMet ? 100 : timer.pct, 2)}%` }}
          />
        </div>
      )}

      {/* Due date — only when not yet met */}
      {showDue && timer.dueAt && !timer.isMet && (
        <p className="text-[11px] text-[#8993a4]">
          Due {format(new Date(timer.dueAt), 'MMM d, h:mm a')}
        </p>
      )}

      {/* Breach timestamp */}
      {timer.breachedAt && (
        <p className="text-[11px] text-red-500">
          Breached at {format(new Date(timer.breachedAt), 'MMM d, h:mm a')}
        </p>
      )}
    </div>
  );
};

// ── Customer SLA panel ────────────────────────────────────────────────────────

export const CustomerSLAPanel: React.FC<{
  createdAt:           string;
  slaResponseDue?:     string | null;
  slaResolveDue?:      string | null;
  firstResponseAt?:    string | null;
  resolvedAt?:         string | null;
  responseBreachedAt?: string | null;
  slaBreachedAt?:      string | null;
  onHoldStartedAt?:    string | null;
  onHoldAccumulated?:  number;
  status:              string;
}> = (props) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const response = computeResponseSLA({
    createdAt:          props.createdAt,
    slaResponseDue:     props.slaResponseDue,
    firstResponseAt:    props.firstResponseAt,
    responseBreachedAt: props.responseBreachedAt,
    isCustomer:         true,
    status:             props.status,
  });

  const resolution = computeResolutionSLA({
    createdAt:                 props.createdAt,
    slaResolveDue:             props.slaResolveDue,
    resolvedAt:                props.resolvedAt,
    slaBreachedAt:             props.slaBreachedAt,
    onHoldStartedAt:           props.onHoldStartedAt,
    onHoldDurationAccumulated: props.onHoldAccumulated ?? 0,
    status:                    props.status,
    isCustomer:                true,
  });

  const bannerStatus: SLAStatus =
    response.status === 'met' && resolution.status === 'met'
      ? 'met'
      : response.isMet
      ? resolution.status
      : response.status;

  const bannerBg = slaBgColor(bannerStatus);

  return (
    <div className={clsx('rounded border px-4 py-3 flex items-start gap-3', bannerBg)}>
      <div className="flex-shrink-0 mt-0.5">
        {bannerStatus === 'met' && (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {(bannerStatus === 'ok' || bannerStatus === 'paused') && (
          <svg className="w-4 h-4 text-[#0052cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {bannerStatus === 'warning' && (
          <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {bannerStatus === 'breached' && (
          <svg className="w-4 h-4 text-[#0052cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className={clsx('text-sm font-medium', slaTextColor(bannerStatus === 'breached' ? 'ok' : bannerStatus))}>
          {response.timeDisplay}
        </p>
        {!resolution.isMet && resolution.dueAt && (
          <p className="text-xs text-[#44546f]">{resolution.timeDisplay}</p>
        )}
        {resolution.isMet && (
          <p className="text-xs text-green-600">{resolution.timeDisplay}</p>
        )}
      </div>
    </div>
  );
};

// ── Agent / TL SLA panel ──────────────────────────────────────────────────────

export const AgentSLAPanel: React.FC<{
  createdAt:                 string;
  slaResponseDue?:           string | null;
  slaResolveDue?:            string | null;
  firstResponseAt?:          string | null;
  resolvedAt?:               string | null;
  responseBreachedAt?:       string | null;
  slaBreachedAt?:            string | null;
  onHoldStartedAt?:          string | null;
  onHoldAccumulated?:        number;
  status:                    string;
  showBreachJustifications?: boolean;
  breachJustifications?:     BreachJustification[];
}> = (props) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const response = computeResponseSLA({
    createdAt:          props.createdAt,
    slaResponseDue:     props.slaResponseDue,
    firstResponseAt:    props.firstResponseAt,
    responseBreachedAt: props.responseBreachedAt,
    isCustomer:         false,
    status:             props.status,
  });

  const resolution = computeResolutionSLA({
    createdAt:                 props.createdAt,
    slaResolveDue:             props.slaResolveDue,
    resolvedAt:                props.resolvedAt,
    slaBreachedAt:             props.slaBreachedAt,
    onHoldStartedAt:           props.onHoldStartedAt,
    onHoldDurationAccumulated: props.onHoldAccumulated ?? 0,
    status:                    props.status,
    isCustomer:                false,
  });

  const anyBreached =
    response.status === 'breached' ||
    resolution.status === 'breached' ||
    response.wasBreached ||
    resolution.wasBreached;

  return (
    <div className="bg-white border border-[#dfe1e6] rounded px-5 py-4 space-y-4">
      <p className="text-[#44546f] text-[11px] font-semibold uppercase tracking-widest">
        SLA Status
      </p>

      <div className="space-y-4">
        <SLARow timer={response}   showDue />
        <SLARow timer={resolution} showDue />
      </div>

      {(props.onHoldAccumulated ?? 0) > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {props.onHoldAccumulated}m excluded from SLA (on-hold time)
        </div>
      )}

      {anyBreached && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-red-700">SLA breached</p>
            <p className="text-xs text-red-600 mt-0.5">
              {(response.status === 'breached' || response.wasBreached) && (resolution.status !== 'breached' && !resolution.wasBreached)
                ? 'Response SLA exceeded. Submit a justification below.'
                : (resolution.status === 'breached' || resolution.wasBreached) && (response.status !== 'breached' && !response.wasBreached)
                ? 'Resolution SLA exceeded. Submit a justification below.'
                : 'Both response and resolution SLAs exceeded.'}
            </p>
          </div>
        </div>
      )}

      {props.showBreachJustifications &&
        props.breachJustifications &&
        props.breachJustifications.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[#44546f] uppercase tracking-widest">
              Breach Justifications
            </p>
            {props.breachJustifications.map((j) => (
              <div key={j.conversation_id} className="px-3 py-2.5 bg-purple-50 border border-purple-200 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest">
                    {j.breach_type} breach
                  </span>
                  <span className="text-[10px] text-purple-400">
                    {format(new Date(j.submitted_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">{j.justification}</p>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export interface BreachJustification {
  conversation_id: string;
  ticket_id:       string;
  agent_id:        string;
  breach_type:     string;
  justification:   string;
  submitted_at:    string;
}