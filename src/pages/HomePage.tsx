/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Stethoscope, Users, Search, ArrowRight, MessageSquare, Volume2, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Doctor } from '../types';
import { DOCTORS as doctors } from '../constants';
import { useState } from 'react';
import { speak, stopSpeech } from '../services/ttsService';
import { cn } from '../lib/utils';

const departments = [
  { name: 'Cardiology', icon: '❤️' },
  { name: 'Neurology', icon: '🧠' },
  { name: 'Pediatrics', icon: '👶' },
  { name: 'Oncology', icon: '🎗️' },
  { name: 'Orthopedics', icon: '🦴' },
  { name: 'Dermatology', icon: '✨' },
];

export function HomePage() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  return (
    <div className="space-y-16">
      {/* Consult Banner */}
      <section className="relative rounded-2xl md:rounded-[3rem] overflow-hidden bg-blue-600 group min-h-[300px] md:h-[500px] shadow-2xl shadow-blue-200/50">
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80"
          alt="Consultation Background"
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-blue-900/90 md:from-blue-900/80 via-blue-900/40 to-transparent" />
        
          <motion.div
            initial={{ opacity: 1, x: 0 }}
            className="relative h-full flex flex-col justify-center px-6 md:px-12 max-w-2xl py-12 md:py-0"
          >
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6 tracking-tighter italic">
              Feeling unwell? <br />
              Talk to a Doctor <br />
              <span className="text-blue-300 underline underline-offset-8 decoration-white/30">Instantly.</span>
            </h2>
            <p className="text-blue-50 text-base md:text-lg mb-10 block opacity-90 leading-relaxed font-medium">
              Our AI-powered platform suggests the best specialist for your symptoms in seconds. Get professional medical advice anytime, anywhere.
            </p>
            <Link
              to="/consult"
              className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95"
            >
              Consult a Doctor Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Departments */}
      <section className="space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-3xl font-black tracking-tighter uppercase italic">Departments</h3>
            <p className="text-gray-500 font-medium tracking-tight">Browse doctors by medical specialty</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {departments.map((dept, idx) => (
            <motion.div
              key={dept.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/80 p-8 rounded-3xl border border-white/50 text-center hover:shadow-xl hover:shadow-blue-100 transition-all cursor-pointer group backdrop-blur-sm h-full flex flex-col justify-center items-center"
            >
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">{dept.icon}</div>
              <div className="font-bold tracking-tight">{dept.name}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Doctors */}
      <section className="space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-3xl font-black tracking-tighter uppercase italic">Available Specialists</h3>
            <p className="text-gray-500 font-medium tracking-tight">Connect with our highest-rated medical experts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {doctors.map((doctor, idx) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-[2.5rem] p-6 border border-white/50 shadow-sm hover:shadow-2xl hover:shadow-blue-200/30 transition-all flex flex-col items-center text-center h-full"
            >
              <div className="relative mb-6 w-full aspect-square max-w-[240px] shrink-0">
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  className="w-full h-full object-cover rounded-[1.5rem]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400';
                  }}
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (speakingId === doctor.id) {
                        stopSpeech();
                        setSpeakingId(null);
                      } else {
                        speak(`Hi, I'm ${doctor.name}, a ${doctor.specialty}. ${doctor.about}`, {
                          gender: doctor.gender as any,
                          name: doctor.name,
                          onStart: () => setSpeakingId(doctor.id),
                          onEnd: () => setSpeakingId(null),
                          onError: () => setSpeakingId(null)
                        });
                      }
                    }}
                    className={cn(
                      "p-2 rounded-xl border border-white/40 shadow-lg backdrop-blur-md transition-all active:scale-90",
                      speakingId === doctor.id ? "bg-red-500 text-white" : "bg-white/80 text-primary-blue hover:bg-white"
                    )}
                  >
                    {speakingId === doctor.id ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  {doctor.isFree ? (
                    <div className="bg-emerald-500/90 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg backdrop-blur-sm">
                      FREE CONSULT
                    </div>
                  ) : (
                    <div className="bg-amber-500/90 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg backdrop-blur-sm">
                      PREMIUM
                    </div>
                  )}
                </div>
              </div>
              <motion.div
            initial={{ opacity: 1, x: 0 }}
            className="flex flex-col flex-grow w-full space-y-4"
          >
                <div className="flex-grow">
                  <p className="text-xs font-bold text-primary-blue uppercase tracking-widest mb-1">{doctor.specialty}</p>
                  <h4 className="text-xl font-bold tracking-tight">{doctor.name}</h4>
                  <p className="text-xs mt-3 text-gray-500 line-clamp-2 italic leading-relaxed px-2">"{doctor.about}"</p>
                </div>
 
                <Link
                  to={`/communication/${doctor.id}`}
                  className="w-full bg-primary-blue text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all group shadow-lg shadow-blue-200 mt-auto"
                >
                  <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Connect Now
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
