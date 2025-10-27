import { useState, useEffect, useCallback } from 'react';
import type { History } from '../types';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

const emptyHistory: History = {
  chat: [],
  live: [],
  image: [],
};

export function useHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<History>(emptyHistory);

  useEffect(() => {
    if (user) {
      api.getHistory(user.email).then(h => setHistory(h || emptyHistory));
    }
  }, [user]);

  const setHistoryCallback = useCallback((updater: React.SetStateAction<History>) => {
    if (!user) return;
    setHistory(prevHistory => {
      const newHistory = typeof updater === 'function' ? updater(prevHistory) : updater;
      api.saveHistory(user.email, newHistory);
      return newHistory;
    });
  }, [user]);

  return { history, setHistory: setHistoryCallback };
}

export const getHistoryForUser = async (email: string): Promise<History | null> => {
  return api.getHistory(email);
};
