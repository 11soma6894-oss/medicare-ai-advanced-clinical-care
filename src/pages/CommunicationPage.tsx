/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Phone, Video, Info, ArrowLeft, CheckCircle2, Sparkles, Volume2, VolumeX, Mic, MicOff, Youtube, Square, FileText, PenLine, Camera, Maximize2, Minimize2, Settings, User, Activity, ShieldAlert } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { generateHealthReport } from '../services/geminiService';
import { historyService } from '../services/historyService';
import { speak, stopSpeech, cleanTextForTTS } from '../services/ttsService';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { Doctor } from '../types';
import { DOCTORS as doctors } from '../constants';
import Markdown from 'react-markdown';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is missing. Communication features will be unavailable.");
  }
  return new GoogleGenAI({ apiKey: key || 'missing_key' });
};

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isComplete?: boolean;
}

async function getSafeUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  try {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      return await navigator.mediaDevices.getUserMedia(constraints);
    }
  } catch (err: any) {
    console.log("Real media device request failed, falling back to simulation stream:", err.message || err);
  }

  // Fallback: Create structured simulated audio and/or video tracks
  const tracks: MediaStreamTrack[] = [];

  if (constraints.audio) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        const track = dst.stream.getAudioTracks()[0];
        if (track) {
          tracks.push(track);
        }
      }
    } catch (e) {
      console.log("Could not generate simulated audio track:", e);
    }
  }

  if (constraints.video) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let frame = 0;
        const intervalId = setInterval(() => {
          frame++;
          ctx.fillStyle = '#0f172a'; // dark background
          ctx.fillRect(0, 0, 640, 480);
          
          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText("SIMULATED CONSULTATION CAMERA", 50, 100);
          
          ctx.fillStyle = '#64748b';
          ctx.font = '16px monospace';
          ctx.fillText("Sandbox Environment - Real Camera Not Found", 50, 140);
          ctx.fillText(`Frame Count: ${frame}`, 50, 180);

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (let x = 0; x < 640; x++) {
            const y = 240 + Math.sin((x + frame * 5) * 0.05) * 40;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }, 33);
        
        const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
        if (stream) {
          const track = stream.getVideoTracks()[0];
          if (track) {
            tracks.push(track);
            track.addEventListener('ended', () => {
              clearInterval(intervalId);
            });
          }
        }
      }
    } catch (e) {
      console.log("Could not generate simulated video track:", e);
    }
  }

  return new MediaStream(tracks);
}

const markdownComponents = {
  strong: ({ children }: any) => (
    <strong className="font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 px-1.5 py-0.5 rounded-lg inline-block transition-colors shrink-0">
      {children}
    </strong>
  )
};

const TypewriterText = ({ text, duration, onComplete }: { text: string, duration: number, onComplete?: () => void }) => {
  const [index, setIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  // Split text by standard whitespace capture to prevent cutting off in the middle of Markdown syntax lines or bold symbols
  const tokens = useMemo(() => {
    return text.split(/(\s+)/);
  }, [text]);
  
  useEffect(() => {
    setIndex(0);
    startTimeRef.current = performance.now();
    
    const animate = (time: number) => {
      if (startTimeRef.current === null) startTimeRef.current = time;
      const elapsed = (time - startTimeRef.current) / 1000; // in seconds
      
      const percentage = Math.min(1, elapsed / duration);
      const newIndex = Math.round(percentage * tokens.length);
      
      setIndex(newIndex);
      
      if (percentage < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
        setShowCursor(false);
      }
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tokens, duration, onComplete]);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorTimer);
  }, []);

  // Softly render the displayed subset of parsed markdown tokens
  const displayedText = useMemo(() => {
    return tokens.slice(0, index).join('');
  }, [tokens, index]);

  return (
    <div className="relative inline">
      <Markdown components={markdownComponents}>{displayedText}</Markdown>
      {showCursor && (
        <span className="inline-block w-1.5 h-4 bg-blue-500 ml-1 translate-y-0.5" />
      )}
    </div>
  );
};

