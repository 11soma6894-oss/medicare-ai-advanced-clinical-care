/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, User, Stethoscope, ChevronRight, MessageSquare, Mic, MicOff } from 'lucide-react';
import { suggestDoctors } from '../services/geminiService';
import { Doctor } from '../types';
import { DOCTORS as allDoctors } from '../constants';
import { Link } from 'react-router-dom';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { cn } from '../lib/utils';

export function ConsultationPage() {
  const [symptoms, setSymptoms] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedDoctors, setSuggestedDoctors] = useState<Doctor[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { isListening, interimText, error: speechError, startListening, stopListening, simulateSpeech } = useSpeechToText();

  const handleSimulate = (text: string) => {
    simulateSpeech(text, (updatedText, isFinal) => {
      if (isFinal) {
        setSymptoms(prev => {
          const base = prev.trim();
          return base ? `${base} ${updatedText.charAt(0).toUpperCase() + updatedText.slice(1)}.` : `${updatedText.charAt(0).toUpperCase() + updatedText.slice(1)}.`;
        });
      }
    });
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text, isFinal) => {
        if (isFinal) {
          setSymptoms(prev => {
            const base = prev.trim();
            return base ? `${base} ${text.charAt(0).toUpperCase() + text.slice(1)}.` : `${text.charAt(0).toUpperCase() + text.slice(1)}.`;
          });
        }
      });
    }
  };

  const handleConsult = async () => {
    if (!symptoms.trim()) return;
    setAnalyzing(true);
    setHasSearched(true);
    setSuggestedDoctors([]);
    
    try {
      const suggestions = await suggestDoctors(symptoms, allDoctors);
      setSuggestedDoctors(suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
      <section className="text-center space-y-4 px-4 md:px-0">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">CONSULTATION</h2>
        <p className="text-gray-500 font-medium text-base md:text-lg tracking-tight">Describe your symptoms below and our AI will find the best specialist for you.</p>
      </section>

      <section className="glass-panel p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-blue-200/50 mx-4 md:mx-0">
        <div className="space-y-6">
          <div className="relative group">
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={isListening ? "Listening... Speak now" : "e.g., I have been feeling sharp chest pains and shortness of breath lately..."}
              className="w-full h-40 md:h-48 bg-white/50 border-0 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-base md:text-lg resize-none outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-blue-300 font-medium"
            />
            
            <AnimatePresence>
              {isListening && interimText && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <p className="text-xl md:text-2xl font-bold text-blue-400 italic text-center leading-relaxed">
                    "{interimText}..."
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {speechError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 left-4 right-4 bg-red-50 border border-red-100 p-4 rounded-xl z-20 flex flex-col gap-2.5 shadow-md"
                >
                  <p className="text-xs font-bold text-red-600 text-center uppercase tracking-wider">{speechError}</p>
                  <div className="flex flex-col items-center gap-1.5 border-t border-red-100 pt-2 bg-red-50/50">
                    <span className="text-[10px] font-semibold text-slate-500 text-center mb-0.5">Click a medical shortcut to simulate voice dictation:</span>
                    <div className="flex flex-wrap justify-center gap-1.5 w-full">
                      {[
                        "I have been coughing for 3 days and have a mild fever.",
                        "Severe migraine on the left side of my head.",
                        "My chest feels tight and heart is beating quickly."
                      ].map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => handleSimulate(sample)}
                          className="text-[10px] bg-white border border-red-200 text-slate-700 font-medium px-2 py-1 rounded-lg hover:bg-neutral-50 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer active:scale-95"
                        >
                          "{sample.length > 50 ? sample.slice(0, 47) + '...' : sample}"
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-3">
              {isListening && (
                <div className="flex items-center gap-2 bg-blue-500/10 backdrop-blur-md px-4 py-2 rounded-full border border-blue-500/20">
                  <div className="flex gap-1 items-end h-3">
                    {[1, 2, 3].map(i => (
                      <motion.div 
                        key={i} 
                        animate={{ height: [4, 12, 4] }} 
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }} 
                        className="w-1 bg-blue-500 rounded-full" 
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Dictating</span>
                </div>
              )}
              
              <button
                onClick={toggleListening}
                type="button"
                title={isListening ? "Stop listening" : "Start dictating symptoms"}
                className={cn(
                  "flex items-center gap-2 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all shadow-lg active:scale-95",
                  isListening 
                    ? 'bg-red-500 text-white shadow-red-500/20' 
                    : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-100'
                )}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5 md:w-6 md:h-6" />
                ) : (
                  <>
                    <Mic className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Dictate</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <button
            onClick={handleConsult}
            disabled={analyzing || !symptoms.trim()}
            className="w-full bg-primary-blue text-white py-5 md:py-6 rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-[0.98] disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
                Analyzing Symptoms...
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                Analyze & Suggest Doctors
              </>
            )}
          </button>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {hasSearched && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <div className="h-px bg-white/50 flex-1" />
              <h3 className="text-2xl font-black tracking-tighter uppercase italic px-4">Suggested Specialists</h3>
              <div className="h-px bg-white/50 flex-1" />
            </div>

            {analyzing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map(i => (
                  <div key={i} className="glass-panel h-64 rounded-[2.5rem] p-8 animate-pulse flex gap-6">
                    <div className="w-24 h-24 bg-white/50 rounded-2xl" />
                    <div className="flex-1 space-y-4 py-2">
                      <div className="h-6 bg-white/50 rounded w-3/4" />
                      <div className="h-4 bg-white/50 rounded w-1/2" />
                      <div className="h-12 bg-white/50 rounded w-full mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestedDoctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suggestedDoctors.map((doctor) => (
                  <motion.div
                    key={doctor.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-[2.5rem] p-8 border border-white/50 shadow-sm hover:shadow-xl hover:shadow-blue-100 flex gap-6"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={doctor.image}
                        alt={doctor.name}
                        className="w-24 h-24 object-cover rounded-2xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-primary-blue text-white p-1.5 rounded-lg shadow-lg">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-bold text-primary-blue uppercase tracking-[0.2em]">{doctor.specialty}</p>
                          {doctor.isFree ? (
                             <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase">Free</span>
                          ) : (
                             <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase flex items-center gap-1">
                               <Sparkles className="w-2 h-2" />
                               Premium
                             </span>
                          )}
                        </div>
                        <h4 className="text-2xl font-bold tracking-tight">{doctor.name}</h4>
                      </div>

                      <Link
                        to={`/communication/${doctor.id}?symptoms=${encodeURIComponent(symptoms)}`}
                        className="flex items-center justify-between w-full bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold group shadow-lg"
                      >
                        Start Consultation
                        <MessageSquare className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 glass-panel rounded-[3rem] border-dashed border-blue-200">
                <p className="text-gray-400 font-medium italic">No specific matches found. Try describing in more detail.</p>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
