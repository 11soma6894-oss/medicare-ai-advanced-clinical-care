/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Home, History, CreditCard, User, LogOut, Activity, ShieldCheck, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const ADMIN_EMAIL = '11neetusharma6894@gmail.com';

  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    ...(user?.email === ADMIN_EMAIL ? [{ label: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
    { label: 'History', path: '/history', icon: History },
    { label: 'Pricing', path: '/pricing', icon: CreditCard },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-blue text-black font-sans selection:bg-blue-200">
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-sky-100/50 px-4 md:px-6 h-14 md:h-16">
        <div className="flex items-center justify-between max-w-7xl mx-auto h-full">
          <Link to="/home" className="flex items-center gap-2 group">
            <div className="bg-primary-blue p-1.5 md:p-2 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight">Medicare AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-medium">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm transition-all hover:text-primary-blue relative py-1",
                  location.pathname === item.path 
                    ? "text-primary-blue border-b-2 border-primary-blue" 
                    : "text-gray-600"
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
          
          {/* Mobile Right Icons */}
          <div className="flex md:hidden items-center gap-2">
             <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="p-2 text-gray-500 hover:bg-slate-50 rounded-xl transition-colors"
             >
               {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl transition-all",
                        location.pathname === item.path ? "bg-blue-50 text-primary-blue" : "text-gray-500"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-bold uppercase tracking-widest text-[10px]">{item.label}</span>
                    </Link>
                  );
                })}
                <hr className="border-slate-50" />
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-widest text-[10px]">Logout</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-[99] bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex items-center justify-around py-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "flex flex-col items-center gap-0.5 transition-all flex-1 py-1",
                isActive ? "text-primary-blue bg-blue-50/50 rounded-xl" : "text-gray-400"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-grow pt-20 pb-32 md:pb-12 px-4 md:px-6 max-w-7xl mx-auto w-full overflow-x-hidden">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="border-t border-sky-100 bg-white px-6 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-6 h-6 text-sky-600" />
              <span className="text-lg font-bold">Medicare AI</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Smart healthcare platform connecting you with professional doctors instantly using AI.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <div className="grid gap-2">
              {navItems.map(item => (
                <Link key={item.path} to={item.path} className="text-sm text-gray-500 hover:text-sky-600">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <p className="text-sm text-gray-500">
              Emergency: 911<br />
              Email: support@medicareai.com<br />
              Address: 123 Healthcare Ave, Tech City
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-sky-50 text-center text-xs text-gray-400">
          © 2026 Medicare AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
