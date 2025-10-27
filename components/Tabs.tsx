
import React from 'react';
import type { View } from '../types';
import { ChatIcon, ImageIcon, MicIcon } from './Icon';

interface TabsProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeView, setActiveView }) => {
  const tabs: { id: View; label: string; icon: React.ElementType }[] = [
    { id: 'chat', label: 'চ্যাট', icon: ChatIcon },
    { id: 'live', label: 'কথা বলুন', icon: MicIcon },
    { id: 'image', label: 'ছবি দেখুন', icon: ImageIcon },
  ];

  return (
    <div className="flex bg-green-600 rounded-t-lg shadow-md">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveView(tab.id)}
          className={`flex-1 py-3 px-2 text-center text-sm md:text-base font-semibold flex items-center justify-center transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-700 focus:ring-lime-300 ${
            activeView === tab.id
              ? 'bg-white text-green-700 rounded-tl-lg rounded-tr-lg'
              : 'text-white hover:bg-green-700'
          }`}
        >
          <tab.icon className="h-5 w-5 mr-2" />
          {tab.label}
        </button>
      ))}
    </div>
  );
};
