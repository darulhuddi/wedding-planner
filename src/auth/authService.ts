import { supabase } from '../lib/supabaseClient';
import type {
  Session,
  AuthResponse,
  AuthTokenResponsePassword,
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

export const authService = {
  getCurrentSession,
  signUp,
  signIn,
  signOut,
};
