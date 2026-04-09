import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Status } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface UserStatusViewProps {
  userId: string;
  allStatuses: Status[];
  onClose: () => void;
}

export const UserStatusView: React.FC<UserStatusViewProps> = ({ userId, allStatuses, onClose }) => {
  const userStatuses = allStatuses.filter(s => s.userId === userId).sort((a, b) => a.timestamp - b.timestamp);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (userStatuses.length === 0) return null;

  const currentStatus = userStatuses[currentIndex];

  const nextStatus = () => {
    if (currentIndex < userStatuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const prevStatus = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;
    const duration = currentStatus.mediaType === 'video' ? 0 : 5000; // 5 seconds for images

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      if (isPaused) {
        startTime = time - (progress / 100) * duration;
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const elapsed = time - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      
      if (currentStatus.mediaType !== 'video') {
         setProgress(newProgress);
         if (newProgress >= 100) {
           nextStatus();
         } else {
           animationFrameId = requestAnimationFrame(animate);
         }
      }
    };

    if (currentStatus.mediaType !== 'video') {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [currentIndex, isPaused, currentStatus]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      if (total > 0) {
        setProgress((current / total) * 100);
      }
    }
  };

  const handleVideoEnded = () => {
    nextStatus();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 z-50">
        <X className="w-8 h-8" />
      </button>
      
      <div className="relative w-full max-w-md aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
        {/* Progress Bars */}
        <div className="absolute top-4 left-0 right-0 px-2 flex space-x-1 z-50">
          {userStatuses.map((status, idx) => (
            <div key={status.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Media */}
        <div 
          className="w-full h-full relative cursor-pointer"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {currentStatus.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={currentStatus.mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              muted={isMuted}
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              onPause={() => setIsPaused(true)}
              onPlay={() => setIsPaused(false)}
            />
          ) : (
            <img src={currentStatus.mediaUrl} className="w-full h-full object-contain pointer-events-none" />
          )}

          {/* Tap Areas for Navigation */}
          <div className="absolute inset-y-0 left-0 w-1/3" onClick={(e) => { e.stopPropagation(); prevStatus(); }} />
          <div className="absolute inset-y-0 right-0 w-1/3" onClick={(e) => { e.stopPropagation(); nextStatus(); }} />
        </div>
        
        {/* Controls */}
        <div className="absolute top-8 right-2 flex flex-col space-y-2 z-50">
          {currentStatus.mediaType === 'video' && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }} 
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (currentStatus.mediaType === 'video' && videoRef.current) {
                if (isPaused) videoRef.current.play();
                else videoRef.current.pause();
              } else {
                setIsPaused(!isPaused);
              }
            }} 
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
        
        {/* User Info & Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
          <div className="flex items-center space-x-2 mb-2">
            {currentStatus.userPhoto && (
              <img src={currentStatus.userPhoto} className="w-8 h-8 rounded-full border border-white/50" />
            )}
            <p className="font-bold text-sm shadow-black drop-shadow-md">{currentStatus.userName}</p>
            <span className="text-xs text-white/70 shadow-black drop-shadow-md">
              {new Date(currentStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {currentStatus.caption && (
            <p className="text-sm shadow-black drop-shadow-md">{currentStatus.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
};
