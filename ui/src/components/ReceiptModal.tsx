'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  vc: Record<string, unknown>;
  onVerifyReceipt: (vc: Record<string, unknown>) => Promise<boolean>;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  vc,
  onVerifyReceipt
}: ReceiptModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'idle' | 'verified' | 'failed'>('idle');

  if (!isOpen || !vc) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const isValid = await onVerifyReceipt(vc);
      setVerificationResult(isValid ? 'verified' : 'failed');
    } catch {
      setVerificationResult('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-[#04060e]/95 backdrop-blur-sm" 
      />

      {/* Modal Content */}
      <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-xl max-w-2xl w-full relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#060810] border-b border-cyan-950/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100 font-mono text-sm tracking-wide">
              VERIFIABLE EGRESS RECEIPT
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-[#05070f] border border-cyan-950/40 rounded-lg p-4 font-mono text-[11px] leading-relaxed relative">
            <pre className="text-cyan-400/90 whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto">
              {JSON.stringify(vc, null, 2)}
            </pre>
          </div>

          {/* Verification Box */}
          <div className="rounded-lg border p-4 bg-[#060810]/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-cyan-950/30">
            <div className="flex items-start space-x-3 text-left">
              {verificationResult === 'verified' ? (
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mt-0.5 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : verificationResult === 'failed' ? (
                <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mt-0.5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              )}
              
              <div>
                <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wide">
                  {verificationResult === 'verified' ? 'ECDSA Signature Valid' : 
                   verificationResult === 'failed' ? 'Cryptographic Check Failed' : 
                   'Signature Verification'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                  {verificationResult === 'verified' ? 'The receipt has been validated against the TEE enclave signer DID. The transaction content and path are cryptographically intact.' : 
                   verificationResult === 'failed' ? 'The verification check returned invalid. Signature mismatch or altered payload parameters.' : 
                   'Run verification to query the TEE contract validation interface to confirm the integrity of the issued VC.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className={`py-2 px-5 rounded font-mono text-xs font-semibold tracking-wide transition-all w-full sm:w-auto shrink-0 ${
                verificationResult === 'verified'
                  ? 'bg-emerald-500 text-[#060814] shadow-[0_0_10px_rgba(16,185,129,0.25)] hover:bg-emerald-400'
                  : 'bg-cyan-500 text-[#060814] hover:bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              }`}
            >
              {isVerifying ? 'VERIFYING...' : verificationResult === 'verified' ? 'VERIFIED' : 'RUN VALIDATION'}
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-[#060810] border-t border-cyan-950/40 px-5 py-3.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Signer ID: {vc.issuer as string}</span>
          <span>Proof Scheme: JSON Web Signature 2020</span>
        </div>
      </div>
    </div>
  );
}
