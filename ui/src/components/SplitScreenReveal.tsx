'use client';

import React, { useState } from 'react';
import { Terminal, ShieldCheck, ArrowRight, EyeOff, Eye, Lock, Unlock, Play, AlertCircle } from 'lucide-react';

interface SplitScreenRevealProps {
  template: {
    id: string;
    host: string;
    path: string;
    fields: Record<string, string>;
  } | null;
  profile: Record<string, string>;
  onSubmit: (nonSecurePayload: Record<string, string>) => Promise<unknown>;
  isSubmitting: boolean;
  submissionStatus: 'idle' | 'draft' | 'submitting' | 'confirmed' | 'error';
  lastResponse: { apptId?: string; candidateId?: string } | null;
}

export default function SplitScreenReveal({
  template,
  profile,
  onSubmit,
  isSubmitting,
  submissionStatus,
  lastResponse
}: SplitScreenRevealProps) {
  // Local state for non-secure parameters
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isRevealProfile, setIsRevealProfile] = useState(false);
  const [lastTemplateId, setLastTemplateId] = useState<string | null>(null);

  // Reset/Initialize form fields during render when template changes
  if (template && template.id !== lastTemplateId) {
    setLastTemplateId(template.id);
    const initialForm: Record<string, string> = {};
    Object.entries(template.fields).forEach(([key, val]) => {
      if (!val.startsWith('{{profile.')) {
        initialForm[key] = val;
      }
    });
    setFormData(initialForm);
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#0b0f19]/40 border border-slate-900 rounded-xl text-center">
        <Terminal className="h-12 w-12 text-slate-700 mb-4 stroke-1" />
        <h3 className="font-bold text-slate-300">No Submission Target Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Deploy an agent for one of the active templates above to view live egress telemetry.
        </p>
      </div>
    );
  }

  // Construct left panel json (placeholders)
  const agentJson: Record<string, string> = {};
  Object.entries(template.fields).forEach(([k, v]) => {
    if (v.startsWith('{{profile.')) {
      agentJson[k] = v;
    } else {
      agentJson[k] = formData[k] !== undefined ? formData[k] : v;
    }
  });

  // Construct right panel json (hydrated)
  const hydratedJson: Record<string, string> = {};
  if (submissionStatus === 'confirmed' || submissionStatus === 'submitting') {
    Object.entries(template.fields).forEach(([k, v]) => {
      if (v.startsWith('{{profile.')) {
        const profileKey = v.replace('{{profile.', '').replace('}}', '');
        hydratedJson[k] = profile[profileKey] || '[Decrypted TEE Secret]';
      } else {
        hydratedJson[k] = formData[k] !== undefined ? formData[k] : v;
      }
    });
  }

  const handleInputChange = (k: string, val: string) => {
    setFormData((prev) => ({ ...prev, [k]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-[#0b0f19]/70 border border-cyan-950/30 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Console Header */}
      <div className="bg-[#060810] border-b border-cyan-950/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-slate-400 font-mono text-[11px] border-l border-cyan-950/50 pl-3">
            Egress Console: {template.id}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Indicator */}
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
            submissionStatus === 'confirmed' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' :
            submissionStatus === 'submitting' ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 animate-pulse' :
            submissionStatus === 'draft' ? 'bg-amber-950/30 text-amber-400 border border-amber-500/20' :
            'bg-slate-900 text-slate-500 border border-slate-800'
          }`}>
            Status: {submissionStatus}
          </span>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Parameter Panel: Customize Non-secure Data */}
        <div className="lg:col-span-4 border-r border-cyan-950/20 p-5 bg-[#060810]/30">
          <h4 className="text-xs uppercase font-mono tracking-widest text-slate-400 font-semibold mb-4 flex items-center space-x-2">
            <Unlock className="h-3.5 w-3.5 text-amber-500" />
            <span>Non-Secure Payload</span>
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            {Object.entries(template.fields)
              .filter(([, v]) => !v.startsWith('{{profile.'))
              .map(([key]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                    {key.replace('_', ' ')}
                  </label>
                  {key === 'symptom' ? (
                    <textarea
                      value={formData[key] || ''}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      className="w-full h-20 bg-[#060810] border border-cyan-950/40 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono resize-none transition-all"
                      placeholder={`Enter ${key}...`}
                      required
                    />
                  ) : (
                    <input
                      type={key === 'experience_years' ? 'number' : 'text'}
                      value={formData[key] || ''}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      className="w-full bg-[#060810] border border-cyan-950/40 rounded h-9 px-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono transition-all"
                      placeholder={`Enter ${key}...`}
                      required
                    />
                  )}
                </div>
              ))}

            {/* Simulated Encrypted profile view */}
            <div className="pt-3 border-t border-cyan-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 flex items-center space-x-1.5">
                  <Lock className="h-3 w-3 text-cyan-500" />
                  <span>TEE-SECURED PROFILE</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsRevealProfile(!isRevealProfile)}
                  className="text-[9px] font-mono text-cyan-500 hover:text-cyan-400 flex items-center space-x-1"
                >
                  {isRevealProfile ? (
                    <>
                      <EyeOff className="h-2.5 w-2.5" />
                      <span>HIDE PII</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-2.5 w-2.5" />
                      <span>REVEAL PII</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#05060b] border border-cyan-950/20 rounded p-2.5 space-y-1 font-mono text-[10px] relative overflow-hidden">
                {!isRevealProfile && (
                  <div className="absolute inset-0 bg-[#05060b]/90 backdrop-blur-[2px] flex items-center justify-center text-[10px] text-cyan-500/70 border border-cyan-950/30">
                    <span>PII Encrypted in Secure Envelope</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">first_name:</span>
                  <span className="text-slate-300">{profile.first_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">dob:</span>
                  <span className="text-slate-300">{profile.dob}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">email:</span>
                  <span className="text-slate-300">{profile.email}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || submissionStatus === 'submitting'}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded bg-gradient-to-r from-cyan-500 to-cyan-600 text-[#060814] font-semibold font-mono text-xs hover:from-cyan-400 hover:to-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isSubmitting ? 'DISPATCHING TEE...' : 'SUBMIT SECURELY'}</span>
            </button>

            {/* Intake Stepper Visualizer */}
            <div className="mt-6 pt-4 border-t border-cyan-950/20 space-y-3 font-mono text-[9px] text-slate-500">
              <span className="uppercase tracking-widest font-bold text-slate-400 block mb-1">INTAKE TRANSACTION STEPPER</span>
              
              <div className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold transition-all ${
                    submissionStatus !== 'idle' ? 'bg-cyan-500 border-cyan-500 text-[#060814] shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'border-slate-700 bg-[#060810]'
                  }`}>1</div>
                  <div className="w-0.5 h-6 bg-slate-800"></div>
                </div>
                <div>
                  <span className={`font-bold block ${submissionStatus !== 'idle' ? 'text-cyan-400' : 'text-slate-400'}`}>Local PII Encrypt</span>
                  <span>Payload encrypted into ECIES envelope on-client.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold transition-all ${
                    submissionStatus === 'submitting' || submissionStatus === 'confirmed' ? 'bg-cyan-500 border-cyan-500 text-[#060814] shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'border-slate-700 bg-[#060810]'
                  }`}>2</div>
                  <div className="w-0.5 h-6 bg-slate-800"></div>
                </div>
                <div>
                  <span className={`font-bold block ${submissionStatus === 'submitting' || submissionStatus === 'confirmed' ? 'text-cyan-400' : 'text-slate-400'}`}>TEE Edge Hydration</span>
                  <span>Intel TDX Enclave decrypts and dispatches payload.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold transition-all ${
                    submissionStatus === 'confirmed' ? 'bg-emerald-500 border-emerald-500 text-[#060814] shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'border-slate-700 bg-[#060810]'
                  }`}>3</div>
                </div>
                <div>
                  <span className={`font-bold block ${submissionStatus === 'confirmed' ? 'text-emerald-400' : 'text-slate-400'}`}>VC Receipt Issued</span>
                  <span>Cryptographic confirmation receipt sealed by enclave.</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Split Screen Console Panel */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-0 relative">
          {/* Middle Transition Divider for Large Screens */}
          <div className="hidden md:flex absolute inset-y-0 left-1/2 w-px bg-cyan-950/30 z-10 items-center justify-center pointer-events-none">
            <div className={`p-1.5 rounded-full border bg-[#060810] transition-colors duration-300 ${
              submissionStatus === 'confirmed' ? 'border-cyan-500/50 text-cyan-400' : 'border-cyan-950/40 text-slate-700'
            }`}>
              <ArrowRight className={`h-3.5 w-3.5 ${submissionStatus === 'submitting' ? 'animate-pulse' : ''}`} />
            </div>
          </div>

          {/* Left Panel: Unsecure Agent View */}
          <div className="p-5 flex flex-col h-[380px] bg-[#060810]/40 overflow-hidden relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Agent / LLM Context (Unsecure)
              </span>
              <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded">
                PLACEHOLDERS
              </span>
            </div>

            <div className="flex-1 bg-[#05060a]/80 border border-cyan-950/10 rounded-lg p-4 font-mono text-xs overflow-y-auto leading-relaxed shadow-inner">
              <pre className="text-amber-500/90 whitespace-pre-wrap select-text">
                {JSON.stringify(agentJson, null, 2)}
              </pre>
            </div>
            
            <div className="mt-2 text-[9px] font-mono text-slate-500 flex items-center space-x-1.5">
              <AlertCircle className="h-3 w-3 text-amber-500/80" />
              <span>PII remains inside cryptographic placeholders</span>
            </div>
          </div>

          {/* Right Panel: Egress Hydrated View */}
          <div className="p-5 flex flex-col h-[380px] bg-[#080b15]/60 overflow-hidden border-t md:border-t-0 md:border-l border-cyan-950/20 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Egress Proxy Wire (Secure TEE)
              </span>
              <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded transition-all duration-300 ${
                submissionStatus === 'confirmed' 
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)]' 
                  : 'bg-slate-900 text-slate-600 border-slate-800'
              }`}>
                {submissionStatus === 'confirmed' ? 'HYDRATED' : 'WAITING'}
              </span>
            </div>

            <div className="flex-1 bg-[#04060c] border border-cyan-950/10 rounded-lg p-4 font-mono text-xs overflow-y-auto leading-relaxed shadow-inner flex flex-col justify-start">
              {submissionStatus === 'confirmed' || submissionStatus === 'submitting' ? (
                <pre className="text-cyan-400 whitespace-pre-wrap select-text animate-fade-in">
                  {JSON.stringify(hydratedJson, null, 2)}
                </pre>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center select-none font-mono">
                  <Lock className="h-8 w-8 text-cyan-950/40 mb-2 stroke-1" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-600">Secure Egress Intercept</span>
                  <span className="text-[9px] text-slate-700 mt-1">Submit request to decrypt and inject PII at secure boundary</span>
                </div>
              )}
            </div>

            <div className="mt-2 text-[9px] font-mono text-slate-500 flex items-center space-x-1.5">
              <ShieldCheck className={`h-3 w-3 ${submissionStatus === 'confirmed' ? 'text-cyan-400' : 'text-slate-600'}`} />
              <span>Decryption + injection occurs strictly in enclave boundary</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Response Info Overlay */}
      {submissionStatus === 'confirmed' && lastResponse && (
        <div className="bg-[#050812] border-t border-cyan-950/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-cyan-400 mb-2 sm:mb-0">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shadow-sm" />
            <span className="font-semibold">TEE Target Response:</span>
            <span className="text-slate-300">Appointment Confirmed</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-500">
            <span>ID: <span className="text-slate-300">{lastResponse.apptId || lastResponse.apptId || 'N/A'}</span></span>
            <span className="hidden sm:inline">|</span>
            <span>Receipt Issued!</span>
          </div>
        </div>
      )}
    </div>
  );
}
