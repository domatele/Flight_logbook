EASA Flight Logbook V36

Google Drive backup/session persistence test.
- OAuth client configured for the GitHub Pages origin.
- Scope: https://www.googleapis.com/auth/drive.file
- First backup creates one JSON backup file.
- Later backups update the same Drive file.
- After reload, the app attempts silent Google authorization so the user does not normally need to sign in again.
