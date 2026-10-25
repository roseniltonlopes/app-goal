import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { goalRepository } from '@/services/goalRepository';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import type { Profile, ThemeMode } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  isRemoteSupabase: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateUserProfile: (
    updates: Partial<Pick<Profile, 'full_name' | 'theme' | 'timezone' | 'week_starts_on'>>
  ) => Promise<Profile>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { setTheme } = useTheme();

  const loadUserAndProfile = useCallback(async () => {
    try {
      const sessionUser = await goalRepository.getCurrentSessionUser();
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        return;
      }
      setUser(sessionUser);
      await goalRepository.touchProfileActivity(sessionUser.id);
      const userProfile = await goalRepository.getProfile(sessionUser.id);
      setProfile(userProfile);
      if (userProfile.theme === 'dark' || userProfile.theme === 'light') {
        setTheme(userProfile.theme);
      }
    } catch (e) {
      console.error('Erro ao carregar sessão:', e);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    loadUserAndProfile();

    if (goalRepository.isRemote() && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(() => {
        loadUserAndProfile();
      });
      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, [loadUserAndProfile]);

  const signIn = async (email: string, password: string) => {
    const authUser = await goalRepository.signIn({ email, password });
    setUser(authUser);
    const userProfile = await goalRepository.getProfile(authUser.id);
    setProfile(userProfile);
    if (userProfile.theme) {
      setTheme(userProfile.theme as ThemeMode);
    }
  };

  const signUp = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<{ requiresEmailConfirmation: boolean }> => {
    const result = await goalRepository.signUp({ full_name: fullName, email, password });
    if (result.requiresEmailConfirmation) {
      return { requiresEmailConfirmation: true };
    }
    setUser(result.user);
    const userProfile = await goalRepository.getProfile(result.user.id);
    setProfile(userProfile);
    if (userProfile.theme) {
      setTheme(userProfile.theme as ThemeMode);
    }
    return { requiresEmailConfirmation: false };
  };

  const signOut = async () => {
    await goalRepository.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateUserProfile = async (
    updates: Partial<Pick<Profile, 'full_name' | 'theme' | 'timezone' | 'week_starts_on'>>
  ): Promise<Profile> => {
    if (!user) throw new Error('Usuário não autenticado.');
    const updated = await goalRepository.updateProfile(user.id, updates);
    setProfile(updated);
    if (updates.full_name) {
      setUser((prev) => (prev ? { ...prev, full_name: updates.full_name! } : prev));
    }
    if (updates.theme) {
      setTheme(updates.theme);
    }
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isRemoteSupabase: goalRepository.isRemote(),
        signIn,
        signUp,
        signOut,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return ctx;
}
