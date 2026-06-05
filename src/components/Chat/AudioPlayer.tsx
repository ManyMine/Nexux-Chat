import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const AudioPlayer: React.FC<{ url: string; isSent?: boolean; showDuration?: boolean }> = ({ url, isSent = false, showDuration = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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
      setCurrentTime(audioRef.current.currentTime);
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (Number(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      setProgress(Number(e.target.value));
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-md w-full max-w-[300px]",
      isSent ? "bg-[#5865f2] text-white" : "bg-[#2f3136] text-white"
    )}>
      <audio 
        ref={audioRef} 
        src={url} 
        onEnded={() => { setIsPlaying(false); setProgress(0); setCurrentTime(0); }}
        onTimeUpdate={updateProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onError={(e) => {
          console.error("Audio error in AudioPlayer:", e, "for URL:", url);
        }}
      />
      
      <div className="flex-shrink-0 flex items-center justify-center">
        {/* Placeholder for user avatar or P icon */}
        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center font-bold text-lg">P</div>
        <button 
          onClick={togglePlay} 
          className="ml-2 flex-shrink-0 p-2 bg-transparent rounded-full hover:bg-white/10 transition-all"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
        </button>
      </div>
      
      <div className="flex-grow flex flex-col gap-1">
        <input 
          type="range"
          min="0"
          max="100"
          value={isNaN(progress) ? 0 : progress}
          onChange={handleSeek}
          className={cn(
            "w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
            isSent ? "bg-white/30" : "bg-white/20"
          )}
        />
        <div className="flex justify-between text-[10px] opacity-80">
           <span>{formatTime(currentTime)} {showDuration ? `/ ${formatTime(duration)}` : ''}</span>
        </div>
      </div>
    </div>
  );
};
