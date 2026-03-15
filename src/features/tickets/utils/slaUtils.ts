// src/features/tickets/utils/slaUtils.ts

import { differenceInMinutes, differenceInSeconds, formatDistanceToNow } from 'date-fns';

export type SLAStatus = 'ok' | 'warning' | 'breached' | 'paused' | 'met';

export interface SLATimer {
  label:        string;         // "Response SLA" | "Resolution SLA"
  status:       SLAStatus;
  pct:          number;         // 0–100 elapsed percentage
  timeDisplay:  string;         // human-readable remaining / elapsed
  dueAt:        string | null;  // ISO string
  breachedAt:   string | null;
  isMet:        boolean;        // first_response stamped / resolved_at set
  isPaused:     boolean;        // ticket is on_hold
}

/**
 * Compute response SLA timer state.
 * Customer-safe: never exposes breach status — returns 'met' or countdown only.
 */
export function computeResponseSLA(params: {
  createdAt:             string;
  slaResponseDue:        string | null | undefined;
  firstResponseAt:       string | null | undefined;
  responseBreachedAt:    string | null | undefined;
  isCustomer:            boolean;
  status:                string;
}): SLATimer {
  const {
    createdAt,
    slaResponseDue,
    firstResponseAt,
    responseBreachedAt,
    isCustomer,
    status,
  } = params;

  const now = new Date();

  // Already responded
  if (firstResponseAt) {
    const mins = differenceInMinutes(new Date(firstResponseAt), new Date(createdAt));
    const hrs  = Math.floor(mins / 60);
    const label = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
    return {
      label:       'Response SLA',
      status:      'met',
      pct:         100,
      timeDisplay: isCustomer ? `Agent responded within ${label}` : `First response in ${label}`,
      dueAt:       slaResponseDue ?? null,
      breachedAt:  responseBreachedAt ?? null,
      isMet:       true,
      isPaused:    false,
    };
  }

  if (!slaResponseDue) {
    return {
      label:       'Response SLA',
      status:      'ok',
      pct:         0,
      timeDisplay: 'Response window pending',
      dueAt:       null,
      breachedAt:  null,
      isMet:       false,
      isPaused:    false,
    };
  }

  const due     = new Date(slaResponseDue);
  const created = new Date(createdAt);
  const totalMs = due.getTime() - created.getTime();
  const elapsedMs = now.getTime() - created.getTime();
  const pct     = Math.min((elapsedMs / totalMs) * 100, 100);
  const remainMins = differenceInMinutes(due, now);

  // Breached
  if (responseBreachedAt || remainMins < 0) {
    if (isCustomer) {
      return {
        label:       'Response SLA',
        status:      'ok',  // customer never sees breach
        pct:         100,
        timeDisplay: 'Our team is working on it',
        dueAt:       slaResponseDue,
        breachedAt:  responseBreachedAt ?? null,
        isMet:       false,
        isPaused:    false,
      };
    }
    const overMins = Math.abs(remainMins);
    const overHrs  = Math.floor(overMins / 60);
    const overLabel = overHrs > 0 ? `${overHrs}h ${overMins % 60}m` : `${overMins}m`;
    return {
      label:       'Response SLA',
      status:      'breached',
      pct:         100,
      timeDisplay: `Breached ${overLabel} ago`,
      dueAt:       slaResponseDue,
      breachedAt:  responseBreachedAt ?? null,
      isMet:       false,
      isPaused:    false,
    };
  }

  const remainHrs = Math.floor(remainMins / 60);
  const remainLabel = remainHrs > 0
    ? `${remainHrs}h ${remainMins % 60}m remaining`
    : `${remainMins}m remaining`;

  const slaStatus: SLAStatus = pct >= 80 ? 'warning' : 'ok';

  if (isCustomer) {
    return {
      label:       'Response SLA',
      status:      slaStatus,
      pct,
      timeDisplay: remainHrs > 0
        ? `Response expected within ${remainHrs}h ${remainMins % 60}m`
        : `Response expected within ${remainMins}m`,
      dueAt:       slaResponseDue,
      breachedAt:  null,
      isMet:       false,
      isPaused:    false,
    };
  }

  return {
    label:       'Response SLA',
    status:      slaStatus,
    pct,
    timeDisplay: remainLabel,
    dueAt:       slaResponseDue,
    breachedAt:  responseBreachedAt ?? null,
    isMet:       false,
    isPaused:    false,
  };
}

/**
 * Compute resolution SLA timer state.
 * Handles on_hold pause: subtracts accumulated hold time from elapsed.
 */
