/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/HomePage';
import { ConsultationPage } from './pages/ConsultationPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { HistoryPage } from './pages/HistoryPage';
import { PricingPage } from './pages/PricingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

function AppContent() {
  const { user, loading, loginGoogle, logout } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-brand-blue">
      <motion.div 
        animate={{ scale: [1, 1.1, 1] }} 
        transition={{ repeat: Infinity, duration: 2 }}
        className="bg-primary-blue p-4 rounded-3xl shadow-2xl shadow-blue-200 mb-6"
      >
        <Activity className="w-12 h-12 text-white" />
      </motion.div>
      <div className="text-2xl font-black italic tracking-tighter uppercase">Medicare AI</div>
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mt-2">Initializing medicare...</div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!user ? <LandingPage onLogin={loginGoogle} /> : <Navigate to="/home" />} />
        
        <Route element={<Layout user={user} onLogout={logout} />}>
          <Route path="/home" element={user ? <HomePage /> : <Navigate to="/" />} />
          <Route path="/consult" element={user ? <ConsultationPage /> : <Navigate to="/" />} />
          <Route path="/communication/:doctorId" element={user ? <CommunicationPage /> : <Navigate to="/" />} />
          <Route path="/history" element={user ? <HistoryPage /> : <Navigate to="/" />} />
          <Route path="/pricing" element={user ? <PricingPage /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/" />} />
          <Route path="/admin" element={user ? <AdminPage /> : <Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
