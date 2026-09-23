/**
 * WedSiap Google Drive Picker Service
 *
 * Integrates Google Identity Services (GIS) and Google Picker API with narrow scope
 * `https://www.googleapis.com/auth/drive.file` to allow users to select images directly
 * from their Google Drive.
 */

import { GoogleDriveSelectedFile } from '../../domain/moodboard/types';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export function getGoogleConfig() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
  const appId = import.meta.env.VITE_GOOGLE_APP_ID || '';
  const isMockMode = import.meta.env.VITE_GOOGLE_DRIVE_MOCK === 'true';

  return {
    clientId,
    apiKey,
    appId,
    isMockMode,
    isConfigured: Boolean((clientId && apiKey) || isMockMode),
  };
}

let isGapiLoaded = false;
let isGsiLoaded = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

export async function loadGoogleLibraries(): Promise<void> {
  if (typeof window === 'undefined') return;

  const tasks: Promise<void>[] = [];

  if (!isGapiLoaded) {
    tasks.push(
      loadScript('https://apis.google.com/js/api.js').then(() => {
        return new Promise<void>((resolve) => {
          // @ts-expect-error window.gapi loaded dynamically
          if (window.gapi) {
            // @ts-expect-error window.gapi load
            window.gapi.load('picker', () => {
              isGapiLoaded = true;
              resolve();
            });
          } else {
            resolve();
          }
        });
      })
    );
  }

  if (!isGsiLoaded) {
    tasks.push(
      loadScript('https://accounts.google.com/gsi/client').then(() => {
        isGsiLoaded = true;
      })
    );
  }

  await Promise.all(tasks);
}

let activeAccessToken: string | null = null;
let activeTokenExpiresAt = 0;

export function getActiveAccessToken(): string | null {
  if (activeAccessToken && Date.now() < activeTokenExpiresAt) {
    return activeAccessToken;
  }
  return null;
}

export function setActiveAccessToken(token: string, expiresInSeconds: number = 3500) {
  activeAccessToken = token;
  activeTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
}

/**
 * Requests short-lived OAuth token via GIS token client and opens Google Picker.
 * Returns domain-neutral file objects: Array<GoogleDriveSelectedFile>
 */
export async function openGoogleDrivePicker(): Promise<GoogleDriveSelectedFile[]> {
  const config = getGoogleConfig();

  if (config.isMockMode) {
    // Development / Testing Mock Mode
    return [
      {
        fileId: `mock_drive_${Date.now()}`,
        fileName: 'wedding_inspiration_drive.jpg',
        mimeType: 'image/jpeg',
        size: 1500000,
      },
    ];
  }

  if (!config.isConfigured) {
    throw new Error(
      'Google Drive API belum terkonfigurasi pada sistem. Harap tambahkan VITE_GOOGLE_CLIENT_ID dan VITE_GOOGLE_API_KEY pada environment variables.'
    );
  }

  await loadGoogleLibraries();

  return new Promise((resolve, reject) => {
    try {
      // @ts-expect-error window.google.accounts.oauth2 loaded dynamically
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: SCOPES,
        callback: async (tokenResponse: { access_token?: string; expires_in?: number; error?: string }) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            reject(new Error(tokenResponse.error || 'Gagal melakukan autentikasi dengan Google Drive.'));
            return;
          }

          const accessToken = tokenResponse.access_token;
          setActiveAccessToken(accessToken, tokenResponse.expires_in || 3500);

          // Build Google Picker
          // @ts-expect-error window.google.picker loaded dynamically
          const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_IMAGES)
            .setMimeTypes('image/jpeg,image/png,image/webp,image/gif');

          // @ts-expect-error window.google.picker loaded dynamically
          const pickerBuilder = new window.google.picker.PickerBuilder()
            .setAppId(config.appId)
            .setOAuthToken(accessToken)
            .setDeveloperKey(config.apiKey)
            .addView(view)
            .setCallback((data: { action: string; docs?: Array<{ id: string; name: string; mimeType: string; sizeBytes?: number; embedUrl?: string }> }) => {
              // @ts-expect-error window.google.picker.Action loaded dynamically
              if (data.action === window.google.picker.Action.PICKED && data.docs) {
                const selected: GoogleDriveSelectedFile[] = data.docs.map((doc) => ({
                  fileId: doc.id,
                  fileName: doc.name,
                  mimeType: doc.mimeType,
                  size: doc.sizeBytes ? Number(doc.sizeBytes) : undefined,
                  embedUrl: doc.embedUrl,
                }));
                resolve(selected);
              } else if (data.action === 'cancel') {
                resolve([]);
              }
            });

          const picker = pickerBuilder.build();
          picker.setVisible(true);
        },
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      console.error('[GoogleDrivePicker] Failed to open picker:', err);
      reject(err);
    }
  });
}

export interface DriveFileMetadata {
  id: string;
  name?: string;
  mimeType?: string;
  thumbnailLink?: string;
}

/**
 * Retrieves metadata (including short-lived thumbnailLink) for a Google Drive file by ID.
 */
export async function fetchDriveFileMetadata(
  fileId: string,
  accessToken?: string
): Promise<DriveFileMetadata> {
  const config = getGoogleConfig();

  if (config.isMockMode) {
    if (fileId.includes('not_found')) {
      const err = new Error('File not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    if (fileId.includes('unauthorized')) {
      const err = new Error('Unauthorized') as Error & { status?: number };
      err.status = 401;
      throw err;
    }
    return {
      id: fileId,
      name: 'mock_drive_file.jpg',
      mimeType: 'image/jpeg',
      thumbnailLink: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    };
  }

  const token = accessToken || getActiveAccessToken();
  if (!token) {
    const err = new Error('No Google Drive access token available') as Error & { status?: number };
    err.status = 401;
    throw err;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,thumbnailLink`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const err = new Error(`Google Drive API error: ${response.statusText}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return await response.json();
}

