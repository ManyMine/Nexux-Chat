import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Heart, MessageCircle, Share2, Send, Loader2, Play, Pause, Volume2, VolumeX, Eye, BarChart2, Settings, Pin } from 'lucide-react';
import { Status, UserProfile } from '@/src/types';
import { getStatuses, createStatus, likeStatus, commentStatus, uploadFile, viewStatus, pinStatus } from '@/src/services/firebaseService';
import { useI18n } from '@/src/lib/i18n';
import { cn } from '@/src/lib/utils';
import { DEFAULT_AVATAR } from '@/src/constants';

interface StatusMenuProps {
  currentUser: UserProfile;
  onClose: () => void;
  initialUserId?: string;
}

export const StatusMenu: React.FC<StatusMenuProps> = ({ currentUser, onClose, initialUserId }) => {
  const { t } = useI18n();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const unsubscribe = getStatuses(setStatuses);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (initialUserId && statuses.length > 0) {
      const userStatuses = statuses.filter(s => s.userId === initialUserId);
      if (userStatuses.length > 0) {
        setSelectedStatus(userStatuses[0]);
      }
    }
  }, [initialUserId, statuses]);

  useEffect(() => {
    if (selectedStatus) {
      const updatedStatus = statuses.find(s => s.id === selectedStatus.id);
      if (updatedStatus) {
        setSelectedStatus(updatedStatus);
      }
    }
  }, [statuses]);

  // Group statuses by user
  const userStatuses = statuses.reduce((acc, status) => {
    if (!acc[status.userId]) {
      acc[status.userId] = [];
    }
    acc[status.userId].push(status);
    return acc;
  }, {} as Record<string, Status[]>);

  const myStatuses = userStatuses[currentUser.uid] || [];
  const otherUserIds = Object.keys(userStatuses).filter(id => id !== currentUser.uid);

  return (
    <div className="flex flex-col h-full bg-bg-primary border-l border-border-primary w-80 md:w-96">
      <div className="p-4 border-b border-border-primary flex items-center justify-between bg-bg-secondary">
        <h2 className="text-xl font-bold text-text-primary">{t('status')}</h2>
        <button onClick={onClose} className="p-2 hover:bg-bg-tertiary rounded-full transition-colors">
          <X className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* My Status */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider">Meu Status</h3>
          <div className="flex items-center justify-between p-2 hover:bg-bg-secondary rounded-lg transition-colors group">
            <div 
              className="flex items-center space-x-3 cursor-pointer flex-1"
              onClick={() => myStatuses.length > 0 ? setSelectedStatus(myStatuses[0]) : setShowUploadModal(true)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (myStatuses.length > 0) setSelectedStatus(myStatuses[0]);
              }}
            >
              <div className="relative">
                <img 
                  src={currentUser.photoURL || DEFAULT_AVATAR} 
                  className={cn(
                    "w-14 h-14 rounded-full p-0.5 object-cover",
                    myStatuses.length > 0 ? "border-2 border-color-brand" : "border-2 border-border-primary"
                  )}
                  referrerPolicy="no-referrer"
                />
                {myStatuses.length === 0 && (
                  <div className="absolute bottom-0 right-0 bg-color-brand rounded-full p-1 border-2 border-bg-primary">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-text-primary font-bold">Meu Status</p>
                <p className="text-text-muted text-xs">
                  {myStatuses.length > 0 
                    ? new Date(myStatuses[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : "Toque para atualizar"}
                </p>
              </div>
            </div>
            
            {myStatuses.length > 0 && (
              <div className="flex items-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSettingsModal(true); }}
                  className="p-2 hover:bg-bg-tertiary rounded-full transition-colors"
                  title="Configurações de status"
                >
                  <Settings className="w-5 h-5 text-text-muted hover:text-text-primary" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowUploadModal(true); }}
                  className="p-2 hover:bg-bg-tertiary rounded-full transition-colors"
                  title="Adicionar novo status"
                >
                  <Plus className="w-5 h-5 text-text-muted hover:text-text-primary" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider">Atualizações Recentes</h3>
          {otherUserIds.length === 0 ? (
            <p className="text-text-muted text-sm italic p-4 text-center">Nenhuma atualização recente</p>
          ) : (
            otherUserIds.map(userId => {
              const userStatusList = userStatuses[userId];
              if (!userStatusList || userStatusList.length === 0) return null;
              const latestStatus = userStatusList[0];
              
              return (
                <div 
                  key={userId} 
                  className="flex items-center space-x-3 p-2 hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer"
                  onClick={() => setSelectedStatus(latestStatus)}
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-color-brand p-0.5 overflow-hidden">
                      <img 
                        src={latestStatus.userPhoto || DEFAULT_AVATAR} 
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-text-primary font-bold">{latestStatus.userName}</p>
                    <p className="text-text-muted text-xs">
                      {new Date(latestStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status Viewer Overlay */}
      <AnimatePresence>
        {selectedStatus && (
          <StatusViewer 
            status={selectedStatus} 
            allStatuses={statuses}
            currentUser={currentUser}
            onClose={() => setSelectedStatus(null)} 
          />
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <StatusUploadModal 
            currentUser={currentUser}
            onClose={() => setShowUploadModal(false)}
            setStatuses={setStatuses}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <StatusSettingsModal 
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [duration, setDuration] = useState('24h');
  const [privacy, setPrivacy] = useState('all');

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-bg-primary w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-border-primary"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-primary">Configurações de Status</h3>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded-full">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-text-muted">Duração do Status</label>
            <select 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-bg-secondary p-3 rounded-xl text-text-primary outline-none"
            >
              <option value="12h">12 horas</option>
              <option value="24h">24 horas</option>
              <option value="48h">48 horas</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-text-muted">Quem pode ver</label>
            <select 
              value={privacy} 
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full bg-bg-secondary p-3 rounded-xl text-text-primary outline-none"
            >
              <option value="all">Todos os contatos</option>
              <option value="contacts">Meus contatos</option>
              <option value="private">Privado</option>
            </select>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-3 bg-color-brand text-white font-bold rounded-xl hover:bg-color-brand-hover transition-colors"
        >
          Salvar
        </button>
      </motion.div>
    </div>
  );
};

const StatusViewer: React.FC<{ status: Status; allStatuses: Status[]; currentUser: UserProfile; onClose: () => void }> = ({ status: initialStatus, allStatuses, currentUser, onClose }) => {
  const { t } = useI18n();
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(initialStatus.likes.includes(currentUser.uid));
  const [showComments, setShowComments] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Find all statuses from the same user to allow navigation
  const userStatuses = allStatuses.filter(s => s.userId === currentStatus.userId).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.timestamp - b.timestamp;
  });
  const currentIndex = userStatuses.findIndex(s => s.id === currentStatus.id);

  useEffect(() => {
    setCurrentStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setIsLiked(currentStatus.likes.includes(currentUser.uid));
    
    // Track view
    if (currentStatus.userId !== currentUser.uid && (!currentStatus.views || !currentStatus.views.includes(currentUser.uid))) {
      viewStatus(currentStatus.id, currentUser.uid).catch(console.error);
    }
  }, [currentStatus, currentUser.uid]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < userStatuses.length - 1) {
      setCurrentStatus(userStatuses[currentIndex + 1]);
    } else {
      onClose();
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentStatus(userStatuses[currentIndex - 1]);
    }
  };

  const handleLike = async () => {
    if (currentStatus.id.startsWith('temp-')) {
      // TODO: Show a toast message here
      console.log("Status ainda está sendo enviado...");
      return;
    }
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    await likeStatus(currentStatus.id, currentUser.uid, newLikedState);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStatus.id.startsWith('temp-')) {
      // TODO: Show a toast message here
      console.log("Status ainda está sendo enviado...");
      return;
    }
    if (!comment.trim()) return;
    const newComment = await commentStatus(currentStatus.id, currentUser, comment);
    setCurrentStatus(prev => ({
      ...prev,
      comments: [...prev.comments, newComment]
    }));
    setComment('');
  };

  const togglePlay = () => {
    if (currentStatus.mediaType !== 'video') return;
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
    >
      <div className="relative w-full max-w-lg h-full md:h-[90vh] bg-bg-overlay md:rounded-2xl overflow-hidden flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-2 z-30 flex space-x-1">
          {userStatuses.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full bg-white transition-all duration-200",
                  idx < currentIndex ? "w-full" : idx === currentIndex ? "w-full" : "w-0"
                )} 
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 pt-6 pb-4 px-4 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center space-x-3">
            <img src={currentStatus.userPhoto || DEFAULT_AVATAR} className="w-10 h-10 rounded-full border border-white/20" />
            <div>
              <p className="text-white font-bold text-sm">{currentStatus.userName}</p>
              <p className="text-white/70 text-xs">{new Date(currentStatus.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentStatus.userId === currentUser.uid && (
              <button 
                onClick={async () => {
                  if (currentStatus.id.startsWith('temp-')) {
                    console.warn("Cannot pin temporary status.");
                    return;
                  }
                  await pinStatus(currentStatus.id, !currentStatus.pinned);
                  setCurrentStatus(prev => ({ ...prev, pinned: !prev.pinned }));
                }}
                className={cn("p-2 hover:bg-white/10 rounded-full text-white transition-colors", currentStatus.pinned && "text-color-brand")}
              >
                <Pin className="w-6 h-6" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Media Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center group" onClick={togglePlay}>
          {/* Navigation Areas */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={handleNext} />

          {currentStatus.mediaType === 'video' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video 
                ref={videoRef}
                src={currentStatus.mediaUrl} 
                autoPlay 
                loop 
                muted={isMuted}
                playsInline
                className="max-w-full max-h-full object-contain"
                onEnded={handleNext}
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <Play className="w-16 h-16 text-white opacity-80" fill="currentColor" />
                </div>
              )}
              <div className="absolute bottom-4 right-4 flex flex-col space-y-4 z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                  className="p-3 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all"
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>
            </div>
          )}

          {(currentStatus.mediaType === 'image' || currentStatus.mediaType === 'drawing') && (
            <img 
              src={currentStatus.mediaUrl} 
              className="max-w-full max-h-full object-contain"
            />
          )}

          {currentStatus.mediaType === 'audio' && (
            <div className="w-full max-w-sm p-6 bg-bg-secondary rounded-2xl flex flex-col items-center space-y-4">
              <div className="w-24 h-24 bg-color-brand/20 rounded-full flex items-center justify-center animate-pulse">
                <Volume2 className="w-12 h-12 text-color-brand" />
              </div>
              <audio src={currentStatus.mediaUrl} controls autoPlay className="w-full" />
            </div>
          )}

          {currentStatus.mediaType === 'link' && (
            <a 
              href={currentStatus.mediaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full max-w-sm p-6 bg-bg-secondary rounded-2xl flex flex-col items-center space-y-4 text-center hover:bg-bg-tertiary transition-colors"
            >
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Share2 className="w-10 h-10 text-blue-500" />
              </div>
              <span className="text-blue-400 font-bold text-lg break-all underline">
                {currentStatus.mediaUrl}
              </span>
              <p className="text-text-muted text-sm">Toque para abrir o link</p>
            </a>
          )}
        </div>

        {/* Caption & Actions */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 z-10">
          {currentStatus.caption && (
            <p className="text-white text-sm mb-4 drop-shadow-md whitespace-pre-wrap">{currentStatus.caption}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {currentStatus.userId === currentUser.uid && (
                <button onClick={() => setShowStats(true)} className="flex flex-col items-center space-y-1 text-white hover:text-color-brand transition-colors">
                  <BarChart2 className="w-7 h-7" />
                  <span className="text-[10px] font-bold">Estatísticas</span>
                </button>
              )}
              <button 
                onClick={handleLike} 
                className={cn("flex flex-col items-center space-y-1 transition-all", isLiked ? "text-color-danger scale-110" : "text-white")}
                title="Favorito"
              >
                <Heart className="w-7 h-7" fill={isLiked ? "currentColor" : "none"} />
                <span className="text-[10px] font-bold">{currentStatus.likes.length}</span>
              </button>
              <button 
                onClick={() => setShowComments(!showComments)} 
                className={cn("flex flex-col items-center space-y-1 text-white")}
              >
                <MessageCircle className="w-7 h-7" />
                <span className="text-[10px] font-bold">{currentStatus.comments.length}</span>
              </button>
              <button className="flex flex-col items-center space-y-1 text-white">
                <Share2 className="w-7 h-7" />
                <span className="text-[10px] font-bold">{t('share')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Drawer (Owner only) */}
        <AnimatePresence>
          {showStats && currentStatus.userId === currentUser.uid && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-x-0 bottom-0 h-3/4 bg-bg-overlay z-40 rounded-t-2xl flex flex-col border-t border-border-primary"
            >
              <div className="p-4 border-b border-border-primary flex items-center justify-between">
                <h4 className="font-bold text-text-primary flex items-center">
                  <BarChart2 className="w-5 h-5 mr-2 text-color-brand" />
                  Estatísticas do Status
                </h4>
                <button onClick={() => setShowStats(false)} className="p-1 hover:bg-bg-tertiary rounded-full">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Views */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Eye className="w-5 h-5 text-text-muted" />
                    <h5 className="font-bold text-text-secondary">Visualizações ({currentStatus.views?.length || 0})</h5>
                  </div>
                  {(!currentStatus.views || currentStatus.views.length === 0) ? (
                    <p className="text-sm text-text-muted italic">Nenhuma visualização ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {currentStatus.views.map(uid => (
                        <div key={uid} className="flex items-center space-x-2 p-2 bg-bg-secondary rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs text-text-muted">
                            {uid.slice(0, 2)}
                          </div>
                          <span className="text-sm text-text-primary">{uid === currentUser.uid ? 'Você' : 'Usuário ' + uid.slice(0, 4)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Likes */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Heart className="w-5 h-5 text-color-danger" />
                    <h5 className="font-bold text-text-secondary">Favoritos ({currentStatus.likes.length})</h5>
                  </div>
                  {currentStatus.likes.length === 0 ? (
                    <p className="text-sm text-text-muted italic">Nenhum favorito ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {currentStatus.likes.map(uid => (
                        <div key={uid} className="flex items-center space-x-2 p-2 bg-bg-secondary rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs text-text-muted">
                            {uid.slice(0, 2)}
                          </div>
                          <span className="text-sm text-text-primary">{uid === currentUser.uid ? 'Você' : 'Usuário ' + uid.slice(0, 4)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    <h5 className="font-bold text-text-secondary">Comentários ({currentStatus.comments.length})</h5>
                  </div>
                  {currentStatus.comments.length === 0 ? (
                    <p className="text-sm text-text-muted italic">Nenhum comentário ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {currentStatus.comments.map(c => (
                        <div key={c.id} className="flex space-x-3 p-3 bg-bg-secondary rounded-lg">
                          <img src={c.userPhoto || DEFAULT_AVATAR} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-text-primary">{c.userName}</span>
                              <span className="text-[10px] text-text-muted">{new Date(c.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-text-secondary">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments Drawer */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-x-0 bottom-0 h-2/3 bg-bg-overlay z-30 rounded-t-2xl flex flex-col border-t border-border-primary"
            >
              <div className="p-4 border-b border-border-primary flex items-center justify-between">
                <h4 className="font-bold text-text-primary">Comentários</h4>
                <button onClick={() => setShowComments(false)} className="p-1 hover:bg-bg-tertiary rounded-full">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentStatus.comments.length === 0 ? (
                  <p className="text-text-muted text-center py-8 italic">Seja o primeiro a comentar!</p>
                ) : (
                  currentStatus.comments.map(c => (
                    <div key={c.id} className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-bg-tertiary flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-text-muted">
                        {c.userName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-bg-secondary p-3 rounded-2xl rounded-tl-none">
                        <p className="text-xs font-bold text-color-brand mb-1">{c.userName}</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{c.content}</p>
                        <p className="text-[10px] text-text-muted mt-1">
                          {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleComment} className="p-4 border-t border-border-primary flex items-end space-x-2">
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment(e);
                    }
                  }}
                  placeholder="Adicione um comentário..."
                  className="flex-1 bg-bg-tertiary border-none rounded-2xl py-2 px-4 text-sm text-text-primary focus:ring-2 focus:ring-color-brand outline-none resize-none min-h-[40px] max-h-32"
                />
                <button 
                  type="submit" 
                  className="p-2 bg-color-brand text-white rounded-full hover:bg-color-brand-hover transition-colors mb-1"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const StatusUploadModal: React.FC<{ currentUser: UserProfile; onClose: () => void; setStatuses: React.Dispatch<React.SetStateAction<Status[]>> }> = ({ currentUser, onClose, setStatuses }) => {
  const { t } = useI18n();
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'audio' | 'drawing' | 'link' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (mediaType === 'video' && !selectedFile.type.startsWith('video/')) {
        alert('Por favor, selecione um arquivo de vídeo.');
        return;
      }
      if (mediaType === 'image' && !selectedFile.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem.');
        return;
      }
      if (mediaType === 'audio' && !selectedFile.type.startsWith('audio/')) {
        alert('Por favor, selecione um arquivo de áudio.');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleUpload = async () => {
    if (!mediaType) return;
    setIsUploading(true);

    let tempMediaUrl = '';
    if (mediaType === 'link') {
      tempMediaUrl = linkUrl;
    } else if (mediaType === 'drawing' && canvasRef.current) {
      tempMediaUrl = canvasRef.current.toDataURL('image/png');
    } else if (file) {
      tempMediaUrl = URL.createObjectURL(file);
    }

    const tempStatus: Status = {
      id: 'temp-' + Date.now(),
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Você',
      userPhoto: currentUser.photoURL || null,
      mediaUrl: tempMediaUrl,
      mediaType,
      caption: caption || null,
      timestamp: Date.now(),
      likes: [],
      comments: []
    };

    setStatuses(prev => [tempStatus, ...prev]);
    onClose();

    try {
      let finalMediaUrl = '';

      if (mediaType === 'link') {
        if (!linkUrl.trim()) throw new Error("Link não pode estar vazio");
        finalMediaUrl = linkUrl;
      } else if (mediaType === 'drawing') {
        if (!canvasRef.current) throw new Error("Desenho não encontrado");
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const drawingFile = new File([blob], 'drawing.png', { type: 'image/png' });
        finalMediaUrl = await uploadFile(drawingFile, `statuses/${currentUser.uid}/${Date.now()}_drawing.png`);
      } else {
        if (!file) throw new Error("Arquivo não selecionado");
        finalMediaUrl = await uploadFile(file, `statuses/${currentUser.uid}/${Date.now()}_${file.name}`);
      }

      await createStatus(currentUser, finalMediaUrl, mediaType, caption);
    } catch (error) {
      setStatuses(prev => prev.filter(s => s.id !== tempStatus.id));
      console.error("Upload error:", error);
      alert("Falha ao enviar status. Verifique se preencheu tudo corretamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetSelection = () => {
    setMediaType(null);
    setFile(null);
    setPreviewUrl(null);
    setLinkUrl('');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-bg-primary w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-border-primary flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-border-primary flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-text-primary">{t('newStatus')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded-full">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {!mediaType ? (
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setMediaType('image')} className="p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors">
                <div className="w-12 h-12 bg-color-brand/20 rounded-full flex items-center justify-center"><Plus className="w-6 h-6 text-color-brand" /></div>
                <span className="font-bold text-text-primary">Imagem</span>
              </button>
              <button onClick={() => setMediaType('video')} className="p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors">
                <div className="w-12 h-12 bg-color-success/20 rounded-full flex items-center justify-center"><Play className="w-6 h-6 text-color-success" /></div>
                <span className="font-bold text-text-primary">Vídeo</span>
              </button>
              <button onClick={() => setMediaType('audio')} className="p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors">
                <div className="w-12 h-12 bg-color-warning/20 rounded-full flex items-center justify-center"><Volume2 className="w-6 h-6 text-color-warning" /></div>
                <span className="font-bold text-text-primary">Áudio</span>
              </button>
              <button onClick={() => setMediaType('drawing')} className="p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors">
                <div className="w-12 h-12 bg-color-danger/20 rounded-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-color-danger rounded-full" /></div>
                <span className="font-bold text-text-primary">Desenho</span>
              </button>
              <button onClick={() => setMediaType('link')} className="p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors col-span-2">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center"><Share2 className="w-6 h-6 text-blue-500" /></div>
                <span className="font-bold text-text-primary">Link</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-muted uppercase">
                  {mediaType === 'image' && 'Nova Imagem'}
                  {mediaType === 'video' && 'Novo Vídeo'}
                  {mediaType === 'audio' && 'Novo Áudio'}
                  {mediaType === 'drawing' && 'Novo Desenho'}
                  {mediaType === 'link' && 'Novo Link'}
                </span>
                <button onClick={resetSelection} className="text-xs text-color-brand hover:underline">Trocar</button>
              </div>

              {/* Media Input Area */}
              {(mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') && !previewUrl && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video border-2 border-dashed border-border-primary rounded-xl flex flex-col items-center justify-center space-y-3 cursor-pointer hover:bg-bg-secondary transition-colors"
                >
                  <div className="p-4 bg-bg-tertiary rounded-full">
                    <Plus className="w-8 h-8 text-text-muted" />
                  </div>
                  <p className="text-text-secondary font-medium">Selecionar Arquivo</p>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : 'audio/*'} 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {/* Previews */}
              {mediaType === 'image' && previewUrl && (
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                  <img src={previewUrl} className="w-full h-full object-contain" />
                </div>
              )}
              {mediaType === 'video' && previewUrl && (
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                  <video src={previewUrl} className="w-full h-full object-contain" controls />
                </div>
              )}
              {mediaType === 'audio' && previewUrl && (
                <div className="relative p-4 bg-bg-secondary rounded-xl flex items-center justify-center">
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              )}
              {mediaType === 'drawing' && (
                <div className="relative aspect-square bg-black rounded-xl overflow-hidden border border-border-primary touch-none">
                  <canvas 
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    onTouchMove={draw}
                  />
                  <div className="absolute top-2 left-2 text-xs text-white/50 pointer-events-none">Desenhe aqui</div>
                </div>
              )}
              {mediaType === 'link' && (
                <div className="space-y-2">
                  <input 
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-bg-tertiary border-none rounded-xl py-3 px-4 text-text-primary focus:ring-2 focus:ring-color-brand outline-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-text-muted">Legenda (Opcional)</label>
                <textarea 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="O que está acontecendo?"
                  className="w-full bg-bg-tertiary border-none rounded-xl py-3 px-4 text-text-primary focus:ring-2 focus:ring-color-brand outline-none h-24"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border-primary flex space-x-3 flex-shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-bold rounded-xl transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            disabled={!mediaType || (mediaType !== 'drawing' && mediaType !== 'link' && !file) || (mediaType === 'link' && !linkUrl) || isUploading}
            onClick={handleUpload}
            className="flex-2 py-3 px-4 bg-color-brand hover:bg-color-brand-hover text-white font-bold rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Postar Status"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
