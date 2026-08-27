# EASA Flight Logbook V35

Google Drive backup test build.

- Google OAuth Client ID configured for the GitHub Pages origin.
- Scope: `https://www.googleapis.com/auth/drive.file`
- First backup creates one app-owned JSON file in Google Drive.
- Later backups update that same file using its stored Drive file ID.
- Local logbook data remains the primary offline copy.
- Google authorization is silently re-acquired on page load when Google permits it; otherwise the user can reconnect manually.
