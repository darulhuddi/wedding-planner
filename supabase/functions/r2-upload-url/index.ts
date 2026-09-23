/**
 * Supabase Edge Function: r2-upload-url
 *
 * Generates presigned PUT upload URL for direct browser -> Cloudflare R2 upload.
 * Endpoint: POST /functions/v1/r2-upload-url
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, generateR2PresignedUploadUrl, getR2Config } from '../_shared/r2Client.ts';

const MAX_WORKSPACE_QUOTA_BYTES = 262144000; // 250 MB Storage Quota

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server environment not properly configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Authenticate user via JWT Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid authentication token.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Parse request payload
  let body: { workspaceId?: string; sizeBytes?: number; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { workspaceId, sizeBytes = 0, mimeType = 'image/webp' } = body;

  if (!workspaceId) {
    return new Response(JSON.stringify({ error: 'workspaceId is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Verify workspace ownership via RLS
  const { data: workspace, error: wsError } = await userClient
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (wsError || !workspace) {
    return new Response(JSON.stringify({ error: 'Workspace not found or access denied.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 4. Enforce Workspace Storage Quota Guard
  const { data: items, error: itemsError } = await userClient
    .from('moodboard_items')
    .select('storage_size')
    .eq('workspace_id', workspaceId)
    .eq('storage_provider', 'r2');

  if (!itemsError && items) {
    const currentUsedBytes = items.reduce((acc, curr) => acc + (curr.storage_size ? Number(curr.storage_size) : 0), 0);
    if (currentUsedBytes + sizeBytes > MAX_WORKSPACE_QUOTA_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Kapasitas penyimpanan workspace telah penuh (${(currentUsedBytes / (1024 * 1024)).toFixed(1)} MB / 250 MB). Hapus inspirasi lama untuk menambah foto baru.`,
          currentUsedBytes,
          maxQuotaBytes: MAX_WORKSPACE_QUOTA_BYTES,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // 5. Generate deterministic, tenant-isolated R2 Storage Key
  const itemId = crypto.randomUUID();
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') ? 'jpg' : 'webp';
  const storageKey = `workspaces/${workspaceId}/moodboard/${itemId}.${ext}`;

  // 6. Generate presigned PUT URL
  try {
    const presigned = await generateR2PresignedUploadUrl(storageKey, mimeType);

    return new Response(
      JSON.stringify({
        uploadUrl: presigned.uploadUrl,
        storageKey: presigned.storageKey,
        publicUrl: presigned.publicUrl,
        itemId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[R2 Presigned Upload URL Error]:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Gagal menghasilkan R2 upload URL.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
