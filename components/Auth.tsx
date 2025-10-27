import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface AuthProps {
  demoExpired?: boolean;
}

const Auth: React.FC<AuthProps> = ({ demoExpired }) => {
  const [view, setView] = useState<'login' | 'signup' | 'verify' | 'forgotPassword' | 'resetPassword'>('login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (demoExpired) {
      setView('signup');
      setMessage('আপনার ডেমো ব্যবহারের সীমা শেষ। অনুগ্রহ করে সাইন আপ করুন।');
    }
  }, [demoExpired]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [emailForFlow, setEmailForFlow] = useState('');
  const [questionForFlow, setQuestionForFlow] = useState('');

  const { login, signup, verifyAccount, requestPasswordReset, completePasswordReset, isLoading, loginAsDemo } = useAuth();

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email || !password) {
      setError('অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড দিন।');
      return;
    }
    const result = await login(email, password);
    if (!result.success) {
      if (result.reason === 'unverified') {
        setEmailForFlow(email);
        setView('verify');
        setMessage('আপনার একাউন্ট যাচাই করা হয়নি। অনুগ্রহ করে আপনার ইমেইলে পাঠানো কোডটি দিন।');
      } else {
        setError('ভুল ইমেইল অথবা পাসওয়ার্ড।');
      }
    }
  };

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email || !password || !name || !phone || !address || !securityQuestion || !securityAnswer) {
      setError('অনুগ্রহ করে সকল ঘর পূরণ করুন।');
      return;
    }
    const result = await signup({ email, password, name, phone, address, securityQuestion, securityAnswer });
    if (result.success) {
      setEmailForFlow(email);
      setView('verify');
      setMessage('নিবন্ধন সফল হয়েছে! আপনার একাউন্ট যাচাই করতে অনুগ্রহ করে আপনার ইমেইল চেক করুন।');
    } else {
      setError(result.error === 'User already exists' ? 'এই ইমেইল দিয়ে ஏற்கனவே একাউন্ট আছে।' : 'নিবন্ধন করা সম্ভব হয়নি。');
    }
  };
  
  const handleVerificationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!verificationCode) {
      setError('অনুগ্রহ করে যাচাইকরণ কোড দিন।');
      return;
    }
    const success = await verifyAccount(emailForFlow, verificationCode);
    if (success) {
      setMessage('যাচাই সফল হয়েছে! অনুগ্রহ করে লগ ইন করুন।');
      setView('login');
      setEmail(emailForFlow); // Pre-fill email
      setPassword('');
    } else {
      setError('ভুল যাচাইকরণ কোড।');
    }
  }

  const handleForgotPassSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const result = await requestPasswordReset(email);
    if (result) {
        setEmailForFlow(email);
        setQuestionForFlow(result.question);
        setView('resetPassword');
    } else {
        setError('এই ইমেইল দিয়ে কোনো একাউন্ট খুঁজে পাওয়া যায়নি।');
    }
  }

  const handleResetPassSubmit = async (e: FormEvent) => {
      e.preventDefault();
      setError('');
      setMessage('');
      if (!securityAnswer || !password) {
          setError('অনুগ্রহ করে সকল ঘর পূরণ করুন।');
          return;
      }
      const success = await completePasswordReset(emailForFlow, securityAnswer, password);
      if (success) {
          setMessage('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। অনুগ্রহ করে লগ ইন করুন।');
          setView('login');
          setEmail(emailForFlow);
          setPassword('');
      } else {
          setError('ভুল উত্তর। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
  }

  const resetFormState = () => {
    setEmail(''); setPassword(''); setName(''); setPhone(''); setAddress('');
    setSecurityQuestion(''); setSecurityAnswer(''); setVerificationCode('');
    setError(''); setMessage('');
  }
  
  const AuthButton = ({ text }: { text: string }) => (
     <button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:bg-gray-400">
        {isLoading ? <LoadingSpinner/> : text}
    </button>
  );

  const renderContent = () => {
    switch (view) {
      case 'signup':
        return (
          <>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">একাউন্ট বানান</h2>
            <form onSubmit={handleSignupSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="পুরো নাম" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading} />
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="ফোন নম্বর" type="tel" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading} />
                </div>
                 <div className="mb-4">
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="ঠিকানা" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                </div>
                <hr className="my-4"/>
                <div className="mb-4">
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ইমেইল" type="email" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                </div>
                <div className="mb-4">
                    <input value={password} onChange={e => setPassword(e.target.value)} placeholder="পাসওয়ার্ড" type="password" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                </div>
                 <hr className="my-4"/>
                <div className="mb-4">
                    <input value={securityQuestion} onChange={e => setSecurityQuestion(e.target.value)} placeholder="একটি নিরাপত্তা প্রশ্ন লিখুন (যেমন: আপনার প্রিয় ফসলের নাম?)" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                </div>
                <div className="mb-6">
                    <input value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} placeholder="নিরাপত্তা প্রশ্নের উত্তর" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                </div>
                <AuthButton text="সাইন আপ" />
            </form>
            <p className="text-center text-sm text-gray-600 mt-6">
                ইতিমধ্যে একাউন্ট আছে?
                <button onClick={() => { setView('login'); resetFormState(); }} className="font-bold text-green-600 hover:text-green-800 ml-2" disabled={isLoading}>লগ ইন করুন</button>
            </p>
          </>
        );
      case 'verify':
        return (
             <>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">একাউন্ট যাচাই করুন</h2>
                <form onSubmit={handleVerificationSubmit} noValidate>
                    <p className="text-center text-sm text-gray-600 mb-4">
                        আপনার ইমেইল <strong className="text-gray-800">{emailForFlow}</strong>-এ পাঠানো যাচাইকরণ কোডটি দিন।
                    </p>
                    <div className="mb-6">
                        <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="যাচাইকরণ কোড" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                    </div>
                    <AuthButton text="যাচাই করুন" />
                </form>
                 <p className="text-center text-sm text-gray-600 mt-6">
                    <button onClick={() => { setView('login'); resetFormState(); }} className="font-bold text-green-600 hover:text-green-800" disabled={isLoading}>লগ ইন পেজে ফিরে যান</button>
                </p>
            </>
        );
       case 'forgotPassword':
        return (
             <>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">পাসওয়ার্ড পুনরুদ্ধার</h2>
                <form onSubmit={handleForgotPassSubmit} noValidate>
                    <p className="text-center text-sm text-gray-600 mb-4">আপনার একাউন্টের ইমেইল দিন।</p>
                    <div className="mb-6">
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ইমেইল" type="email" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                    </div>
                    <AuthButton text="চালিয়ে যান" />
                </form>
                 <p className="text-center text-sm text-gray-600 mt-6">
                    <button onClick={() => { setView('login'); resetFormState(); }} className="font-bold text-green-600 hover:text-green-800" disabled={isLoading}>লগ ইন পেজে ফিরে যান</button>
                </p>
            </>
        );
    case 'resetPassword':
        return (
            <>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">পাসওয়ার্ড রিসেট করুন</h2>
                <form onSubmit={handleResetPassSubmit} noValidate>
                    <div className="mb-4 p-3 bg-lime-100 border border-lime-200 rounded-lg">
                        <p className="text-sm text-gray-600">আপনার নিরাপত্তা প্রশ্ন:</p>
                        <p className="font-semibold text-gray-800">{questionForFlow}</p>
                    </div>
                    <div className="mb-4">
                        <input value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="নিরাপত্তা প্রশ্নের উত্তর" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                    </div>
                     <div className="mb-6">
                        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="নতুন পাসওয়ার্ড" type="password" className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
                    </div>
                    <AuthButton text="পাসওয়ার্ড রিসেট করুন" />
                </form>
            </>
        );
      case 'login':
      default:
        return (
          <>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">লগ ইন করুন</h2>
            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="mb-4">
                <input id="email" type="email" value={email} placeholder="ইমেইল" onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
              </div>
              <div className="mb-2">
                <input id="password" type="password" value={password} placeholder="পাসওয়ার্ড" onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading}/>
              </div>
              <div className="text-right mb-4">
                  <button onClick={() => { setView('forgotPassword'); resetFormState(); }} type="button" className="text-sm font-bold text-green-600 hover:text-green-800" disabled={isLoading}>পাসওয়ার্ড ভুলে গেছেন?</button>
              </div>
              <AuthButton text="লগ ইন"/>
            </form>
            <p className="text-center text-sm text-gray-600 mt-6">
              একাউন্ট নেই?
              <button onClick={() => { setView('signup'); resetFormState(); }} className="font-bold text-green-600 hover:text-green-800 ml-2" disabled={isLoading}>সাইন আপ করুন</button>
              <span className="mx-2">|</span>
              <button onClick={() => loginAsDemo()} className="font-bold text-blue-600 hover:text-blue-800" disabled={isLoading}>ডেমো চেষ্টা করুন</button>
            </p>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-lime-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-4xl font-bold text-green-800">লাঙ্গল</h1>
          <p className="text-gray-600 mt-1">আপনার ডিজিটাল কৃষি সহায়ক</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-lg">
           {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative text-sm text-center mb-4" role="alert">{error}</p>}
           {message && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative text-sm text-center mb-4" role="alert">{message}</p>}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
