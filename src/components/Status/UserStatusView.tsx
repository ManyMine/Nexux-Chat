import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, History, Heart, MessageCircle, Send, Music, Type, Link as LinkIcon } from 'lucide-react';
import { Status, UserProfile, StatusComment } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { getUserStatusHistory, likeStatus, commentStatus } from '@/src/services/firebaseService';
import { DEFAULT_AVATAR } from '@/src/constants';

interface UserStatusViewProps {
  userId: string;
  currentUser: UserProfile;
  allStatuses: Status[];
  onClose: () => void;
  initialStatusId?: string;
}

export const UserStatusView: React.FC<UserStatusViewProps> = ({ userId, currentUser, allStatuses, onClose, initialStatusId }) => {
  const [userStatuses, setUserStatuses] = useState(() => allStatuses.filter(s => s.userId === userId).sort((a, b) => a.timestamp - b.timestamp));
  const [showHistory, setShowHistory] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const filtered = allStatuses.filter(s => s.userId === userId).sort((a, b) => a.timestamp - b.timestamp);
    if (initialStatusId) {
      const index = filtered.findIndex(s => s.id === initialStatusId);
      return index !== -1 ? index : 0;
    }
    return 0;
  });
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll comments to bottom
  useEffect(() => {
    if (showComments) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showComments, userStatuses[currentIndex]?.comments.length]);

  useEffect(() => {
    if (showHistory) {
      getUserStatusHistory(userId).then(history => {
        const sorted = history.sort((a, b) => a.timestamp - b.timestamp);
        setUserStatuses(sorted);
      });
    } else {
      const filtered = allStatuses.filter(s => s.userId === userId).sort((a, b) => a.timestamp - b.timestamp);
      setUserStatuses(filtered);
    }
  }, [showHistory, userId, allStatuses]);

  if (userStatuses.length === 0) return null;

  const currentStatus = userStatuses[currentIndex];

  const nextStatus = useCallback(() => {
    if (currentIndex < userStatuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, userStatuses.length, onClose]);

  const prevStatus = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (progress >= 100) {
      nextStatus();
    }
  }, [progress, nextStatus]);

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
         if (newProgress < 100) {
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

  const handleHold = () => {
    setIsPaused(true);
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
  };

  const handleRelease = () => {
    if (showComments) return; // Stay paused if comments are open
    setIsPaused(false);
    if (videoRef.current) videoRef.current.play();
    if (audioRef.current) audioRef.current.play();
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = currentStatus.likes.includes(currentUser.uid);
    try {
      await likeStatus(currentStatus.id, currentUser.uid, !isLiked);
    } catch (error) {
      console.error("Error liking status:", error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await commentStatus(currentStatus.id, currentUser, commentText);
      setCommentText('');
    } catch (error) {
      console.error("Error commenting on status:", error);
    }
  };

  useEffect(() => {
    if (currentStatus.mediaType === 'video' && videoRef.current) {
      if (isPaused) videoRef.current.pause();
      else videoRef.current.play();
    }
    if (currentStatus.mediaType === 'audio' && audioRef.current) {
      if (isPaused) audioRef.current.pause();
      else audioRef.current.play();
    }
  }, [isPaused, currentStatus.mediaType]);

  useEffect(() => {
    if (showComments) setIsPaused(true);
  }, [showComments]);

  const isPost = currentStatus.mediaType === 'image' || currentStatus.mediaType === 'drawing';

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2 z-[130] transition-colors">
        <X className="w-8 h-8" />
      </button>
      
      <div className={cn(
        "relative w-full max-w-md aspect-[9/16] bg-black flex flex-col overflow-hidden shadow-2xl transition-all duration-300",
        showComments && "max-w-4xl aspect-auto h-[80vh] flex-row rounded-xl"
      )}>
        {/* Main Content Area */}
        <div className={cn(
          "relative flex-1 bg-black flex items-center justify-center overflow-hidden",
          showComments && "rounded-l-xl"
        )}>
          {/* Progress Bars (only for stories or if not showing comments) */}
          {!showComments && (
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
          )}

          {/* Media */}
          <div 
            className="w-full h-full relative cursor-pointer flex items-center justify-center"
            onMouseDown={handleHold}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onTouchStart={handleHold}
            onTouchEnd={handleRelease}
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
              />
            ) : currentStatus.mediaType === 'audio' ? (
              <div className="flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="w-32 h-32 rounded-full bg-color-brand/20 flex items-center justify-center mb-6 animate-pulse">
                  <Music className="w-16 h-16 text-color-brand" />
                </div>
                <audio
                  ref={audioRef}
                  src={currentStatus.mediaUrl}
                  autoPlay
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                    }
                  }}
                  onEnded={nextStatus}
                />
                <p className="text-lg font-bold mb-2">Áudio Status</p>
                <p className="text-sm text-white/60 italic">"{currentStatus.caption}"</p>
              </div>
            ) : currentStatus.mediaType === 'text' ? (
              <div className="w-full h-full flex items-center justify-center p-12 bg-gradient-to-br from-color-brand/40 to-black text-center">
                <div className="max-w-xs">
                  <Type className="w-12 h-12 text-white/20 mx-auto mb-6" />
                  <p className="text-2xl font-bold text-white leading-relaxed">{currentStatus.mediaUrl}</p>
                </div>
              </div>
            ) : currentStatus.mediaType === 'link' ? (
              <div className="w-full h-full flex items-center justify-center p-12 bg-gradient-to-br from-blue-600/40 to-black text-center">
                <div className="max-w-xs">
                  <LinkIcon className="w-12 h-12 text-white/20 mx-auto mb-6" />
                  <a 
                    href={currentStatus.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xl font-bold text-blue-400 hover:underline break-all"
                  >
                    {currentStatus.mediaUrl}
                  </a>
                  {currentStatus.caption && <p className="mt-4 text-white/60">{currentStatus.caption}</p>}
                </div>
              </div>
            ) : (
              <img 
                src={currentStatus.mediaUrl} 
                className="w-full h-full object-contain pointer-events-none" 
                referrerPolicy="no-referrer"
              />
            )}

            {/* Tap Areas for Navigation */}
            {!showComments && (
              <>
                <div className="absolute inset-y-0 left-0 w-1/4 z-40" onClick={(e) => { e.stopPropagation(); prevStatus(); }} />
                <div className="absolute inset-y-0 right-0 w-1/4 z-40" onClick={(e) => { e.stopPropagation(); nextStatus(); }} />
              </>
            )}
          </div>
          
          {/* Controls */}
          <div className="absolute top-8 right-2 flex flex-col space-y-3 z-50">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(!showHistory);
              }}
              className={cn("p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all", showHistory && "bg-color-brand")}
            >
              <History className="w-5 h-5" />
            </button>
            {(currentStatus.mediaType === 'video' || currentStatus.mediaType === 'audio') && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }} 
                className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (currentStatus.mediaType === 'video' && videoRef.current) {
                  if (isPaused) videoRef.current.play();
                  else videoRef.current.pause();
                } else if (currentStatus.mediaType === 'audio' && audioRef.current) {
                  if (isPaused) audioRef.current.play();
                  else audioRef.current.pause();
                } else {
                  setIsPaused(!isPaused);
                }
              }} 
              className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          </div>

          {/* Social Interactions Floating (only if not showing comments) */}
          {!showComments && (
            <div className="absolute right-4 bottom-32 flex flex-col space-y-6 z-50 items-center">
              <div className="flex flex-col items-center">
                <button 
                  onClick={handleLike}
                  className={cn(
                    "p-3 rounded-full bg-black/40 backdrop-blur-md transition-all hover:scale-110 active:scale-95",
                    currentStatus.likes.includes(currentUser.uid) ? "text-red-500" : "text-white"
                  )}
                >
                  <Heart className={cn("w-7 h-7", currentStatus.likes.includes(currentUser.uid) && "fill-current")} />
                </button>
                <span className="text-white text-xs font-bold mt-1 shadow-sm">{currentStatus.likes.length}</span>
              </div>
              <div className="flex flex-col items-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                  className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white transition-all hover:scale-110 active:scale-95"
                >
                  <MessageCircle className="w-7 h-7" />
                </button>
                <span className="text-white text-xs font-bold mt-1 shadow-sm">{currentStatus.comments.length}</span>
              </div>
            </div>
          )}
          
          {/* User Info & Caption */}
          {!showComments && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white pointer-events-none z-40">
              <div className="flex items-center space-x-3 mb-3">
                {currentStatus.userPhoto && (
                  <img src={currentStatus.userPhoto} className="w-10 h-10 rounded-full border-2 border-white/30 shadow-lg" />
                )}
                <div>
                  <p className="font-bold text-base shadow-black drop-shadow-md">{currentStatus.userName}</p>
                  <span className="text-xs text-white/60 shadow-black drop-shadow-md">
                    {new Date(currentStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              {currentStatus.caption && (
                <p className="text-sm leading-relaxed shadow-black drop-shadow-md max-w-[80%]">{currentStatus.caption}</p>
              )}
            </div>
          )}
        </div>

        {/* Comments Sidebar (Functional Post/Story) */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-80 bg-[#1e1f22] flex flex-col border-l border-white/10 z-[140]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-bold text-sm">Comentários</h3>
                <button onClick={() => setShowComments(false)} className="text-white/50 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {currentStatus.comments.length > 0 ? (
                    <>
                      {currentStatus.comments.map((comment) => (
                        <div key={comment.id} className="flex space-x-3">
                          <img 
                            src={comment.userPhoto || DEFAULT_AVATAR} 
                            className="w-8 h-8 rounded-full shrink-0" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white">{comment.userName}</span>
                              <span className="text-[10px] text-white/40">
                                {new Date(comment.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-white/80 mt-1 leading-relaxed break-words">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={commentsEndRef} />
                    </>
                  ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <MessageCircle className="w-12 h-12 mb-2" />
                    <p className="text-xs">Nenhum comentário ainda.</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10">
                <form onSubmit={handleComment} className="relative">
                  <input 
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Adicione um comentário..."
                    className="w-full bg-[#2b2d31] text-white text-xs rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-color-brand"
                  />
                  <button 
                    type="submit"
                    disabled={!commentText.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-color-brand disabled:opacity-30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