export function computeResolutionSLA(params: {
  createdAt:                    string;
  slaResolveDue:                string | null | undefined;
  resolvedAt:                   string | null | undefined;
  slaBreachedAt:                string | null | undefined;
  onHoldStartedAt:              string | null | undefined;
  onHoldDurationAccumulated:    number;
  status:                       string;
  isCustomer:                   boolean;
}): SLATimer {
  const {
    createdAt,
    slaResolveDue,
    resolvedAt,
    slaBreachedAt,
    onHoldStartedAt,
    onHoldDurationAccumulated,
    status,
    isCustomer,
  } = params;

  const now      = new Date();
  const isPaused = status === 'on_hold';

  // Already resolved
  if (resolvedAt) {
    return {
      label:       'Resolution SLA',
      status:      'met',
      pct:         100,
      timeDisplay: `Resolved ${formatDistanceToNow(new Date(resolvedAt), { addSuffix: true })}`,
      dueAt:       slaResolveDue ?? null,
      breachedAt:  slaBreachedAt ?? null,
      isMet:       true,
      isPaused:    false,
    };
  }

  if (!slaResolveDue) {
    return {
      label:       'Resolution SLA',
      status:      isPaused ? 'paused' : 'ok',
      pct:         0,
      timeDisplay: isPaused ? 'SLA paused — ticket on hold' : 'Resolution window pending',
      dueAt:       null,
      breachedAt:  null,
      isMet:       false,
      isPaused,
    };
  }

  if (isPaused) {
    return {
      label:       'Resolution SLA',
      status:      'paused',
      pct:         0,
      timeDisplay: 'SLA paused — ticket on hold',
      dueAt:       slaResolveDue,
      breachedAt:  slaBreachedAt ?? null,
      isMet:       false,
      isPaused:    true,
    };
  }

  const due     = new Date(slaResolveDue);
  const created = new Date(createdAt);

  // Effective elapsed = raw elapsed minus hold time
  const rawElapsedMins     = differenceInMinutes(now, created);
  const effectiveElapsedMins = Math.max(rawElapsedMins - onHoldDurationAccumulated, 0);
  const totalMins          = differenceInMinutes(due, created);
  const pct                = Math.min((effectiveElapsedMins / Math.max(totalMins, 1)) * 100, 100);
  const remainMins         = differenceInMinutes(due, now);

  // Breached
  if (slaBreachedAt || remainMins < 0) {
    if (isCustomer) {
      return {
        label:       'Resolution SLA',
        status:      'ok',
        pct:         100,
        timeDisplay: 'Our team is actively working on your issue',
        dueAt:       slaResolveDue,
        breachedAt:  slaBreachedAt ?? null,
        isMet:       false,
        isPaused:    false,
      };
    }
    const overMins  = Math.abs(remainMins);
    const overHrs   = Math.floor(overMins / 60);
    const overLabel = overHrs > 0 ? `${overHrs}h ${overMins % 60}m` : `${overMins}m`;
    return {
      label:       'Resolution SLA',
      status:      'breached',
      pct:         100,
      timeDisplay: `Breached ${overLabel} ago`,
      dueAt:       slaResolveDue,
      breachedAt:  slaBreachedAt ?? null,
      isMet:       false,
      isPaused:    false,
    };
  }

  const remainHrs   = Math.floor(remainMins / 60);
  const remainLabel = remainHrs > 0
    ? `${remainHrs}h ${remainMins % 60}m remaining`
    : `${remainMins}m remaining`;

  const slaStatus: SLAStatus = pct >= 80 ? 'warning' : 'ok';

  if (isCustomer) {
    return {
      label:       'Resolution SLA',
      status:      slaStatus,
      pct,
      timeDisplay: remainHrs > 0
        ? `Expected resolution within ${remainHrs}h ${remainMins % 60}m`
        : `Expected resolution within ${remainMins}m`,
      dueAt:       slaResolveDue,
      breachedAt:  null,
      isMet:       false,
      isPaused:    false,
    };
  }

  return {
    label:       'Resolution SLA',
    status:      slaStatus,
    pct,
    timeDisplay: remainLabel,
    dueAt:       slaResolveDue,
    breachedAt:  slaBreachedAt ?? null,
    isMet:       false,
    isPaused:    false,
  };
}

/** Bar + status color mappings */
export function slaBarColor(status: SLAStatus): string {
  switch (status) {
    case 'met':     return 'bg-green-500';
    case 'ok':      return 'bg-blue-500';
    case 'warning': return 'bg-orange-400';
    case 'breached': return 'bg-red-500';
    case 'paused':  return 'bg-slate-400';
    default:        return 'bg-blue-500';
  }
}

export function slaTextColor(status: SLAStatus): string {
  switch (status) {
    case 'met':      return 'text-green-600';
    case 'ok':       return 'text-[#172b4d]';
    case 'warning':  return 'text-orange-600';
    case 'breached': return 'text-red-600';
    case 'paused':   return 'text-slate-500';
    default:         return 'text-[#172b4d]';
  }
}

export function slaBgColor(status: SLAStatus): string {
  switch (status) {
    case 'met':      return 'bg-green-50 border-green-200';
    case 'ok':       return 'bg-[#deebff] border-[#4c9aff]';
    case 'warning':  return 'bg-orange-50 border-orange-200';
    case 'breached': return 'bg-red-50 border-red-200';
    case 'paused':   return 'bg-slate-50 border-slate-200';
    default:         return 'bg-[#deebff] border-[#4c9aff]';
  }
}