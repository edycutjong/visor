'use client';

import React from 'react';
import { Database, CheckCircle2, Lock } from 'lucide-react';

export interface AuditLog {
  ts: number;
  actor: string;
  action: 'draft' | 'submit' | 'finalize';
  markers: string[];
  outcome: 'success' | 'failed';
}

interface AuditTableProps {
  logs: AuditLog[];
}

export default function AuditTable({ logs }: AuditTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 font-mono flex items-center space-x-2">
          <Database className="h-4 w-4" />
          <span>TEE Append-Only Audits</span>
        </h2>
        <span className="text-[10px] font-mono text-slate-500 flex items-center space-x-1">
          <Lock className="h-3 w-3" />
          <span>Immutable Ledger</span>
        </span>
      </div>

      <div className="bg-[#0b0f19]/70 border border-cyan-950/30 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#060810] border-b border-cyan-950/40 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Egress Markers</th>
                <th className="px-5 py-3.5">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-950/15">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No ledger entries recorded. Initiate a secure submission to generate immutable logs.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const date = new Date(log.ts).toLocaleTimeString();
                  
                  return (
                    <tr key={index} className="hover:bg-cyan-950/5 transition-colors">
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {date}
                      </td>
                      <td className="px-5 py-4 text-cyan-400 font-medium truncate max-w-[120px]" title={log.actor}>
                        {log.actor}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 uppercase text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.action === 'finalize' ? 'bg-emerald-950/35 text-emerald-400 border border-emerald-500/20' :
                          log.action === 'submit' ? 'bg-cyan-950/35 text-cyan-400 border border-cyan-500/20' :
                          'bg-amber-950/35 text-amber-400 border border-amber-500/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {log.markers.length === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            log.markers.map((marker, i) => (
                              <span 
                                key={i} 
                                className="bg-[#05060b] border border-cyan-950/40 text-[9px] px-1.5 py-0.2 rounded text-slate-400"
                              >
                                {marker}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`flex items-center space-x-1.5 ${
                          log.outcome === 'success' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{log.outcome.toUpperCase()}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
