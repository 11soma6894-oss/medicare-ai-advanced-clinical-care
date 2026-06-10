import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isListeningRef = useRef(false);
  const shouldBeListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const onResultRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  const retryCountRef = useRef(0);

  // Clean up any remaining timers and recognition instances on unmount
  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error('Error aborting speech recognition on unmount', e);
        }
      }
    };
  }, []);

  const simulateSpeech = useCallback((text: string, onResult: (text: string, isFinal: boolean) => void) => {
    setError(null);
    setIsListening(true);
    shouldBeListeningRef.current = false;
    
    let currentText = '';
    const words = text.split(' ');
    let index = 0;
    
    if (restartTimerRef.current) {
      clearInterval(restartTimerRef.current);
    }
    
    const interval = setInterval(() => {
      if (index < words.length) {
        currentText += (index === 0 ? '' : ' ') + words[index];
        setInterimText(currentText);
        onResult(currentText, false);
        index++;
      } else {
        clearInterval(interval);
        setIsListening(false);
        setInterimText('');
        onResult(text, true);
      }
    }, 150);
    
    restartTimerRef.current = interval;
  }, []);

  const startListening = useCallback((onResult: (text: string, isFinal: boolean) => void, onEnd?: () => void) => {
    setError(null);
    shouldBeListeningRef.current = true;
    retryCountRef.current = 0;
    onResultRef.current = onResult;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const msg = "Speech recognition is not supported in your browser.";
      console.error(msg);
      setError(msg);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      retryCountRef.current = 0; // Reset retry count upon successful start
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          currentInterim += transcript;
        }
      }

      setInterimText(currentInterim);
      if (finalTranscript) {
        onResult(finalTranscript, true);
      } else if (currentInterim) {
        onResult(currentInterim, false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      
      const isNotAllowed = event.error === 'not-allowed';
      if (!isNotAllowed) {
        console.warn('Speech input status:', event.error);
      } else {
        console.log('Demo mode activated: please tap any of the quick-action speech templates');
      }
      
      let message = event.error;
      if (event.error === 'network') {
        message = 'Connection lost. Reconnecting...';
        
        // If it's a network error and we haven't exhausted our retries, try to auto-reconnect
        if (retryCountRef.current < 3) {
          retryCountRef.current += 1;
          console.log(`Speech network: Retrying (${retryCountRef.current}/3)...`);
          setError(message);
          // Let onend retry the start without marking shouldBeListeningRef as false
          return;
        } else {
          message = 'Speech connection failed. Please check your internet and click mic to retry.';
        }
      } else if (isNotAllowed) {
        // Detect if we are inside an iframe (e.g. AI Studio Web preview window)
        const inIframe = window.self !== window.top;
        if (inIframe) {
          message = 'Microphone access is not active. Use the quick-tap shortcuts below to simulate voice/symptom dictation smoothly!';
        } else {
          message = 'Microphone access is not active. Please authorize device access in your settings or use simulated speech templates!';
        }
      }
      
      setError(message);
      shouldBeListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      
      // If it stopped but we still want to be listening (e.g. no-speech timeout or auto-reconnecting network)
      if (shouldBeListeningRef.current) {
        const delay = retryCountRef.current > 0 ? 1500 : 0;
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }
        restartTimerRef.current = setTimeout(() => {
          try {
            if (shouldBeListeningRef.current) {
              recognition.start();
            }
          } catch (e) {
            console.log('Alternative restart for speech activation', e);
            if (retryCountRef.current >= 3) {
              setIsListening(false);
            }
          }
        }, delay);
      } else {
        setIsListening(false);
        setInterimText('');
        if (onEnd) onEnd();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.log('Speech activation notice:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    if (restartTimerRef.current) {
      clearInterval(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping speech recognition', e);
      }
      setIsListening(false);
      isListeningRef.current = false;
      setInterimText('');
    }
  }, []);

  return {
    isListening,
    interimText,
    error,
    startListening,
    stopListening,
    simulateSpeech
  };
}
