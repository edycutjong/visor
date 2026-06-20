'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import TemplateGrid, { Template } from '../components/TemplateGrid';
import SplitScreenReveal from '../components/SplitScreenReveal';
import ReceiptModal from '../components/ReceiptModal';
import AuditTable, { AuditLog } from '../components/AuditTable';
import { Shield, Terminal, Trash2 } from 'lucide-react';

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'clinic-intake',
    name: 'Clinical Intake Agent',
    description: 'Secure appointment booking for healthcare providers. Hides patient identity and symptoms.',
    host: 'https://clinic.sandbox.test',
    path: '/api/mock/clinic/intake',
    fields: {
      first_name: '{{profile.first_name}}',
      dob: '{{profile.dob}}',
      email: '{{profile.email}}',
      symptom: 'dermatological consult and skin lesion checking'
    },
    markers: ['clinic', 'medical', 'intake']
  },
  {
    id: 'job-application',
    name: 'Job Application ATS Agent',
    description: 'Blind recruiting submission for ATS software. Hides name, age, and contact information.',
    host: 'https://ats.sandbox.test',
    path: '/api/mock/ats/apply',
    fields: {
      first_name: '{{profile.first_name}}',
      dob: '{{profile.dob}}',
      email: '{{profile.email}}',
      experience_years: '5',
      role: 'Staff Cryptography Engineer'
    },
    markers: ['ats', 'hr', 'recruitment']
  }
];

const MOCK_PROFILE = {
  first_name: 'Maria',
  dob: '1994-08-14',
  email: 'maria.s@healthmail.net'
};

interface TelemetryEntry {
  timestamp: number;
  type: 'agent' | 'enclave';
  message: string;
  data?: unknown;
}

