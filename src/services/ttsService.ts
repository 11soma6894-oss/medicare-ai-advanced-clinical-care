/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is missing. TTS features will be unavailable.");
  }
  return new GoogleGenAI({ apiKey: key || 'missing_key' });
};

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

/**
 * Clean text for TTS by removing markdown and URLs
 */
export function cleanTextForTTS(text: string) {
  return text
    .replace(/\*\*/g, '') // Remove bold markers for speech
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Keep the label of markdown links: [label](url) -> label
    .replace(/[#*`~_]/g, ' ') // Remove remaining markdown symbols
    .replace(/https?:\/\/\S+/g, ' ') // Remove remaining URLs
    .replace(/[\[\](){}<>]/g, ' ') // Remove any leftover brackets
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

export async function stopSpeech() {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Already stopped
    }
    currentSource = null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function speak(text: string, options: { 
  voiceName?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  gender?: 'male' | 'female';
  name?: string; // Add name to help guess gender if missing
  onStart?: (duration?: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
} = {}) {
  let { voiceName, gender, name, onStart, onEnd, onError } = options;

  // Fallback if gender is missing: guess from name
  if (!gender && name) {
    const n = name.toLowerCase();
    if (n.includes('james') || n.includes('michael') || n.includes('robert') || n.includes('david') || n.includes('marcus') || n.includes('liam')) {
      gender = 'male';
    } else if (n.includes('sarah') || n.includes('emily') || n.includes('lisa') || n.includes('sofia') || n.includes('chloe')) {
      gender = 'female';
    }
  }
  
  // Default fallback
  if (!gender) gender = 'female';

  try {
    const ttsText = cleanTextForTTS(text);
    if (!ttsText) return;

    await stopSpeech();

    // Use Gemini TTS if possible
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const selectedVoice = voiceName || (gender === 'female' ? 'Kore' : 'Charon');

      console.log(`TTS using voice: ${selectedVoice} for gender: ${gender}`);

      const ai = getAI();

      const response = await ai.models.generateContent({
        model: "models/gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: ttsText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const view = new DataView(new ArrayBuffer(len));
        for (let i = 0; i < len; i++) {
          view.setUint8(i, binaryString.charCodeAt(i));
        }
        
        const floatData = new Float32Array(len / 2);
        for (let i = 0; i < len; i += 2) {
          const sample = view.getInt16(i, true);
          floatData[i / 2] = sample / 32768;
        }

        const buffer = audioContext.createBuffer(1, floatData.length, 24000);
        buffer.copyToChannel(floatData, 0);

        onStart?.(buffer.duration);
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => {
          if (currentSource === source) {
            currentSource = null;
            onEnd?.();
          }
        };
        currentSource = source;
        source.start(0);
        return;
      }
    } catch (geminiErr) {
      console.warn("Gemini TTS failed, falling back to Browser TTS:", geminiErr);
    }

    // Fallback to Browser TTS
    if (!('speechSynthesis' in window)) {
      throw new Error("TTS not supported in this browser");
    }

    const utterance = new SpeechSynthesisUtterance(ttsText);
    const voices = window.speechSynthesis.getVoices();
    
    // Better voice selection fallback
    const findVoice = () => {
      // 1. Try to find a high-quality voice with the right gender and language
      const match = voices.find(v => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        const isRightLang = lang.startsWith('en');
        if (!isRightLang) return false;

        if (gender === 'female') {
          return name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('google us english');
        } else {
          return name.includes('male') || name.includes('daniel') || name.includes('david') || name.includes('google uk english male');
        }
      });
      if (match) return match;

      // 2. Just find any voice with the right gender
      return voices.find(v => {
        const name = v.name.toLowerCase();
        if (gender === 'female') return name.includes('female') || name.includes('samantha');
        return name.includes('male') || name.includes('daniel');
      });
    };

    const voice = findVoice();
    if (voice) utterance.voice = voice;
    
    utterance.rate = 1.0;
    utterance.pitch = gender === 'female' ? 1.1 : 0.9;
    
    const wordsCount = ttsText.split(/\s+/).length;
    const voiceDuration = Math.max(1, (wordsCount / 140) * 60); // Math estimate for word list

    utterance.onstart = () => onStart?.(voiceDuration);
    utterance.onend = () => onEnd?.();
    utterance.onerror = (e) => onError?.(e);

    window.speechSynthesis.speak(utterance);

  } catch (err) {
    console.error("Critical TTS Error:", err);
    onError?.(err);
  }
}
