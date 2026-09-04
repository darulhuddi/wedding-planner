import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { authService } from './authService';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
  signUp: typeof authService.signUp;
  signIn: typeof authService.signIn;
  signOut: typeof authService.signOut;
  updateEmail: typeof authService.updateEmail;
  updatePassword: typeof authService.updatePassword;
  checkAdminStatus: (uid?: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(true);

  const resolveAdminStatus = async (uid?: string): Promise<boolean> => {
    if (!uid) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return false;
    }
    setIsAdminLoading(true);
    try {
      const adminStatus = await authService.checkIsAdmin(uid);
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch {
      setIsAdmin(false);
      return false;
    } finally {
      setIsAdminLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Fetch initial session
    authService
      .getCurrentSession()
      .then(async (initialSession) => {
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
          await resolveAdminStatus(initialSession?.user?.id);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
      });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
        await resolveAdminStatus(currentSession?.user?.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (uid?: string): Promise<boolean> => {
    const targetId = uid || user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
    return resolveAdminStatus(targetId);
  };

  const handleSignIn: typeof authService.signIn = async (email: string, password: string) => {
    const data = await authService.signIn(email, password);
    if (data?.user) {
      setSession(data.session);
      setUser(data.user);
      await resolveAdminStatus(data.user.id);
    }
    return data;
  };

  const handleSignOut = async (): Promise<void> => {
    await authService.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsAdminLoading(false);
  };

  const value: AuthContextValue = {
    session,
    user,
    loading,
    isAdmin,
    isAdminLoading,
    signUp: authService.signUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    updateEmail: authService.updateEmail,
    updatePassword: authService.updatePassword,
    checkAdminStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

