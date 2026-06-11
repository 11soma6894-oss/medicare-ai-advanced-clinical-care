/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { User as UserIcon, Mail, Phone, Calendar, Heart, Activity, FileText, Settings, Shield, Plus, ArrowRight, Loader2, Save, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export function ProfilePage() {
  const { user: authUser, updateWebsiteName } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable Profile Form States
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBloodType, setEditBloodType] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editWebsiteName, setEditWebsiteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      if (!authUser) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid)).catch(e => {
          handleFirestoreError(e, OperationType.GET, `users/${authUser.uid}`);
          throw e;
        });
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          // Fallback if document doesn't exist yet but user is authenticated
          setProfile({
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL,
            uid: authUser.uid
          });
        }
      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfileData();
  }, [authUser]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || authUser?.displayName || '');
      setEditPhone(profile.phone || '');
      setEditBloodType(profile.bloodType || '');
      setEditWeight(profile.weight || '');
      setEditHeight(profile.height || '');
      setEditWebsiteName(profile.websiteName || authUser?.websiteName || 'Medicare AI');
    }
  }, [profile, authUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateDoc(doc(db, 'users', authUser.uid), {
        displayName: editName,
        phone: editPhone,
        bloodType: editBloodType,
        weight: editWeight,
        height: editHeight,
        websiteName: editWebsiteName,
      }).catch(e => {
        handleFirestoreError(e, OperationType.UPDATE, `users/${authUser.uid}`);
        throw e;
      });

      // Update local profile state immediately
      setProfile((prev: any) => ({
        ...prev,
        displayName: editName,
        phone: editPhone,
        bloodType: editBloodType,
        weight: editWeight,
        height: editHeight,
        websiteName: editWebsiteName,
      }));

      // Sync demo user in localStorage
      const cachedDemo = localStorage.getItem('medicare_demo_user');
      if (cachedDemo) {
        try {
          const parsed = JSON.parse(cachedDemo);
          parsed.displayName = editName;
          parsed.phone = editPhone;
          localStorage.setItem('medicare_demo_user', JSON.stringify(parsed));
        } catch (err) {
          console.warn("Storage sync skipped: ", err);
        }
      }

      updateWebsiteName(editWebsiteName);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile information:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authUser) return;

    try {
      setUploading(true);
      // In a real app, we would upload to Firebase Storage
      // Since storage isn't explicitly configured in the provided snippet beyond apiKey,
      // and we want "store users data", we'll simulate the storage part but update the URL in Firestore.
      // For this demo/task, we'll use a placeholder URL and update the document.
      
      const mockURL = URL.createObjectURL(file); // This is just for local preview in this demo
      // In production: const photoURL = await uploadToStorage(file);
      
      await updateDoc(doc(db, 'users', authUser.uid), {
        photoURL: mockURL
      }).catch(e => {
        handleFirestoreError(e, OperationType.UPDATE, `users/${authUser.uid}`);
        throw e;
      });
      
      setProfile((prev: any) => ({ ...prev, photoURL: mockURL }));
      alert('Profile photo updated (Preview only)');
    } catch (error) {
      console.error("Error updating profile photo:", error);
      alert('Failed to update photo. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  if (!authUser) return (
    <div className="flex flex-col items-center justify-center py-24 glass-panel rounded-[3rem] gap-6">
      <div className="p-6 bg-blue-50 rounded-full">
        <UserIcon className="w-12 h-12 text-primary-blue animate-pulse" />
      </div>
      <div className="text-center">
        <h3 className="text-2xl font-black uppercase tracking-tighter italic">Authentication Required</h3>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Please sign in to view your profile</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <div className="glass-panel p-10 rounded-[3rem] animate-pulse h-64 bg-white/20" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] p-12 h-96 animate-pulse" />
        <div className="bg-slate-900 rounded-[3rem] p-12 h-96 animate-pulse" />
      </div>
    </div>
  );

  const userData = {
    name: profile?.displayName || authUser.displayName || 'No Name Set',
    email: profile?.email || authUser.email || 'no-email@provided.com',
    photoURL: profile?.photoURL || authUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    phone: profile?.phone || 'Not provided',
    memberSince: profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'N/A',
    bloodType: profile?.bloodType || 'Not set',
    weight: profile?.weight || 'Not set',
    height: profile?.height || 'Not set',
    websiteName: profile?.websiteName || authUser.websiteName || 'Medicare AI',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* Profile Header / Identity */}
      <section className="glass-panel p-6 md:p-10 rounded-[2rem] shadow-xl shadow-blue-100/40 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[300px] md:w-[450px] h-[300px] md:h-[450px] bg-primary-blue/5 blur-[80px] md:blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10">
          <div className="relative">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-blue-100 overflow-hidden shadow-md border-4 border-white transition-transform group-hover:scale-105 duration-500 relative">
              <img 
                src={userData.photoURL} 
                className={cn("w-full h-full object-cover", uploading && "opacity-50 grayscale")} 
                alt="Avatar"
                referrerPolicy="no-referrer"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/30">
                  <Loader2 className="w-6 h-6 text-primary-blue animate-spin" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 bg-primary-blue text-white p-2 rounded-xl shadow-md hover:scale-110 transition-transform disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-grow text-center md:text-left space-y-3">
            <div>
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase mb-1.5 italic leading-none">{userData.name}</h2>
              <p className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 font-bold uppercase tracking-widest text-[9px] px-3 py-1 rounded-full shadow-sm">
                <Shield className="w-3 h-3 text-amber-500 animate-pulse" />
                {profile?.activePlan || authUser?.activePlan ? `${profile?.activePlan || authUser?.activePlan} Membership` : 'Free Tier'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-gray-500 font-bold text-[9px] uppercase tracking-widest">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                <Mail className="w-3 h-3 text-primary-blue/70" />
                <span>{userData.email}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                <Phone className="w-3 h-3 text-primary-blue/70" />
                <span>{userData.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                <Calendar className="w-3 h-3 text-primary-blue/70" />
                <span>Joined {userData.memberSince}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left 2-Columns: Vitals & Stats */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 text-white rounded-[2rem] p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary-blue/10 blur-[80px] rounded-full translate-y-1/3 translate-x-1/3" />
            
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-black uppercase tracking-tight italic">Key Patient Vitals</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              {[
                { icon: Heart, label: 'Blood Group', value: userData.bloodType, color: 'text-red-400' },
                { icon: Activity, label: 'Weight', value: userData.weight, color: 'text-sky-400' },
                { icon: Activity, label: 'Height', value: userData.height, color: 'text-emerald-400' },
                { icon: Shield, label: 'Portal Name', value: userData.websiteName, color: 'text-amber-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-xs hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className={cn("w-4 h-4", item.color)} />
                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest leading-none">{item.label}</span>
                  </div>
                  <div className="text-xl font-black italic tracking-tighter text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 3-Columns: Interactive Profile Update Form */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-primary-blue" />
                  Update Profile Details
                </h3>
                <p className="text-slate-400 font-bold text-[8px] uppercase tracking-wider mt-0.5">Edit patient records and personal metrics</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/5 outline-none font-bold text-xs px-4 py-3 rounded-xl transition-all"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/5 outline-none font-bold text-xs px-4 py-3 rounded-xl transition-all"
                  />
                </div>

                {/* Website name branding */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                    Website Name Branding
                  </label>
                  <input
                    type="text"
                    value={editWebsiteName}
                    onChange={(e) => setEditWebsiteName(e.target.value)}
                    placeholder="e.g. Medicare AI"
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/5 outline-none font-bold text-xs px-4 py-3 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Blood Group */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                    Blood Group
                  </label>
                  <select
                    value={editBloodType}
                    onChange={(e) => setEditBloodType(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/5 outline-none font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Select blood type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Weight */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    placeholder="e.g. 65 kg"
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/5 outline-none font-bold text-xs px-4 py-3 rounded-xl transition-all"
                  />
                </div>

                {/* Height */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                    Height
                  </label>
                  <input
                    type="text"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    placeholder="e.g. 170 cm"
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/5 outline-none font-bold text-xs px-4 py-3 rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Save Button & Saving State */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 gap-3">
                <div>
                  <AnimatePresence mode="wait">
                    {saveSuccess && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-full"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Changes saved successfully!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="sm:ml-auto w-full sm:w-auto px-6 py-3.5 bg-primary-blue text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Information
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
