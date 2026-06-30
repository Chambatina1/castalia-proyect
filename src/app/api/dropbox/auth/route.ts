import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = process.env.DATA_DIR
  ? join(process.env.DATA_DIR, 'dropbox-config.json')
  : '/data/dropbox-config.json';

interface DropboxConfig {
  accessToken?: string;
  connectedAt?: string;
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

// Build the app's base URL from the request
function getBaseUrl(request: NextRequest): string {
  // Try X-Forwarded headers first (Render/proxy sets these)
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  // Fallback
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  try {
    // Check if App Key is configured
    // It can come from env var OR from the saved config
    let appKey = process.env.DROPBOX_APP_KEY;

    if (!appKey) {
      const config = await loadConfig();
      appKey = config?.appKey;
    }

    if (!appKey) {
      return NextResponse.redirect(
        new URL('/settings?dropbox=need_app_keys', getBaseUrl(request))
      );
    }

    const baseUrl = getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/dropbox/callback`;

    // Dropbox OAuth2 authorization URL
    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', appKey);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('token_access_type', 'offline'); // gets long-lived token
    authUrl.searchParams.set('redirect_uri', redirectUri);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Dropbox auth redirect error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL('/settings?dropbox=auth_error', baseUrl)
    );
  }
}