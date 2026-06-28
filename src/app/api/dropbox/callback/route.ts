import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = process.env.DATA_DIR
  ? join(process.env.DATA_DIR, 'dropbox-config.json')
  : '/data/dropbox-config.json';

interface DropboxConfig {
  accessToken: string;
  connectedAt: string;
  accountName?: string;
  accountEmail?: string;
  lastBackupAt?: string;
  baseFolder?: string;
  appKey?: string;
  appSecret?: string;
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

function getBaseUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const baseUrl = getBaseUrl(request);

    // User denied access
    if (error) {
      console.error('Dropbox OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/settings?dropbox=denied&msg=${encodeURIComponent(errorDescription || error)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?dropbox=no_code', baseUrl)
      );
    }

    // Get App Key and Secret from config or env
    let appKey = process.env.DROPBOX_APP_KEY;
    let appSecret = process.env.DROPBOX_APP_SECRET;

    if (!appKey || !appSecret) {
      const config = await loadConfig();
      if (!appKey) appKey = config?.appKey;
      if (!appSecret) appSecret = config?.appSecret;
    }

    if (!appKey || !appSecret) {
      console.error('Missing Dropbox App Key or Secret');
      return NextResponse.redirect(
        new URL('/settings?dropbox=need_app_keys', baseUrl)
      );
    }

    const redirectUri = `${baseUrl}/api/dropbox/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: appKey,
        client_secret: appSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errText);
      return NextResponse.redirect(
        new URL(`/settings?dropbox=token_error&msg=${encodeURIComponent(errText)}`, baseUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Verify the token and get account info
    const accountRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!accountRes.ok) {
      console.error('Account verification failed after token exchange');
      return NextResponse.redirect(
        new URL('/settings?dropbox=verify_error', baseUrl)
      );
    }

    const accountData = await accountRes.json();

    // Save config with token and app credentials
    const existingConfig = await loadConfig();
    const config: DropboxConfig = {
      accessToken,
      connectedAt: new Date().toISOString(),
      accountName: accountData.name?.display_name,
      accountEmail: accountData.email,
      baseFolder: existingConfig?.baseFolder || '/Castalia Proyect',
      appKey: appKey,
      appSecret: appSecret,
      lastBackupAt: existingConfig?.lastBackupAt,
    };

    await saveConfig(config);

    // Create folder structure in Dropbox
    try {
      const ensureFolder = async (path: string) => {
        await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path, autorename: false }),
        }).catch(() => {}); // folder might exist
      };
      await ensureFolder(config.baseFolder!);
      await ensureFolder(`${config.baseFolder}/_backups`);
    } catch {}

    // Redirect to settings with success
    return NextResponse.redirect(
      new URL('/settings?dropbox=connected', baseUrl)
    );

  } catch (err) {
    console.error('Dropbox callback error:', err);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL('/settings?dropbox=callback_error', baseUrl)
    );
  }
}