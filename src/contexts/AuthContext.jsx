import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'admin@edugrade.com').toLowerCase();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData,    setUserData]    = useState(null);
  const [loading,     setLoading]     = useState(true);

  /* ── Register ─────────────────────────────────────────────────── */
  async function register(email, password, name) {
    const result  = await createUserWithEmailAndPassword(auth, email, password);
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
    await setDoc(doc(db, 'users', result.user.uid), {
      name,
      email: email.toLowerCase(),
      role:    isAdmin ? 'admin' : 'teacher',
      blocked: false,
      createdAt: serverTimestamp(),
    });
    return result;
  }

  /* ── Login ─────────────────────────────────────────────────────── */
  async function login(email, password) {
    const result  = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (userDoc.exists() && userDoc.data().blocked) {
      await signOut(auth);
      throw new Error('Your account has been blocked. Please contact admin.');
    }
    return result;
  }

  /* ── Logout ────────────────────────────────────────────────────── */
  function logout() { return signOut(auth); }

  /* ── Auth state listener ───────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setUserData(snap.exists() ? snap.data() : null);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin   = userData?.role    === 'admin';
  const isBlocked = userData?.blocked === true;

  return (
    <AuthContext.Provider value={{ currentUser, userData, isAdmin, isBlocked, register, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
