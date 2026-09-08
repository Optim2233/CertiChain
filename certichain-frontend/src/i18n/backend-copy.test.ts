import { describe, expect, it } from 'vitest';
import { backendText } from './backend-copy';

// Identity translator: records which key (and params) the mapper chose.
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key} ${JSON.stringify(params)}` : key;

describe('backendText', () => {
  it('maps known fixed strings to backend.* keys', () => {
    expect(backendText(t, 'Certificate issued')).toBe('backend.certIssued');
    expect(backendText(t, 'Share link viewed (view-only, no viewer identity recorded)')).toBe(
      'backend.shareViewed',
    );
    expect(backendText(t, 'Certificate verified — revoked credential shown')).toBe(
      'backend.certVerifiedRevoked',
    );
    expect(backendText(t, 'Institution approved')).toBe('backend.instApproved');
    expect(
      backendText(t, 'A new credential has been issued to you by an accredited institution.'),
    ).toBe('backend.notifCertIssued');
  });

  it('extracts counts into ICU params, singular and plural', () => {
    expect(backendText(t, 'Your credentials were verified 1 time')).toBe(
      'backend.verifsTitle {"n":1}',
    );
    expect(backendText(t, 'Your credentials were verified 4 times')).toBe(
      'backend.verifsTitle {"n":4}',
    );
    expect(backendText(t, 'Your shared credentials were viewed 2 times')).toBe(
      'backend.shareViewsTitle {"n":2}',
    );
    expect(backendText(t, '1 dispute was filed against your credentials')).toBe(
      'backend.disputesTitle {"n":1}',
    );
    expect(backendText(t, '3 disputes were filed against your credentials')).toBe(
      'backend.disputesTitle {"n":3}',
    );
  });

  it('translates the static prefix but keeps human-written tails verbatim', () => {
    expect(backendText(t, 'A credential you hold was revoked. Reason: expired by registrar')).toBe(
      'backend.revokePrefix {"reason":"expired by registrar"}',
    );
    expect(backendText(t, 'Your dispute was upheld. Resolution: reissued')).toBe(
      'backend.disputeUpheldMsg {"note":"reissued"}',
    );
    expect(backendText(t, 'Your dispute was dismissed. Resolution: stands as issued')).toBe(
      'backend.disputeDismissedMsg {"note":"stands as issued"}',
    );
  });

  it('passes unknown strings through and blanks empty input', () => {
    expect(backendText(t, 'Some future event')).toBe('Some future event');
    expect(backendText(t, '')).toBe('');
    expect(backendText(t, null)).toBe('');
    expect(backendText(t, undefined)).toBe('');
  });
});
