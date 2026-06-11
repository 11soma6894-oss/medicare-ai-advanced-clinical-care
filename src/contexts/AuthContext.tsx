/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signInWithGoogle, signUpWithEmail, loginWithEmail, resetPassword, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';

interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: string;
  activePlan?: string | null;
  websiteName?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  loginGoogle: () => Promise<void>;
  registerEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: (presetRole?: 'patient' | 'admin') => Promise<void>;
  updateWebsiteName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Instantaneous Demo Cached Session Login Check
    const cachedDemo = localStorage.getItem('medicare_demo_user');
    if (cachedDemo) {
      try {
        const parsed = JSON.parse(cachedDemo);
        if (parsed && parsed.uid) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('medicare_demo_user');
      }
    }

    // Safety Loading Fallback Timeout to make sure the app never hangs
    const timeoutId = setTimeout(() => {
      console.warn("Auth initialization fallback timeout reached: showing standard view.");
      setLoading(false);
    }, 2500);

    // Process any OAuth Redirect result upon returning
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const u = result.user;
          const userRef = doc(db, 'users', u.uid);
          const isSystemAdmin = u.email === '11neetusharma6894@gmail.com';
          await setDoc(userRef, {
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            lastLogin: serverTimestamp(),
            role: isSystemAdmin ? 'admin' : 'patient',
            websiteName: 'Medicare AI'
          }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`));
        }
      })
      .catch((err) => {
        console.error("Redirect auth error:", err);
        handleAuthError(err);
      });

    const handleUserChange = async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(timeoutId);
      if (firebaseUser) {
        const cacheKey = 'medicare_user_profile_' + firebaseUser.uid;
        const cachedProfileStr = localStorage.getItem(cacheKey);

        if (cachedProfileStr) {
          try {
            const cached = JSON.parse(cachedProfileStr);
            if (cached && cached.uid === firebaseUser.uid) {
              const localPlan = localStorage.getItem('medicare_active_plan_' + firebaseUser.uid);
              setUser({
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || cached.displayName,
                email: firebaseUser.email || cached.email,
                photoURL: firebaseUser.photoURL || cached.photoURL,
                role: cached.role || 'patient',
                activePlan: localPlan || cached.activePlan || null,
                websiteName: cached.websiteName || 'Medicare AI'
              });
              setLoading(false);

              // Background refresh
              getDoc(doc(db, 'users', firebaseUser.uid))
                .then((userDoc) => {
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const role = userData.role || (firebaseUser.email === '11neetusharma6894@gmail.com' ? 'admin' : 'patient');
                    const activePlan = localStorage.getItem('medicare_active_plan_' + firebaseUser.uid) || userData.activePlan || null;

                    const freshProfile = {
                      uid: firebaseUser.uid,
                      displayName: firebaseUser.displayName || userData.displayName,
                      email: firebaseUser.email,
                      photoURL: firebaseUser.photoURL || userData.photoURL,
                      role,
                      activePlan,
                      websiteName: userData.websiteName || 'Medicare AI'
                    };
                    setUser(freshProfile);
                    localStorage.setItem(cacheKey, JSON.stringify(freshProfile));
                  }
                })
                .catch((e) => {
                  console.warn("Background profile fetch skipped/failed:", e);
                });
              return;
            }
          } catch (e) {
            localStorage.removeItem(cacheKey);
          }
        }

        let role = 'patient';
        let activePlan = null;
        let dbWebsiteName = 'Medicare AI';
        try {
          // Check local storage first for billing without Google Cloud
          const localPlan = localStorage.getItem('medicare_active_plan_' + firebaseUser.uid);
          if (localPlan) {
            activePlan = localPlan;
          }

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            role = userData.role || (firebaseUser.email === '11neetusharma6894@gmail.com' ? 'admin' : 'patient');
            if (!activePlan) {
              activePlan = userData.activePlan || null;
            }
            dbWebsiteName = userData.websiteName || 'Medicare AI';
          } else {
            // Profile doesn't exist yet, determine role from email
            role = firebaseUser.email === '11neetusharma6894@gmail.com' ? 'admin' : 'patient';
          }
        } catch (e) {
          console.warn("Could not fetch user profile from Firestore:", e);
          role = firebaseUser.email === '11neetusharma6894@gmail.com' ? 'admin' : 'patient';
        }

        // Final fallback to localStorage in case Firestore calls failed
        if (!activePlan) {
          activePlan = localStorage.getItem('medicare_active_plan_' + firebaseUser.uid) || null;
        }

        const fullProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          role,
          activePlan,
          websiteName: dbWebsiteName
        };

        setUser(fullProfile);
        localStorage.setItem(cacheKey, JSON.stringify(fullProfile));
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, handleUserChange);
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const isAdmin = user?.role === 'admin' || user?.email === '11neetusharma6894@gmail.com';

  const handleAuthError = (err: any) => {
    if (err.code === 'auth/popup-closed-by-user') {
      // User closed the popup, don't log as error or show global bar
      console.log("Auth: Popup closed by user");
      setLoading(false);
      return;
    }

    console.error("Auth error:", err);
    if (err.code === 'auth/popup-blocked') {
      setError("Pop-up Blocked: Your browser or the sandboxed preview iframe blocked the sign-in popup. To sign in easily: Click 'Open App' in a new tab at the top-right of your screen, or use the 'Guest Patient' / 'Doctor Admin' demo buttons below for instant access.");
    } else if (err.code === 'auth/unauthorized-domain') {
      setError(`Unauthorized Domain: Please add "${window.location.hostname}" to your Firebase Console > Authentication > Settings > Authorized domains.`);
    } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      setError("Authentication failed: Invalid credentials. This could be a wrong password, or your Firebase project needs the 'Identity Toolkit API' enabled in Google Cloud Console.");
    } else if (err.code === 'auth/operation-not-allowed') {
      setError("Operation Not Allowed: Please enable the sign-in provider (Google/Email) in your Firebase Console.");
    } else if (err.code === 'auth/network-request-failed') {
      setError("Network Request Failed: This usually happens when an ad-blocker, VPN, or firewall blocks the connection to Firebase Auth. Please try disabling these or check if you're behind a restricted network.");
    } else {
      setError(err.message || "An unexpected authentication error occurred.");
    }
    setTimeout(() => setError(null), 10000); // Clear after 10s
    setLoading(false);
  };

  const loginDemo = async (presetRole: 'patient' | 'admin' = 'patient') => {
    setLoading(true);
    try {
      const demoUser = {
        uid: 'demo-user-id-' + (presetRole === 'admin' ? 'admin-system' : 'patient-guest'),
        displayName: presetRole === 'admin' ? 'Dr. Sarah (Admin Demo)' : 'Guest Patient',
        email: presetRole === 'admin' ? '11neetusharma6894@gmail.com' : 'guest@medicare.ai',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150',
        role: presetRole,
        activePlan: presetRole === 'admin' ? 'Business' : 'Pro',
        websiteName: 'Medicare AI'
      };
      setUser(demoUser);
      localStorage.setItem('medicare_demo_user', JSON.stringify(demoUser));
    } catch (e) {
      console.error("Demo login failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    try {
      const userResult = await signInWithGoogle();
      if (!userResult) return; // Page redirected, return early
      const isSystemAdmin = userResult.email === '11neetusharma6894@gmail.com';
      const role = isSystemAdmin ? 'admin' : 'patient';
      const activePlan = localStorage.getItem('medicare_active_plan_' + userResult.uid) || null;

      const profile = {
        uid: userResult.uid,
        displayName: userResult.displayName,
        email: userResult.email,
        photoURL: userResult.photoURL,
        role,
        activePlan,
        websiteName: 'Medicare AI'
      };

      // Optimistic instant state and cache updates
      setUser(profile);
      localStorage.setItem('medicare_user_profile_' + userResult.uid, JSON.stringify(profile));

      // Async Firestore store background update
      const userRef = doc(db, 'users', userResult.uid);
      setDoc(userRef, {
        uid: userResult.uid,
        displayName: userResult.displayName,
        email: userResult.email,
        photoURL: userResult.photoURL,
        lastLogin: serverTimestamp(),
        role,
        websiteName: 'Medicare AI'
      }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${userResult.uid}`));
    } catch (err) {
      handleAuthError(err);
    }
  };

  const registerEmail = async (email: string, pass: string, name: string) => {
    try {
      const userResult = await signUpWithEmail(email, pass, name);
      const isSystemAdmin = email === '11neetusharma6894@gmail.com';
      const role = isSystemAdmin ? 'admin' : 'patient';
      const activePlan = null;

      const profile = {
        uid: userResult.uid,
        displayName: name,
        email: email,
        photoURL: null,
        role,
        activePlan,
        websiteName: 'Medicare AI'
      };

      // Optimistic instant state and cache updates
      setUser(profile);
      localStorage.setItem('medicare_user_profile_' + userResult.uid, JSON.stringify(profile));

      // Async/background build profile document
      const userRef = doc(db, 'users', userResult.uid);
      setDoc(userRef, {
        uid: userResult.uid,
        displayName: name,
        email: email,
        photoURL: null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role,
        websiteName: 'Medicare AI'
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${userResult.uid}`));
    } catch (err) {
      handleAuthError(err);
    }
  };

  const loginEmail = async (email: string, pass: string) => {
    try {
      const userResult = await loginWithEmail(email, pass);
      const isSystemAdmin = email === '11neetusharma6894@gmail.com';
      const role = isSystemAdmin ? 'admin' : 'patient';
      const activePlan = localStorage.getItem('medicare_active_plan_' + userResult.uid) || null;

      const profile = {
        uid: userResult.uid,
        displayName: userResult.displayName || email.split('@')[0],
        email: userResult.email,
        photoURL: userResult.photoURL,
        role,
        activePlan,
        websiteName: 'Medicare AI'
      };

      // Optimistic instant state and cache updates
      setUser(profile);
      localStorage.setItem('medicare_user_profile_' + userResult.uid, JSON.stringify(profile));

      // Background registration of lastLogin
      const userRef = doc(db, 'users', userResult.uid);
      updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        websiteName: 'Medicare AI'
      }).catch(async (e) => {
        if (e.code === 'not-found') {
          await setDoc(userRef, {
            uid: userResult.uid,
            displayName: userResult.displayName || email.split('@')[0],
            email: userResult.email,
            photoURL: userResult.photoURL,
            lastLogin: serverTimestamp(),
            role,
            websiteName: 'Medicare AI'
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${userResult.uid}`));
        } else {
          handleFirestoreError(e, OperationType.UPDATE, `users/${userResult.uid}`);
        }
      });
    } catch (err) {
      handleAuthError(err);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await resetPassword(email);
    } catch (err) {
      console.error("Reset password failed", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const currentUid = user?.uid;
      setUser(null); // Instantly set state to null to initiate immediate visual change
      localStorage.removeItem('medicare_demo_user');
      if (currentUid) {
        localStorage.removeItem('medicare_user_profile_' + currentUid);
      }
      await signOut(auth);
    } catch (err) {
      console.warn("Google signOut connection error or issue:", err);
    } finally {
      setUser(null);
    }
  };

  const updateWebsiteName = (name: string) => {
    if (user) {
      const updated = { ...user, websiteName: name };
      setUser(updated);
      localStorage.setItem('medicare_user_profile_' + user.uid, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, isAdmin, loginGoogle, registerEmail, loginEmail, forgotPassword, logout, loginDemo, updateWebsiteName }}>
      {error && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 text-center font-bold shadow-lg animate-in slide-in-from-top duration-300">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm md:text-base">{error}</p>
            <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      )}
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
