import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Heart, MessageCircle, Share2, Send, Loader2, Play, Pause, Volume2, VolumeX, Eye, BarChart2, Settings, Pin, Copy, Check, MessageSquare, Pencil } from 'lucide-react';
import { Status, UserProfile, StatusComment, Channel } from '@/src/types';
import { createStatus, likeStatus, commentStatus, uploadFile, viewStatus, pinStatus, deleteMultipleStatuses, updateUserProfile, createPrivateChannel, sendMessage, updateStatusPresence, removeStatusPresence, listenForStatusPresence } from '@/src/services/firebaseService';
import { useI18n } from '@/src/lib/i18n';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/context/ToastContext';
import { DEFAULT_AVATAR } from '@/src/constants';
import { DrawingCanvas } from './DrawingCanvas';

interface StatusMenuProps {
  currentUser: UserProfile;
  onClose: () => void;
  initialUserId?: string;
  statuses: Status[];
  setStatuses: React.Dispatch<React.SetStateAction<Status[]>>;
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
}

export const StatusMenu: React.FC<StatusMenuProps> = ({ currentUser, onClose, initialUserId, statuses, setStatuses, channels, onChannelSelect }) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [presence, setPresence] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    updateStatusPresence(currentUser.uid, currentUser.displayName, currentUser.photoURL || '');
    const unsubscribe = listenForStatusPresence((p) => setPresence(p));
    
    return () => {
      removeStatusPresence(currentUser.uid);
      unsubscribe();
    };
  }, [currentUser]);

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

  const orderedUserIds = useMemo(() => {
    const ids = [];
    if (myStatuses.length > 0) ids.push(currentUser.uid);
    ids.push(...otherUserIds);
    return ids;
  }, [currentUser.uid, myStatuses.length, otherUserIds]);

  const handleCloseViewer = useCallback(() => {
    setSelectedStatus(null);
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedForDeletion.size === 0) return;
    try {
      await deleteMultipleStatuses(Array.from(selectedForDeletion));
      setSelectedForDeletion(new Set());
      setIsManaging(false);
    } catch (error) {
      console.error("Error deleting statuses:", error);
    }
  };

  const handleSelectAll = () => {
    if (selectedForDeletion.size === myStatuses.length) {
      setSelectedForDeletion(new Set());
    } else {
      setSelectedForDeletion(new Set(myStatuses.map(s => s.id)));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#2f3136] border-l border-[#202225] w-80 md:w-96">
      <div className="p-4 border-b border-[#202225] flex items-center justify-between bg-[#2f3136]">
        <div className="flex items-center space-x-3 gpu-accelerated">
          <img 
            src="https://img.sanishtech.com/u/47612354b3429905a0e4183c638bcdfb.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain will-change-transform"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-lg font-bold text-white">{t('status')}</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#4f545c] rounded-full transition-colors">
          <X className="w-5 h-5 text-[#b9bbbe]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* My Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-[#8e9297] tracking-wider">Meu Status</h3>
            {myStatuses.length > 0 && (
              <button 
                onClick={() => {
                  setIsManaging(!isManaging);
                  setSelectedForDeletion(new Set());
                }}
                className="text-[10px] font-bold text-[#b9bbbe] hover:text-white hover:underline uppercase"
              >
                {isManaging ? 'Cancelar' : 'Gerenciar'}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between p-2 hover:bg-[#36393f] rounded-md transition-colors group">
            <div 
              className="flex items-center space-x-3 cursor-pointer flex-1"
              onClick={() => {
                if (isManaging) return;
                myStatuses.length > 0 ? setSelectedStatus(myStatuses[0]) : setShowUploadModal(true);
              }}
            >
              <div className="relative">
                <img 
                  src={currentUser.photoURL || DEFAULT_AVATAR} 
                  className={cn(
                    "w-12 h-12 rounded-full p-0.5 object-cover",
                    myStatuses.length > 0 ? "border-2 border-[#5865f2]" : "border-2 border-[#4f545c]"
                  )}
                  referrerPolicy="no-referrer"
                />
                {myStatuses.length === 0 && (
                  <div className="absolute bottom-0 right-0 bg-[#5865f2] rounded-full p-1 border-2 border-[#2f3136]">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">Meu Status</p>
                <div className="flex items-center space-x-2">
                  <p className="text-[#8e9297] text-xs">
                    {myStatuses.length > 0 
                      ? new Date(myStatuses[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "Toque para atualizar"}
                  </p>
                  {myStatuses.length > 0 && myStatuses[0].views && myStatuses[0].views.length > 0 && (
                    <div className="flex items-center text-[10px] text-[#8e9297]">
                      <Eye className="w-3 h-3 mr-0.5" />
                      {myStatuses[0].views.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {!isManaging && myStatuses.length > 0 && (
              <div className="flex items-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSettingsModal(true); }}
                  className="p-2 hover:bg-[#4f545c] rounded-md transition-colors"
                  title="Configurações de status"
                >
                  <Settings className="w-5 h-5 text-[#b9bbbe] hover:text-white" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowUploadModal(true); }}
                  className="p-2 hover:bg-[#4f545c] rounded-md transition-colors"
                  title="Adicionar novo status"
                >
                  <Plus className="w-5 h-5 text-[#b9bbbe] hover:text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Manage Statuses List */}
          {isManaging && myStatuses.length > 0 && (
            <div className="space-y-2 pl-4 border-l-2 border-border-primary ml-7">
              <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-color-brand hover:underline"
                >
                  {selectedForDeletion.size === myStatuses.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>
                <span className="text-[10px] text-text-muted uppercase font-bold">
                  {selectedForDeletion.size} selecionados
                </span>
              </div>
              {myStatuses.map(status => (
                <div key={status.id} className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={selectedForDeletion.has(status.id)}
                      onChange={(e) => {
                        const next = new Set(selectedForDeletion);
                        if (e.target.checked) next.add(status.id);
                        else next.delete(status.id);
                        setSelectedForDeletion(next);
                      }}
                      className="w-4 h-4 rounded border-border-primary text-color-brand focus:ring-color-brand"
                    />
                    <div className="w-10 h-10 rounded bg-black overflow-hidden">
                      {status.mediaType === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                      ) : status.mediaType === 'audio' ? (
                        <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                          <Volume2 className="w-4 h-4 text-white" />
                        </div>
                      ) : status.mediaType === 'text' ? (
                        <div className="w-full h-full flex items-center justify-center bg-purple-500/20">
                          <MessageCircle className="w-4 h-4 text-purple-500" />
                        </div>
                      ) : (
                        <img src={status.mediaUrl || undefined} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-xs text-text-secondary">
                      {new Date(status.timestamp).toLocaleDateString()} {new Date(status.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <button 
                onClick={handleDeleteSelected}
                disabled={selectedForDeletion.size === 0}
                className="w-full py-2 bg-[#ed4245] text-white text-xs font-semibold rounded-md hover:bg-[#c03538] transition-colors disabled:opacity-50"
              >
                Excluir Selecionados ({selectedForDeletion.size})
              </button>
            </div>
          )}
        </div>

        {/* Presence */}
        {presence.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#8e9297] tracking-wider">Online no Status</h3>
            <div className="flex flex-wrap gap-2">
              {presence.map(p => (
                <div key={p.userId} className="flex items-center space-x-2 bg-[#202225] p-1.5 rounded-full" title={p.userName}>
                  <img src={p.userPhoto || DEFAULT_AVATAR} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  <span className="text-xs text-white font-medium pr-2">{p.userName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Updates */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-[#8e9297] tracking-wider">Atualizações Recentes</h3>
          {otherUserIds.length === 0 ? (
            <p className="text-[#8e9297] text-sm italic p-4 text-center">Nenhuma atualização recente</p>
          ) : (
            otherUserIds.map(userId => {
              const userStatusList = userStatuses[userId];
              if (!userStatusList || userStatusList.length === 0) return null;
              const latestStatus = userStatusList[0];
              
              return (
                <div 
                  key={userId} 
                  className="flex items-center space-x-3 p-2 hover:bg-[#36393f] rounded-md transition-colors cursor-pointer"
                  onClick={() => setSelectedStatus(latestStatus)}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-[#5865f2] p-0.5 overflow-hidden">
                      <img 
                        src={latestStatus.userPhoto || DEFAULT_AVATAR} 
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-white font-semibold">{latestStatus.userName}</p>
                    <div className="flex items-center space-x-2">
                      {latestStatus.comments.length > 0 && (
                        <div className="flex items-center text-[10px] text-[#8e9297]">
                          <MessageCircle className="w-3 h-3 mr-0.5" />
                          {latestStatus.comments.length}
                        </div>
                      )}
                      <p className="text-[#8e9297] text-xs">
                        {new Date(latestStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
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
            onClose={handleCloseViewer} 
            setStatuses={setStatuses}
            orderedUserIds={orderedUserIds}
            channels={channels}
            onChannelSelect={onChannelSelect}
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
            currentUser={currentUser}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusSettingsModal: React.FC<{ currentUser: UserProfile; onClose: () => void }> = ({ currentUser, onClose }) => {
  const { showToast } = useToast();
  const [duration, setDuration] = useState(currentUser.statusSettings?.duration || '24h');
  const [privacy, setPrivacy] = useState(currentUser.statusSettings?.privacy || 'all');
  const [allowReplies, setAllowReplies] = useState(currentUser.statusSettings?.allowReplies !== false);
  const [allowStatusChat, setAllowStatusChat] = useState(currentUser.statusSettings?.allowStatusChat !== false);
  const [statusNotifications, setStatusNotifications] = useState(currentUser.statusSettings?.statusNotifications !== false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile(currentUser.uid, {
        statusSettings: { duration: duration as any, privacy: privacy as any, allowReplies, allowStatusChat, statusNotifications }
      });
      onClose();
    } catch (error) {
      console.error("Error saving status settings:", error);
      showToast("Falha ao salvar configurações.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#36393f] w-full max-w-sm rounded-md p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Configurações de Status</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#4f545c] rounded-md">
            <X className="w-5 h-5 text-[#b9bbbe]" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8e9297] uppercase">Duração do Status</label>
            <select 
              value={duration} 
              onChange={(e) => setDuration(e.target.value as '12h' | '24h' | '48h' | 'never')}
              className="w-full bg-[#202225] p-3 rounded-md text-white outline-none focus:ring-1 focus:ring-[#5865f2]"
            >
              <option value="12h">12 horas</option>
              <option value="24h">24 horas</option>
              <option value="48h">48 horas</option>
              <option value="never">Nunca expira</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8e9297] uppercase">Quem pode ver</label>
            <select 
              value={privacy} 
              onChange={(e) => setPrivacy(e.target.value as 'all' | 'contacts' | 'private')}
              className="w-full bg-[#202225] p-3 rounded-md text-white outline-none focus:ring-1 focus:ring-[#5865f2]"
            >
              <option value="all">Todos os contatos</option>
              <option value="contacts">Meus contatos</option>
              <option value="private">Privado</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-sm font-semibold text-[#dbdee1]">Permitir Comentários</label>
            <button 
              onClick={() => setAllowReplies(!allowReplies)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                allowReplies ? "bg-[#3ba55d]" : "bg-[#4f545c]"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                allowReplies ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-sm font-semibold text-[#dbdee1]">Permitir Chat no Status</label>
            <button 
              onClick={() => setAllowStatusChat(!allowStatusChat)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                allowStatusChat ? "bg-[#3ba55d]" : "bg-[#4f545c]"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                allowStatusChat ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-sm font-semibold text-[#dbdee1]">Notificações de Status</label>
            <button 
              onClick={() => setStatusNotifications(!statusNotifications)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                statusNotifications ? "bg-[#3ba55d]" : "bg-[#4f545c]"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                statusNotifications ? "left-7" : "left-1"
              )} />
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-8 py-3 bg-[#5865f2] text-white font-semibold rounded-md hover:bg-[#4752c4] transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Alterações"}
        </button>
      </motion.div>
    </div>
  );
};

const StatusViewer: React.FC<{ 
  status: Status; 
  allStatuses: Status[]; 
  currentUser: UserProfile; 
  onClose: () => void;
  setStatuses: React.Dispatch<React.SetStateAction<Status[]>>;
  orderedUserIds: string[];
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
}> = ({ status: initialStatus, allStatuses, currentUser, onClose, setStatuses, orderedUserIds, channels, onChannelSelect }) => {
  const { t } = useI18n();
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<StatusComment | null>(null);
  const [isLiked, setIsLiked] = useState(initialStatus.likes.includes(currentUser.uid));
  const [showComments, setShowComments] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Find all statuses from the same user to allow navigation
  const userStatuses = useMemo(() => {
    return allStatuses.filter(s => s.userId === currentStatus.userId).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.timestamp - b.timestamp;
    });
  }, [allStatuses, currentStatus.userId]);

  // Always use the latest version of the current status from allStatuses
  const latestStatus = useMemo(() => {
    return allStatuses.find(s => s.id === currentStatus.id) || currentStatus;
  }, [allStatuses, currentStatus.id, currentStatus]);

  const currentIndex = useMemo(() => {
    return userStatuses.findIndex(s => s.id === latestStatus.id);
  }, [userStatuses, latestStatus.id]);

  const currentUserIndex = useMemo(() => {
    return orderedUserIds.indexOf(latestStatus.userId);
  }, [orderedUserIds, latestStatus.userId]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.log("handleNext called", { currentIndex, userStatusesLength: userStatuses.length, currentUserIndex, orderedUserIdsLength: orderedUserIds.length });
    if (currentIndex < userStatuses.length - 1) {
      setCurrentStatus(userStatuses[currentIndex + 1]);
      setProgress(0);
    } else if (currentUserIndex < orderedUserIds.length - 1) {
      // Move to next user
      const nextUserId = orderedUserIds[currentUserIndex + 1];
      console.log("Moving to next user:", nextUserId);
      const nextUserStatuses = allStatuses.filter(s => s.userId === nextUserId).sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.timestamp - b.timestamp;
      });
      if (nextUserStatuses.length > 0) {
        setCurrentStatus(nextUserStatuses[0]);
        setProgress(0);
      } else {
        console.log("No statuses for next user, closing");
        onClose();
      }
    } else {
      console.log("No more users, closing");
      onClose();
    }
  }, [currentIndex, userStatuses, currentUserIndex, orderedUserIds, allStatuses, onClose]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentStatus(userStatuses[currentIndex - 1]);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      // Move to previous user's last status
      const prevUserId = orderedUserIds[currentUserIndex - 1];
      const prevUserStatuses = allStatuses.filter(s => s.userId === prevUserId).sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.timestamp - b.timestamp;
      });
      if (prevUserStatuses.length > 0) {
        setCurrentStatus(prevUserStatuses[prevUserStatuses.length - 1]);
        setProgress(0);
      }
    }
  }, [currentIndex, userStatuses, currentUserIndex, orderedUserIds, allStatuses]);

  const handleHold = () => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleRelease = () => {
    setIsPlaying(true);
    if (videoRef.current) videoRef.current.play();
  };

  useEffect(() => {
    if (progress >= 100) {
      handleNext();
    }
  }, [progress, handleNext]);

  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setProgress(0);

    if (latestStatus.mediaType !== 'video' && latestStatus.mediaType !== 'audio') {
      const duration = 5000; // 5 seconds for images/links/etc
      const interval = 50;
      const step = (interval / duration) * 100;

      progressInterval.current = setInterval(() => {
        if (isPlaying) {
          setProgress(prev => {
            if (prev >= 100) return 100;
            const next = prev + step;
            return next >= 100 ? 100 : next;
          });
        }
      }, interval);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [latestStatus, isPlaying]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && latestStatus.mediaType === 'video') {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      if (total > 0) {
        setProgress((current / total) * 100);
      }
    }
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const handleAudioTimeUpdate = () => {
    if (audioRef.current && latestStatus.mediaType === 'audio') {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (total > 0) {
        setProgress((current / total) * 100);
      }
    }
  };

  useEffect(() => {
    setCurrentStatus(initialStatus);
    setProgress(0);
  }, [initialStatus]);

  useEffect(() => {
    setIsLiked(latestStatus.likes.includes(currentUser.uid));
    
    // Track view
    if (latestStatus.userId !== currentUser.uid && (!latestStatus.views || !latestStatus.views.includes(currentUser.uid))) {
      viewStatus(latestStatus.id, currentUser.uid).catch(console.error);
    }
  }, [latestStatus, currentUser.uid]);

  const handleLike = async () => {
    if (latestStatus.id.startsWith('temp-')) {
      // TODO: Show a toast message here
      console.log("Status ainda está sendo enviado...");
      return;
    }
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    await likeStatus(latestStatus.id, currentUser.uid, newLikedState);
  };

  const handleCopy = () => {
    const textToCopy = latestStatus.mediaType === 'text' ? latestStatus.mediaUrl : latestStatus.caption;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (latestStatus.id.startsWith('temp-')) return;
    if (!comment.trim()) return;
    
    const commentText = comment.trim();
    setComment(''); // Clear immediately for better UX
    
    try {
      const newComment = await commentStatus(latestStatus.id, currentUser, commentText, replyingTo?.id);
      
      // Update local state for immediate feedback
      setCurrentStatus(prev => ({
        ...prev,
        comments: [...prev.comments, newComment]
      }));
      
      // Also update the global statuses state in ChatLayout
      setStatuses(prev => prev.map(s => 
        s.id === latestStatus.id 
          ? { ...s, comments: [...s.comments, newComment] }
          : s
      ));
      
      setReplyingTo(null);
    } catch (error) {
      console.error("commentStatus failed", error);
      setComment(commentText); // Restore on error
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (latestStatus.id.startsWith('temp-')) return;
    if (!chatMessage.trim()) return;

    const messageText = chatMessage.trim();
    setChatMessage('');
    setShowChatInput(false);

    try {
      const channel = await createPrivateChannel(currentUser.uid, latestStatus.userId);
      await sendMessage(channel.id, currentUser, messageText, undefined, undefined, {
        statusId: latestStatus.id,
        userId: latestStatus.userId,
        mediaUrl: latestStatus.mediaUrl,
        mediaType: latestStatus.mediaType,
        caption: latestStatus.caption
      });
      // Optionally show a toast
    } catch (error) {
      console.error("Failed to send chat message", error);
      setChatMessage(messageText);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    // Prevent toggle if clicking navigation areas or input
    if ((e.target as HTMLElement).closest('form') || (e.target as HTMLElement).closest('.nav-area')) return;
    
    if (latestStatus.mediaType === 'video') {
      if (videoRef.current) {
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
      }
    } else if (latestStatus.mediaType === 'audio') {
      if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.x < -100) {
          handleNext();
        } else if (offset.x > 100) {
          handlePrev();
        }
      }}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center touch-none"
    >
      <div className="relative w-full max-w-lg h-full md:h-[90vh] bg-[#2f3136] md:rounded-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-2 z-30 flex space-x-1">
          {userStatuses.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-[#4f545c] rounded-full overflow-hidden">
              <motion.div 
                className={cn(
                  "h-full bg-white transition-all duration-100 ease-linear",
                  idx < currentIndex ? "w-full" : idx === currentIndex ? "w-0" : "w-0"
                )} 
                style={idx === currentIndex ? { width: `${progress}%` } : {}}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 pt-6 pb-4 px-4 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center space-x-3">
            <img 
              src={latestStatus.userPhoto || DEFAULT_AVATAR} 
              className="w-10 h-10 rounded-full border border-[#202225]" 
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-white font-semibold text-sm">{latestStatus.userName}</p>
              <div className="flex items-center space-x-2">
                <p className="text-[#8e9297] text-xs">{new Date(latestStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                {latestStatus.expiresAt && latestStatus.expiresAt !== -1 && (
                  <span className="text-[10px] text-[#ed4245] font-bold">
                    Expira em {Math.max(0, Math.floor((latestStatus.expiresAt - Date.now()) / (60 * 60 * 1000)))}h
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(e as any); }}
              className="p-2 hover:bg-[#4f545c] rounded-md text-white transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            {latestStatus.userId === currentUser.uid && (
              <button 
                onClick={async () => {
                  if (latestStatus.id.startsWith('temp-')) return;
                  await pinStatus(latestStatus.id, !latestStatus.pinned);
                  setCurrentStatus(prev => ({ ...prev, pinned: !prev.pinned }));
                }}
                className={cn("p-2 hover:bg-[#4f545c] rounded-md text-white transition-all", latestStatus.pinned && "text-[#5865f2]")}
              >
                <Pin className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-[#4f545c] rounded-md text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Area */}
        <div 
          className="flex-1 relative bg-black flex items-center justify-center group" 
          onClick={togglePlay}
          onMouseDown={handleHold}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handleHold}
          onTouchEnd={handleRelease}
        >
          {/* Navigation Areas */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer nav-area" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer nav-area" onClick={handleNext} />

          {latestStatus.mediaType === 'video' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video 
                ref={videoRef}
                src={latestStatus.mediaUrl || undefined} 
                autoPlay 
                muted={isMuted}
                playsInline
                className="max-w-full max-h-full object-contain"
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={() => handleNext()}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
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

          {(latestStatus.mediaType === 'image' || latestStatus.mediaType === 'drawing') && (
            <img 
              src={latestStatus.mediaUrl || undefined} 
              className="max-w-full max-h-full object-contain will-change-transform"
              referrerPolicy="no-referrer"
            />
          )}

          {latestStatus.mediaType === 'audio' && (
            <div className="w-full max-w-sm p-6 bg-[#202225] rounded-md flex flex-col items-center space-y-4">
              <div className="w-24 h-24 bg-[#5865f2]/20 rounded-full flex items-center justify-center animate-pulse">
                <Volume2 className="w-12 h-12 text-[#5865f2]" />
              </div>
              <audio 
                ref={audioRef}
                src={latestStatus.mediaUrl || undefined} 
                controls 
                autoPlay 
                className="w-full" 
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={() => handleNext()}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          )}

          {currentStatus.mediaType === 'text' && (
            <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-[#5865f2]/20 to-[#5865f2]/40">
              <p className="text-2xl md:text-3xl font-bold text-white text-center leading-relaxed">
                {currentStatus.mediaUrl}
              </p>
            </div>
          )}

          {currentStatus.mediaType === 'link' && (
            <a 
              href={currentStatus.mediaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full max-w-sm p-6 bg-[#202225] rounded-md flex flex-col items-center space-y-4 text-center hover:bg-[#2f3136] transition-colors"
            >
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Share2 className="w-10 h-10 text-blue-500" />
              </div>
              <span className="text-blue-400 font-bold text-lg break-all underline">
                {currentStatus.mediaUrl}
              </span>
              <p className="text-[#8e9297] text-sm">Toque para abrir o link</p>
            </a>
          )}
        </div>

        {/* Caption & Actions */}
        <div className="p-4 bg-gradient-to-t from-[#202225] to-transparent absolute bottom-0 left-0 right-0 z-10">
          {currentStatus.caption && (
            <p className="text-white text-sm mb-4 whitespace-pre-wrap">{currentStatus.caption}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {currentStatus.userId === currentUser.uid && (
                <button onClick={() => setShowStats(true)} className="flex flex-col items-center space-y-1 text-[#b9bbbe] hover:text-white transition-colors">
                  <BarChart2 className="w-6 h-6" />
                  <span className="text-[10px] font-bold">Stats</span>
                </button>
              )}
              <button 
                onClick={handleLike} 
                className={cn("flex flex-col items-center space-y-1 transition-all", isLiked ? "text-[#ed4245] scale-110" : "text-[#b9bbbe] hover:text-white")}
                title="Favorito"
              >
                <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} />
                <span className="text-[10px] font-bold">{currentStatus.likes.length}</span>
              </button>

              {/* Quick Reactions */}
              <div 
                className="flex items-center space-x-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {['🔥', '😂', '😮', '😢', '👏', '🙌'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (latestStatus.id.startsWith('temp-')) return;
                      try {
                        await commentStatus(latestStatus.id, currentUser, emoji);
                        // Update local state for immediate feedback
                        setStatuses(prev => prev.map(s => 
                          s.id === latestStatus.id 
                            ? { ...s, comments: [...s.comments, { 
                                id: Math.random().toString(36).substring(2, 9),
                                userId: currentUser.uid,
                                userName: currentUser.displayName || 'Você',
                                userPhoto: currentUser.photoURL || undefined,
                                content: emoji,
                                timestamp: Date.now()
                              }] }
                            : s
                        ));
                      } catch (err) {
                        console.error("Failed to send emoji reaction", err);
                      }
                    }}
                    className="text-lg hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              {latestStatus.allowReplies !== false && (
                <button 
                  onClick={() => setShowComments(!showComments)} 
                  className={cn("flex flex-col items-center space-y-1 text-[#b9bbbe] hover:text-white")}
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-[10px] font-bold">{latestStatus.comments.length}</span>
                </button>
              )}

              {currentStatus.allowStatusChat !== false && currentStatus.userId !== currentUser.uid && (
                <button 
                  onClick={() => {
                    const dmChannel = channels.find(c => c.type === 'private' && c.members?.includes(currentStatus.userId));
                    if (dmChannel) {
                      onChannelSelect(dmChannel);
                      onClose();
                    } else {
                      createPrivateChannel(currentUser.uid, currentStatus.userId).then((newChannel) => {
                        onChannelSelect(newChannel);
                        onClose();
                      });
                    }
                  }}
                  className={cn("flex flex-col items-center space-y-1 transition-all", showChatInput ? "text-[#5865f2] scale-110" : "text-[#b9bbbe] hover:text-white")}
                  title="Enviar mensagem"
                >
                  <Send className="w-6 h-6" />
                  <span className="text-[10px] font-bold">Chat</span>
                </button>
              )}

              {(currentStatus.mediaType === 'text' || currentStatus.caption) && (
                <button 
                  onClick={handleCopy} 
                  className={cn("flex flex-col items-center space-y-1 transition-all", isCopied ? "text-[#3ba55d]" : "text-[#b9bbbe] hover:text-white")}
                  title="Copiar conteúdo"
                >
                  {isCopied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  <span className="text-[10px] font-bold">{isCopied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              )}

              <button className="flex flex-col items-center space-y-1 text-[#b9bbbe] hover:text-white">
                <Share2 className="w-6 h-6" />
                <span className="text-[10px] font-bold">{t('share')}</span>
              </button>
            </div>
          </div>

          {/* Live Comments Overlay */}
          {latestStatus.allowReplies !== false && (
            <div className="absolute bottom-32 left-4 right-4 z-20 pointer-events-none space-y-2">
              <AnimatePresence>
                {latestStatus.comments.slice(-3).map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm p-2 rounded-lg max-w-[80%]"
                  >
                    <img 
                      src={c.userPhoto || DEFAULT_AVATAR} 
                      className="w-6 h-6 rounded-full border border-white/20" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-color-brand truncate">{c.userName}</p>
                      <p className="text-xs text-white truncate">{c.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Quick Comment Input */}
          {currentStatus.allowReplies !== false && !showChatInput && (
            <div className="mt-4 space-y-2">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-1 bg-white/10 backdrop-blur-md rounded-t-xl border-t border-x border-white/20 mx-4">
                  <p className="text-[10px] text-white/80">
                    Respondendo a <span className="font-bold text-color-brand">{replyingTo.userName}</span>
                  </p>
                  <button onClick={() => setReplyingTo(null)} className="p-0.5 hover:bg-white/10 rounded-full">
                    <X className="w-3 h-3 text-white/60" />
                  </button>
                </div>
              )}
              <form 
                onSubmit={handleComment} 
                className={cn(
                  "flex items-center space-x-2 bg-white/15 backdrop-blur-xl p-2 rounded-full border border-white/30 shadow-lg",
                  replyingTo && "rounded-t-none border-t-0"
                )}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input 
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onFocus={() => setIsPlaying(false)}
                  onBlur={() => setIsPlaying(true)}
                  placeholder="Comentar..."
                  className="flex-1 bg-transparent border-none text-white text-sm px-4 py-2 outline-none placeholder:text-white/70 font-medium"
                />
                <button 
                  type="submit"
                  disabled={!comment.trim()}
                  className="p-2 mr-1 text-white/70 hover:text-white disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {/* Chat Input */}
          {showChatInput && currentStatus.allowStatusChat !== false && (
            <div className="mt-4 space-y-2">
              <form 
                onSubmit={handleSendChatMessage} 
                className="flex items-center space-x-2 bg-color-brand/20 backdrop-blur-xl p-2 rounded-full border border-color-brand/50 shadow-lg"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input 
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onFocus={() => setIsPlaying(false)}
                  onBlur={() => setIsPlaying(true)}
                  placeholder="Enviar mensagem..."
                  className="flex-1 bg-transparent border-none text-white text-sm px-4 py-2 outline-none placeholder:text-white/70 font-medium"
                />
                <button 
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="p-2 mr-1 text-white/70 hover:text-white disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
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
                      {currentStatus.comments.filter(c => !c.parentId).map(c => (
                        <div key={c.id} className="flex space-x-3 p-3 bg-bg-secondary rounded-lg">
                          <img src={c.userPhoto || DEFAULT_AVATAR || undefined} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-text-primary">{c.userName}</span>
                              <span className="text-[10px] text-text-muted">{new Date(c.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-text-secondary">{c.content}</p>
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
                  currentStatus.comments.filter(c => !c.parentId).map(c => (
                    <div key={c.id} className="space-y-3">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 rounded-full bg-bg-tertiary flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-text-muted overflow-hidden">
                          {c.userPhoto ? (
                            <img src={c.userPhoto || undefined} alt={c.userName} className="w-full h-full object-cover" />
                          ) : (
                            c.userName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 bg-bg-secondary p-3 rounded-2xl rounded-tl-none shadow-sm border border-border-primary/50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-xs font-bold text-color-brand">{c.userName}</p>
                              {c.userId === 'belepuff-uid-placeholder' || c.userName.toLowerCase().includes('belepuff') && (
                                <span className="px-1.5 py-0.5 bg-color-brand/10 text-color-brand text-[8px] font-bold rounded uppercase tracking-wider border border-color-brand/20">Admin</span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-muted">
                              {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{c.content}</p>
                          <div className="flex items-center space-x-3 mt-2">
                            <button 
                              onClick={() => setReplyingTo(c)}
                              className="text-[10px] font-bold text-text-muted hover:text-color-brand transition-colors flex items-center"
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Responder
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {currentStatus.comments.filter(r => r.parentId === c.id).map(reply => (
                        <div key={reply.id} className="flex space-x-3 ml-11">
                          <div className="w-6 h-6 rounded-full bg-bg-tertiary flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-text-muted overflow-hidden">
                            {reply.userPhoto ? (
                              <img src={reply.userPhoto || undefined} alt={reply.userName} className="w-full h-full object-cover" />
                            ) : (
                              reply.userName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 bg-bg-tertiary p-2 rounded-xl rounded-tl-none">
                            <p className="text-[10px] font-bold text-color-brand mb-0.5">{reply.userName}</p>
                            <p className="text-xs text-text-primary whitespace-pre-wrap">{reply.content}</p>
                            <p className="text-[8px] text-text-muted mt-1">
                              {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
              
              {replyingTo && (
                <div className="px-4 py-2 bg-bg-tertiary border-t border-border-primary flex items-center justify-between">
                  <p className="text-xs text-text-secondary">
                    Respondendo a <span className="font-bold text-color-brand">{replyingTo.userName}</span>
                  </p>
                  <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-bg-secondary rounded-full">
                    <X className="w-3 h-3 text-text-muted" />
                  </button>
                </div>
              )}

              <form 
                onSubmit={handleComment} 
                className="p-4 border-t border-border-primary flex items-end space-x-2"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
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
  const { showToast } = useToast();
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'audio' | 'drawing' | 'link' | 'text' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [textStatus, setTextStatus] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [privacy, setPrivacy] = useState<'all' | 'contacts' | 'private'>(currentUser.statusSettings?.privacy || 'all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDrawingEditor, setShowDrawingEditor] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (mediaType === 'video' && !selectedFile.type.startsWith('video/')) {
        showToast('Por favor, selecione um arquivo de vídeo.', "warning");
        return;
      }
      if (mediaType === 'image' && !selectedFile.type.startsWith('image/')) {
        showToast('Por favor, selecione uma imagem.', "warning");
        return;
      }
      if (mediaType === 'audio' && !selectedFile.type.startsWith('audio/')) {
        showToast('Por favor, selecione um arquivo de áudio.', "warning");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };
  const handleUpload = async () => {
    if (!mediaType) return;
    setIsUploading(true);

    let tempMediaUrl = '';
    if (mediaType === 'link') {
      tempMediaUrl = linkUrl;
    } else if (mediaType === 'text') {
      tempMediaUrl = textStatus;
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
      const finalMediaUrl = mediaType === 'link' ? linkUrl : (mediaType === 'text' ? textStatus : (file ? await uploadFile(file, `statuses/${currentUser.uid}/${Date.now()}_${file.name}`) : ''));
      await createStatus(currentUser, finalMediaUrl, mediaType, caption, privacy);
      setStatuses(prev => prev.filter(s => s.id !== tempStatus.id));
    } catch (error) {
      setStatuses(prev => prev.filter(s => s.id !== tempStatus.id));
      console.error("Upload error:", error);
      showToast("Falha ao enviar status. Verifique se preencheu tudo corretamente.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const resetSelection = () => {
    setMediaType(null);
    setFile(null);
    setPreviewUrl(null);
    setLinkUrl('');
    setTextStatus('');
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
              <button onClick={() => setMediaType('link')} className="p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center"><Share2 className="w-6 h-6 text-blue-500" /></div>
                <span className="font-bold text-text-primary">Link</span>
              </button>
              <button onClick={() => setMediaType('text')} className="p-4 bg-bg-secondary hover:bg-bg-tertiary rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center"><MessageCircle className="w-6 h-6 text-purple-500" /></div>
                <span className="font-bold text-text-primary">Texto</span>
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
                  {mediaType === 'text' && 'Novo Status de Texto'}
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
                  <img src={previewUrl || undefined} className="w-full h-full object-contain" />
                </div>
              )}
              {mediaType === 'video' && previewUrl && (
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                  <video src={previewUrl || undefined} className="w-full h-full object-contain" controls />
                </div>
              )}
              {mediaType === 'audio' && previewUrl && (
                <div className="relative p-4 bg-bg-secondary rounded-xl flex items-center justify-center">
                  <audio src={previewUrl || undefined} controls className="w-full" />
                </div>
              )}
              {mediaType === 'drawing' && (
                <div className="relative aspect-square bg-black rounded-xl overflow-hidden border border-border-primary flex flex-col items-center justify-center space-y-4">
                  {previewUrl ? (
                    <img src={previewUrl || undefined} className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-color-danger/20 rounded-full flex items-center justify-center">
                        <Pencil className="w-8 h-8 text-color-danger" />
                      </div>
                      <p className="text-text-secondary font-medium">Nenhum desenho criado</p>
                    </>
                  )}
                  <button 
                    onClick={() => setShowDrawingEditor(true)}
                    className="px-6 py-2 bg-color-brand text-white font-bold rounded-lg hover:bg-color-brand-hover transition-colors"
                  >
                    {previewUrl ? 'Editar Desenho' : 'Abrir Editor'}
                  </button>
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
              {mediaType === 'text' && (
                <div className="space-y-2">
                  <textarea 
                    value={textStatus}
                    onChange={(e) => setTextStatus(e.target.value)}
                    placeholder="Digite sua mensagem aqui..."
                    className="w-full bg-bg-tertiary border-none rounded-xl py-4 px-4 text-lg font-bold text-text-primary focus:ring-2 focus:ring-color-brand outline-none h-40 text-center"
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
                <button 
                  onClick={() => {
                    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(caption)}`;
                    window.open(telegramUrl, '_blank');
                  }}
                  className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-bold">Compartilhar no Telegram</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-text-muted">Privacidade</label>
                <select 
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="w-full bg-bg-tertiary border-none rounded-xl py-3 px-4 text-text-primary focus:ring-2 focus:ring-color-brand outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="contacts">Apenas Contatos</option>
                  <option value="private">Privado (Apenas Eu)</option>
                </select>
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

      <AnimatePresence>
        {showDrawingEditor && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[200] bg-bg-primary"
          >
            <DrawingCanvas 
              onCancel={() => setShowDrawingEditor(false)}
              onSave={(blob, type) => {
                const extension = type === 'video' ? 'mp4' : (type === 'gif' ? 'gif' : 'png');
                const drawingFile = new File([blob], `drawing.${extension}`, { type: blob.type });
                setFile(drawingFile);
                setPreviewUrl(URL.createObjectURL(drawingFile));
                if (type === 'video' || type === 'gif') {
                  setMediaType('video');
                } else {
                  setMediaType('image');
                }
                setShowDrawingEditor(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
