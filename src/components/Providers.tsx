'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeDB, DB, User, StaffProfile, pullFromSupabase } from '@/services/db';

interface AppContextProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentStaff: StaffProfile | null;
  setCurrentStaff: (staff: StaffProfile | null) => void;
  isLoadingAuth: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  cms: any;
  refreshCMS: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [currentStaff, setCurrentStaffState] = useState<StaffProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [cms, setCms] = useState<any>(null);

  // Initialize DB and load data
  useEffect(() => {
    const initApp = async () => {
      initializeDB();

      // 1. Authoritative server-side session check
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUserState(data.user);
            DB.setCurrentUser(data.user);
          } else {
            // Unauthenticated on server
            setCurrentUserState(null);
            DB.setCurrentUser(null);
          }
        } else {
          // If server error or offline, fallback to local cache
          const cachedUser = DB.getCurrentUser();
          setCurrentUserState(cachedUser);
        }
      } catch (err) {
        console.warn('[Affy Auth] Server session check failed, using local cache:', err);
        const cachedUser = DB.getCurrentUser();
        setCurrentUserState(cachedUser);
      } finally {
        setIsLoadingAuth(false);
      }

      // 2. Staff & CMS state
      setCurrentStaffState(DB.getCurrentStaff());
      setCms(DB.getCMS());

      // 3. Remote data sync
      await pullFromSupabase();
    };

    initApp();

    // Load theme setting
    const savedTheme = localStorage.getItem('affy_theme') as 'light' | 'dark' | null;
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const handleCmsUpdated = () => {
      setCms(DB.getCMS());
    };

    window.addEventListener('cms_updated', handleCmsUpdated);

    return () => {
      window.removeEventListener('cms_updated', handleCmsUpdated);
    };
  }, []);

  // Global Discreet Admin Shortcut: Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        e.stopPropagation();

        if (currentStaff) {
          if (currentStaff.role === 'Super Admin') {
            router.push('/admin');
          } else {
            router.push('/staff');
          }
        } else {
          router.push('/auth/login');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [currentStaff, router]);

  // Update theme helper
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('affy_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Auth wrappers
  const setCurrentUser = (user: User | null) => {
    DB.setCurrentUser(user);
    setCurrentUserState(user);

    if (user === null) {
      // Clear server session cookie on logout
      fetch('/api/auth/logout', { method: 'POST' }).catch((err) => {
        console.warn('[Affy Auth] Logout request failed:', err);
      });
    }
  };

  const setCurrentStaff = (staff: StaffProfile | null) => {
    DB.setCurrentStaff(staff);
    setCurrentStaffState(staff);
  };

  const refreshCMS = () => {
    setCms(DB.getCMS());
  };

  // Inject dynamic CMS branding styling into root element
  useEffect(() => {
    if (!cms) return;
    const root = document.documentElement;
    if (cms.branding?.primaryColor) root.style.setProperty('--primary', cms.branding.primaryColor);
    if (cms.branding?.primaryColorDark) root.style.setProperty('--primary-hover', cms.branding.primaryColorDark);
  }, [cms]);

  if (!cms) {
    return (
      <div className="min-h-screen bg-[#0d0617] flex items-center justify-center text-purple-400 font-mono animate-pulse">
        Loading Affy Savings Platform...
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentStaff,
        setCurrentStaff,
        isLoadingAuth,
        theme,
        toggleTheme,
        cms,
        refreshCMS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
