import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const updateProgress = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isNaN(p) ? 0 : p);
    }
  };

  useEffect(() => {
    console.log("AudioPlayer rendering for URL:", url);
  }, [url]);

  return (
    <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-2xl w-full max-w-[280px] mt-2 border border-border-primary/50">
      <audio 
        ref={audioRef} 
        src={url} 
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onTimeUpdate={updateProgress}
        onError={(e) => console.error("Audio error:", e)}
      />
      <button 
        onClick={togglePlay} 
        className="flex-shrink-0 p-2.5 bg-color-brand text-white rounded-full hover:bg-opacity-90 transition-all"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
      </button>
      
      <div className="flex-grow flex items-center gap-1.5 h-10">
         {/* Waveform representation */}
         {[...Array(20)].map((_, i) => (
           <div 
             key={i} 
             className={cn("w-1 rounded-full", (i / 20) * 100 <= progress ? "bg-color-brand" : "bg-text-muted/30")} 
             style={{ height: `${Math.random() * 60 + 20}%` }} 
           />
         ))}
      </div>
    </div>
  );
};
