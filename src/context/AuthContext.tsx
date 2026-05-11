import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Default to driver if first time login (or admin if you want to hardcode first user)
          const isAdmin = user.email === 'sangitarsalunkhe46@gmail.com';
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            username: user.email?.split('@')[0] || 'user',
            phoneNumber: '',
            displayName: user.displayName || 'Anonymous',
            role: isAdmin ? 'admin' : 'driver', // Default role
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed", error);
      throw error;
    }
  };

  const signInWithEmail = async (emailOrUsername: string, password: string) => {
    try {
      let email = emailOrUsername;
      
      // If it looks like a username (no @), try to find the email
      if (!emailOrUsername.includes('@')) {
        const q = query(collection(db, 'users'), where('username', '==', emailOrUsername));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("Username not found");
        email = snap.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Email login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
