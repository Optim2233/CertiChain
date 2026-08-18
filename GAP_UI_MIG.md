# CertiChain UI Audit — Design vs Codebase (lowest-level check)

## A. Entire screens missing

1. **Graduate — "My Credentials" list page.** Design: all credential cards in a 2-col grid. Codebase: no route; Overview shows only the top 3 (`src/app/(graduate)/graduate/page.tsx:85`), and its "View all" links back to `/graduate`.
2. **Graduate — "Timeline" page.** Design: chronological feed with filter chips (All/Credentials/Shares/Disputes). Codebase: no route; "View full timeline" (`src/app/(graduate)/graduate/page.tsx:151`) is a dead self-link.

## B. Shared design-system chrome missing (affects all 3 auth portals)

3. **No top 44px navy header bar** (brand + portal label) — design-system component, absent everywhere. Only the sidebar exists.
4. **Sidebar rows have no icons** — design: nav rows carry Material icons, active = navy `#34466c` + `4px #61a1fd` left border, `FILL=1`. Codebase `src/shared/components/layout/portal-sidebar.tsx`: text-only rows, `border-l-2`, no icons.
5. **No sidebar collapse** — design: 240–280px ⇄ 80px with `chevron_left` button + 0.25s width transition. Codebase: fixed `w-64` (`portal-sidebar.tsx:104`).
6. **No "Help Center" link** at sidebar bottom (design lists Help Center + Logout). Only Logout exists.
7. **No "Upgrade Plan" button** (dictated in Institution sidebar bottom).

## C. Component-level gaps

8. **No trust-badge chips in verification result** — design: "Blockchain" / "Secure hash" (unverified) and "RBTC" etc. (verified) chips under the result card. `src/shared/components/verification-result.tsx` has none (only the hero "Verified on chain" chip + status line).
9. **Authority Suspend requires risk level (Strong/Moderate/Low, color-coded)** — codebase suspend modal only requires a reason; no risk selector anywhere in `src/app/(authority)/`.
10. **Authority dashboard KPI cards mismatch** — design: Pending Reviews / Institutions Reviewed / Suspended / Revoked. Codebase registry stat cards: Total / Approved / Pending / Suspended (no "Revoked" or "Reviewed").
11. **QR rendering is stubbed** — `src/shared/components/certificate-hero.tsx` has no "Document QR" button (design dictates it); shares-table QR button is a disabled stub pending a dependency (`shares/page.tsx:77-79`).

## D. Minor fidelity deviations

12. Graduate "Create Share" is a **page** (`/graduate/shares/new`) vs design's modal-based create.
13. Authority **Reject** is an inline reason field with disabled button, vs design's reason-required confirm modal (Suspend does use the modal).
14. Row-action menus: institution cred row menu shows disabled Approve/Revoke stubs; design keeps action list to hover-only real actions.
15. Colors/fonts/icons pass: `#02275A`, `#0987EA`, `#0d9668`, `#a5730f`, `#C0392B`, Manrope/IBM Plex Sans, Material Symbols Outlined — all match the spec.

## Verified present (no action)

- Credential hero (navy, chip, copy-hash, verification link) shared across Graduate/Institution/Verifier
- Dispute flows: flag → Institution tabs (Under Review/History) → Dismiss (reason modal) → Uphold opens credential Edit pre-filled + dispute banner
- Revocation: reason capture + revoked banners + surfaced on Verifier result & graduate detail
- Institution: issue single (validation + success banner), batch (drop zone, preview CSV, row Fix, Download template, Issue All Valid Rows), activity records (form + guidance + recent list), registration (3-step, consent, PDF upload, no sidebar)
- Graduate: overview (greeting, 4 stats, Recent Activity, Active Shares, profile nudge), credential detail (fields grid, Fields Shared toggle, flag for review, registrar signature), disputes (stat cards + Raise a Dispute modal), shares (list + activity feed), settings (profile + account info + notification toggles + security)
- Authority: registry (search + filter pills + amber dispute flag), review (documents checks + ministry cross-check, decision verdicts), audit log (search + When/Event/Actor + pagination), settings
- Verifier: verify form (ID/Link/QR tabs), verified/revoked/not-found states, share timeline with actor + scope events, bulk CSV upload with template + instructions, public institutions directory