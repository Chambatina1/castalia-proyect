---
Task ID: 1
Agent: main
Task: Fix Dropbox sync bug + make Dropbox the database backup

Work Log:
- Analyzed the bug: photo.url is `/api/photos/serve/filename.jpg` and the replacement was correct BUT the old `dropboxApi` function had a bug where `isUpload=true` passed `body: body as BodyInit` which sent the JSON metadata as the file content instead of the actual file buffer
- Rewrote entire `/api/dropbox/route.ts`:
  - Created `extractFilename()` and `getLocalPhotoPath()` helper functions for robust path resolution
  - Fixed `uploadFileToDropbox` to correctly use `content.dropboxapi.com` (was already correct but the old `dropboxApi` helper was broken for uploads)
  - Removed the buggy `dropboxApi` helper for uploads, keeping `uploadFileToDropbox` separate
  - Added `backupDatabaseToDropbox()` — exports all projects, subProducts, photos, users, tasks as JSON
  - Added `restoreDatabaseFromDropbox()` — downloads latest backup and upserts all data
  - Added `uploadJsonToDropbox()` and `downloadFromDropbox()` helpers
  - Added `listDropboxFolder()` helper
  - New actions: `backup-db`, `restore-db`, `list-backups`
  - Auto-backup DB after every photo sync and single photo upload
  - Keep only last 10 backups, delete oldest
  - Track `lastBackupAt` in config
- Updated `photos/route.ts`: Auto-sync to Dropbox now fires for ALL photos (not just those with subProductId)
- Updated `settings-page.tsx`:
  - Added backup/restore UI cards in Dropbox section
  - Shows last backup time and "Protegido" badge
  - "Crear Backup Ahora" button with teal styling
  - "Restaurar Datos" button with orange styling and confirmation dialog
  - Warning about what backup includes
  - Updated system info to show "SQLite + Dropbox Backup"

Stage Summary:
- Fixed the 0 photos sync bug (path extraction + upload function)
- Added full DB backup/restore via Dropbox
- Auto-backup on every photo upload
- Committed and deployed to Render (deploy ID: dep-d905inbtqb8s73ffobug)
