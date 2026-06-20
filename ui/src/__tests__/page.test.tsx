/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Page from '../app/page';

// Mock components to simplify page testing and focus on page state/logic
jest.mock('../components/TemplateGrid', () => {
  return function MockTemplateGrid(props: any) {
    return (
      <div data-testid="mock-template-grid">
        {props.templates.map((t: any) => (
          <div key={t.id}>
            <span>{t.name}</span>
            <button onClick={() => props.onRegisterTemplate(t.id)}>Register {t.id}</button>
            <button onClick={() => props.onSelectTemplate(t)}>Select {t.id}</button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../components/SplitScreenReveal', () => {
  return function MockSplitScreenReveal(props: any) {
    if (!props.template) return <div data-testid="no-template">No Template</div>;
    return (
      <div data-testid="mock-split-screen-reveal">
        <span>Selected: {props.template.id}</span>
        <button onClick={() => props.onSubmit({ symptom: 'cough' })}>Submit Securely</button>
        {props.submissionStatus === 'confirmed' && props.lastResponse && (
          <div>
            <span>Appointment Confirmed</span>
            <span>ID: {props.lastResponse.apptId}</span>
          </div>
        )}
      </div>
    );
  };
});

jest.mock('../components/AuditTable', () => {
  return function MockMockAuditTable(props: any) {
    return <div data-testid="mock-audit-table">Audits: {props.logs.length}</div>;
  };
});

jest.mock('../components/ReceiptModal', () => {
  return function MockReceiptModal(props: any) {
    if (!props.isOpen) return null;
    return (
      <div data-testid="mock-receipt-modal">
        <button onClick={() => props.onVerifyReceipt(props.vc)}>Run Validation</button>
      </div>
    );
  };
});

// Mock Lucide icons or other components in layout
jest.mock('lucide-react', () => ({
  Shield: () => <span data-testid="shield-icon" />,
  Terminal: () => <span data-testid="terminal-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Cpu: () => <span data-testid="cpu-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  Activity: () => <span data-testid="activity-icon" />,
  ShieldCheck: () => <span data-testid="shield-check-icon" />,
}));

describe('Visor Page', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders landing page, fetches telemetry logs initially, handles config changes', async () => {
    const mockTelemetry = [
      { timestamp: Date.now(), type: 'enclave', message: 'Enclave boot success' }
    ];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTelemetry),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;

    render(<Page />);

    // Renders title / description
    expect(screen.getByText('Secure submissions.')).toBeInTheDocument();
    
    // Verify initial telemetry logs fetched
    await waitFor(() => {
      expect(screen.getByText('Enclave boot success')).toBeInTheDocument();
    });

    // Check UI elements (e.g. Ping button)
    const pingButton = screen.getByRole('button', { name: 'Ping' });
    expect(pingButton).toBeInTheDocument();

    fireEvent.click(pingButton);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/telemetry'));
  });

  it('can register a template', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/template/register')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;

    render(<Page />);

    // Trigger template registration
    const registerButton = screen.getByRole('button', { name: 'Register clinic-intake' });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/template/register'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('runs blind submit flow successfully', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/submission/draft')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url.includes('/api/submission/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ apptId: 'appt-123', receiptVc: { type: 'VerifiableCredential' } }),
        });
      }
      if (url.includes('/api/submission/sub_')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            audits: [
              { ts: Date.now(), actor: 'did:t3n:maria123', action: 'submit', markers: ['test'], outcome: 'success' }
            ]
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as any;

    render(<Page />);

    // Select a template
    const selectButton = screen.getByRole('button', { name: 'Select clinic-intake' });
    fireEvent.click(selectButton);

    // Verify it changed component state to show SplitScreenReveal
    expect(screen.getByText('Selected: clinic-intake')).toBeInTheDocument();

    // Click submit
    const submitBtn = screen.getByRole('button', { name: 'Submit Securely' });
    fireEvent.click(submitBtn);

    // Wait for flow to complete and state transitions
    await waitFor(() => {
      expect(screen.getByText('VIEW VERIFIABLE RECEIPT VC')).toBeInTheDocument();
    });

    expect(screen.getByText('Appointment Confirmed')).toBeInTheDocument();
  });

  it('can verify a receipt and clear telemetry logs', async () => {
    let clearCalled = false;
    let verifyCalled = false;

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/telemetry/clear')) {
        clearCalled = true;
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/api/receipt/verify')) {
        verifyCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });
      }
      // Initial page load telemetry
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ timestamp: Date.now(), type: 'enclave', message: 'Active log' }]),
        });
      }
      // Mock submit flow to produce receipt button
      if (url.includes('/api/submission/draft')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (url.includes('/api/submission/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ apptId: 'appt-123', receiptVc: { id: 'vc-123', issuer: 'did:t3n:enclave' } }),
        });
      }
      if (url.includes('/api/submission/sub_')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ audits: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;

    render(<Page />);

    // Verify clear logs works
    await waitFor(() => {
      expect(screen.getByText('Active log')).toBeInTheDocument();
    });

    const clearButton = screen.getByTitle('Clear Logs');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(clearCalled).toBe(true);
      expect(screen.queryByText('Active log')).not.toBeInTheDocument();
    });

    // Select template
    const selectButton = screen.getByRole('button', { name: 'Select clinic-intake' });
    fireEvent.click(selectButton);

    // Submit securely
    const submitBtn = screen.getByRole('button', { name: 'Submit Securely' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('VIEW VERIFIABLE RECEIPT VC')).toBeInTheDocument();
    });

    const viewReceiptBtn = screen.getByRole('button', { name: 'VIEW VERIFIABLE RECEIPT VC' });
    fireEvent.click(viewReceiptBtn);

    // Verify Modal has "Run Validation" button (mocked)
    const runValidationBtn = screen.getByRole('button', { name: 'Run Validation' });
    fireEvent.click(runValidationBtn);

    await waitFor(() => {
      expect(verifyCalled).toBe(true);
    });
  });
});
