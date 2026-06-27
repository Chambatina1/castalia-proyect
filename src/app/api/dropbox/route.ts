import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { db } from '@/lib/db';

const CONFIG_PATH = process.env.DATA_DIR
  ? join(process.env.DATA_DIR, 'dropbox-config.json')
  : '/data/dropbox-config.json';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

// ─── Config helpers ───

interface DropboxConfig {
  accessToken: string;
  connectedAt: string;
  accountName?: string;
  accountEmail?: string;
  lastBackupAt?: string;
}

async function loadConfig(): Promise<DropboxConfig | null> {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveConfig(config: DropboxConfig): Promise<void> {
  const dir = CONFIG_PATH.substring(0, CONFIG_PATH.lastIndexOf('/'));
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// ─── Dropbox API helpers ───

async function dropboxApi(token: string, endpoint: string, body: unknown): Promise<Response> {
  const url = `https://api.dropboxapi.com/2${endpoint}`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function ensureDropboxFolder(token: string, path: string): Promise<void> {
  try {
    await dropboxApi(token, '/files/create_folder_v2', { path, autorename: false });
  } catch {
    // Folder might already exist
  }
}

async function uploadFileToDropbox(
  token: string,
  localPath: string,
  dropboxPath: string
): Promise<boolean> {
  try {
    const fileBuffer = await readFile(localPath);
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: dropboxPath,
          mode: 'overwrite',
          autorename: true,
          mute: true,
        }),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Dropbox upload failed for ${dropboxPath}: ${response.status} ${errText}`);
    }
    return response.ok;
  } catch (err) {
    console.error(`Dropbox upload error for ${dropboxPath}:`, err);
    return false;
  }
}

async function uploadJsonToDropbox(
  token: string,
  jsonData: string,
  dropboxPath: string
): Promise<boolean> {
  try {
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: dropboxPath,
          mode: 'overwrite',
          autorename: false,
          mute: true,
        }),
      },
      body: jsonData,
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function downloadFromDropbox(
  token: string,
  dropboxPath: string
): Promise<string | null> {
  try {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: dropboxPath }),
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function listDropboxFolder(
  token: string,
  path: string
): Promise<Array<{ name: string; path_display: string; '.tag': string }>> {
  try {
    const res = await dropboxApi(token, '/files/list_folder', { path, recursive: false });
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries || [];
  } catch {
    return [];
  }
}

// Sanitize a name for use as a folder/file name in Dropbox
function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Sin_nombre';
}

// ─── Extract filename from photo.url ───
// photo.url = "/api/photos/serve/1234567-abcd.jpg" → "1234567-abcd.jpg"
function extractFilename(photoUrl: string): string {
  if (!photoUrl) return '';
  // Handle /api/photos/serve/filename.ext
  const servePrefix = '/api/photos/serve/';
  if (photoUrl.startsWith(servePrefix)) {
    return photoUrl.slice(servePrefix.length);
  }
  // Handle just a filename
  if (!photoUrl.includes('/') || photoUrl.includes('.')) {
    return basename(photoUrl);
  }
  return basename(photoUrl);
}

// Build local file path from photo.url
function getLocalPhotoPath(photoUrl: string): string {
  const filename = extractFilename(photoUrl);
  if (!filename) return '';
  return join(UPLOAD_DIR, filename);
}

// ─── GET: Check connection status + last backup info ───

export async function GET() {
  try {
    const config = await loadConfig();
    if (!config) {
      return NextResponse.json({ connected: false });
    }

    // Verify token is still valid
    const res = await dropboxApi(config.accessToken, '/users/get_current_account', null);
    if (!res.ok) {
      return NextResponse.json({ connected: false, error: 'Token inválido' });
    }

    const data = await res.json();
    return NextResponse.json({
      connected: true,
      accountName: data.name?.display_name,
      accountEmail: data.email,
      connectedAt: config.connectedAt,
      lastBackupAt: config.lastBackupAt || null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

// ─── POST: Connect / Sync / Upload / Backup / Restore ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ─── CONNECT ───
    if (action === 'connect') {
      const { accessToken } = body;
      if (!accessToken?.trim()) {
        return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
      }

      const res = await dropboxApi(accessToken.trim(), '/users/get_current_account', null);
      if (!res.ok) {
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
      }

      const data = await res.json();
      const config: DropboxConfig = {
        accessToken: accessToken.trim(),
        connectedAt: new Date().toISOString(),
        accountName: data.name?.display_name,
        accountEmail: data.email,
      };
      await saveConfig(config);

      // Create folder structure
      await ensureDropboxFolder(config.accessToken, '/Castalia Proyect');
      await ensureDropboxFolder(config.accessToken, '/Castalia Proyect/_backups');

      return NextResponse.json({
        success: true,
        accountName: config.accountName,
        accountEmail: config.accountEmail,
      });
    }

    // ─── DISCONNECT ───
    if (action === 'disconnect') {
      if (existsSync(CONFIG_PATH)) {
        await writeFile(CONFIG_PATH, JSON.stringify({ accessToken: '', connectedAt: '' }));
      }
      return NextResponse.json({ success: true });
    }

    // ─── SYNC PROJECT (photos only) ───
    if (action === 'sync-project') {
      const config = await loadConfig();
      if (!config?.accessToken) {
        return NextResponse.json({ error: 'Dropbox no conectado' }, { status: 400 });
      }

      const { projectId } = body;
      if (!projectId) {
        return NextResponse.json({ error: 'projectId requerido' }, { status: 400 });
      }

      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          subProducts: { orderBy: { sortOrder: 'asc' } },
          photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        },
      });

      if (!project) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }

      const projectName = sanitize(project.name);
      const baseFolder = `/Castalia Proyect/${projectName}`;
      await ensureDropboxFolder(config.accessToken, baseFolder);

      let uploaded = 0;
      let failed = 0;
      const errors: string[] = [];

      // List existing files in uploads dir for debugging
      let uploadFiles: string[] = [];
      try {
        if (existsSync(UPLOAD_DIR)) {
          uploadFiles = readdirSync(UPLOAD_DIR);
        }
      } catch {}

      // Group photos by subProduct
      const photosBySub = new Map<string, typeof project.photos>();
      const unassignedPhotos: typeof project.photos = [];

      for (const photo of project.photos) {
        if (photo.subProductId) {
          const arr = photosBySub.get(photo.subProductId) || [];
          arr.push(photo);
          photosBySub.set(photo.subProductId, arr);
        } else {
          unassignedPhotos.push(photo);
        }
      }

      const allSubs = [
        ...project.subProducts,
        ...(unassignedPhotos.length > 0 ? [{ id: '__general__', name: 'General', sortOrder: 999 }] : []),
      ];

      for (const sub of allSubs) {
        const catName = sanitize(sub.name);
        const catFolder = `${baseFolder}/${catName}`;
        await ensureDropboxFolder(config.accessToken, catFolder);

        const photos = sub.id === '__general__' ? unassignedPhotos : (photosBySub.get(sub.id) || []);

        const antesPhotos: typeof photos = [];
        const despuesPhotos: typeof photos = [];
        const otherPhotos: typeof photos = [];

        for (const photo of photos) {
          let tags: string[] = [];
          try { tags = JSON.parse(photo.tags || '[]'); } catch { tags = (photo.tags || '').split(',').filter(Boolean); }
          if (tags.includes('antes')) antesPhotos.push(photo);
          else if (tags.includes('despues')) despuesPhotos.push(photo);
          else otherPhotos.push(photo);
        }

        // Upload photos helper
        const uploadBatch = async (photosList: typeof photos, folder: string) => {
          for (const photo of photosList) {
            const localFile = getLocalPhotoPath(photo.url);
            if (existsSync(localFile)) {
              const ext = localFile.split('.').pop() || 'jpg';
              const dropboxFile = sanitize(photo.caption || photo.fileName || `foto-${photo.sortOrder}`);
              const dropboxPath = `${folder}/${dropboxFile}.${ext}`;
              const ok = await uploadFileToDropbox(config!.accessToken, localFile, dropboxPath);
              if (ok) uploaded++; else { failed++; errors.push(`${basename(localFile)}: upload failed`); }
            } else {
              failed++;
              errors.push(`${photo.url} → ${localFile} not found (uploads dir has ${uploadFiles.length} files)`);
            }
          }
        };

        if (antesPhotos.length > 0) {
          const folder = `${catFolder}/ANTES`;
          await ensureDropboxFolder(config.accessToken, folder);
          await uploadBatch(antesPhotos, folder);
        }

        if (despuesPhotos.length > 0) {
          const folder = `${catFolder}/DESPUÉS`;
          await ensureDropboxFolder(config.accessToken, folder);
          await uploadBatch(despuesPhotos, folder);
        }

        if (otherPhotos.length > 0) {
          await uploadBatch(otherPhotos, catFolder);
        }
      }

      // Also do a DB backup after syncing photos
      try {
        await backupDatabaseToDropbox(config.accessToken);
      } catch {}

      const msg = `${uploaded} foto(s) sincronizada(s) a Dropbox${failed > 0 ? `, ${failed} falló(aron)` : ''}`;
      return NextResponse.json({
        success: true,
        uploaded,
        failed,
        message: msg,
        ...(errors.length > 0 && { debugErrors: errors.slice(0, 5) }),
      });
    }

    // ─── UPLOAD SINGLE PHOTO (fire-and-forget from photo upload) ───
    if (action === 'upload-photo') {
      const config = await loadConfig();
      if (!config?.accessToken) {
        return NextResponse.json({ skipped: true });
      }

      const { photoId, projectId, fase, subProductName } = body;
      if (!photoId || !projectId) {
        return NextResponse.json({ skipped: true });
      }

      const photo = await db.photo.findUnique({
        where: { id: photoId },
        include: { project: { select: { name: true } } },
      });
      if (!photo) return NextResponse.json({ skipped: true });

      const projectName = sanitize(photo.project.name);
      const catName = sanitize(subProductName || 'General');
      const phaseFolder = fase === 'antes' ? 'ANTES' : fase === 'despues' ? 'DESPUÉS' : null;

      let dropboxDir = `/Castalia Proyect/${projectName}/${catName}`;
      if (phaseFolder) {
        dropboxDir += `/${phaseFolder}`;
      }

      await ensureDropboxFolder(config.accessToken, dropboxDir);

      const localFile = getLocalPhotoPath(photo.url);
      if (!existsSync(localFile)) {
        // Log for debugging
        console.log(`[Dropbox auto-sync] File not found: ${localFile} (photo.url=${photo.url})`);
        return NextResponse.json({ skipped: true, reason: 'file_not_found' });
      }

      const ext = localFile.split('.').pop() || 'jpg';
      const fileName = sanitize(photo.caption || photo.fileName || `foto-${Date.now()}`);
      const dropboxPath = `${dropboxDir}/${fileName}.${ext}`;

      const ok = await uploadFileToDropbox(config.accessToken, localFile, dropboxPath);

      // Also backup DB after each photo upload
      if (ok) {
        try { await backupDatabaseToDropbox(config.accessToken); } catch {}
      }

      return NextResponse.json({ success: ok });
    }

    // ─── BACKUP DATABASE (export all data as JSON to Dropbox) ───
    if (action === 'backup-db') {
      const config = await loadConfig();
      if (!config?.accessToken) {
        return NextResponse.json({ error: 'Dropbox no conectado' }, { status: 400 });
      }

      const result = await backupDatabaseToDropbox(config.accessToken);
      return NextResponse.json(result);
    }

    // ─── RESTORE DATABASE (import JSON from Dropbox) ───
    if (action === 'restore-db') {
      const config = await loadConfig();
      if (!config?.accessToken) {
        return NextResponse.json({ error: 'Dropbox no conectado' }, { status: 400 });
      }

      const result = await restoreDatabaseFromDropbox(config.accessToken);
      return NextResponse.json(result);
    }

    // ─── DEBUG SYNC (shows what DB has vs what files exist) ───
    if (action === 'debug-sync') {
      const { projectId } = body;
      const photos = await db.photo.findMany({
        where: projectId ? { projectId } : undefined,
        select: { id: true, url: true, fileName: true, projectId: true, subProductId: true },
        take: 20,
      });

      let uploadFiles: string[] = [];
      try {
        if (existsSync(UPLOAD_DIR)) {
          uploadFiles = readdirSync(UPLOAD_DIR);
        }
      } catch {}

      const photoDebug = photos.map(p => {
        const filename = extractFilename(p.url);
        const localPath = getLocalPhotoPath(p.url);
        const fileExists = existsSync(localPath);
        return {
          id: p.id,
          url: p.url,
          fileName: p.fileName,
          extractedFilename: filename,
          localPath,
          fileExists,
          subProductId: p.subProductId,
        };
      });

      return NextResponse.json({
        uploadDir: UPLOAD_DIR,
        uploadFileCount: uploadFiles.length,
        uploadFilesSample: uploadFiles.slice(0, 10),
        photoCount: photos.length,
        photos: photoDebug,
      });
    }

    // ─── GET BACKUP LIST ───
    if (action === 'list-backups') {
      const config = await loadConfig();
      if (!config?.accessToken) {
        return NextResponse.json({ error: 'Dropbox no conectado' }, { status: 400 });
      }

      const entries = await listDropboxFolder(config.accessToken, '/Castalia Proyect/_backups');
      const backups = entries
        .filter(e => e['.tag'] === 'file' && e.name.endsWith('.json'))
        .map(e => ({
          name: e.name,
          path: e.path_display,
          size: e.name,
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // newest first

      return NextResponse.json({ backups });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Dropbox API error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ─── Database Backup ───

async function backupDatabaseToDropbox(token: string): Promise<{ success: boolean; message: string; backupFile?: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = `backup-${timestamp}.json`;
  const dropboxPath = `/Castalia Proyect/_backups/${backupFile}`;

  // Export all data
  const [projects, subProducts, photos, users, tasks, activityLogs] = await Promise.all([
    db.project.findMany({ orderBy: { createdAt: 'asc' } }),
    db.subProduct.findMany({ orderBy: { createdAt: 'asc' } }),
    db.photo.findMany({ orderBy: { createdAt: 'asc' } }),
    db.user.findMany({ select: { id: true, email: true, name: true, role: true, phone: true, position: true, isActive: true, createdAt: true } }),
    db.task.findMany({ orderBy: { createdAt: 'asc' } }),
    db.activityLog.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const backupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'Castalia Proyect',
    counts: {
      projects: projects.length,
      categorias: subProducts.length,
      photos: photos.length,
      users: users.length,
      tasks: tasks.length,
    },
    data: {
      projects,
      subProducts,
      photos,
      users,
      tasks,
      activityLogs,
    },
  };

  const jsonStr = JSON.stringify(backupData, null, 2);

  await ensureDropboxFolder(token, '/Castalia Proyect/_backups');

  const ok = await uploadJsonToDropbox(token, jsonStr, dropboxPath);
  if (ok) {
    // Update lastBackupAt in config
    const config = await loadConfig();
    if (config) {
      config.lastBackupAt = new Date().toISOString();
      await saveConfig(config);
    }

    // Keep only last 10 backups
    try {
      const entries = await listDropboxFolder(token, '/Castalia Proyect/_backups');
      const backupFiles = entries
        .filter(e => e['.tag'] === 'file' && e.name.startsWith('backup-') && e.name.endsWith('.json'))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (backupFiles.length > 10) {
        const toDelete = backupFiles.slice(0, backupFiles.length - 10);
        for (const f of toDelete) {
          try {
            await dropboxApi(token, '/files/delete_v2', { path: f.path_display });
          } catch {}
        }
      }
    } catch {}

    return { success: true, message: `Backup creado: ${backupFile}`, backupFile };
  }

  return { success: false, message: 'Error al crear backup' };
}

// ─── Database Restore ───

async function restoreDatabaseFromDropbox(token: string): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> {
  // Find latest backup
  const entries = await listDropboxFolder(token, '/Castalia Proyect/_backups');
  const backupFiles = entries
    .filter(e => e['.tag'] === 'file' && e.name.startsWith('backup-') && e.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name));

  if (backupFiles.length === 0) {
    return { success: false, message: 'No hay backups disponibles en Dropbox' };
  }

  const latestBackup = backupFiles[0];
  const jsonStr = await downloadFromDropbox(token, latestBackup.path_display);
  if (!jsonStr) {
    return { success: false, message: `Error al descargar ${latestBackup.name}` };
  }

  let backupData: any;
  try {
    backupData = JSON.parse(jsonStr);
  } catch {
    return { success: false, message: 'Backup corrupto' };
  }

  if (!backupData.data) {
    return { success: false, message: 'Formato de backup no válido' };
  }

  const { users, projects, subProducts, photos, tasks, activityLogs } = backupData.data;
  const stats: Record<string, number> = { users: 0, projects: 0, categorias: 0, photos: 0, tasks: 0 };

  try {
    // Restore users (upsert by email)
    if (Array.isArray(users)) {
      for (const u of users) {
        await db.user.upsert({
          where: { email: u.email },
          update: { name: u.name, role: u.role, phone: u.phone, position: u.position, isActive: u.isActive },
          create: { id: u.id, email: u.email, name: u.name, password: 'restored_needs_reset', role: u.role },
        });
        stats.users++;
      }
    }

    // Restore projects
    if (Array.isArray(projects)) {
      for (const p of projects) {
        await db.project.upsert({
          where: { id: p.id },
          update: {
            name: p.name, clientName: p.clientName, clientEmail: p.clientEmail,
            address: p.address, city: p.city, state: p.state, description: p.description,
            status: p.status, priority: p.priority, progress: p.progress,
            sortOrder: p.sortOrder, coverImage: p.coverImage,
          },
          create: {
            id: p.id, name: p.name, clientName: p.clientName, address: p.address,
            creatorId: p.creatorId, status: p.status, priority: p.priority,
          },
        });
        stats.projects++;
      }
    }

    // Restore categorías (subProducts)
    if (Array.isArray(subProducts)) {
      for (const s of subProducts) {
        await db.subProduct.upsert({
          where: { id: s.id },
          update: { name: s.name, sortOrder: s.sortOrder },
          create: { id: s.id, name: s.name, projectId: s.projectId, sortOrder: s.sortOrder },
        });
        stats.categorias++;
      }
    }

    // Restore photos
    if (Array.isArray(photos)) {
      for (const ph of photos) {
        await db.photo.upsert({
          where: { id: ph.id },
          update: {
            caption: ph.caption, tags: ph.tags, sortOrder: ph.sortOrder,
            subProductId: ph.subProductId, isApproved: ph.isApproved,
          },
          create: {
            id: ph.id, projectId: ph.projectId, uploadedBy: ph.uploadedBy,
            url: ph.url, fileName: ph.fileName, fileSize: ph.fileSize,
            fileType: ph.fileType, tags: ph.tags, caption: ph.caption,
            sortOrder: ph.sortOrder, subProductId: ph.subProductId,
          },
        });
        stats.photos++;
      }
    }

    // Restore tasks
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        await db.task.upsert({
          where: { id: t.id },
          update: { title: t.title, description: t.description, status: t.status, priority: t.priority },
          create: {
            id: t.id, projectId: t.projectId, title: t.title,
            creatorId: t.creatorId, status: t.status, priority: t.priority,
          },
        });
        stats.tasks++;
      }
    }

    return {
      success: true,
      message: `Restaurado desde "${latestBackup.name}"`,
      stats,
    };
  } catch (err) {
    console.error('Restore error:', err);
    return { success: false, message: `Error durante la restauración: ${String(err)}` };
  }
}