import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import AuditTable, { AuditLog } from '../AuditTable';

// Enable act() testing environment warning suppression for React 19
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('AuditTable Component', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  test('renders placeholder message when logs are empty', async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<AuditTable logs={[]} />);
    });
    expect(container!.textContent).toContain('No ledger entries recorded');
  });

  test('renders list of logs', async () => {
    const mockLogs: AuditLog[] = [
      {
        ts: 1774872000000, // Fixed timestamp
        actor: 'did:t3n:maria123',
        action: 'draft',
        markers: ['test-marker'],
        outcome: 'success'
      }
    ];

    await act(async () => {
      const root = createRoot(container!);
      root.render(<AuditTable logs={mockLogs} />);
    });
    expect(container!.textContent).toContain('did:t3n:maria123');
    expect(container!.textContent).toContain('draft');
    expect(container!.textContent).toContain('test-marker');
    expect(container!.textContent).toContain('SUCCESS');
  });
});
