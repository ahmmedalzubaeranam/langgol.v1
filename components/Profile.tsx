import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

const Profile: React.FC = () => {
  const { user, isLoading, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const result = await updateUser(user.email, { name, phone, address });
    if (result.success) {
      setMessage('Information updated successfully!');
    } else {
      setMessage('Failed to update information.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">প্রোফাইল</h2>
      {message && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative text-sm text-center mb-4" role="alert">{message}</p>}
      <form onSubmit={handleUpdate}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">ইমেইল</label>
          <input id="email" type="email" value={user.email} className="w-full px-3 py-2 border rounded-lg bg-gray-200 text-gray-900" disabled />
        </div>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">পুরো নাম</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">ফোন নম্বর</label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="mb-6">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">ঠিকানা</label>
          <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:bg-gray-400">
          {isLoading ? <LoadingSpinner /> : 'আপডেট করুন'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
