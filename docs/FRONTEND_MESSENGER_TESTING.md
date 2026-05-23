Squad Messenger — Patch & Testing Notes

Summary of changes:
- Enforced role-based messaging client-side in `frontend/squad-messenger.js`:
  - Admins: can message any club member/staff.
  - Coaches: allowed to message their squad players and group admins.
  - Players: restricted from starting new conversations; may reply to existing threads only.
- Contact fetching now filters based on role and deduplicates contacts.
- Send path performs role checks and blocks unauthorized send attempts with user-friendly notifications.

How to test locally (quick):
1. Start the local frontend (open pages from `frontend/*.html` via a local server or file:// as appropriate).
2. Ensure `localStorage.currentUser` reflects the test user, and `localStorage.isDemoSession` as needed.
3. For Admin demo account:
   - Switch to the admin group (if demo switcher exists) and open Admin Messenger.
   - Confirm you can compose a new message ("+ New") and send to arbitrary recipients.
4. For Coach account:
   - Switch to a coach context and open Squad Messenger.
   - Confirm you can message squad players and group admins; attempts to message others should be blocked.
5. For Player account:
   - Switch to a player context and open Player Messenger.
   - Attempt to start a new conversation (should be blocked); reply to an existing thread (should succeed).
6. Mass message / broadcast flows are hidden for players; visible to admins/coaches per UI rules.

Troubleshooting:
- If messages fail to send in demo sessions, check `api-service.js` `shouldMock()` and `localStorage.isDemoSession` flags.
- If the messenger UI shows "Loading conversations..." or errors, check browser console for API errors and ensure `authToken`/`currentUser` are set.

Files touched:
- frontend/squad-messenger.js

Next steps I can run for you:
- Full static audit mapping of messenger mounts across all frontend pages (done partially).
- Prepare PR branch and commit changes with the above changelog and testing notes.
