EASA Flight Logbook V35
Google Drive backup test build.

- Visible build: V35
- Google OAuth Client ID configured for the GitHub Pages origin.
- Scope: https://www.googleapis.com/auth/drive.file
- First backup creates one JSON file and stores its Drive file ID.
- Later backups update that exact file.
- The app attempts silent Google authorization after reload when possible.
