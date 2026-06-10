import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  FileText, 
  Activity, 
  ShieldAlert, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  Search,
  ArrowLeft,
  Filter,
  BarChart3,
  Clock,
  ShieldCheck,
  CreditCard,
  Trash2
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { collection, getDocs, doc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: any;
  consultationCount?: number;
}

interface ConsultationData {
  id: string;
  userId: string;
  userName: string;
  doctorName: string;
  diagnosis: string;
  timestamp: any;
  prescription?: any;
}

interface PaymentData {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planName: string;
  amount: number;
  status: string;
  createdAt: any;
  utr?: string;
  screenshot?: string | null;
}

export const AdminPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [consultations, setConsultations] = useState<ConsultationData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'payments'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const { user: authUser, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleDeleteSession = async (userId: string, sessionId: string) => {
    if (!window.confirm('ADMIN: Are you sure you want to delete this consultation record? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'medicalRecords', sessionId)).catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${userId}/medicalRecords/${sessionId}`));
      setConsultations(prev => prev.filter(c => c.id !== sessionId));
      if (selectedItem?.type === 'session' && selectedItem.data.id === sessionId) {
        setSelectedItem(null);
      }
      alert('Record purged successfully from database.');
    } catch (error: any) {
      console.error("Admin deletion error:", error);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch Users
        const usersSnap = await getDocs(collection(db, 'users')).catch(e => handleFirestoreError(e, OperationType.LIST, 'users'));
        const usersList: UserData[] = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
        
        // Fetch Payments
        let paymentsList: PaymentData[] = [];
        try {
          const paymentsSnap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
          paymentsList = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentData));
        } catch (e) {
          console.warn("Google Cloud Payments fetch skipped:", e);
        }

        // Merge local billing records for "billing without Google Cloud" configuration
        try {
          const localPaymentsStr = localStorage.getItem('medicare_local_payments');
          if (localPaymentsStr) {
            const localPayments = JSON.parse(localPaymentsStr);
            localPayments.forEach((lp: any) => {
              if (lp.createdAt && typeof lp.createdAt === 'string') {
                lp.createdAt = {
                  seconds: Math.floor(new Date(lp.createdAt).getTime() / 1000),
                  toDate: () => new Date(lp.createdAt)
                };
              }
              if (!paymentsList.some(p => p.utr === lp.utr)) {
                paymentsList.unshift(lp);
              }
            });
          }
        } catch (err) {
          console.warn("Failed to merge offline payments:", err);
        }

        const sessionsList: ConsultationData[] = [];
        for (const u of usersList) {
          const recordsSnap = await getDocs(collection(db, 'users', u.uid, 'medicalRecords'));
          recordsSnap.docs.forEach(rd => {
            sessionsList.push({ id: rd.id, userId: u.uid, ...rd.data() } as ConsultationData);
          });
        }
        sessionsList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        // Count consultations per user
        const updatedUsers = usersList.map(u => ({
          ...u,
          consultationCount: sessionsList.filter(s => s.userId === u.uid).length
        }));

        setUsers(updatedUsers);
        setConsultations(sessionsList);
        setPayments(paymentsList);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, authLoading]);

  const [selectedItem, setSelectedItem] = useState<{ type: 'user' | 'session' | 'payment', data: any } | null>(null);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-blue-500 animate-pulse" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Verifying Administrative Access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex p-6 bg-red-50 rounded-[2.5rem] border-2 border-red-100">
            <ShieldAlert className="w-16 h-16 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 mb-2">Restricted Area</h1>
            <p className="text-slate-500 text-sm leading-relaxed">This page is only accessible by the authorized system administrator. Your current account does not have sufficient permissions.</p>
          </div>
          <button 
            onClick={() => navigate('/home')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Safety
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-white border-b md:border-r border-slate-100 p-4 md:p-8 flex flex-col shrink-0 sticky top-14 md:top-16 z-40">
        <div className="flex items-center gap-3 mb-4 md:mb-12">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black tracking-tighter uppercase italic leading-none">Medicare</h2>
            <p className="text-[7px] md:text-[8px] font-bold text-blue-500 uppercase tracking-widest">Admin Console</p>
          </div>
        </div>

        <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar pb-2 md:pb-0">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all font-bold text-[10px] md:text-sm whitespace-nowrap",
              activeTab === 'users' ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-slate-50 text-slate-400"
            )}
          >
            <Users className="w-4 h-4 md:w-5 md:h-5" />
            Active Users
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={cn(
              "flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all font-bold text-[10px] md:text-sm whitespace-nowrap",
              activeTab === 'sessions' ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-slate-50 text-slate-400"
            )}
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
             Logs
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={cn(
              "flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all font-bold text-[10px] md:text-sm whitespace-nowrap",
              activeTab === 'payments' ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-slate-50 text-slate-400"
            )}
          >
            <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
             Payments
          </button>
        </nav>

        <div className="hidden md:block mt-auto p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <ShieldCheck className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Mode</p>
            <p className="text-sm font-bold">Hardened Privacy</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-10 blur-3xl rounded-full translate-x-12 -translate-y-12" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-4 md:p-12 overflow-y-auto max-h-screen custom-scrollbar">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {[
            { label: 'Users', value: users.length, icon: Users, color: 'blue' },
            { label: 'Sessions', value: consultations.length, icon: TrendingUp, color: 'emerald' },
            { label: 'Uptime', value: '99.9%', icon: Activity, color: 'amber', hideOnMobile: true }
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label} 
              className={cn(
                "bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-6",
                stat.hideOnMobile && "hidden md:flex"
              )}
            >
              <div className={cn("p-2 md:p-4 rounded-lg md:rounded-2xl", `bg-${stat.color}-50 text-${stat.color}-600`)}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 md:mb-1">{stat.label}</p>
                <div className="text-xl md:text-3xl font-black tracking-tight">{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-slate-900 rounded-xl md:rounded-2xl">
                {activeTab === 'users' ? <Users className="w-4 h-4 md:w-5 md:h-5 text-white" /> : (activeTab === 'sessions' ? <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" /> : <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-white" />)}
              </div>
              <div>
                <h3 className="text-base md:text-xl font-bold tracking-tight uppercase italic">
                  {activeTab === 'users' ? 'Users' : (activeTab === 'sessions' ? 'Sessions' : 'Payments')}
                </h3>
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeTab === 'users' ? users.length : (activeTab === 'sessions' ? consultations.length : payments.length)} records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 md:pl-11 pr-4 md:pr-6 py-2 md:py-3 bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 transition-all"
                />
              </div>
              <button className="p-2 md:p-3 bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl hover:bg-slate-100 transition-all">
                <Filter className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  {activeTab === 'users' ? (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User Identity</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Join Date</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Engagement</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
                    </>
                  ) : activeTab === 'sessions' ? (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Session ID</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Physician</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Patient Obj</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ref ID</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Plan / Amount</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User OBJ</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTab === 'users' ? (
                  users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 uppercase text-xs">
                            {u.displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.displayName}</p>
                            <p className="text-[10px] font-mono text-slate-400 uppercase">UID: {u.uid.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                           <Calendar className="w-4 h-4 opacity-40" />
                           {formatDate(u.createdAt)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-medium text-sm">
                        {u.email}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-blue-500 rounded-full" 
                               style={{ width: `${Math.min((u.consultationCount || 0) * 20, 100)}%` }} 
                             />
                           </div>
                           <span className="text-xs font-bold text-slate-600">{u.consultationCount || 0} calls</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                          Authorized
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => setSelectedItem({ type: 'user', data: u })}
                          className="p-2 hover:bg-white rounded-lg text-slate-300 hover:text-blue-500 transition-all border border-transparent hover:border-slate-100 group-hover:shadow-sm"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : activeTab === 'sessions' ? (
                  consultations.filter(c => c.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) || c.userName.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                         <div className="text-xs font-mono font-bold text-blue-500 leading-none">#{c.id.slice(0, 10)}...</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-blue-400" />
                           <span className="font-bold text-slate-900 text-sm italic">{c.doctorName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                           <Clock className="w-4 h-4 opacity-40" />
                           {formatDate(c.timestamp)}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-bold text-slate-600">ID: {c.userName}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDeleteSession(c.userId, c.id)}
                            className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all border border-transparent hover:border-red-100 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setSelectedItem({ type: 'session', data: c })}
                            className="p-2 hover:bg-white rounded-lg text-slate-300 hover:text-blue-500 transition-all border border-transparent hover:border-slate-100 group-hover:shadow-sm"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  payments.filter(p => p.planName.toLowerCase().includes(searchTerm.toLowerCase()) || p.userName.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                         <div className="text-[10px] font-mono font-bold text-slate-400 leading-none truncate w-24">PAY_{p.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div>
                           <p className="font-bold text-slate-900 text-sm">{p.planName}</p>
                           <p className="text-emerald-600 font-black text-[10px]">₹{p.amount}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                           <Clock className="w-4 h-4 opacity-40" />
                           {formatDate(p.createdAt)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-medium text-sm">
                        {p.userEmail}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            p.status === 'success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            p.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            "bg-red-50 text-red-600 border-red-100"
                          )}>
                            {p.status}
                          </div>
                          <button 
                            onClick={() => setSelectedItem({ type: 'payment', data: p })}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-300 hover:text-blue-500 transition-all border border-transparent hover:border-slate-100"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail View Modal Overlay */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
               <div className="p-8 pb-0 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                      {selectedItem.type === 'user' ? <Users className="w-5 h-5" /> : (selectedItem.type === 'session' ? <FileText className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />)}
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tighter uppercase italic">Record Detail</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Resource Type: {selectedItem.type}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                   {selectedItem.type === 'session' && (
                     <button
                       onClick={() => handleDeleteSession(selectedItem.data.userId, selectedItem.data.id)}
                       className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all"
                       title="Purge Record"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                   )}
                   <button 
                    onClick={() => setSelectedItem(null)}
                    className="p-3 hover:bg-slate-50 text-slate-400 rounded-2xl transition-all"
                   >
                     <ChevronRight className="w-6 h-6 rotate-180" />
                   </button>
                 </div>
               </div>

               <div className="p-8 space-y-6">
                  {selectedItem.type === 'user' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 text-3xl shadow-sm">
                          {selectedItem.data.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-2xl font-black tracking-tight">{selectedItem.data.displayName}</p>
                          <p className="text-xs font-bold text-slate-400">UID: {selectedItem.data.uid}</p>
                          <p className="text-xs text-slate-400 font-medium">{selectedItem.data.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Joined</p>
                            <p className="text-sm font-bold text-slate-900">{formatDate(selectedItem.data.createdAt)}</p>
                         </div>
                         <div className="p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Consults</p>
                            <p className="text-sm font-bold text-slate-900">{selectedItem.data.consultationCount || 0} Sessions</p>
                         </div>
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'session' && (
                    <div className="space-y-4">
                      <div className="p-6 bg-blue-50 text-blue-600 rounded-3xl border border-blue-100">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2">Diagnosis Summary</p>
                        <p className="text-lg font-bold italic tracking-tight">"{selectedItem.data.diagnosis}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Physician</p>
                            <p className="text-sm font-bold text-slate-900">{selectedItem.data.doctorName}</p>
                         </div>
                         <div className="p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient Name</p>
                            <p className="text-sm font-bold text-slate-900">{selectedItem.data.userName}</p>
                         </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-900 text-white">
                         <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Session Reference</p>
                         <p className="text-xs font-mono">{selectedItem.data.id}</p>
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'payment' && (
                    <div className="space-y-4">
                       <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                          <p className="text-3xl font-black text-emerald-700 tracking-tight">₹{selectedItem.data.amount}</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-emerald-600">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan</p>
                            <p className="text-sm font-bold text-slate-900">{selectedItem.data.planName}</p>
                         </div>
                         <div className="p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Status</p>
                            <p className="text-sm font-bold text-emerald-600 uppercase">{selectedItem.data.status}</p>
                         </div>
                      </div>
                      
                      {selectedItem.data.utr && (
                        <div className="p-4 rounded-2xl border border-slate-100 bg-white">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">UPI Ref / UTR Number</p>
                          <code className="text-xs font-mono font-bold text-slate-900 tracking-tight">{selectedItem.data.utr}</code>
                        </div>
                      )}

                      {selectedItem.data.screenshot && (
                        <div className="p-4 rounded-2xl border border-slate-100 bg-white text-left">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Attached Receipt Image</p>
                          <div className="w-full max-h-56 overflow-auto rounded-xl border border-slate-100 shadow-inner bg-slate-50/50">
                            <img src={selectedItem.data.screenshot} className="w-full object-contain rounded-lg" alt="UTR digital screenshot confirm" />
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payer Details</p>
                         <p className="text-xs font-mono font-bold text-slate-600">{selectedItem.data.userEmail}</p>
                         <p className="text-xs font-bold text-slate-500 mt-1">{selectedItem.data.userName}</p>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200"
                  >
                    Close Log View
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