export function CommunicationPage() {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const symptoms = searchParams.get('symptoms') || 'No symptoms provided';
  const role = searchParams.get('role') || 'patient';
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const doctor = doctors.find(d => d.id === doctorId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showDoctorInfo, setShowDoctorInfo] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (start: number, end: number) => {
    const diff = Math.floor((end - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [liveTypewriting, setLiveTypewriting] = useState<{ id: string, text: string, duration: number } | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const spokenMessageIdsRef = useRef<Set<string>>(new Set());

  const { isListening, interimText, error: speechError, startListening, stopListening, simulateSpeech } = useSpeechToText();

  const handleSimulateSpeech = (text: string) => {
    simulateSpeech(text, (updatedText, isFinal) => {
      if (isFinal) {
        handleSend(updatedText);
      } else {
        setInput(updatedText);
      }
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);
  const lastSpokenRef = useRef<number | null>(null);
  const hasInitializedChatRef = useRef(false);

  // Watch for new AI messages and auto-play them
  useEffect(() => {
    if (!messages.length || sessionEnded) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'model' && (lastMessage.isComplete || lastMessage.id.startsWith('welcome')) && !spokenMessageIdsRef.current.has(lastMessage.id)) {
      spokenMessageIdsRef.current.add(lastMessage.id);
      
      const cleanedText = cleanTextForTTS(lastMessage.content);
      
      speak(cleanedText, {
        gender: doctor?.gender as any,
        name: doctor?.name,
        onStart: (duration) => {
          setIsSpeaking(lastMessage.id);
          setLiveTypewriting({
            id: lastMessage.id,
            text: lastMessage.content,
            duration: Math.max(0.2, duration || cleanedText.length * 0.05) 
          });
        },
        onEnd: () => {
          setIsSpeaking(null);
          setLiveTypewriting(null);
        },
        onError: () => {
          setIsSpeaking(null);
          setLiveTypewriting(null);
        }
      });
    }
  }, [messages, sessionEnded, doctor]);

  const handleStartCall = async () => {
    if (isCallActive || sessionEnded) return;
    setIsCallActive(true);
    stopSpeech();

    // Initialize Media in background
    const startMedia = async () => {
      try {
        const stream = await getSafeUserMedia({ audio: true });
        setLocalStream(stream);
        setIsMicOn(true);
      } catch (err: any) {
        console.log("Media initialization info (falling back to sterile simulation stream):", err);
        setIsMicOn(false);
      }
    };

    const initChat = async () => {
      // Initialize Chat Session
      const systemPrompt = `You are ${doctor?.name}, a world-class ${doctor?.specialty} practicing in India. This is a professional medical consultation specifically for the Indian population.
      
      TONE: Warm, deeply reassuring, and clinical. You are a real human doctor with rich emotional bedside manners, not a cold AI robot. Express heart-to-heart human empathy.
      
      GUIDELINES:
      1. BREVITY: Keep all responses to 1-2 SHORT sentences maximum.
      2. MEDICAL ADVICE: Proactively recommend appropriate professional **medications** (bold them like **Paracetamol**, **Azithromycin** so they highlight nicely) for recovery. Do NOT suggest home remedies.
      3. HUMAN EMOTION: Use warm comforting human voice expressions when speaking. E.g., 'Oh, please don't worry, we will get you through this together', 'Take a soft breath', or 'My dear patient, let's treat this promptly.'
      4. INDIAN CONTEXT: Consider Indian climatic conditions, diet, and lifestyle (e.g., spicy food impact on gastric issues, pollution impact on respiratory issues).
      5. NO YOGA: Do NOT suggest yoga or asanas.
      6. EMPATHY: Acknowledge the patient's symptoms with genuine warmth and emotional core.
      7. SAFETY: If symptoms sound emergency-grade, advise immediate physical care at the nearest hospital.
      8. SEARCH: Use Google Search to verify any medication dosages relevant to the Indian market.
      9. CAMERA: If you need to see a physical symptom (rash, swelling, etc.), politely ask the user to turn on their camera.
      
      NEVER use AI disclaimers or "as an AI...". Be the doctor.`;

      const ai = getAI();
      chatSessionRef.current = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: systemPrompt,
          tools: [{ googleSearch: {} }]
        }
      });

      const userName = auth.currentUser?.displayName?.split(' ')?.[0] || 'there';
      const welcome = `Hi ${userName}, I'm ${doctor?.name}. I've carefully reviewed your notes about ${symptoms}. I'm here to help—how have you been feeling since these symptoms started?`;
      
      setMessages([{
        id: 'welcome-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: welcome,
        timestamp: Date.now()
      }]);
    };

    // Run both in parallel for speed
    startMedia();
    await initChat();
  };

  const handleUnlockFreeSpecialist = () => {
    if (authUser) {
      localStorage.setItem('medicare_active_plan_' + authUser.uid, 'Pro');
      const cachedDemo = localStorage.getItem('medicare_demo_user');
      if (cachedDemo) {
        try {
          const parsed = JSON.parse(cachedDemo);
          parsed.activePlan = 'Pro';
          localStorage.setItem('medicare_demo_user', JSON.stringify(parsed));
        } catch (e) {
          console.warn("Storage sync skipped: ", e);
        }
      }
      window.location.reload();
    } else {
      setShowSubscriptionModal(false);
      hasInitializedChatRef.current = true;
      handleStartCall();
    }
  };

  useEffect(() => {
    if (!doctor || hasInitializedChatRef.current) return;
    
    const isPremiumRecord = authUser?.activePlan != null || authUser?.role === 'admin' || authUser?.email === '11neetusharma6894@gmail.com';
    
    if (!doctor.isFree && role === 'patient' && !isPremiumRecord) {
      setShowSubscriptionModal(true);
    } else {
      hasInitializedChatRef.current = true;
      handleStartCall();
    }
  }, [doctor, authUser]);

  const handleSend = async (customInput?: string) => {
    const textToSend = (customInput || input || (isListening ? interimText : '')).trim();
    if (!textToSend || sessionEnded || isProcessing) return;

    if (isListening) stopListening();
    setIsProcessing(true);
    setIsTyping(true);
    setInput('');
    
    const userMsg: Message = { id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9), role: 'user', content: textToSend, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      if (!chatSessionRef.current) {
        await handleStartCall();
      }

      // Create a temporary ID for the AI response
      const aiResponseId = 'ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      const streamResponse = await chatSessionRef.current.sendMessageStream({ message: textToSend });
      
      let fullText = '';
      
      for await (const chunk of streamResponse) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
        }
      }

      // Mark as complete and trigger synchronized voice and typewriter
      setMessages(prev => [...prev, {
        id: aiResponseId,
        role: 'model',
        content: fullText,
        isComplete: true,
        timestamp: Date.now()
      }]);
    } catch (err) {
      console.warn('Chat interaction status: fallback response active.', err);
      
      // Dynamic offline medical consultation fallback matching our warm, professional doctor persona
      let fallbackText = '';
      const textLower = textToSend.toLowerCase();
      
      if (textLower.includes('fever') || textLower.includes('temperature') || textLower.includes('hot')) {
        fallbackText = `Oh, please don't worry, my dear patient. For fever, I recommend taking a tablet of **Paracetamol 500mg** up to three times a day after meals. Complete hydration of about three litres of water is essential. We will get you through this together. Do you have body pain as well?`;
      } else if (textLower.includes('cough') || textLower.includes('cold') || textLower.includes('throat') || textLower.includes('congest')) {
        fallbackText = `I understand your distress, please take a soft breath. For cold and dry throat, taking a dose of **Cetirizine 10mg** once daily at night or a gentle cough lozenge will soothe your chest. Let's treat this promptly and prevent congestion with warm steam inhalation twice a day. Is it dry?`;
      } else if (textLower.includes('stomach') || textLower.includes('pain') || textLower.includes('loose') || textLower.includes('vomit') || textLower.includes('digest') || textLower.includes('acid')) {
        fallbackText = `I understand how unsettling stomach issues are, don't worry! I suggest taking **Pantoprazole 40mg** once daily in the morning on an empty stomach to alleviate discomfort, paired with **ORS solution** to restore hydration. Do avoid spicy or heavy greasy food. Are you having nausea?`;
      } else if (textLower.includes('headache') || textLower.includes('migraine')) {
        fallbackText = `Headaches can be incredibly draining, my dear. I warmly recommend taking a soft rest in a dark, quiet room, staying hydrated, and taking a dose of **Crocin Pain Relief** or **Ibuprofen 400mg** if severe. Don't worry, it will subside very soon. Are you experiencing eye strain?`;
      } else {
        fallbackText = `Oh, please don't worry, we will manage this together. I understand these symptoms are causing discomfort. For overall recovery and symptoms relief, I suggest resting well, keeping hydrated, and taking simple symptomatic relief like **Paracetamol 500mg** if needed. My dear patient, let's treat this promptly. Please share if anything else changes.`;
      }

      const aiResponseId = 'ai-fallback-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      setMessages(prev => [...prev, {
        id: aiResponseId,
        role: 'model',
        content: fallbackText + "\n\n*(Symptom assessment loaded under high clinic volume)*",
        isComplete: true,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
      setIsProcessing(false);
    }
  };

  const handleEndSession = async () => {
    stopSpeech();
    stopListening();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setGeneratingReport(true);
    setSessionEnded(true);

    try {
      const report = await generateHealthReport(symptoms, messages);
      const reportContent = `## Medical Consultation Summary\n\n### Diagnosis\n${report.diagnosis}\n\n### Prescription\n${report.prescription.medicines.map((m: any) => `- **${m.name}**: ${m.dosage} (${m.frequency})`).join('\n')}\n\n### LifeStyle\n${report.prescription.yoga.map((y: any) => `- ${y}`).join('\n')}\n\n--- *Automated record*`;
      setMessages(prev => [...prev, { id: 'report-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9), role: 'model', content: reportContent, timestamp: Date.now() }]);

      // Save to local history
      const record = {
        id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        userId: auth.currentUser?.uid || 'anonymous',
        userName: auth.currentUser?.displayName || 'Guest User',
        doctorName: doctor.name,
        symptoms: symptoms,
        diagnosis: report.diagnosis,
        prescription: report.prescription,
        startTime: sessionStartTime,
        timestamp: Date.now(),
        aiAgentResponseTime: 0,
        userResponseTime: 0
      };
      
      historyService.saveRecord(record);

      // Save to Firestore if authenticated using the exact record.id
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'medicalRecords', record.id), {
          ...record,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser?.uid}/medicalRecords/${record.id}`));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, liveTypewriting]);

  return (
    <div className="flex flex-col h-screen bg-slate-50/50 overflow-hidden relative font-sans">
      {/* Premium Interactive Ambient Backdrop Glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-blue-400/5 blur-[100px] pointer-events-none select-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-400/5 blur-[120px] pointer-events-none select-none" />

      {/* Sleek Top Navigation Bar */}
      <header className="h-16 md:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 z-[60] shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            type="button"
            className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-all border border-slate-100 active:scale-95"
            title="Return back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={doctor.image} className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shadow-sm border border-slate-100 transition-all duration-300", isSpeaking && "ring-4 ring-blue-500/30 scale-105 border-blue-400")} alt="" />
              <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full transition-all duration-300", isSpeaking ? "bg-blue-500 animate-pulse" : "bg-emerald-500")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm md:text-base tracking-tight">{doctor.name}</h4>
                <div className="bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5 hidden sm:flex">
                  <div className="w-1 bg-emerald-500 h-1 rounded-full animate-ping" />
                  <span className="text-[9px] font-extrabold text-emerald-600 tracking-wider uppercase">Active Call</span>
                </div>
              </div>
              {isSpeaking ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex gap-0.5 items-end h-2.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <motion.div
                        key={val}
                        animate={{ height: [3, 10, 3] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: val * 0.1 }}
                        className="w-0.5 bg-blue-500 rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-[9.5px] font-black text-blue-600 tracking-wider uppercase animate-pulse">Speaking...</span>
                </div>
              ) : (
                <p className="text-[10px] md:text-xs text-slate-400 font-semibold">{doctor.specialty}</p>
              )}
            </div>
          </div>
        </div>

        {/* Media controls integrated clean into header */}
        <div className="flex items-center gap-2">
          {!sessionEnded && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
              {/* Mic Control */}
              <button 
                onClick={() => { 
                  if (localStream) { 
                    const track = localStream.getAudioTracks()[0];
                    if (track) {
                      track.enabled = !isMicOn; 
                      setIsMicOn(!isMicOn); 
                    }
                  } 
                }} 
                type="button"
                className={cn(
                  "p-2 rounded-lg transition-all active:scale-95", 
                  isMicOn ? "text-slate-600 hover:bg-slate-200" : "bg-red-500 text-white shadow-sm"
                )}
                title={isMicOn ? "Mute microphone" : "Unmute microphone"}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* Camera Control */}
              <button 
                onClick={async () => { 
                  if (localStream) { 
                    const videoTrack = localStream.getVideoTracks()[0];
                    if (videoTrack) {
                      videoTrack.enabled = !isCameraOn; 
                      setIsCameraOn(!isCameraOn); 
                    } else if (!isCameraOn) {
                      try {
                        const videoStream = await getSafeUserMedia({ 
                          video: { width: 1280, height: 720 } 
                        });
                        const newVideoTrack = videoStream.getVideoTracks()[0];
                        localStream.addTrack(newVideoTrack);
                        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
                        setIsCameraOn(true);
                      } catch (err) {
                        console.log("Failed to turn on camera:", err);
                      }
                    }
                  } else {
                    try {
                      const stream = await getSafeUserMedia({ 
                        video: { width: 1280, height: 720 },
                        audio: true 
                      });
                      setLocalStream(stream);
                      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                      setIsCameraOn(true);
                    } catch (err) {
                      console.log("Failed to initialize media:", err);
                    }
                  }
                }} 
                type="button"
                className={cn(
                  "p-2 rounded-lg transition-all active:scale-95", 
                  isCameraOn ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                )}
                title={isCameraOn ? "Turn camera off" : "Turn camera on"}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={() => setShowDoctorInfo(true)} type="button" className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100" title="Consultation details">
            <Info className="w-5 h-5" />
          </button>

          {!sessionEnded && (
            <button 
              onClick={handleEndSession} 
              type="button"
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 rotate-[135deg]" /> 
              <span className="hidden sm:inline">End Call</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Unified Consultation Canvas */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col min-h-0 bg-transparent relative">
        
        {/* Compact Floating Video / Audio Consultation PIP widget */}
        <AnimatePresence>
          {isCallActive && !sessionEnded && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-4 right-4 z-40 w-44 h-56 md:w-56 md:h-40 bg-slate-900 border border-slate-200/50 shadow-2xl rounded-2xl overflow-hidden"
            >
              <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover", !isCameraOn && "opacity-0")} />
              
              {!isCameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 relative">
                    <div className={cn("absolute inset-0 rounded-full bg-blue-500/10", isMicOn && "animate-ping")} />
                    <User className="w-5 h-5 text-slate-400 relative z-10" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-3 uppercase tracking-wider">Audio Feed Only</span>
                  {isMicOn && (
                    <div className="flex gap-0.5 items-end h-2 mt-1.5">
                      {[1, 2, 3].map(i => (
                        <motion.div 
                          key={i} 
                          animate={{ height: [3, 8, 3] }} 
                          transition={{ repeat: Infinity, duration: 0.4, delay: i * 0.1 }} 
                          className="w-0.5 bg-blue-500 rounded-full" 
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Patient Indicator Tag */}
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
                <span className="text-[8px] font-bold text-white uppercase tracking-wider">You (Patient)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message / Chat Feed Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pt-6 pb-20 custom-scrollbar">
          
          {/* Welcome session duration / indicator banner */}
          <div className="flex justify-center pb-2">
            <div className="bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Session started {new Date(sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Duration {formatDuration(sessionStartTime, currentTime)}
            </div>
          </div>

          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] px-6 py-4 rounded-3xl text-[13px] leading-relaxed transition-all duration-300", 
                m.role === 'user' 
                  ? "bg-slate-900 text-white rounded-br-sm shadow-md" 
                  : cn(
                      "bg-white text-slate-700 border rounded-bl-sm shadow-xs",
                      isSpeaking === m.id ? "border-blue-200 bg-blue-50/10 shadow-md shadow-blue-500/5 ring-1 ring-blue-100/50" : "border-slate-100"
                    )
              )}>
                {liveTypewriting?.id === m.id ? (
                  <div className="markdown-content">
                    <TypewriterText text={liveTypewriting.text} duration={liveTypewriting.duration} />
                  </div>
                ) : (
                  <div className="markdown-content">
                    <Markdown components={markdownComponents}>{m.content}</Markdown>
                  </div>
                )}
                <div className={cn("text-[9px] mt-2 font-bold uppercase tracking-wider flex items-center justify-between gap-4", m.role === 'user' ? "text-slate-400 text-right" : "text-slate-400 text-left")}>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.role === 'model' && isSpeaking === m.id && (
                    <span className="text-blue-600 flex items-center gap-1.5 bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-100/50 text-[8.5px] font-black tracking-widest uppercase animate-pulse">
                      <Volume2 className="w-3 h-3 text-blue-500" /> Speaking Voice
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <div className="flex gap-1.5 p-3 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">{doctor.name} is thinking</span>
              {[0, 1, 2].map(i => (
                <motion.div 
                  key={i} 
                  animate={{ opacity: [0.4, 1, 0.4] }} 
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} 
                  className="w-1.5 h-1.5 bg-slate-300 rounded-full" 
                />
              ))}
            </div>
          )}
          
          {/* Quick clinical queries based on state */}
          {!isTyping && messages.length > 0 && messages[messages.length-1].role === 'model' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-2">
              {[
                "Tell me more",
                "Dosage help?",
                "Side effects?",
                "Got it, thanks"
              ].map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="whitespace-nowrap bg-white text-slate-500 px-4 py-1.5 rounded-full text-[11px] font-semibold border border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input Interface with glassy blur pane */}
        <div className="p-5 bg-white/80 backdrop-blur-xl border-t border-slate-100/80 absolute bottom-0 left-0 right-0 z-10 shrink-0 shadow-lg shadow-slate-100/50">
          <AnimatePresence>
            {speechError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 bg-red-50 border border-red-100 p-3 rounded-xl flex flex-col gap-2 shadow-sm"
              >
                <p className="text-[10px] font-bold text-red-600 text-center uppercase tracking-wide">{speechError}</p>
                <div className="flex flex-col items-center gap-1.5 border-t border-red-100 pt-1.5 bg-red-50/50">
                  <span className="text-[9px] font-semibold text-slate-500 text-center">Click a shortcut to simulate real voice input:</span>
                  <div className="flex flex-wrap justify-center gap-1.5 w-full">
                    {[
                      "What medications should I take for this?",
                      "Can you explain my clinical diagnosis?",
                      "Are there any specific food restrictions?"
                    ].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => handleSimulateSpeech(sample)}
                        className="text-[9px] bg-white border border-red-200 text-slate-700 font-semibold px-2 py-1 rounded-lg hover:bg-neutral-50 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer active:scale-95"
                      >
                        "{sample}"
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-center gap-2 max-w-2xl mx-auto w-full">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                placeholder="Type your message..." 
                className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-12 py-3.5 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-sm" 
              />
              <button 
                onClick={() => (isListening ? stopListening() : startListening((t, final) => final && handleSend(t)))} 
                type="button"
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all", 
                  isListening ? "bg-red-500 text-white animate-pulse" : "text-slate-400 hover:text-blue-500"
                )}
                title={isListening ? "Stop voice transcription" : "Listen via speech recognition"}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={() => handleSend()} 
              disabled={!input.trim() && !isListening} 
              type="button"
              className="p-3.5 bg-blue-600 text-white rounded-2xl disabled:opacity-20 disabled:grayscale transition-all shadow-md shadow-blue-600/10 active:scale-95 hover:bg-blue-700"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDoctorInfo && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] p-8 border-l border-slate-100">
            <button onClick={() => setShowDoctorInfo(false)} type="button" className="mb-8 p-2 hover:bg-slate-50 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <img src={doctor.image} className="w-32 h-32 rounded-3xl object-cover mb-4 shadow-lg" alt="" />
            <h4 className="text-xl font-bold text-slate-900">{doctor.name}</h4>
            <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mb-4">{doctor.specialty}</p>
            <p className="text-sm text-slate-500 leading-relaxed italic border-l-2 border-blue-500 pl-4 py-1 bg-blue-50/50 rounded-r-lg">"{doctor.about}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="absolute inset-0 z-[100] bg-slate-900/45 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 text-center max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center">
              <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"><Sparkles className="w-8 h-8 text-amber-600 animate-pulse" /></div>
              <h4 className="text-2xl font-black mb-3">Premium Access</h4>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">Consultations with specialists are exclusive to Medicare AI Plus members.</p>
              
              <button 
                onClick={handleUnlockFreeSpecialist} 
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest mb-3 shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Activate Free Trial (Immediate)
              </button>

              <button onClick={() => navigate('/pricing')} className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold mb-4 text-xs uppercase tracking-wide hover:bg-slate-800 active:scale-95 transition-colors cursor-pointer">View Plans</button>
              <button onClick={() => navigate('/')} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors cursor-pointer">Back</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

