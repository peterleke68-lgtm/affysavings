'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDB, DB, getSimulationLogs, clearSimulationLogs, NotificationLog, User, StaffProfile, pullFromSupabase } from '@/services/db';
import { Mail, MessageSquare, Terminal, X, ChevronDown, ChevronUp, BellRing } from 'lucide-react';

interface AppContextProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentStaff: StaffProfile | null;
  setCurrentStaff: (staff: StaffProfile | null) => void;
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
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [currentStaff, setCurrentStaffState] = useState<StaffProfile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [cms, setCms] = useState<any>(null);
  const [simLogs, setSimLogs] = useState<NotificationLog[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasNewLog, setHasNewLog] = useState(false);

  // Initialize DB and load data
  useEffect(() => {
    const initDB = async () => {
      initializeDB();
      await pullFromSupabase();
      setCurrentUserState(DB.getCurrentUser());
      setCurrentStaffState(DB.getCurrentStaff());
      setCms(DB.getCMS());
    };
    initDB();
    
    // Load theme setting
    const savedTheme = localStorage.getItem('affy_theme') as 'light' | 'dark';
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load CMS
    setCms(DB.getCMS());
    setSimLogs(getSimulationLogs());

    // Listen for custom simulation events
    const handleSimNotification = () => {
      setSimLogs(getSimulationLogs());
      setHasNewLog(true);
    };

    const handleCmsUpdated = () => {
      setCms(DB.getCMS());
    };

    window.addEventListener('sim_notification_triggered', handleSimNotification);
    window.addEventListener('new_in_app_notification', handleSimNotification);
    window.addEventListener('cms_updated', handleCmsUpdated);

    return () => {
      window.removeEventListener('sim_notification_triggered', handleSimNotification);
      window.removeEventListener('new_in_app_notification', handleSimNotification);
      window.removeEventListener('cms_updated', handleCmsUpdated);
    };
  }, []);

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
    root.style.setProperty('--primary', cms.branding.primaryColor);
    root.style.setProperty('--primary-hover', cms.branding.primaryColorDark);
  }, [cms]);

  const handleClearLogs = () => {
    clearSimulationLogs();
    setSimLogs([]);
    setHasNewLog(false);
  };

  if (!cms) {
    return <div className="min-h-screen bg-[#0d0617] flex items-center justify-center text-purple-400 font-mono animate-pulse">Loading Affy Savings Platform...</div>;
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      currentStaff,
      setCurrentStaff,
      theme,
      toggleTheme,
      cms,
      refreshCMS
    }}>
      {children}
    </AppContext.Provider>
  );
}
