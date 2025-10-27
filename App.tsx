import React, { useState } from "react";
import ChatView from "./components/ChatView";
import LiveView from "./components/LiveView";
import ImageView from './components/ImageView';
import Profile from './components/Profile';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import type { View } from './types';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('chat');
  const { user, demoExpired } = useAuth();

  const renderView = () => {
    switch (activeView) {
      case 'chat':
        return <ChatView />;
      case 'live':
        return <LiveView />;
      case 'image':
        return <ImageView />;
      case 'profile':
        return <Profile />;
      default:
        return <ChatView />;
    }
  };

  if (!user) {
    return <Auth demoExpired={demoExpired} />;
  }

  if (user.isAdmin) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen bg-lime-50 font-sans flex flex-col">
      <Header setActiveView={setActiveView} />
      <main className="flex-grow flex flex-col p-4 md:p-6">
        <div className="w-full max-w-4xl mx-auto flex flex-col flex-grow">
          <Tabs activeView={activeView} setActiveView={setActiveView} />
          <div className="bg-white rounded-b-lg shadow-lg flex-grow flex flex-col min-h-[60vh]">
            {renderView()}
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-green-700">
        <p>&copy; লাঙ্গল। সর্বস্বত্ব সংরক্ষিত।</p>
      </footer>
    </div>
  );
};

export default App;
