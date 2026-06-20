'use client';

import React from 'react';
import { Layers, Play, Database } from 'lucide-react';

export interface Template {
  id: string;
  name: string;
  description: string;
  host: string;
  path: string;
  fields: Record<string, string>;
  markers: string[];
}

interface TemplateGridProps {
  templates: Template[];
  activeTemplateId: string | null;
  onSelectTemplate: (template: Template) => void;
  registeredTemplates: string[];
  onRegisterTemplate: (templateId: string) => void;
  isRegistering: boolean;
}

export default function TemplateGrid({
  templates,
  activeTemplateId,
  onSelectTemplate,
  registeredTemplates,
  onRegisterTemplate,
  isRegistering
}: TemplateGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 font-mono flex items-center space-x-2">
          <Layers className="h-4 w-4" />
          <span>Active Egress Templates</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => {
          const isRegistered = registeredTemplates.includes(template.id);
          const isActive = activeTemplateId === template.id;

          return (
            <div
              key={template.id}
              className={`relative rounded-xl border p-5 glass-panel transition-all duration-300 hover:-translate-y-0.5 ${
                isActive 
                  ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/20' 
                  : isRegistered 
                  ? 'border-slate-800/80 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                  : 'border-slate-950 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Active Glow Decorator */}
              {isActive && (
                <div className="absolute -top-px left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
              )}

              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-100 flex items-center space-x-2">
                    <span>{template.name}</span>
                    {isRegistered && (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                        REGISTERED
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{template.description}</p>
                </div>
              </div>

              {/* Endpoint details */}
              <div className="mt-4 bg-[#060810] border border-cyan-950/20 rounded p-2.5 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span>EGRESS TARGET</span>
                  <span className="text-slate-400 font-semibold">{template.host}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>PATH</span>
                  <span className="text-slate-300">{template.path}</span>
                </div>
              </div>

              {/* Field Placeholders */}
              <div className="mt-4">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-2">
                  Mapped Secure Placeholders
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(template.fields).map(([key, val]) => (
                    <span
                      key={key}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        val.startsWith('{{profile.') 
                          ? 'bg-amber-950/25 border-amber-500/20 text-amber-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                      title={`${key}: ${val}`}
                    >
                      {key} {val.startsWith('{{profile.') ? '🔐' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center space-x-3">
                {!isRegistered ? (
                  <button
                    onClick={() => onRegisterTemplate(template.id)}
                    disabled={isRegistering}
                    className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all font-mono text-xs font-semibold"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Register Schema</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectTemplate(template)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded transition-all font-mono text-xs font-semibold ${
                      isActive 
                        ? 'bg-cyan-500 text-[#060814] shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:bg-cyan-400' 
                        : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Play className={`h-3.5 w-3.5 ${isActive ? 'fill-current' : ''}`} />
                    <span>{isActive ? 'Active Submission' : 'Deploy Submission'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
