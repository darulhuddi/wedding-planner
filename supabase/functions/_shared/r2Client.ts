/**
 * Supabase Edge Function Shared Helper: r2Client.ts
 *
 * Configures Cloudflare R2 S3-compatible client using server-side secrets.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from 'npm:@aws-sdk/client-s3@^3.500.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@^3.500.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
};

export function getR2Config() {
  const accountId = Deno.env.get('R2_ACCOUNT_ID') || '';
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID') || '';
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY') || '';
  const bucketName = Deno.env.get('R2_BUCKET_NAME') || 'wedsiap-media';
  const publicBaseUrl = Deno.env.get('R2_PUBLIC_BASE_URL') || '';

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ''),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function createR2Client() {
  const config = getR2Config();

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('R2 credentials are not properly configured on the server environment.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Generates a presigned PUT upload URL for direct browser -> Cloudflare R2 upload.
 */
export async function generateR2PresignedUploadUrl(
  storageKey: string,
  contentType: string = 'image/webp',
  expiresInSeconds: number = 900 // 15 minutes
): Promise<{ uploadUrl: string; storageKey: string; publicUrl: string }> {
  const config = getR2Config();
  const r2Client = createR2Client();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });

  const publicUrl = config.publicBaseUrl
    ? `${config.publicBaseUrl}/${storageKey}`
    : `${config.endpoint}/${config.bucketName}/${storageKey}`;

  return {
    uploadUrl,
    storageKey,
    publicUrl,
  };
}

/**
 * Deletes an object from Cloudflare R2 bucket.
 */
export async function deleteR2Object(storageKey: string): Promise<void> {
  const config = getR2Config();
  const r2Client = createR2Client();

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: storageKey,
  });

  try {
    await r2Client.send(command);
  } catch (err) {
    console.warn('[R2 Delete Warning]: Object delete returned error (may be idempotent missing object):', err);
  }
}
