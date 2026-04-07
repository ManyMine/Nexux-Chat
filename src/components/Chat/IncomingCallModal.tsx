import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Call } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';

interface IncomingCallModalProps {
  call: Call | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ call, onAccept, onDecline }) => {
  React.useEffect(() => {
    if (!call) return;

    // Simple beep sound simulation
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let interval: NodeJS.Timeout;

    const playBeep = () => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    };

    if (call) {
      interval = setInterval(playBeep, 2000);
      playBeep();
    }

    return () => {
      if (interval) clearInterval(interval);
      audioCtx.close();
    };
  }, [call]);

  if (!call) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-[#111214] border border-[#1e1f22] rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-10 flex flex-col items-center text-center space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-[#5865f2] rounded-full animate-ping opacity-20" />
              <img 
                src={call.callerPhoto || DEFAULT_AVATAR} 
                alt={call.callerName}
                className="w-32 h-32 rounded-full object-cover ring-4 ring-[#5865f2] relative z-10"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#5865f2] p-3 rounded-full border-4 border-[#111214] z-20">
                {call.type === 'video' ? <Video className="w-6 h-6 text-white" /> : <Phone className="w-6 h-6 text-white" />}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-white font-bold text-3xl">{call.callerName}</h3>
              <p className="text-[#b5bac1] text-lg animate-pulse">Chamada de {call.type === 'video' ? 'Vídeo' : 'Voz'} recebida...</p>
            </div>

            <div className="flex items-center space-x-6 w-full pt-4">
              <button 
                onClick={onDecline}
                className="flex-1 bg-[#f23f42] hover:bg-[#d83c3e] text-white py-5 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#f23f42]/20"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <button 
                onClick={onAccept}
                className="flex-1 bg-[#23a559] hover:bg-[#1f8f4c] text-white py-5 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#23a559]/20"
              >
                {call.type === 'video' ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
              </button>
            </div>
          </div>
          
          {/* Ringing animation bar */}
          <div className="h-2 w-full bg-[#1e1f22]">
            <motion.div 
              className="h-full bg-[#5865f2]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 30, ease: "linear" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
