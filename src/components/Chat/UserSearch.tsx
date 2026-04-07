import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, UserPlus, Loader2, MessageSquare } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  allUsers: UserProfile[];
}

export const UserSearch: React.FC<UserSearchProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  allUsers
}) => {
  const [search, setSearch] = useState('');

  const filteredUsers = allUsers.filter(user => 
    !user.isPrivate && user.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="relative bg-[#313338] w-full max-w-[440px] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-[#1e1f22]/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Buscar Amigos</h2>
                <button onClick={onClose} className="text-[#b5bac1] hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#80848e]" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Digite um nome"
                  className="w-full bg-[#1e1f22] border-none rounded-md py-2.5 pl-10 pr-4 text-[#dbdee1] focus:ring-2 focus:ring-[#5865f2] outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-[#b5bac1]">
                  <p className="text-sm italic">Nenhum usuário encontrado.</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className="w-full flex items-center p-3 rounded-md hover:bg-[#35373c] transition-colors group"
                  >
                    <img 
                      src={user.photoURL || DEFAULT_AVATAR} 
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover mr-3"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white font-bold truncate">{user.displayName}</p>
                    </div>
                    <div className="bg-[#1e1f22] p-2 rounded-full text-[#b5bac1] group-hover:text-white group-hover:bg-[#5865f2] transition-all">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
