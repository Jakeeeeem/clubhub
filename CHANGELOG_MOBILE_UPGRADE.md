Mobile UX Overhaul — Summary

What changed:
- Added mobile-first primitives (FAB, bottom-sheet, bottom-nav) and global styles.
- Converted many table-heavy admin/coach/player pages into stacked mobile-friendly card lists.
- Added MutationObservers to re-run conversions after async data loads.
- Introduced quick-create bottom-sheets for Member/Team creation via `unified-nav.js`.
- Improved actionable items and touch targets for mobile.

Pages updated (high-level):
- admin-members, admin-events, admin-teams, admin-finances, admin-shop,
  admin-tournament-manager, coach-chat, coach-players, training-manager,
  player-finances, player-shop, plus others listed in the TODOs.

Developer notes:
- The mobile conversions are client-side DOM transforms; desktop behavior preserved.
- New globals: `UnifiedNav` helpers and `apiService` enhancements are used by mobile sheets.
- See `frontend/unified-nav.js` and `frontend/unified-nav.css` for primitives.

Testing checklist:
- Verify messenger behavior for Admin / Coach / Player roles.
- Open affected pages at mobile breakpoint (<= 991px) and confirm card view rendering.
- Test primary FAB actions on pages where applicable.
- Check bottom-sheet fallbacks to legacy modals on desktop.

Suggested PR title: "Mobile-first UX: card conversions, FAB + mobile sheets, messenger permissions"

Merge notes:
- No DB or backend changes required.
- Recommend QA on device widths 360–480, 768, and 1024+.
