import { supabase } from '../lib/supabaseClient';
import type {
  Session,
  AuthResponse,
  AuthTokenResponsePassword,
  UserResponse,
} from '@supabase/supabase-js';

export const getCurrentSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
};

export const signUp = async (
  email: string,
  password: string
): Promise<AuthResponse['data']> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
};

export const signIn = async (
  email: string,
  password: string
): Promise<AuthTokenResponsePassword['data']> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

export const updateEmail = async (email: string): Promise<UserResponse['data']> => {
  const { data, error } = await supabase.auth.updateUser({ email });
  if (error) {
    throw error;
  }
  return data;
};

export const updatePassword = async (password: string): Promise<UserResponse['data']> => {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }
  return data;
};

export const checkIsAdmin = async (userId?: string): Promise<boolean> => {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_current_user_is_admin');
    if (!rpcError && typeof rpcData === 'boolean') {
      return rpcData;
    }

    // Direct fallback query against public.admin_users
    let targetUid = userId;
    if (!targetUid) {
      const { data: sessionData } = await supabase.auth.getSession();
      targetUid = sessionData?.session?.user?.id;
    }

    if (!targetUid) {
      return false;
    }

    const { data: adminRow, error: adminErr } = await supabase
      .from('admin_users')
      .select('is_active')
      .eq('user_id', targetUid)
      .eq('is_active', true)
      .maybeSingle();

    if (!adminErr && adminRow && adminRow.is_active === true) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[WedFlow Auth] Error checking admin status:', err);
    return false;
  }
};

export const bootstrapFirstAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('bootstrap_admin_user', {
      p_user_id: userId,
    });
    if (error) {
      throw error;
    }
    return Boolean(data?.success);
  } catch (err) {
    console.error('[WedFlow Auth] Failed to bootstrap admin user:', err);
    throw err;
  }
};

export const authService = {
  getCurrentSession,
  signUp,
  signIn,
  signOut,
  updateEmail,
  updatePassword,
  checkIsAdmin,
  bootstrapFirstAdmin,
};

