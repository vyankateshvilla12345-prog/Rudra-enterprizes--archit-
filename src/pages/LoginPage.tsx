import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Cylinder, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signInWithEmail } = useAuth();
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(formData.identifier, formData.password);
    } catch (err: any) {
      console.error("Login component error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Action Required: Email/Password login is not enabled in your Firebase Console. Go to Authentication > Sign-in method and enable 'Email/Password'.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email format.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        setError("Invalid identifier or password. If you haven't linked this ID to a role yet, the Admin must do it from 'User Management'.");
      } else {
        setError(err.message || "Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        // Silently handle or show minimal message
        console.log("Sign-in cancelled by user");
      } else {
        setError(err.message || "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl mb-6 shadow-xl shadow-blue-200"
          >
            <Cylinder className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">CylinTrack Pro</h1>
          <p className="text-gray-500 font-bold">Smart Logistics & Tracking</p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100"
        >
          {isEmailLogin ? (
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username or Email</label>
                <input 
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                  placeholder="admin_123"
                  value={formData.identifier}
                  onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  required
                  type="password"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-100"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              {error && <p className="text-xs font-bold text-red-500 ml-1">{error}</p>}
              <button
                disabled={loading}
                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Sign In"}
              </button>
              <button 
                type="button"
                onClick={() => setIsEmailLogin(false)}
                className="w-full text-gray-400 font-bold text-xs hover:text-gray-900"
              >
                Back to social login
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-100 text-gray-900 py-5 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Continue with Google
              </button>
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <button
                onClick={() => setIsEmailLogin(true)}
                className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl active:scale-[0.98]"
              >
                <LogIn className="w-5 h-5" />
                Login with ID
              </button>
            </div>
          )}
        </motion.div>

        <p className="mt-8 text-center text-xs font-bold text-gray-400">
           Protected and secure session for authorized personnel only.
        </p>
      </div>
    </div>
  );
}