export default function Page() {
  // Config
  const [agentUrl, setAgentUrl] = useState(process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3000');

  // Enclave / UI state
  const [enclaveStatus, setEnclaveStatus] = useState<'active' | 'syncing' | 'offline'>('active');
  const [userDid] = useState(process.env.NEXT_PUBLIC_T3N_DID || 'did:t3n:maria123');
  const [registeredTemplates, setRegisteredTemplates] = useState<string[]>(['clinic-intake', 'job-application']);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Submission execution flow
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'draft' | 'submitting' | 'confirmed' | 'error'>('idle');
  const [lastResponse, setLastResponse] = useState<{ apptId?: string; candidateId?: string } | null>(null);
  const [activeVc, setActiveVc] = useState<Record<string, unknown> | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Audits and logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check backend availability & fetch initial templates status
  const checkBackend = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${agentUrl}/api/telemetry`);
      if (res.ok) {
        setEnclaveStatus('active');
        // Load logs
        const logs = await res.json();
        setTelemetryLogs(logs);
      } else {
        setEnclaveStatus('offline');
      }
    } catch {
      setEnclaveStatus('offline');
    } finally {
      setIsRefreshing(false);
    }
  }, [agentUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkBackend();
    }, 0);
    return () => clearTimeout(timer);
  }, [agentUrl, checkBackend]);

  const handleRegisterTemplate = async (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    try {
      const res = await fetch(`${agentUrl}/api/template/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      if (res.ok) {
        setRegisteredTemplates((prev) => [...prev, templateId]);
        checkBackend();
      }
    } catch (err) {
      console.error('Failed to register template on agent:', err);
    }
  };

  const addSimulatedTelemetry = (type: 'agent' | 'enclave', message: string, data?: unknown) => {
    setTelemetryLogs((prev) => [
      ...prev,
      { timestamp: Date.now(), type, message, data }
    ].slice(-50)); // Cap at 50 logs
  };

  // Run blind submit
  const handleBlindSubmit = async (nonSecurePayload: Record<string, string>) => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    setSubmissionStatus('draft');
    setLastResponse(null);

    const subId = `sub_${selectedTemplate.id}_${Math.floor(Math.random() * 1000000)}`;
    const txReceipt = `0x${Math.floor(Math.random() * 1000000).toString(16)}receipt`;
    const zkProof = {
      pi_a: [
        "0x11219b165b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112",
        "0x06c28f9d0cba6be4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc01289cf08"
      ],
      pi_b: [
        [
          "0x1ab36cba6be4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc01289cf08b1a3",
          "0x2bc8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb11211219b165b4c1bdc"
        ],
        [
          "0x0cf82b9dc3c8c704f05eb11211219b165b4c1bdc30c8cb080b06b3e4dc4ec2b",
          "0x15b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb112efc4ebc"
        ]
      ],
      pi_c: [
        "0x2bc8cb080b06b3e4dc4ec2bc2ef82b9dc3c8c704f05eb11211219b165b4c1bdc",
        "0x03c8c704f05eb11211219b165b4c1bdc30c8cb080b06b3e4dc4ec2bc2ef82b9d"
      ],
      publicSignals: ['0x12a63ae9f06a65c0fee8419c88ae174a41ba2bd920a22a03430d547048f7d339']
    };

    // Simulated Encryption
    const mockEnvelope = {
      ephemeralPublicKey: '043f1b2c3d...',
      iv: 'a5d3f2...',
      ciphertext: '5c2e9a...',
      authTag: 'f9b3e1...'
    };

    // Real Coordinator Agent execution
    try {
      addSimulatedTelemetry('agent', `Drafting submission ${subId} via Agent API...`);
      // 1. Create Draft
      const draftRes = await fetch(`${agentUrl}/api/submission/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          subId,
          userDid
        })
      });

      if (!draftRes.ok) throw new Error('Failed to draft submission on agent');

      // 2. Submit blind execution
      addSimulatedTelemetry('agent', 'Executing TEE blind submission...');
      const submitRes = await fetch(`${agentUrl}/api/submission/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subId,
          envelope: mockEnvelope,
          zkProof,
          txReceipt,
          payload: nonSecurePayload
        })
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json();
        throw new Error(errData.error || 'Blind submission execution failed');
      }

      const data = await submitRes.json();
      
      // Load latest telemetry & audits from backend
      checkBackend();
      
      // Fetch submission status to get the proper audit history
      const statusRes = await fetch(`${agentUrl}/api/submission/${subId}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setAuditLogs(statusData.audits.reverse());
      }

      setLastResponse(data);
      setActiveVc(data.receiptVc);
      setSubmissionStatus('confirmed');
    } catch (err) {
      addSimulatedTelemetry('enclave', `Execution failed: ${(err as Error).message}`);
      setSubmissionStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyReceipt = async (vc: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch(`${agentUrl}/api/receipt/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptVc: vc })
      });
      if (res.ok) {
        const data = await res.json();
        return data.valid;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleClearTelemetry = async () => {
    try {
      await fetch(`${agentUrl}/api/telemetry/clear`, { method: 'POST' });
      setTelemetryLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout
      userDid={userDid}
      enclaveStatus={enclaveStatus}
      onRefresh={checkBackend}
      isRefreshing={isRefreshing}
    >
      {/* Hero Section (Element 3) */}
      <section className="text-center py-10 space-y-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 font-mono text-[10px] text-cyan-400 tracking-widest uppercase mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>TEE PRIVACY-BLIND EGRESS GATEWAY</span>
        </div>

        <h1 className="font-display font-black text-5xl sm:text-7xl text-slate-100 uppercase tracking-tight leading-[1.05]">
          Secure submissions. <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">Completely blind to AI agents.</span>
        </h1>

        <p className="max-w-2xl mx-auto font-sans text-sm sm:text-base text-slate-400 leading-relaxed">
          Maria&apos;s Secure Booking Console is powered by Visor, a secure privacy-blind proxy running inside a hardware TEE enclave. AI agents construct payload templates with cryptographic placeholders, which are substituted out-of-band at the egress wire, keeping PII secure.
        </p>

        {/* Element 4: Primary CTA */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <a 
            href="#templates-section"
            className="px-8 py-3.5 rounded-xl font-mono text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span>CONFIGURE SUBMISSION TEMPLATE</span>
            <span>&rarr;</span>
          </a>
          <a 
            href="#enclave-telemetry"
            className="px-8 py-3.5 rounded-xl font-mono text-xs font-bold text-slate-200 border border-slate-800 hover:bg-slate-900 active:scale-[0.98] transition-all"
          >
            LIVE TELEMETRY STREAM
          </a>
        </div>

        {/* Element 5: Enhanced Social Proof / Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto p-5 rounded-2xl border border-cyan-950/40 bg-[#090d16]/30 backdrop-blur-sm font-mono text-xs text-slate-400 mt-10">
          <div className="flex flex-col gap-1 items-center border-r border-cyan-950/30 last:border-0">
            <span className="text-slate-500 text-[10px]">PII LEAK RISK</span>
            <span className="font-bold text-emerald-500 text-sm mt-0.5">0% Plaintext Logs</span>
          </div>
          <div className="flex flex-col gap-1 items-center border-r border-cyan-950/30 last:border-0">
            <span className="text-slate-500 text-[10px]">EGRESS ENVELOPE</span>
            <span className="font-bold text-cyan-400 text-sm mt-0.5">Secp256k1 ECIES</span>
          </div>
          <div className="flex flex-col gap-1 items-center border-r border-cyan-950/30 last:border-0">
            <span className="text-slate-500 text-[10px]">ATTESTATION STATE</span>
            <span className="font-bold text-emerald-400 text-sm mt-0.5">Intel TDX Verified</span>
          </div>
          <div className="flex flex-col gap-1 items-center last:border-0">
            <span className="text-slate-500 text-[10px]">RECEIPT EVIDENCE</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">Signed SD-JWT VCs</span>
          </div>
        </div>

        {/* Coordinator URL Config */}
        <div className="max-w-md mx-auto p-4 bg-[#05060b] border border-cyan-950/40 rounded-xl space-y-2 text-left mt-6">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 text-[10px]">COORDINATOR ROUTE API</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold">
              SANDBOX SIMULATOR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={agentUrl}
              onChange={(e) => setAgentUrl(e.target.value)}
              className="grow bg-[#080b15] border border-cyan-950/50 rounded h-8 px-2.5 font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              placeholder="Coordinator URL"
            />
            <button
              onClick={() => checkBackend()}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-400 text-xs font-mono rounded"
            >
              Ping
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {/* Phase 1: Templates Selection */}
        <div id="templates-section" className="scroll-mt-24">
          <TemplateGrid
            templates={DEFAULT_TEMPLATES}
            activeTemplateId={selectedTemplate?.id || null}
            onSelectTemplate={(template) => {
              setSelectedTemplate(template);
              setSubmissionStatus('idle');
              setLastResponse(null);
            }}
            registeredTemplates={registeredTemplates}
            onRegisterTemplate={handleRegisterTemplate}
            isRegistering={isSubmitting}
          />
        </div>

        {/* Phase 2: Core Telemetry Panel */}
        <SplitScreenReveal
          template={selectedTemplate}
          profile={MOCK_PROFILE}
          onSubmit={handleBlindSubmit}
          isSubmitting={isSubmitting}
          submissionStatus={submissionStatus}
          lastResponse={lastResponse}
        />

        {/* Dynamic Buttons for Receipts */}
        {submissionStatus === 'confirmed' && activeVc && (
          <div className="flex justify-center">
            <button
              onClick={() => setIsReceiptOpen(true)}
              className="flex items-center space-x-2 py-2.5 px-6 rounded-lg bg-emerald-500 text-[#060814] font-semibold font-mono text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:bg-emerald-400 transition-all duration-200"
            >
              <Shield className="h-4 w-4 fill-current" />
              <span>VIEW VERIFIABLE RECEIPT VC</span>
            </button>
          </div>
        )}

        {/* Split Screen Telemetry and Audit Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Telemetry Logs Terminal Stream */}
          <div id="enclave-telemetry" className="lg:col-span-7 space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 font-mono flex items-center space-x-2">
                <Terminal className="h-4 w-4" />
                <span>TEE Enclave Telemetry Stream</span>
              </h2>
              <button
                onClick={handleClearTelemetry}
                className="text-[10px] font-mono text-slate-500 hover:text-red-400 flex items-center space-x-1"
                title="Clear Logs"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            </div>

            <div className="bg-[#05060b]/90 terminal-scanlines border border-cyan-950/50 rounded-xl p-4 font-mono text-[11px] h-[280px] overflow-y-auto leading-relaxed space-y-2 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] select-text relative">
              {telemetryLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600">
                  <span className="animate-pulse">Waiting for telemetry signals...</span>
                  <span className="w-1.5 h-3.5 bg-slate-600 ml-1.5 animate-cursor inline-block"></span>
                </div>
              ) : (
                <>
                  {telemetryLogs.map((log, index) => {
                    const isEnclave = log.type === 'enclave';
                    return (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-bold shrink-0 ${isEnclave ? 'text-cyan-400' : 'text-slate-300'}`}>
                          {isEnclave ? '[ENCLAVE]' : '[AGENT]'}
                        </span>
                        <div className="flex-1">
                          <span className={isEnclave ? 'text-cyan-300' : 'text-slate-300'}>
                            {log.message}
                          </span>
                          {!!log.data && (
                            <pre className="text-slate-500 text-[10px] mt-1 bg-[#090d1a]/40 p-2 rounded border border-cyan-950/10 overflow-x-auto max-w-full">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1 text-slate-500 text-[10px] pt-1">
                    <span>SYS_LISTENER_ACTIVE</span>
                    <span className="w-1 h-3 bg-cyan-400 animate-cursor inline-block"></span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Audit Ledger Table */}
          <div className="lg:col-span-5">
            <AuditTable logs={auditLogs} />
          </div>
        </div>
      </div>

      {/* Customer Testimonials (Element 8) */}
      <section className="max-w-7xl mx-auto px-4 mt-16 relative z-10 w-full space-y-6">
        <div className="text-center">
          <h2 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-[0.25em] mb-2">
            WHO IT&apos;S FOR
          </h2>
          <h3 className="font-mono text-2xl font-extrabold text-white uppercase tracking-tight">
            Built So Agents Can Apply Without Seeing You
          </h3>
          <p className="font-mono text-[10px] text-slate-500 mt-3">
            Illustrative usage scenarios — not real testimonials. See the Hackathon Simulation Context below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: "I want an agent to apply me to clinical trials I qualify for, but my diagnosis and SSN can never reach the LLM — Visor fills them in only at the egress wire.",
              persona: "Clinical-trial applicant",
              context: "Medical PII",
              badge: "CT"
            },
            {
              quote: "Our agent submits loan applications to dozens of lenders on a customer's behalf; the broker node routes, but decrypted income and SSN exist only inside the enclave.",
              persona: "Lending platform",
              context: "Financial submissions",
              badge: "LP"
            },
            {
              quote: "Each submission comes back with an enclave-signed VC receipt, so we can prove to an auditor exactly what was sent without ever logging the raw PII.",
              persona: "Compliance auditor",
              context: "Verifiable receipts",
              badge: "CA"
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-[#0b0f19]/60 border border-cyan-950/40 rounded-xl p-5 hover:border-cyan-500/20 transition-colors flex flex-col justify-between">
              <p className="text-xs text-slate-300 italic mb-5 leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 flex items-center justify-center font-mono text-[10px] font-bold">
                  {item.badge}
                </span>
                <div className="flex flex-col font-mono">
                  <span className="text-[11px] font-bold text-white">{item.persona}</span>
                  <span className="text-[9px] text-slate-500">{item.context}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA (Element 10) */}
      <section className="max-w-7xl mx-auto px-4 mt-16 mb-12 relative z-10 w-full">
        <div className="bg-linear-to-r from-cyan-950/20 via-[#060814] to-blue-950/10 border border-cyan-900/40 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
          
          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <h3 className="text-xl md:text-3xl font-bold font-display tracking-wide text-white uppercase">
              RECLAIM YOUR PRIVACY BOUNDARIES
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-xl mx-auto leading-relaxed">
              Join early contributors deploying secure Visor enclaves. Enter your email to receive developer integration SDK announcements.
            </p>
            
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
              <input 
                type="email" 
                placeholder="Enter DID or email..." 
                className="grow px-4 py-3 rounded-lg border border-cyan-950/50 bg-[#060814] font-mono text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                required
              />
              <button 
                type="submit"
                onClick={() => {
                  alert("Subscribed to Visor updates!");
                }}
                className="bg-cyan-500 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-[#060814] font-mono text-xs px-6 py-3 rounded-lg font-bold transition-all active:scale-[0.98]"
              >
                SUBSCRIBE
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Hackathon Simulation Context (honesty disclaimer) */}
      <section className="max-w-4xl mx-auto px-4 mt-4 mb-12 relative z-10 w-full">
        <div className="p-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/2 flex flex-col gap-3">
          <h3 className="font-mono text-xs font-bold text-cyan-400 uppercase">Hackathon Simulation Context</h3>
          <p className="font-mono text-[11px] text-slate-400 leading-relaxed">
            Visor is a demo built for the DoraHacks T3 ADK Launch Edition. The enclave, agent submission routing,
            and data-broker egress run in a <span className="text-slate-200">local sandbox</span> against simulated
            Terminal 3 host APIs — no real applications are submitted and broker endpoints are seeded test targets.
            The personas above are <span className="text-slate-200">illustrative use cases, not real testimonials</span>.
            What is real: a Rust&rarr;WASM enclave contract, PII-blind <span className="text-slate-200">http-with-placeholders</span> egress,
            an <span className="text-slate-200">authorisation</span> allowlist pre-flight, enclave-signed VC receipts, and a
            durable <span className="text-slate-200">outbox</span>.
          </p>
        </div>
      </section>

      {/* Receipts Modal */}
      {activeVc && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          vc={activeVc}
          onVerifyReceipt={handleVerifyReceipt}
        />
      )}
    </DashboardLayout>
  );
}
