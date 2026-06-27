import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
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

async function dropboxApi(token: string, endpoint: string, body: unknown, isUpload = false): Promise<Response> {
  const url = `https://api.dropboxapi.com/2${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (isUpload) {
    // For file upload: Content-Type is octet-stream, metadata goes in Dropbox-API-Arg
    headers['Content-Type'] = 'application/octet-stream';
    headers['Dropbox-API-Arg'] = JSON.stringify(body);
    return fetch(url, { method: 'POST', headers, body: body as BodyInit });
  } else {
    headers['Content-Type'] = 'application/json';
    return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  }
}

async function ensureDropboxFolder(token: string, path: string): Promise<void> {
  try {
    await dropboxApi(token, '/files/create_folder_v2', { path, autorename: false });
  } catch {
    // Folder might already exist — that's fine
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
    return response.ok;
  } catch {
    return false;
  }
}

// Sanitize a name for use as a folder/file name in Dropbox
function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Sin_nombre';
}

// ─── GET: Check connection status ───

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
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

// ─── POST: Connect / Sync / Upload ───

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

      // Verify token
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

      return NextResponse.json({
        success: true,
        accountName: config.accountName,
        accountEmail: config.accountEmail,
      });
    }

    // ─── DISCONNECT ───
    if (action === 'disconnect') {
      const { writeFile: wf } = await import('fs/promises');
      if (existsSync(CONFIG_PATH)) {
        await wf(CONFIG_PATH, JSON.stringify({ accessToken: '', connectedAt: '' }));
      }
      return NextResponse.json({ success: true });
    }

    // ─── SYNC PROJECT ───
    if (action === 'sync-project') {
      const config = await loadConfig();
      if (!config?.accessToken) {
        return NextResponse.json({ error: 'Dropbox no conectado' }, { status: 400 });
      }

      const { projectId } = body;
      if (!projectId) {
        return NextResponse.json({ error: 'projectId requerido' }, { status: 400 });
      }

      // Get project with categorías and photos
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          subProducts: { orderBy: { sortOrder: 'asc' } },
          photos: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }

      const projectName = sanitize(project.name);
      const baseFolder = `/Castalia Proyect/${projectName}`;

      // Create base project folder
      await ensureDropboxFolder(config.accessToken, baseFolder);

      let uploaded = 0;
      let failed = 0;

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

      // Upload photos per categoría
      const allSubs = [
        ...project.subProducts,
        // If there are unassigned photos, create a "General" folder
        ...(unassignedPhotos.length > 0 ? [{ id: '__general__', name: 'General', sortOrder: 999 }] : []),
      ];

      for (const sub of allSubs) {
        const catName = sanitize(sub.name);
        const catFolder = `${baseFolder}/${catName}`;
        await ensureDropboxFolder(config.accessToken, catFolder);

        const photos = sub.id === '__general__' ? unassignedPhotos : (photosBySub.get(sub.id) || []);

        // Group by phase (ANTES/DESPUÉS)
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

        // Upload ANTES
        if (antesPhotos.length > 0) {
          const folder = `${catFolder}/ANTES`;
          await ensureDropboxFolder(config.accessToken, folder);
          for (const photo of antesPhotos) {
            const localFile = join(UPLOAD_DIR, photo.url.replace('/api/photos/serve/', ''));
            if (existsSync(localFile)) {
              const ext = photo.url.split('.').pop() || 'jpg';
              const dropboxPath = `${folder}/${sanitize(photo.caption || photo.fileName || `foto-${photo.sortOrder}`)}.${ext}`;
              const ok = await uploadFileToDropbox(config.accessToken, localFile, dropboxPath);
              if (ok) uploaded++; else failed++;
            } else {
              failed++;
            }
          }
        }

        // Upload DESPUÉS
        if (despuesPhotos.length > 0) {
          const folder = `${catFolder}/DESPUÉS`;
          await ensureDropboxFolder(config.accessToken, folder);
          for (const photo of despuesPhotos) {
            const localFile = join(UPLOAD_DIR, photo.url.replace('/api/photos/serve/', ''));
            if (existsSync(localFile)) {
              const ext = photo.url.split('.').pop() || 'jpg';
              const dropboxPath = `${folder}/${sanitize(photo.caption || photo.fileName || `foto-${photo.sortOrder}`)}.${ext}`;
              const ok = await uploadFileToDropbox(config.accessToken, localFile, dropboxPath);
              if (ok) uploaded++; else failed++;
            } else {
              failed++;
            }
          }
        }

        // Upload other photos (no phase tag)
        if (otherPhotos.length > 0) {
          for (const photo of otherPhotos) {
            const localFile = join(UPLOAD_DIR, photo.url.replace('/api/photos/serve/', ''));
            if (existsSync(localFile)) {
              const ext = photo.url.split('.').pop() || 'jpg';
              const dropboxPath = `${catFolder}/${sanitize(photo.caption || photo.fileName || `foto-${photo.sortOrder}`)}.${ext}`;
              const ok = await uploadFileToDropbox(config.accessToken, localFile, dropboxPath);
              if (ok) uploaded++; else failed++;
            } else {
              failed++;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        uploaded,
        failed,
        message: `${uploaded} foto(s) sincronizada(s) a Dropbox${failed > 0 ? `, ${failed} falló(aron)` : ''}`,
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

      // Get photo and project info
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

      const localFile = join(UPLOAD_DIR, photo.url.replace('/api/photos/serve/', ''));
      if (!existsSync(localFile)) {
        return NextResponse.json({ skipped: true });
      }

      const ext = photo.url.split('.').pop() || 'jpg';
      const fileName = sanitize(photo.caption || photo.fileName || `foto-${Date.now()}`);
      const dropboxPath = `${dropboxDir}/${fileName}.${ext}`;

      const ok = await uploadFileToDropbox(config.accessToken, localFile, dropboxPath);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Dropbox API error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}