import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { Channel, UserProfile } from '@/src/types';
import { addChannelMember } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';
import { DEFAULT_AVATAR } from '@/src/constants';

interface AddMembersModalProps {
  channel: Channel;
  allUsers: UserProfile[];
  isOpen: boolean;
  onClose: () => void;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  channel,
  allUsers,
  isOpen,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const filteredUsers = allUsers.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async (userId: string) => {
    setLoadingUserId(userId);
    try {
      await addChannelMember(channel.id, userId);
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-bg-primary w-full max-w-[440px] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-border-primary">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text-primary">Adicionar Membros</h2>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-text-muted mb-4">
                Convide amigos para o canal privado <span className="font-bold text-text-primary">#{channel.name}</span>
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                  type="text"
                  placeholder="Buscar membros..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-tertiary border-none rounded-md py-2 pl-10 pr-4 text-sm text-text-secondary focus:ring-2 focus:ring-[#5865f2] outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm italic">
                  Nenhum usuário encontrado.
                </div>
              ) : (
                filteredUsers.map(user => {
                  const isMember = channel.members.includes(user.uid);
                  return (
                    <div 
                      key={user.uid}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-bg-secondary transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <img 
                          src={user.photoURL || DEFAULT_AVATAR} 
                          alt={user.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{user.displayName}</p>
                          <p className="text-xs text-text-muted">{user.email || 'Sem e-mail'}</p>
                        </div>
                      </div>
                      
                      {isMember ? (
                        <div className="flex items-center space-x-1 text-color-success text-xs font-bold px-2 py-1 bg-color-success/10 rounded">
                          <Check className="w-3 h-3" />
                          <span>Membro</span>
                        </div>
                      ) : (
                        <button
                          disabled={loadingUserId === user.uid}
                          onClick={() => handleAddMember(user.uid)}
                          className="bg-[#5865f2] hover:bg-[#4752c4] text-white p-1.5 rounded transition-colors disabled:opacity-50"
                        >
                          {loadingUserId === user.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-bg-secondary flex justify-end">
              <button
                onClick={onClose}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                Concluído
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
