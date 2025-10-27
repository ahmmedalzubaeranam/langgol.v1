
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { View } from '../types';

interface HeaderProps {
  setActiveView: (view: View) => void;
}

export const Header: React.FC<HeaderProps> = ({ setActiveView }) => {
  const { logout, user, isDemoUser, demoUsage } = useAuth();

  return (
    <header className="bg-green-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold">লাঙ্গল</h1>
        </div>
        <div className="flex items-center">
          {isDemoUser ? (
            <span className="mr-4">ডেমো মোড | {5 - demoUsage.requests} টি অনুরোধ এবং {120 - demoUsage.talkTime} সেকেন্ড বাকি আছে</span>
          ) : (
            <span className="mr-4">{user?.name}</span>
          )}
          <button onClick={() => setActiveView('profile')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-2">প্রোফাইল</button>
          <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">লগ আউট</button>
        </div>
      </div>
    </header>
  );
};
