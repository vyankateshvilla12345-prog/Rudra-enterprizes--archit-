import React, { useState } from 'react';
import { useUsers } from '../hooks/useFirebaseData';
import { UserPlus, Search, Shield, Truck, Calculator, Mail, Phone, MoreVertical, X, Loader2, Check, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function UsersSection() {
  const { data: users, loading } = useUsers();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-gray-500 font-medium whitespace-nowrap">Manage team members, drivers, and accountants.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text"
               placeholder="Search users..."
               className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-[0.98] whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 animate-pulse h-64" />
            ))
          ) : filteredUsers.map((user) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={user.uid}
              className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center relative ${
                  user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' :
                  user.role === 'driver' ? 'bg-orange-50 text-orange-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  <User className="w-10 h-10" />
                  <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-lg border border-gray-50">
                    <RoleIcon role={user.role} className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{user.displayName}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">@{user.username || 'n/a'}</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full">
                  <RoleIcon role={user.role} className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{user.role}</span>
                </div>

                <div className="w-full pt-4 space-y-2 border-t border-gray-50 text-left">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{user.phoneNumber}</span>
                  </div>
                  {user.vehicleNumber && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <Truck className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">Vehicle: {user.vehicleNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddUserModal onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleIcon({ role, className }: { role: string, className?: string }) {
  if (role === 'admin') return <Shield className={className} />;
  if (role === 'driver') return <Truck className={className} />;
  return <Calculator className={className} />;
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'link'>('link');
  
  const [formData, setFormData] = useState({
    uid: '',
    displayName: '',
    username: '',
    password: '',
    email: '',
    phoneNumber: '',
    vehicleNumber: '',
    role: 'driver' as 'admin' | 'driver' | 'accountant'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // If 'link' mode, we can attempt it client-side if the current user is an admin
    if (mode === 'link') {
      try {
        const userRef = doc(db, 'users', formData.uid);
        await setDoc(userRef, {
          uid: formData.uid,
          email: formData.email || "",
          username: formData.username || "",
          displayName: formData.displayName || "New Staff",
          role: formData.role,
          phoneNumber: formData.phoneNumber || "",
          vehicleNumber: formData.vehicleNumber || "",
          activeDispatchId: null,
          createdAt: new Date().toISOString(),
        }, { merge: true });
        
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setFormData({
            uid: '',
            displayName: '',
            username: '',
            password: '',
            email: '',
            phoneNumber: '',
            vehicleNumber: '',
            role: 'driver'
          });
        }, 2000);
        return;
      } catch (err: any) {
        console.error("Client-side link failed, falling back to backend:", err);
      }
    }

    const endpoint = mode === 'create' ? '/api/admin/create-user' : '/api/admin/assign-role';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.includes('identitytoolkit')) {
           setError("Action Required: The Identity Toolkit API must be enabled. Please check the email sent to you or visit the Google Cloud Console to enable it.");
        } else if (data.error?.includes('firestore.googleapis.com')) {
           setError("Action Required: The Cloud Firestore API is disabled for project 'ais-asia-east1-65702fcc90494f8'. Please click the link in the guide I provided to enable it.");
        } else if (data.error?.includes('PERMISSION_DENIED')) {
           setError("Permission Denied: Backend rejected the request. Please ensure APIs are enabled in the Google Cloud Console.");
        } else {
           throw new Error(data.error || "Failed to process request");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          uid: '',
          displayName: '',
          username: '',
          password: '',
          email: '',
          phoneNumber: '',
          vehicleNumber: '',
          role: 'driver'
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-3xl font-black text-gray-900 mb-2">{mode === 'create' ? 'Register Member' : 'Link Existing User'}</h2>
        <p className="text-gray-400 font-bold text-sm mb-6">
          {mode === 'create' 
            ? 'Create a new Firebase Auth account and profile.' 
            : 'Assign a role to an existing UID from Firebase Console.'}
        </p>

        <div className="flex bg-gray-50 p-2 rounded-2xl mb-8">
           <button 
             onClick={() => setMode('link')}
             className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'link' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
           >
             Link by UID
           </button>
           <button 
             onClick={() => setMode('create')}
             className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'create' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
           >
             Full Registration
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'link' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Firebase UID (from Console)</label>
              <input 
                required
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                placeholder="Paste UID here..."
                value={formData.uid}
                onChange={e => setFormData({...formData, uid: e.target.value})}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
              <input 
                required
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                placeholder="John Doe"
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Portal Username</label>
              <input 
                required
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                placeholder="jdoe_staff"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                required
                type="email"
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            {mode === 'create' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Temporary Password</label>
                <input 
                  required
                  type="password"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            ) : (
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Role</label>
                <select 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="driver">Driver</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}
          </div>

          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone (E.164)</label>
                <input 
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                  placeholder="+11234567890"
                  value={formData.phoneNumber}
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Role</label>
                <select 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="driver">Driver</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
          )}

          {mode === 'link' && (
             <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
              <input 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                placeholder="+11234567890"
                value={formData.phoneNumber}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              />
            </div>
          )}

          {formData.role === 'driver' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle License Plate</label>
              <input 
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                placeholder="ABC-1234"
                value={formData.vehicleNumber}
                onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
              />
            </div>
          )}

          {error && <p className="text-xs font-bold text-red-500 mt-2">{error}</p>}

          <div className="pt-6">
            <button
              disabled={isSubmitting || success}
              className={`w-full py-5 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3 ${
                success ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white hover:bg-black'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 
               success ? <><Check className="w-6 h-6" /> Success!</> : 
               <>{mode === 'create' ? 'Register Member' : 'Map UID to Profile'}</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
