'use client';

import React from 'react';
import { Shield, Cpu, RefreshCw, Activity } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userDid: string;
  enclaveStatus: 'active' | 'syncing' | 'offline';
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function DashboardLayout({
  children,
  userDid,
  enclaveStatus,
  onRefresh,
  isRefreshing
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Cybernetic Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 right-1/4 h-96 bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-cyan-950/40 bg-[#060814]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-cyan-500 to-amber-500 opacity-70 blur-sm animate-pulse" />
              <div className="relative bg-[#0b0f19] p-1.5 rounded-lg border border-cyan-500/30">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-wider text-lg bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                  VISOR
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded border border-cyan-500/20 bg-cyan-950/20 text-cyan-400">
                  TEE Egress
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Terminal 3 Privacy-Blind Submission Protocol</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-mono text-xs">
            {/* Connection/Enclave Status */}
            <div className="hidden sm:flex items-center space-x-2 bg-[#0b0f19] border border-cyan-950/60 rounded-full px-3 py-1.5">
              <Cpu className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-slate-400 text-[11px]">Enclave:</span>
              <span className="flex items-center space-x-1.5 font-bold">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  enclaveStatus === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                  enclaveStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                }`} />
                <span className={
                  enclaveStatus === 'active' ? 'text-emerald-400' : 
                  enclaveStatus === 'syncing' ? 'text-amber-400' : 'text-red-400'
                }>
                  {enclaveStatus.toUpperCase()}
                </span>
              </span>
            </div>

            {/* Profile Summary DID Badge */}
            <div className="flex items-center space-x-2 bg-[#0b0f19] border border-cyan-950/60 rounded-full px-3.5 py-1.5 shadow-inner">
              <span className="text-slate-500">DID:</span>
              <span className="text-cyan-400 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
                {userDid}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-cyan-950/60 bg-[#0b0f19] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200 disabled:opacity-50"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-950/20 bg-[#04060f]/60 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs font-mono">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Activity className="h-3.5 w-3.5 text-cyan-500/50" />
            <span>Intel TDX Hardware Attestation Active (Secp256k1)</span>
          </div>
          <div>
            <span>© 2026 Visor Protocol. Powered by Terminal 3 ADK.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
