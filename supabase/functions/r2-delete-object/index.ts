/**
 * Supabase Edge Function: r2-delete-object
 *
 * Deletes object from Cloudflare R2 bucket.
 * Endpoint: POST /functions/v1/r2-delete-object
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, deleteR2Object } from '../_shared/r2Client.ts';

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
  let body: { workspaceId?: string; storageKey?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { workspaceId, storageKey } = body;

  if (!workspaceId || !storageKey) {
    return new Response(JSON.stringify({ error: 'workspaceId and storageKey are required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Tenant Boundary Check: Enforce storageKey starts with workspaces/{workspaceId}/
  const expectedPrefix = `workspaces/${workspaceId}/`;
  if (!storageKey.startsWith(expectedPrefix)) {
    return new Response(
      JSON.stringify({ error: 'Tenant security violation: Storage key does not belong to target workspace.' }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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

  // 4. Delete R2 Object
  try {
    await deleteR2Object(storageKey);

    return new Response(
      JSON.stringify({ success: true, message: 'R2 Object deleted successfully.', storageKey }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[R2 Delete Object Error]:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Gagal menghapus object dari Cloudflare R2.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
