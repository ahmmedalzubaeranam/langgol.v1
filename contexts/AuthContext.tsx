import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import * as api from '../services/api';

// --- Cookie Helpers ---
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name: string) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name: string) {   
    document.cookie = name+'=; Max-Age=-99999999;';  
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isDemoUser: boolean;
  demoUsage: { requests: number; talkTime: number };
  demoExpired: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; reason?: 'unverified' | 'credentials'; user?: User }>;
  signup: (details: Omit<User, 'isVerified' | 'isAdmin' | 'password'> & {password: string}) => Promise<{ success: boolean, error?: string }>;
  logout: () => void;
  verifyAccount: (email: string, code: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ question: string } | null>;
  completePasswordReset: (email: string, answer: string, newPass: string) => Promise<boolean>;
  getAllUsers: () => Promise<User[]>;
  loginAsDemo: () => void;
  updateDemoUsage: (requests: number, talkTime: number) => void;
  updateUser: (email: string, data: { name: string, phone: string, address: string }) => Promise<{ success: boolean, user?: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'langgol-currentUser';
const DEMO_USER_COOKIE = 'langgol-demoUser';

const DEMO_LIMITS = { requests: 5, talkTime: 120 }; // 2 minutes

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [demoUsage, setDemoUsage] = useState({ requests: 0, talkTime: 0 });
  const [demoExpired, setDemoExpired] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsDemoUser(false);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDemoUser) {
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          updateDemoUsage(0, 1);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDemoUser]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(email, pass);
      if (result.success && result.user) {
        setUser(result.user);
        setIsDemoUser(false);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
        eraseCookie(DEMO_USER_COOKIE);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = () => {
    const storedDemoUser = getCookie(DEMO_USER_COOKIE);
    if (storedDemoUser) {
      const demoData = JSON.parse(storedDemoUser);
      if (demoData.requests >= DEMO_LIMITS.requests || demoData.talkTime >= DEMO_LIMITS.talkTime) {
        setDemoExpired(true);
        return;
      }
    }

    const demoData = { requests: 0, talkTime: 0 };
    setCookie(DEMO_USER_COOKIE, JSON.stringify(demoData), 30);
    setUser({ name: 'Demo User', isDemo: true } as User);
    setIsDemoUser(true);
    setDemoUsage(demoData);
    setDemoExpired(false);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const updateDemoUsage = (requests: number, talkTime: number) => {
    const storedDemoUser = getCookie(DEMO_USER_COOKIE);
    if (storedDemoUser) {
      const demoData = JSON.parse(storedDemoUser);
      demoData.requests += requests;
      demoData.talkTime += talkTime;
      setCookie(DEMO_USER_COOKIE, JSON.stringify(demoData), 30);
      setDemoUsage(demoData);

      if (demoData.requests >= DEMO_LIMITS.requests || demoData.talkTime >= DEMO_LIMITS.talkTime) {
        setDemoExpired(true);
        setUser(null); // Log out the demo user
        setIsDemoUser(false);
      }
    }
  };

  const signup = async (details: Omit<User, 'isVerified' | 'isAdmin'>) => {
    setIsLoading(true);
    try {
      return await api.signup(details);
    } finally {
      setIsLoading(false);
    }
  };
  
  const verifyAccount = async (email: string, code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      return await api.verifyAccount(email, code);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    setIsLoading(true);
    try {
       return await api.requestPasswordReset(email);
    } finally {
        setIsLoading(false);
    }
  }

  const completePasswordReset = async (email: string, answer: string, newPass: string) => {
    setIsLoading(true);
    try {
      return await api.completePasswordReset(email, answer, newPass);
    } finally {
      setIsLoading(false);
    }
  }

  const logout = () => {
    setUser(null);
    setIsDemoUser(false);
    localStorage.removeItem(CURRENT_USER_KEY);
    eraseCookie(DEMO_USER_COOKIE);
  };
  
  const getAllUsers = async (): Promise<User[]> => {
    return api.getAllUsers();
  };

  const updateUser = async (email: string, data: { name: string, phone: string, address: string }) => {
    setIsLoading(true);
    try {
      const result = await api.updateUser(email, data);
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const value = { user, isLoading, isDemoUser, demoUsage, demoExpired, login, signup, logout, verifyAccount, requestPasswordReset, completePasswordReset, getAllUsers, loginAsDemo, updateDemoUsage, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
