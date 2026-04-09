import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Calendar, Mail, Hash, Flag, MessageSquare, MoreVertical, AlertTriangle } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { reportUser } from '@/src/services/firebaseService';

interface UserProfileModalProps {
  user: UserProfile;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, currentUser, isOpen, onClose, onSendMessage }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  if (!isOpen) return null;

  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Desconhecido';

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
                  className="w-20 h-20 rounded-full object-cover border-[6px] border-[#1e1f22]"
                />
                <div className={cn(
                  "absolute bottom-1 right-1 w-5 h-5 border-[4px] border-[#1e1f22] rounded-full",
                  user.status === 'online' ? "bg-[#23a55a]" : 
                  user.status === 'away' ? "bg-[#f0b232]" : 
                  user.status === 'dnd' ? "bg-[#f23f43]" : "bg-[#80848e]"
                )} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <div className="bg-[#111214] p-4 rounded-lg mt-2">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-white flex items-center">
                  {user.displayName}
                  {user.role === 'admin' && (
                    <Shield className="w-4 h-4 ml-2 text-[#5865f2]" title="Administrador" />
                  )}
                </h2>
              </div>
              <p className="text-xs text-[#b5bac1] font-medium mb-4">{user.username || user.displayName.toLowerCase().replace(/\s/g, '')}</p>
              
              <div className="space-y-4">
                {/* Custom Status */}
                {user.statusMessage && (
                  <div>
                    <h3 className="text-[10px] font-bold text-[#b5bac1] uppercase mb-1 tracking-wider">Status Personalizado</h3>
                    <p className="text-sm text-[#dbdee1]">{user.statusMessage}</p>
                  </div>
                )}

                <div className="h-px bg-white/5" />

                {/* About Me */}
                <div>
                  <h3 className="text-[10px] font-bold text-[#b5bac1] uppercase mb-1 tracking-wider">Sobre Mim</h3>
                  <p className="text-sm text-[#dbdee1]">
                    {user.bio || "Este usuário ainda não definiu uma biografia."}
                  </p>
                </div>

                {/* Member Since */}
                <div>
                  <h3 className="text-[10px] font-bold text-[#b5bac1] uppercase mb-1 tracking-wider">Membro Desde</h3>
                  <div className="flex items-center text-sm text-[#dbdee1]">
                    <Calendar className="w-3.5 h-3.5 mr-2 text-[#b5bac1]" />
                    {createdAt}
                  </div>
                </div>

                {/* Quick Message Input */}
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
            </div>
          </div>

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
