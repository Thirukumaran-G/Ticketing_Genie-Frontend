// src/features/settings/TemplatesPage.tsx
import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { tlNav } from '../../tickets/components/teamlead/teamleadNav';
import { ticketsService } from '../../tickets/services/ticketsService';

interface Template {
  id:         string;
  key:        string;
  name:       string;
  subject:    string;
  body:       string;
  variables:  string[];
  is_active:  boolean;
  updated_at: string;
}

// ── Variable chip ─────────────────────────────────────────────────────────────

const VarChip: React.FC<{ variable: string; onInsert: (v: string) => void }> = ({
  variable, onInsert,
}) => (
  <button
    onClick={() => onInsert(variable)}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#dfe1e6] bg-[#f4f5f7] text-[11px] text-[#0052cc] font-mono hover:bg-[#deebff] hover:border-[#0052cc] transition-colors"
    title={`Insert {${variable}}`}
  >
    <span className="text-[#8993a4]">{'{}'}</span>
    {variable}
  </button>
);

// ── Template editor ───────────────────────────────────────────────────────────

const TemplateEditor: React.FC<{
  template:  Template;
  onSaved:   (updated: Template) => void;
}> = ({ template, onSaved }) => {
  const [name, setName]           = useState(template.name);
  const [subject, setSubject]     = useState(template.subject);
  const [body, setBody]           = useState(template.body);
  const [isActive, setIsActive]   = useState(template.is_active);
  const [saving, setSaving]       = useState(false);
  const [isDirty, setIsDirty]     = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const dirty =
      name    !== template.name    ||
      subject !== template.subject ||
      body    !== template.body    ||
      isActive !== template.is_active;
    setIsDirty(dirty);
  }, [name, subject, body, isActive, template]);

  const insertVariable = (variable: string) => {
    if (!bodyRef.current) return;
    const el    = bodyRef.current;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const newBody = body.slice(0, start) + `{${variable}}` + body.slice(end);
    setBody(newBody);
    // Restore cursor after inserted text
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
    }, 0);
  };

  const onSave = async () => {
    if (!isDirty) return;
    try {
      setSaving(true);
      const updated = await ticketsService.updateNotificationTemplate(template.id, {
        name,
        subject,
        body,
        is_active: isActive,
      });
      toast.success('Template saved');
      setIsDirty(false);
      onSaved(updated);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setIsActive(template.is_active);
  };

  return (
    <div className="space-y-4">

      {/* Name + active toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1">
            Template name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-3 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
          />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 mt-5">
          <button
            onClick={() => setIsActive((v) => !v)}
            className={clsx(
              'relative w-9 h-5 rounded-full transition-colors',
              isActive ? 'bg-[#0052cc]' : 'bg-[#dfe1e6]',
            )}
          >
            <span className={clsx(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              isActive ? 'translate-x-4' : 'translate-x-0.5',
            )} />
          </button>
          <span className="text-xs text-[#44546f]">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full h-8 px-3 rounded border border-[#dfe1e6] text-sm text-[#172b4d] bg-[#fafbfc] outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
        />
      </div>

      {/* Variables */}
      {template.variables.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1.5">
            Available variables — click to insert at cursor
          </label>
          <div className="flex flex-wrap gap-1.5">
            {template.variables.map((v) => (
              <VarChip key={v} variable={v} onInsert={insertVariable} />
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div>
        <label className="block text-xs font-semibold text-[#6b778c] uppercase tracking-wide mb-1">
          Message body
        </label>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="w-full bg-[#fafbfc] border border-[#dfe1e6] rounded px-3 py-2.5 text-sm text-[#172b4d] font-mono resize-none outline-none focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20 transition-colors"
        />
      </div>

      {/* Preview */}
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
          {showPreview ? 'Hide preview' : 'Show rendered preview'}
        </button>

        {showPreview && (
          <div className="mt-2 px-4 py-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded text-xs text-[#172b4d] whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">
            {body}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-[#ebecf0]">
        <button
          onClick={onSave}
          disabled={saving || !isDirty}
          className="h-8 px-4 rounded bg-[#0052cc] hover:bg-[#0065ff] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {saving && (
            <div className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
          )}
          Save changes
        </button>
        {isDirty && (
          <button
            onClick={onReset}
            className="h-8 px-4 rounded border border-[#dfe1e6] text-sm text-[#42526e] hover:bg-[#f4f5f7] transition-colors"
          >
            Reset
          </button>
        )}
        {isDirty && (
          <span className="text-xs text-orange-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Unsaved changes
          </span>
        )}
        {!isDirty && !saving && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeKey, setActiveKey]   = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ticketsService.listNotificationTemplates();
        setTemplates(data);
        if (data.length > 0) setActiveKey(data[0].key);
      } catch {
        toast.error('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onSaved = (updated: Template) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  };

  const activeTemplate = templates.find((t) => t.key === activeKey) ?? null;

  const keyLabels: Record<string, string> = {
    sla_apology:          'SLA Apology',
    ticket_on_hold:       'Ticket On Hold',
    ticket_resolved:      'Ticket Resolved',
    breach_agent_warning: 'Agent Breach Warning',
  };

  return (
    <MainLayout navItems={tlNav} pageTitle="Notification Templates">
      <div className="min-h-screen bg-[#f4f5f7]">
        <div className="max-w-5xl mx-auto px-6 py-6">

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#172b4d]">Notification Templates</h2>
            <p className="text-[#44546f] text-sm mt-1">
              Customise messages sent to customers and agents. Variables in{' '}
              <code className="text-xs bg-[#ebecf0] px-1 py-0.5 rounded text-[#172b4d]">
                {'{curly braces}'}
              </code>{' '}
              are automatically replaced with ticket data.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#0052cc] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white border border-[#dfe1e6] rounded-xl px-6 py-16 text-center">
              <p className="text-[#44546f] text-sm">No templates found.</p>
              <p className="text-[#8993a4] text-xs mt-1">
                Run the seed script to populate default templates.
              </p>
            </div>
          ) : (
            <div className="flex gap-5">

              {/* Sidebar — template list */}
              <div className="w-52 flex-shrink-0 space-y-1">
                {templates.map((tpl) => (
                  <button
                    key={tpl.key}
                    onClick={() => setActiveKey(tpl.key)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all',
                      activeKey === tpl.key
                        ? 'bg-[#0052cc] text-white shadow'
                        : 'bg-white border border-[#dfe1e6] text-[#172b4d] hover:border-[#b3bac5] hover:bg-[#f4f5f7]',
                    )}
                  >
                    <span className={clsx(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      tpl.is_active
                        ? activeKey === tpl.key ? 'bg-white' : 'bg-green-500'
                        : 'bg-[#dfe1e6]',
                    )} />
                    <span className="truncate text-xs font-medium">
                      {keyLabels[tpl.key] ?? tpl.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Editor area */}
              <div className="flex-1 min-w-0">
                {activeTemplate ? (
                  <div className="bg-white border border-[#dfe1e6] rounded-xl px-6 py-5">
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#ebecf0]">
                      <span className="text-[10px] font-semibold text-[#8993a4] uppercase tracking-widest font-mono">
                        {activeTemplate.key}
                      </span>
                      <span className={clsx(
                        'ml-auto text-[10px] font-semibold px-2 py-0.5 rounded border',
                        activeTemplate.is_active
                          ? 'text-green-600 bg-green-50 border-green-200'
                          : 'text-[#44546f] bg-[#f4f5f7] border-[#dfe1e6]',
                      )}>
                        {activeTemplate.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <TemplateEditor
                      key={activeTemplate.id}
                      template={activeTemplate}
                      onSaved={onSaved}
                    />
                  </div>
                ) : (
                  <div className="bg-white border border-[#dfe1e6] rounded-xl px-6 py-16 text-center">
                    <p className="text-[#8993a4] text-sm">Select a template to edit</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};