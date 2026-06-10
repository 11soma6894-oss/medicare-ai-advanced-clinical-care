/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Activity, ShieldCheck, HeartPulse, Clock, Sparkles, Stethoscope, Twitter, Instagram, Linkedin, Youtube, Share2, MessageCircle, AlertCircle, Loader2, ArrowUpRight, Star, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const { registerEmail, loginEmail, forgotPassword, loginDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!name) throw new Error('Name is required for registration');
        await registerEmail(email, password, name);
      } else if (authMode === 'signin') {
        await loginEmail(email, password);
      } else if (authMode === 'forgot') {
        await forgotPassword(email);
        setSuccess('Password reset link sent to your email.');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // This shouldn't happen here but for safety
        setError("Sign-in window was closed. Please try again.");
        return;
      }

      console.error("Auth error:", err);
      let msg = err.message || 'An error occurred during authentication';
      
      if (err.code === 'auth/invalid-credential') {
        msg = "Invalid credentials. Please check your email/password or try Google sign-in. If you're an admin, ensure the 'Identity Toolkit API' is enabled in Google Cloud Console.";
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = "Invalid email or password.";
      } else if (err.code === 'auth/network-request-failed') {
        msg = "Network request failed. This is often caused by ad-blockers or firewalls blocking Firebase connection. Please disable ad-blockers and check your network.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-blue text-black font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="fixed top-6 left-6 right-6 z-50 glass-panel p-4 rounded-2xl flex items-center justify-between max-w-7xl mx-auto backdrop-blur-xl bg-white/70">
        <div className="flex items-center gap-2">
          <div className="bg-primary-blue p-2 rounded-xl shadow-lg shadow-blue-200">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-bold tracking-tight">Medicare AI</span>
        </div>
        <div className="hidden lg:flex items-center gap-8 mr-8">
          {['Features', 'Process', 'Testimonials', 'FAQ'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-primary-blue transition-colors">{item}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setAuthMode('signin');
              setShowAuthModal(true);
            }}
            className="hidden sm:flex bg-primary-blue text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all items-center gap-2 shadow-lg shadow-blue-200 active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            Launch Platform
          </button>
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 text-gray-500 hover:bg-blue-50 rounded-xl transition-colors"
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 mt-4 p-6 glass-panel rounded-[2rem] bg-white/90 backdrop-blur-2xl border border-white/50 shadow-2xl flex flex-col gap-6 lg:hidden"
            >
              {['Features', 'Process', 'Testimonials', 'FAQ'].map(item => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase()}`} 
                  onClick={() => setShowMobileMenu(false)}
                  className="text-lg font-black uppercase tracking-widest text-gray-400 hover:text-primary-blue transition-colors"
                >
                  {item}
                </a>
              ))}
              <hr className="border-gray-100" />
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setShowAuthModal(true);
                  setShowMobileMenu(false);
                }}
                className="bg-primary-blue text-white w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-200"
              >
                Launch Platform
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col pt-32 overflow-hidden bg-brand-blue">
        {/* Background blobs for a mesh gradient effect */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 100, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-300/30 blur-[120px] rounded-full" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              x: [0, -100, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-indigo-300/30 blur-[100px] rounded-full" 
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10 flex-grow py-20">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-3 bg-white/60 backdrop-blur-md border border-white/40 text-blue-700 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-10 shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              Trusted by 50k+ Patients in India
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-black leading-[0.85] tracking-tighter mb-10 font-display italic">
              MEDICARE <br />
              <span className="text-primary-blue not-italic font-sans">AI.</span>
            </h1>
            
            <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
              <p className="text-lg text-gray-500 max-w-sm leading-tight font-medium">
                The next generation of clinical care. Autonomous AI diagnostics meets world-class human expertise.
              </p>
              <div className="h-10 w-px bg-gray-200 hidden md:block" />
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                    className="w-12 h-12 rounded-full border-4 border-white shadow-sm object-cover"
                    alt="User"
                  />
                ))}
                <div className="w-12 h-12 rounded-full border-4 border-white bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600 shadow-sm">
                  +50K
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-12">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                className="bg-primary-blue text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_-20px_rgba(37,99,235,0.5)] flex items-center gap-3 group"
              >
                Launch Platform
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  setLoading(true);
                  await loginDemo('patient');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_-20px_rgba(16,185,129,0.3)] flex items-center gap-3"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                Instant Demo Access
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, scale: 1, x: 0 }}
            className="lg:col-span-5 relative"
          >
            {/* Main Image with a more interesting shape */}
            <div className="relative z-10 rounded-[4rem] overflow-hidden shadow-2xl skew-y-2 hover:skew-y-0 transition-transform duration-700 aspect-[4/5] group bg-white p-3">
              <img
                src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80"
                alt="Medical Professional"
                className="w-full h-full object-cover rounded-[3.5rem] grayscale group-hover:grayscale-0 transition-all duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay group-hover:opacity-0 transition-opacity" />
            </div>

            {/* Floating Stats - Glassy & Minimal */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 z-20 glass-panel p-6 rounded-[2.5rem] border-none shadow-2xl flex flex-col gap-1 items-center min-w-[140px]"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-blue-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-black tracking-tight tracking-tighter">99.8%</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Precision</div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-10 -left-10 z-20 glass-panel p-8 rounded-[3rem] border-none shadow-2xl flex items-center gap-5"
            >
              <div className="relative">
                <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black italic">EST. 2MIN</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Response Time</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Ticker / Proof Bar */}
        <div className="relative mt-24 py-12 border-y border-gray-100 bg-white/30 backdrop-blur-sm overflow-hidden">
          <div className="flex gap-20 animate-infinite-scroll">
            {[1, 2].map((group) => (
              <div key={group} className="flex gap-20 items-center shrink-0">
                {['ApolloSync', 'MaxHealth', 'FortisCare', 'MediIndia', 'BharatBio', 'ArtemisTech'].map((brand) => (
                  <div key={brand} className="flex items-center gap-3 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter italic uppercase">{brand}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-40 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-24 gap-10">
            <div className="max-w-2xl">
              <h2 className="text-6xl lg:text-8xl font-black mb-10 tracking-tighter uppercase italic leading-[0.8] font-display">
                CORE <br />
                <span className="text-primary-blue not-italic font-sans">SYNAPSE.</span>
              </h2>
              <p className="text-gray-500 font-medium text-xl leading-snug">
                We've rebuilt the medical journey from the ground up. Fast, accurate, and incredibly human.
              </p>
            </div>
            <div className="flex gap-4">
               <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
                 <ShieldCheck className="w-5 h-5" />
               </div>
               <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
                 <Sparkles className="w-5 h-5" />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Bento Grid Item 1 */}
            <motion.div
              whileHover={{ y: -10 }}
              className="md:col-span-8 p-12 rounded-[4rem] bg-blue-50 border border-blue-100 flex flex-col justify-between min-h-[400px] group transition-all duration-500"
            >
              <div className="flex justify-between items-start">
                <div className="bg-white p-5 rounded-3xl shadow-xl shadow-blue-200/50">
                  <Sparkles className="w-10 h-10 text-primary-blue" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-white/50 px-4 py-2 rounded-full">New Algorithm v2.4</div>
              </div>
              <div className="max-w-md">
                <h3 className="text-4xl font-black mb-6 tracking-tighter italic uppercase">AI Diagnostic <br />Symmetry</h3>
                <p className="text-blue-900/60 leading-relaxed font-medium text-lg">
                  State-of-the-art neural networks analyze your symptoms against millions of clinical cases in milliseconds.
                </p>
              </div>
            </motion.div>

            {/* Bento Grid Item 2 */}
            <motion.div
              whileHover={{ y: -10 }}
              className="md:col-span-4 p-12 rounded-[4rem] bg-slate-900 text-white flex flex-col justify-between min-h-[400px] overflow-hidden relative group transition-all duration-500"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-blue blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl w-fit">
                <Stethoscope className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-black mb-4 tracking-tighter italic uppercase">Elite <br />Practitioners</h3>
                <p className="text-slate-400 leading-relaxed font-medium">
                  Direct access to board-certified specialists.
                </p>
              </div>
            </motion.div>

            {/* Bento Grid Item 3 */}
            <motion.div
              whileHover={{ y: -10 }}
              className="md:col-span-4 p-12 rounded-[4rem] bg-emerald-50 border border-emerald-100 flex flex-col justify-between min-h-[400px] group transition-all duration-500"
            >
              <div className="bg-white p-5 rounded-3xl shadow-xl shadow-emerald-200/50 w-fit">
                <Activity className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-3xl font-black mb-4 tracking-tighter italic uppercase">Biometric <br />Sync</h3>
                <p className="text-emerald-900/60 leading-relaxed font-medium">
                  Real-time monitoring of your vitals throughout.
                </p>
              </div>
            </motion.div>

            {/* Bento Grid Item 4 */}
            <motion.div
              whileHover={{ y: -10 }}
              className="md:col-span-8 p-12 rounded-[4rem] bg-gray-50 border border-gray-100 flex flex-col md:flex-row gap-12 items-center min-h-[400px] group transition-all duration-500"
            >
              <div className="flex-1">
                <div className="bg-white p-5 rounded-3xl shadow-xl shadow-gray-200/50 w-fit mb-8">
                  <ShieldCheck className="w-10 h-10 text-gray-900" />
                </div>
                <h3 className="text-4xl font-black mb-6 tracking-tighter italic uppercase">Fortified <br />Privacy</h3>
                <p className="text-gray-500 leading-relaxed font-medium text-lg">
                  Military-grade encryption for all medical records and private consultation buffers.
                </p>
              </div>
              <div className="flex-1 w-full h-full min-h-[200px] bg-white rounded-[3rem] border border-gray-100 p-2 overflow-hidden shadow-inner flex items-center justify-center p-8">
                 <div className="grid grid-cols-4 gap-4 w-full">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                      <div key={i} className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                        <motion.div 
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 2, delay: i * 0.1, ease: "linear" }}
                          className="h-full w-1/2 bg-primary-blue/20"
                        />
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="process" className="py-40 bg-brand-blue relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-32">
            <div className="flex-1 order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-10 bg-blue-400/20 shadow-[0_0_100px_40px_rgba(37,99,235,0.15)] rounded-full blur-[80px]" />
                <img 
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80" 
                  className="w-full rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(37,99,235,0.2)] relative z-10 border-[12px] border-white grayscale hover:grayscale-0 transition-all duration-700"
                  alt="Healthcare platform"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-10 -right-10 z-20 bg-primary-blue text-white p-10 rounded-[3rem] shadow-2xl">
                   <div className="text-4xl font-black italic mb-1 uppercase tracking-tighter leading-none tracking-tight">Active</div>
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Consultation Session</div>
                </div>
              </div>
            </div>
            <div className="flex-1 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-primary-blue font-black text-[10px] uppercase tracking-[0.3em] mb-10">
                <div className="w-10 h-[1px] bg-primary-blue" /> System Protocol
              </div>
              <h2 className="text-6xl lg:text-8xl font-black mb-16 tracking-tighter uppercase italic leading-[0.8] font-display">
                THE <br />
                <span className="text-primary-blue not-italic font-sans">PROCESS.</span>
              </h2>
              
              <div className="space-y-16">
                {[
                  { step: "01", title: "Synthesize", desc: "Share your symptoms with our AI to build your initial medical profile." },
                  { step: "02", title: "Select", desc: "Choose from an elite roster of specialists hand-picked for your condition." },
                  { step: "03", title: "Resolve", desc: "Engage in a seamless consultation and launch your recovery protocol." }
                ].map((s, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    key={i} 
                    className="flex gap-10 group"
                  >
                    <div className="text-7xl font-black text-blue-100 group-hover:text-primary-blue transition-colors leading-none italic font-display">{s.step}</div>
                    <div>
                      <h4 className="text-2xl font-black mb-3 tracking-tighter uppercase italic tracking-tight">{s.title}</h4>
                      <p className="text-gray-500 font-medium leading-relaxed max-w-sm">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="p-16 rounded-[5rem] bg-indigo-50/50 border border-indigo-100/50 text-center shadow-sm flex flex-col md:flex-row items-center justify-between gap-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10 w-full">
              <div className="text-7xl font-black text-primary-blue mb-3 font-display italic leading-none tracking-tighter uppercase">50K+</div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Happy Patients</div>
            </div>
            <div className="w-px h-24 bg-indigo-100 hidden md:block shrink-0" />
            <div className="relative z-10 w-full">
              <div className="text-7xl font-black text-gray-900 mb-3 font-display italic leading-none tracking-tighter uppercase">200+</div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Expert Doctors</div>
            </div>
            <div className="w-px h-24 bg-indigo-100 hidden md:block shrink-0" />
            <div className="relative z-10 w-full">
              <div className="text-7xl font-black text-primary-blue mb-3 font-display italic leading-none tracking-tighter uppercase">4.9/5</div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Trust Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-40 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/30 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-end justify-between mb-24 gap-10">
            <div className="max-w-2xl text-left">
              <h2 className="text-6xl lg:text-8xl font-black mb-10 tracking-tighter uppercase italic leading-[0.8] font-display">
                PATIENT <br />
                <span className="text-primary-blue not-italic font-sans">VOICES.</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 mb-4">
               {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                text: "The AI analysis was spot on. Within minutes I was talking to a specialist who helped me manage my chronic back pain. Truly revolutionary.",
                author: "Sarah Jenkins",
                role: "Marketing Director",
                img: "https://i.pravatar.cc/100?img=32"
              },
              {
                text: "Finally, a healthcare platform that feels modern and human. The interface is beautiful and the doctors are extremely professional.",
                author: "David Chen",
                role: "Software Engineer",
                img: "https://i.pravatar.cc/100?img=12"
              },
              {
                text: "Being able to get a prescription and a care plan at 2 AM was a lifesaver. Medicare AI is a must-have for every family.",
                author: "Elena Rodriguez",
                role: "Mother of two",
                img: "https://i.pravatar.cc/100?img=45"
              }
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-12 rounded-[4rem] shadow-xl shadow-blue-100/20 border border-slate-100 relative group transition-all duration-500"
              >
                <div className="text-[12rem] text-slate-50 absolute -top-10 -left-6 font-serif leading-none select-none group-hover:text-blue-50 transition-colors italic">“</div>
                <p className="text-gray-600 mb-12 italic relative z-10 font-medium text-lg leading-relaxed">
                  {t.text}
                </p>
                <div className="flex items-center gap-5 relative z-10">
                  <img src={t.img} className="w-16 h-16 rounded-3xl object-cover shadow-lg border-2 border-white" alt={t.author} />
                  <div>
                    <div className="font-black tracking-tight text-lg italic uppercase">{t.author}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-40 bg-white relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-6xl lg:text-7xl font-black mb-10 tracking-tighter uppercase italic leading-none font-display">
              COMMON <br />
              <span className="text-primary-blue not-italic font-sans">QUERIES.</span>
            </h2>
            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">Everything you need to know about Medicare AI</p>
          </div>

          <div className="space-y-6">
            {[
              { q: "Is the AI analysis accurate?", a: "Our AI is trained on vast medical datasets and serves as a highly accurate triage tool to connect you with the right human specialist." },
              { q: "How quickly can I see a doctor?", a: "Depending on availability, you can usually start a session within 5-15 minutes of sharing your symptoms." },
              { q: "Are my medical records secure?", a: "Yes, we use military-grade encryption and adhere to strict healthcare data privacy regulations." },
              { q: "Can I get a prescription?", a: "Verified doctors on our platform can provide prescriptions where medically appropriate during your consultation." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all cursor-default"
              >
                <h4 className="text-lg font-bold mb-3 tracking-tight flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-blue" />
                  {item.q}
                </h4>
                <p className="text-gray-500 font-medium leading-relaxed ml-5">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Pulse Section */}
      <section className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(0,123,255,0.05)_0%,transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                <Activity className="w-3 h-3" /> Live Community Pulse
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">
                Join the <span className="text-primary-blue">Conversation.</span>
              </h2>
            </div>
            <div className="flex gap-4">
              <button className="p-4 rounded-full bg-white shadow-xl hover:bg-blue-50 transition-all">
                <Twitter className="w-6 h-6 text-sky-500" />
              </button>
              <button className="p-4 rounded-full bg-white shadow-xl hover:bg-rose-50 transition-all">
                <Instagram className="w-6 h-6 text-rose-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { user: "@HealthWise", text: "Medicare AI just saved me 4 hours in a waiting room! 🚀", tags: "#HealthTech #AI", color: "blue" },
              { user: "@ModernMed", text: "The symptom analysis is actually incredible. Highly recommended.", tags: "#BetterHealthcare", color: "emerald" },
              { user: "@PatientFirst", text: "Finally, a doctor who listens. Seamless experience.", tags: "#MedicareAI", color: "amber" },
              { user: "@WellnessHub", text: "24/7 access is a game changer for busy parents.", tags: "#ParentingHack", color: "rose" }
            ].map((post, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2">
                       <div className={`w-10 h-10 rounded-full bg-${post.color}-100 flex items-center justify-center font-bold text-${post.color}-600`}>
                        {post.user[1]}
                       </div>
                       <div>
                         <div className="text-sm font-black">{post.user}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Twitter</div>
                       </div>
                    </div>
                    <div className="text-sky-400"><Twitter className="w-4 h-4 fill-current" /></div>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed mb-4">{post.text}</p>
                  <div className="text-primary-blue text-xs font-bold">{post.tags}</div>
                </div>
                <div className="mt-8 flex items-center gap-6 text-slate-300">
                  <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4" /> <span className="text-xs font-black">2.4k</span></div>
                  <div className="flex items-center gap-2"><Share2 className="w-4 h-4" /> <span className="text-xs font-black">156</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-white/10 pb-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-primary-blue p-2 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Medicare AI</span>
            </div>
            <p className="text-slate-400 max-w-sm font-medium leading-relaxed">
              We are on a mission to democratize quality healthcare through artificial intelligence and professional expertise.
            </p>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-200">Platform</h5>
            <ul className="space-y-4 text-slate-400 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Find a Doctor</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Reviews</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-slate-200">Company</h5>
            <ul className="space-y-4 text-slate-400 font-medium">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-sm font-medium">© 2026 Medicare AI. All rights reserved.</p>
          <div className="flex gap-6 text-slate-500 text-sm font-medium">
            <a href="#" className="hover:text-blue-400 transition-all hover:-translate-y-1"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="hover:text-rose-400 transition-all hover:-translate-y-1"><Instagram className="w-5 h-5" /></a>
            <a href="#" className="hover:text-sky-500 transition-all hover:-translate-y-1"><Linkedin className="w-5 h-5" /></a>
            <a href="#" className="hover:text-red-500 transition-all hover:-translate-y-1"><Youtube className="w-5 h-5" /></a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => setShowAuthModal(false)} 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-12 relative z-[101] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-blue/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <div className="text-center mb-10">
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Activity className="w-8 h-8 text-primary-blue" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none mb-2">
                {authMode === 'signin' ? 'Welcome Back' : authMode === 'signup' ? 'Join Medicare' : 'Reset Password'}
              </h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                {authMode === 'forgot' ? 'We will send you a reset link' : 'Access the future of healthcare'}
              </p>
            </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs font-bold">
                  <Activity className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              <div className="space-y-4">
                {(authMode === 'signin' || authMode === 'signup') && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        setError(null);
                        setLoading(true);
                        try {
                          await onLogin();
                        } catch (err: any) {
                          if (err.code === 'auth/popup-closed-by-user') {
                            console.log("Google login: Popup closed by user");
                            setError("Sign-in window was closed. Please try again if you want to log in.");
                            return;
                          }
                          
                          console.error("Google login error:", err);
                          let msg = err.message || 'Google authentication failed';
                          if (err.code === 'auth/popup-blocked') {
                            msg = "Pop-up Blocked: Your browser or the sandboxed preview iframe blocked the sign-in popup. To sign in easily: Click 'Open App' in a new tab at the top-right of your screen, or use the 'Guest Patient' / 'Doctor Admin' demo buttons below for instant access.";
                          } else if (err.code === 'auth/invalid-credential') {
                            msg = "Invalid credentials. Please ensure the 'Identity Toolkit API' is enabled in Google Cloud Console for this project.";
                          } else if (err.code === 'auth/network-request-failed') {
                            msg = "Network request failed. This is often caused by ad-blockers or firewalls blocking Firebase Auth. Please disable ad-blockers and try again.";
                          }
                          setError(msg);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full bg-white border border-slate-100 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 shadow-sm group disabled:opacity-50"
                    >
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                      Continue with Google
                    </button>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          setError(null);
                          setLoading(true);
                          await loginDemo('patient');
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/60 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        Guest Patient
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setError(null);
                          setLoading(true);
                          await loginDemo('admin');
                        }}
                        className="bg-indigo-50 hover:bg-indigo-100/80 text-indigo-800 border border-indigo-200/60 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                        Doctor Admin
                      </button>
                    </div>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                      <div className="relative flex justify-center text-xs uppercase font-black tracking-[0.3em] text-gray-300"><span className="bg-white px-4">OR</span></div>
                    </div>
                  </>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Your Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe" 
                        className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all outline-none font-bold tracking-tight text-gray-700" 
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Email Identifier</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@medicare.ai" 
                      className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all outline-none font-bold tracking-tight text-gray-700" 
                    />
                  </div>
                  {authMode !== 'forgot' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center pr-1">
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Secure Password</label>
                        {authMode === 'signin' && (
                          <button 
                            type="button"
                            onClick={() => setAuthMode('forgot')}
                            className="text-[9px] font-black uppercase tracking-widest text-primary-blue hover:underline"
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password" 
                        className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 focus:ring-2 focus:ring-primary-blue focus:bg-white transition-all outline-none font-bold tracking-tight text-gray-700" 
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-blue text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] mt-4 hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      authMode === 'signin' ? 'AUTHENTICATE' : authMode === 'signup' ? 'INITIALIZE ACCOUNT' : 'SEND RESET LINK'
                    )}
                  </button>
                </form>

                <div className="text-center mt-8">
                  <button
                    onClick={() => {
                      if (authMode === 'forgot') {
                        setAuthMode('signin');
                      } else {
                        setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      }
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[10px] font-black text-gray-400 hover:text-primary-blue transition-colors uppercase tracking-[0.15em] underline underline-offset-4 decoration-blue-100 hover:decoration-blue-300"
                  >
                    {authMode === 'forgot' ? "Back to authentication" : authMode === 'signin' ? "Need an account? Create one" : "Already registered? Authenticate"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
