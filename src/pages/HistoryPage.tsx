/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, FileText, Calendar, Clock, User, Trash2, X, Filter, Activity, ClipboardCheck, ArrowUpRight } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { historyService } from '../services/historyService';
import { ConsultationRecord } from '../types';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

const formatDate = (ts: any) => {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toLocaleDateString();
  return new Date(ts).toLocaleDateString();
};

const formatDateTime = (ts: any) => {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toLocaleString();
  return new Date(ts).toLocaleString();
};

const formatTimeOnly = (ts: any) => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function HistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const filteredRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [records, sortBy]);

  const handleDelete = async (recordId: string) => {
    setIsDeleting(true);
    try {
      // Local delete
      historyService.deleteRecord(recordId);
      
      // Firestore delete if user is logged in
      if (auth.currentUser) {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'medicalRecords', recordId))
          .catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${auth.currentUser?.uid}/medicalRecords/${recordId}`));
      }
      
      setRecords(prev => prev.filter(r => r.id !== recordId));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      console.error("Deletion error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        let allRecords: any[] = [];
        
        // Always get from local storage first
        const localRecords = historyService.getRecords();
        allRecords = [...localRecords];

        // If user is logged in, sync with Firestore
        if (auth.currentUser) {
          const q = query(
            collection(db, 'users', auth.currentUser.uid, 'medicalRecords'),
            orderBy('timestamp', 'desc')
          );
          
          const querySnapshot = await getDocs(q).catch(e => {
            console.warn("Firestore history fetch failed (permissions?), falling back to local only.");
            return null;
          });

          if (querySnapshot) {
            const firestoreRecords = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                fromFirestore: true
              };
            });

            // Merge and de-duplicate by ID (prefer Firestore if conflict)
            const recordMap = new Map();
            localRecords.forEach(r => recordMap.set(r.id, r));
            firestoreRecords.forEach(r => recordMap.set(r.id, r));
            allRecords = Array.from(recordMap.values());
          }
        }

        setRecords(allRecords);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [auth.currentUser]);

  return (
    <div className="space-y-12 relative">
       {/* Banner Section */}
       <section className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-primary-blue h-[200px] md:h-[300px] mb-8 md:mb-12 shadow-2xl shadow-blue-200/50 group mx-4 md:mx-0">
        <img
          src="https://images.unsplash.com/photo-1576091160550-217359f41f48?auto=format&fit=crop&w=1920&q=80"
          alt="History Background"
          className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-[2s]"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1920';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase italic">Medical History</h2>
          <p className="text-blue-100 font-medium max-w-md mt-2 tracking-tight text-sm md:text-base">Securely view and manage all your past consultations and prescriptions.</p>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 h-80 animate-pulse flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                <div className="w-24 h-4 bg-slate-100 rounded" />
              </div>
              <div className="w-3/4 h-8 bg-slate-100 rounded" />
              <div className="w-full h-12 bg-slate-100 rounded-xl" />
              <div className="mt-auto flex gap-4">
                <div className="flex-1 h-12 bg-slate-100 rounded-xl" />
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between glass-panel p-6 rounded-[2rem]">

            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white/50 border border-slate-100 p-1.5 rounded-xl">
                <button
                  onClick={() => setSortBy('newest')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    sortBy === 'newest' ? "bg-primary-blue text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy('oldest')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    sortBy === 'oldest' ? "bg-primary-blue text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Oldest
                </button>
              </div>
              <div className="p-3 bg-white/50 border border-slate-100 rounded-xl text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-24 glass-panel rounded-[3rem] border border-dashed border-blue-200">
              <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <History className="w-10 h-10 text-blue-300" />
              </div>
              <h4 className="text-2xl font-bold tracking-tight mb-2">No medical records found</h4>
              <p className="text-gray-500 max-w-sm mx-auto font-medium">Once you complete a consultation, your reports will appear here.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredRecords.map((record, index) => (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-200/40 transition-all flex flex-col gap-6 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-primary-blue transition-colors">
                        <Activity className="w-6 h-6 text-primary-blue group-hover:text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Session ID</div>
                        <div className="font-mono text-[10px] font-bold text-slate-400">#MT-{record.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-primary-blue uppercase tracking-[0.2em] mb-1">Physician</h4>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        {record.doctorName}
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-primary-blue transition-colors" />
                      </h3>
                    </div>

                    <div className="bg-slate-50/80 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Analysis</span>
                        <span>{formatDate(record.timestamp)}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed">
                        {record.diagnosis}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <Clock className="w-3 h-3" />
                          {formatTimeOnly(record.startTime)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="bg-slate-900 text-white px-6 py-3.5 rounded-xl hover:bg-black transition-all group shadow-lg shadow-slate-200 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View Full Report
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecordToDelete(record.id);
                          }}
                          disabled={isDeleting}
                          className="bg-red-50 text-red-500 p-3.5 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 shadow-sm border border-red-50"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="bg-slate-50 w-full max-w-5xl rounded-[3rem] overflow-hidden relative z-[101] shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Report Header (Printable) */}
              <div className="sticky top-0 bg-white border-b border-slate-100 p-8 px-12 z-50 flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-blue/10 p-3 rounded-2xl text-primary-blue">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 uppercase tracking-widest text-sm italic">Session Record</h2>
                    <p className="text-[10px] font-bold text-slate-400">ID: medicare-med-{selectedRecord.id.slice(0, 12)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="p-3 hover:bg-slate-100 bg-slate-50 text-slate-400 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Report Body */}
              <div className="p-8 md:p-16 overflow-y-auto custom-scrollbar bg-white" id="printable-report">
                <div className="max-w-4xl mx-auto space-y-16">
                  {/* Clinical Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-12 border-b border-dashed border-slate-200">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Activity className="w-10 h-10 text-primary-blue" />
                        <h1 className="text-4xl font-black tracking-tighter italic uppercase">Clinical Report</h1>
                      </div>
                      <div className="flex flex-wrap gap-4 pt-2">
                        <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                          <span className="text-[9px] font-black uppercase text-emerald-600 block leading-none mb-1">Status</span>
                          <span className="text-xs font-bold text-emerald-700">Digital Authenticated</span>
                        </div>
                        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                          <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-1">Patient Identifier</span>
                          <span className="text-xs font-bold text-slate-700">{selectedRecord.userName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Generated By Medicare AI</div>
                      <p className="text-sm font-bold text-slate-600">{formatDateTime(selectedRecord.timestamp)}</p>
                      <p className="text-sm font-bold text-slate-400 italic">Dr. {selectedRecord.doctorName}</p>
                    </div>
                  </div>

                  {/* Diagnosis & Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-12">
                      <section className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                            <ClipboardCheck className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Clinical Diagnosis</h3>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-orange-50/30 border border-orange-100 text-slate-800 leading-relaxed font-bold italic relative">
                          <div className="text-4xl absolute -top-4 -left-2 text-orange-200 pointer-events-none opacity-50 font-serif">“</div>
                          {selectedRecord.diagnosis}
                        </div>
                      </section>
                    </div>

                    <aside className="space-y-12">
                      <section className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <Activity className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Prescription</h3>
                        </div>
                        <div className="space-y-3">
                          {selectedRecord.prescription.medicines.map((med: any, i: number) => (
                            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000" />
                                <span className="font-extrabold text-sm text-slate-900 bg-emerald-50/70 border border-emerald-100/50 px-3 py-1 rounded-xl shadow-xs">
                                  {med.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ml-5">
                                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/40">
                                  {med.dosage}
                                </span>
                                <span className="text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100/50">
                                  {med.frequency}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                            <Activity className="w-4 h-4 rotate-180" />
                          </div>
                          <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Yoga Protocol</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedRecord.prescription.yoga.map((asana: string, i: number) => (
                            <div key={i} className="px-4 py-3 rounded-xl bg-purple-50/50 border border-purple-100 text-[10px] font-bold text-purple-700 uppercase tracking-widest">
                              {asana}
                            </div>
                          ))}
                        </div>
                      </section>
                    </aside>
                  </div>

                  {/* Footnotes */}
                  <footer className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">AI</div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-900">Digitally Signed</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Medicare-Agent-X-01</p>
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-300 max-w-xs text-center md:text-right uppercase tracking-[0.2em] leading-relaxed">
                      This is an AI-generated consultation report. Please follow up with your physical physician for regular checkups.
                    </p>
                  </footer>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecordToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white max-w-md w-full rounded-3xl p-8 relative z-[111] shadow-2xl text-center space-y-6 border border-slate-100"
            >
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Delete Medical Record?</h3>
                <p className="text-slate-500 text-sm font-medium">
                  Are you sure you want to delete this clinical consultation and prescription report? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = recordToDelete;
                    setRecordToDelete(null);
                    await handleDelete(id);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-200"
                >
                  Delete Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
