/**
 * Backend-authored display copy (audit events, notification type/message,
 * briefing titles/details) arrives as English strings, not codes — see
 * AuditEvents.java, BriefingServiceImpl, and the notify()/audit() call sites.
 * This maps the known inventory to `common.backend.*` keys so those surfaces
 * follow the app locale. Unknown strings pass through raw so new backend
 * copy degrades to English, never to a blank.
 */

type Translate = (key: string, params?: Record<string, string | number>) => string

const EXACT: Record<string, string> = {
  "Certificate issued": "backend.certIssued",
  "Certificate revoked": "backend.certRevoked",
  "Certificate verified (view-only, no personal data shown)": "backend.certVerified",
  "Certificate verified — revoked credential shown": "backend.certVerifiedRevoked",
  "Share link viewed (view-only, no viewer identity recorded)": "backend.shareViewed",
  "Share created": "backend.shareCreated",
  "Share revoked": "backend.shareRevoked",
  "Document verified": "backend.docVerified",
  "Certificate edited": "backend.certEdited",
  "Dispute upheld": "backend.disputeUpheld",
  "Dispute dismissed": "backend.disputeDismissed",
  "Institution approved": "backend.instApproved",
  "Information requested": "backend.infoRequested",
  "Institution rejected": "backend.instRejected",
  "Institution suspended": "backend.instSuspended",
  "Institution reinstated": "backend.instReinstated",
  "Institution revoked": "backend.instRevoked",
  "Institution application submitted": "backend.instAppSubmitted",
  "Institution profile updated": "backend.instProfileUpdated",
  "A new credential has been issued to you by an accredited institution.": "backend.notifCertIssued",
  "A credential you hold was edited and re-signed by the issuing institution.": "backend.notifCertEdited",
  "Employers or other parties opened a link you shared.": "backend.shareViewsSub",
  "Third parties checking credentials you issued.": "backend.verifsSub",
  "Review them in the Disputes section.": "backend.disputesSub",
}

const PATTERNS: Array<{
  re: RegExp
  key: string
  params: (m: RegExpMatchArray) => Record<string, string | number>
}> = [
  {
    re: /^Your shared credentials were viewed (\d+) times?$/,
    key: "backend.shareViewsTitle",
    params: (m) => ({ n: Number(m[1]) }),
  },
  {
    re: /^Your credentials were verified (\d+) times?$/,
    key: "backend.verifsTitle",
    params: (m) => ({ n: Number(m[1]) }),
  },
  {
    re: /^(\d+) disputes? (?:was|were) filed against your credentials$/,
    key: "backend.disputesTitle",
    params: (m) => ({ n: Number(m[1]) }),
  },
  // Static prefix translates; the human-written reason/note stays verbatim.
  {
    re: /^A credential you hold was revoked\. Reason: ([\s\S]*)$/,
    key: "backend.revokePrefix",
    params: (m) => ({ reason: m[1] }),
  },
  {
    re: /^Your dispute was upheld\. Resolution: ([\s\S]*)$/,
    key: "backend.disputeUpheldMsg",
    params: (m) => ({ note: m[1] }),
  },
  {
    re: /^Your dispute was dismissed\. Resolution: ([\s\S]*)$/,
    key: "backend.disputeDismissedMsg",
    params: (m) => ({ note: m[1] }),
  },
]

export function backendText(t: Translate, raw: string | null | undefined): string {
  if (!raw) return ""
  const exact = EXACT[raw]
  if (exact) return t(exact)
  for (const p of PATTERNS) {
    const m = p.re.exec(raw)
    if (m) return t(p.key, p.params(m))
  }
  return raw
}
