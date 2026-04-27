import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Calendar, Mail, Hash, Flag, MessageSquare, MoreVertical, AlertTriangle, Grid, History, Users, Heart, MessageCircle } from 'lucide-react';
import { UserProfile, Channel, Status } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { reportUser, getStatuses } from '@/src/services/firebaseService';
import { DEFAULT_AVATAR } from '@/src/constants';
import { UserStatusView } from '../Status/UserStatusView';

interface UserProfileModalProps {
  user: UserProfile;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: () => void;
  channels?: Channel[];
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'online': return 'bg-[#23a55a]';
    case 'away': return 'bg-[#f0b232]';
    case 'dnd': return 'bg-[#f23f43]';
    case 'invisible': return 'bg-[#80848e]';
    case 'auto': return 'bg-[#5865f2]';
    default: return 'bg-[#80848e]';
  }
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, currentUser, isOpen, onClose, onSendMessage, channels = [] }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'posts' | 'stories' | 'communities'>('about');
  const [userStatuses, setUserStatuses] = useState<Status[]>([]);
  const [viewingStatusId, setViewingStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = getStatuses(currentUser, channels, (allStatuses) => {
        const filtered = allStatuses.filter(s => s.userId === user.uid);
        setUserStatuses(filtered);
      });
      return () => unsubscribe();
    }
  }, [isOpen, user.uid, currentUser, channels]);

  if (!isOpen) return null;

  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Desconhecido';

  const posts = userStatuses.filter(s => s.mediaType === 'image' || s.mediaType === 'drawing');
  const stories = userStatuses.filter(s => s.mediaType === 'video' || s.mediaType === 'audio' || s.mediaType === 'text' || s.mediaType === 'link');
  const mutualCommunities = channels.filter(c => 
    c.type === 'community' || c.type === 'server' || c.type === 'public'
  ).filter(c => c.members.includes(user.uid) && c.members.includes(currentUser.uid));

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setIsReporting(true);
    try {
      await reportUser(currentUser.uid, user.uid, reportReason);
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason('');
      }, 2000);
    } catch (error) {
      console.error("Failed to report user:", error);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[340px] bg-[#1e1f22] rounded-lg shadow-2xl overflow-hidden relative border border-white/5"
        >
          {/* Banner */}
          <div 
            className="h-[60px] w-full relative"
            style={{ 
              backgroundColor: user.primaryColor || '#5865F2',
              backgroundImage: user.background?.type === 'image' ? `url(${user.background.value})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Report Button */}
            {user.uid !== currentUser.uid && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="absolute top-2 right-10 p-1.5 bg-black/20 text-white/70 rounded hover:bg-black/40 hover:text-white transition-all"
                title="Denunciar Usuário"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}
            
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 p-1.5 bg-black/20 text-white/70 rounded hover:bg-black/40 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Avatar Section */}
          <div className="px-4 relative h-12">
            <div className="absolute -top-10 left-4 p-1.5 bg-[#1e1f22] rounded-full">
              <div className="relative">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`} 
                  alt={user.displayName}
                  className="w-[85px] h-[85px] rounded-full object-cover border-[6px] border-[#1e1f22] will-change-transform"
                  referrerPolicy="no-referrer"
                />
                <div className={cn(
                  "absolute bottom-1 right-1 w-5 h-5 border-[4px] border-[#1e1f22] rounded-full",
                  getStatusColor(user.status)
                )}>
                  {user.status === 'dnd' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-1 bg-[#1e1f22] rounded-full" />
                    </div>
                  )}
                  {user.status === 'invisible' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-[#1e1f22] rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <div className="bg-[#111214] rounded-lg mt-2 overflow-hidden flex flex-col">
              {/* Profile Info Header */}
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    {user.displayName}
                    {user.role === 'admin' && (
                      <Shield className="w-4 h-4 ml-2 text-[#5865f2]" />
                    )}
                  </h2>
                </div>
                <p className="text-xs text-[#b5bac1] font-medium">{user.username || user.displayName.toLowerCase().replace(/\s/g, '')}</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button 
                  onClick={() => setActiveTab('about')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'about' ? "text-white border-b-2 border-[#5865f2]" : "text-[#b5bac1] hover:text-[#dbdee1]"
                  )}
                >
                  Sobre
                </button>
                <button 
                  onClick={() => setActiveTab('posts')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'posts' ? "text-white border-b-2 border-[#5865f2]" : "text-[#b5bac1] hover:text-[#dbdee1]"
                  )}
                >
                  Posts ({posts.length})
                </button>
                <button 
                  onClick={() => setActiveTab('stories')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'stories' ? "text-white border-b-2 border-[#5865f2]" : "text-[#b5bac1] hover:text-[#dbdee1]"
                  )}
                >
                  Stories ({stories.length})
                </button>
                <button 
                  onClick={() => setActiveTab('communities')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    activeTab === 'communities' ? "text-white border-b-2 border-[#5865f2]" : "text-[#b5bac1] hover:text-[#dbdee1]"
                  )}
                >
                  Comuns ({mutualCommunities.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar">
                {activeTab === 'about' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-[10px] font-bold text-[#b5bac1] uppercase mb-1 tracking-wider">Sobre Mim</h3>
                      <p className="text-sm text-[#dbdee1]">
                        {user.about || "Este usuário ainda não definiu uma biografia."}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-[#b5bac1] uppercase mb-1 tracking-wider">Membro Desde</h3>
                      <div className="flex items-center text-sm text-[#dbdee1]">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-[#b5bac1]" />
                        {createdAt}
                      </div>
                    </div>
                    {onSendMessage && user.uid !== currentUser.uid && (
                      <div className="pt-2">
                        <button 
                          onClick={onSendMessage}
                          className="w-full bg-[#5865f2] text-white text-sm font-medium py-2 rounded hover:bg-[#4752c4] transition-colors flex items-center justify-center"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Enviar Mensagem
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div className="grid grid-cols-3 gap-1">
                    {posts.length > 0 ? (
                      posts.map(post => (
                        <div 
                          key={post.id} 
                          onClick={() => setViewingStatusId(post.id)}
                          className="aspect-square relative group cursor-pointer overflow-hidden rounded-sm"
                        >
                          <img 
                            src={post.mediaUrl} 
                            alt="Post" 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                            <div className="flex items-center text-white text-[10px] font-bold">
                              <Heart className="w-3 h-3 mr-1 fill-white" />
                              {post.likes.length}
                            </div>
                            <div className="flex items-center text-white text-[10px] font-bold">
                              <MessageCircle className="w-3 h-3 mr-1 fill-white" />
                              {post.comments.length}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 flex flex-col items-center justify-center py-10 text-center">
                        <Grid className="w-8 h-8 text-[#4f545c] mb-2" />
                        <p className="text-xs text-[#b5bac1]">Nenhum post ainda.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'stories' && (
                  <div className="space-y-2">
                    {stories.length > 0 ? (
                      stories.map(story => (
                        <div 
                          key={story.id} 
                          onClick={() => setViewingStatusId(story.id)}
                          className="flex items-center p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full border-2 border-[#5865f2] p-0.5 mr-3 shrink-0">
                            {story.mediaType === 'text' ? (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#5865f2] to-[#7289da] flex items-center justify-center text-[8px] text-white font-bold overflow-hidden">
                                {story.mediaUrl.substring(0, 10)}...
                              </div>
                            ) : (
                              <img 
                                src={story.mediaUrl} 
                                className="w-full h-full rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium truncate">{story.caption || (story.mediaType === 'text' ? story.mediaUrl : 'Status')}</p>
                            <p className="text-[10px] text-[#b5bac1]">{new Date(story.timestamp).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center space-x-2 text-[#b5bac1]">
                            <div className="flex items-center text-[10px]">
                              <Heart className="w-3 h-3 mr-0.5" />
                              {story.likes.length}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <History className="w-8 h-8 text-[#4f545c] mb-2" />
                        <p className="text-xs text-[#b5bac1]">Nenhum story ainda.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'communities' && (
                  <div className="space-y-2">
                    {mutualCommunities.length > 0 ? (
                      mutualCommunities.map(community => (
                        <div key={community.id} className="flex items-center p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-[#313338] flex items-center justify-center mr-3 shrink-0 overflow-hidden">
                            {community.background?.value ? (
                              <img src={community.background.value} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Hash className="w-5 h-5 text-[#b5bac1]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-bold truncate">{community.name}</p>
                            <p className="text-[10px] text-[#b5bac1]">{community.members.length} membros</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Users className="w-8 h-8 text-[#4f545c] mb-2" />
                        <p className="text-xs text-[#b5bac1]">Nenhuma comunidade em comum.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Viewer Overlay */}
          {viewingStatusId && (
            <UserStatusView 
              userId={user.uid}
              currentUser={currentUser}
              allStatuses={activeTab === 'posts' ? posts : stories}
              initialStatusId={viewingStatusId}
              onClose={() => setViewingStatusId(null)}
            />
          )}

          {/* Report Modal Overlay */}
          <AnimatePresence>
            {showReportModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#1e1f22] p-4 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-[#f23f43]" />
                    Denunciar Usuário
                  </h3>
                  <button onClick={() => setShowReportModal(false)} className="text-[#b5bac1] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {reportSuccess ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-12 h-12 bg-[#23a55a]/20 rounded-full flex items-center justify-center mb-2">
                      <Flag className="w-6 h-6 text-[#23a55a]" />
                    </div>
                    <p className="text-white font-bold">Denúncia Enviada</p>
                    <p className="text-sm text-[#b5bac1]">Obrigado por ajudar a manter nossa comunidade segura.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#b5bac1] mb-4">
                      Por favor, descreva o motivo da denúncia para o usuário <span className="text-white font-bold">{user.displayName}</span>.
                    </p>
                    <textarea 
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Ex: Comportamento inadequado, spam, etc..."
                      className="flex-1 bg-[#111214] text-white text-sm p-3 rounded border border-white/5 focus:border-[#5865f2] outline-none resize-none mb-4"
                    />
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setShowReportModal(false)}
                        className="flex-1 py-2 text-sm font-medium text-white hover:underline"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleReport}
                        disabled={isReporting || !reportReason.trim()}
                        className="flex-1 bg-[#f23f43] text-white text-sm font-medium py-2 rounded hover:bg-[#da373c] disabled:opacity-50 transition-colors"
                      >
                        {isReporting ? "Enviando..." : "Denunciar"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
