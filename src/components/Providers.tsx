'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDB, DB, getSimulationLogs, clearSimulationLogs, NotificationLog, User, StaffProfile } from '@/services/db';
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
    initializeDB();
    setCurrentUserState(DB.getCurrentUser());
    setCurrentStaffState(DB.getCurrentStaff());
    
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

      {/* FLOATING SIMULATION DEV TERMINAL */}
      <div className="fixed bottom-0 right-4 z-50 w-[420px] max-w-[95vw] shadow-2xl rounded-t-lg overflow-hidden border border-zinc-200 dark:border-zinc-850 font-sans">
        {/* Header */}
        <div 
          onClick={() => {
            setIsDrawerOpen(!isDrawerOpen);
            setHasNewLog(false);
          }}
          className="bg-zinc-900 text-zinc-100 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-850 select-none"
        >
          <div className="flex items-center gap-2">
            <Terminal size={16} className={hasNewLog ? 'text-purple-400 animate-pulse' : 'text-zinc-400'} />
            <span className="text-xs font-bold font-mono tracking-wider">AFFY SAVINGS SIMULATION TERMINAL</span>
            {simLogs.length > 0 && (
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                {simLogs.length} logs
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasNewLog && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
            {isDrawerOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>

        {/* Console Content */}
        {isDrawerOpen && (
          <div className="bg-zinc-950 text-zinc-300 h-64 p-3 overflow-y-auto flex flex-col gap-2 font-mono text-[11px] border-t border-zinc-800">
            {simLogs.length === 0 ? (
              <div className="text-zinc-500 flex flex-col items-center justify-center h-full gap-2">
                <BellRing size={20} className="text-zinc-700" />
                <span>No simulated alerts triggered yet.</span>
                <span className="text-[10px] text-zinc-650">OTP codes, login warnings, and deposits appear here.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center pb-1.5 border-b border-zinc-800">
                  <span className="text-zinc-500 text-[10px]">Real-time Event Log</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearLogs();
                    }}
                    className="text-[10px] text-zinc-400 hover:text-emerald-400 font-semibold cursor-pointer underline"
                  >
                    Clear Logs
                  </button>
                </div>
                {simLogs.map((log) => (
                  <div key={log.id} className="p-2 bg-zinc-900 rounded border border-zinc-850 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-bold">
                        {log.medium === 'Email' ? (
                          <Mail size={12} className="text-blue-400" />
                        ) : (
                          <MessageSquare size={12} className="text-emerald-400" />
                        )}
                        <span className={log.medium === 'Email' ? 'text-blue-400' : 'text-emerald-400'}>
                          [{log.medium.toUpperCase()}]
                        </span>{' '}
                        {log.type}
                      </span>
                      <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      <strong>To:</strong> {log.recipient}
                    </div>
                    <div className="text-zinc-300 mt-1 whitespace-pre-line leading-relaxed font-sans p-1 bg-zinc-950 rounded text-[10.5px]">
                      {log.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
