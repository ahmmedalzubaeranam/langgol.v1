import type { User, History } from '../types';

const API_URL = 'https://astroveritas-backend.onrender.com';

// --- API Functions ---

export const login = async (email: string, pass: string) => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass }),
    });
    return response.json();
};

export const signup = async (details: Omit<User, 'isVerified' | 'isAdmin'>) => {
    const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
    });
    return response.json();
};

export const verifyAccount = async (email: string, code: string): Promise<boolean> => {
    const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });
    const result = await response.json();
    return result.success;
};

export const requestPasswordReset = async (email: string) => {
    const response = await fetch(`${API_URL}/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (response.ok) {
        return response.json();
    }
    return null;
}

export const completePasswordReset = async (email: string, answer: string, newPass: string) => {
    const response = await fetch(`${API_URL}/complete-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answer, newPass }),
    });
    const result = await response.json();
    return result.success;
}

export const getAllUsers = async (): Promise<User[]> => {
    const response = await fetch(`${API_URL}/users`);
    return response.json();
};

export const updateUser = async (email: string, data: { name: string, phone: string, address: string }) => {
    const response = await fetch(`${API_URL}/users/${email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return response.json();
};

export const getHistory = async (email: string): Promise<History | null> => {
    const response = await fetch(`${API_URL}/history/${email}`);
    return response.json();
};

export const saveHistory = async (email: string, history: History) => {
    const response = await fetch(`${API_URL}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, history }),
    });
    return response.json();
};

export const initializeAdminUser = () => {
  // This is now handled by the backend
};