import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getHistoryForUser } from '../hooks/useHistory';
import type { User, History, ChatMessage } from '../types';
import { Header } from './Header';
import { UserIcon, BotIcon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';

const AdminPanel: React.FC = () => {
  const { getAllUsers } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userHistory, setUserHistory] = useState<History | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  }, [getAllUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    setIsHistoryLoading(true);
    setUserHistory(null);
    try {
      const history = await getHistoryForUser(user.email);
      setUserHistory(history);
    } catch (error) {
      console.error("Failed to fetch user history", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <Header />
      <main className="flex-grow flex p-4 md:p-6 gap-6">
        {/* User List Panel */}
        <div className="w-1/3 lg:w-1/4 bg-white rounded-lg shadow-lg p-4 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">ব্যবহারকারীগণ</h2>
          <div className="overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
            ) : (
              <ul>
                {users.map((user) => (
                  <li key={user.email}>
                    <button
                      onClick={() => handleSelectUser(user)}
                      className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                        selectedUser?.email === user.email
                          ? 'bg-green-600 text-white'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm truncate">{user.email}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* User Details and History Panel */}
        <div className="w-2/3 lg:w-3/4 bg-white rounded-lg shadow-lg p-4 flex flex-col">
          {!selectedUser ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-lg">
                ব্যবহারকারীর তথ্য দেখতে তালিকা থেকে একজনকে নির্বাচন করুন।
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
                ব্যবহারকারীর তথ্য ও চ্যাট ইতিহাস
              </h2>
              <div className="flex-grow flex flex-col overflow-y-hidden">
                {/* User Details */}
                <div className="mb-4 p-4 bg-lime-50 rounded-lg border border-lime-200 flex-shrink-0">
                    <h3 className="font-bold text-lg text-green-800">{selectedUser.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-sm mt-2">
                        <p><strong className="text-gray-600">ইমেইল:</strong> {selectedUser.email}</p>
                        <p><strong className="text-gray-600">ফোন:</strong> {selectedUser.phone}</p>
                        <p className="col-span-2"><strong className="text-gray-600">ঠিকানা:</strong> {selectedUser.address}</p>
                    </div>
                </div>

                {/* Chat History */}
                <div className="flex-grow overflow-y-auto pr-2">
                  <h3 className="font-semibold text-gray-700 mb-2">চ্যাট</h3>
                  {isHistoryLoading ? (
                     <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
                  ) : userHistory?.chat.length ? (
                     <div className="space-y-4">
                        {userHistory.chat.map((msg, index) => (
                          <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'model' && <BotIcon className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />}
                            <div className={`max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-green-100 text-gray-800 rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                            {msg.sender === 'user' && <UserIcon className="h-8 w-8 text-gray-500 flex-shrink-0 mt-1" />}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">কোনো চ্যাট ইতিহাস নেই।</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
