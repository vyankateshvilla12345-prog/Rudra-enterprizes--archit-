import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import StaffPortal from './pages/StaffPortal';
import { AnimatePresence, motion } from 'motion/react';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 bg-blue-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoginPage />
        </motion.div>
      ) : profile?.role === 'admin' ? (
        <motion.div
          key="admin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full"
        >
          <AdminDashboard />
        </motion.div>
      ) : (profile?.role === 'driver' || profile?.role === 'accountant') ? (
        <motion.div
          key="staff"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full"
        >
          <StaffPortal />
        </motion.div>
      ) : (
        <div className="h-screen w-screen flex items-center justify-center bg-white p-8 text-center text-gray-500 font-bold">
           Welcome! Please ask an administrator to assign you a role (Driver or Accountant).
        </div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
