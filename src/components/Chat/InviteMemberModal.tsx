import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';

interface InviteMemberModalProps {
  members: UserProfile[];
  currentParticipants: string[];
  onClose: () => void;
  onInvite: (userId: string) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ 
  members, 
  currentParticipants, 
  onClose, 
  onInvite 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = members.filter(user => 
    !currentParticipants.includes(user.uid) &&
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-tertiary w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border-primary">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">Convidar Pessoas</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar membros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-text-primary placeholder:text-text-muted outline-none focus:ring-1 focus:ring-color-brand"
          />
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredMembers.map(user => (
            <div key={user.uid} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-secondary group">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img src={user.photoURL || DEFAULT_AVATAR} className="w-8 h-8 rounded-full" alt="" />
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-tertiary",
                    user.status === 'online' ? "bg-color-success" : "bg-text-muted"
                  )} />
                </div>
                <div className="flex flex-col">
                  <span className="text-text-primary font-medium">{user.displayName}</span>
                  <span className="text-xs text-text-muted">{user.status === 'online' ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <button 
                onClick={() => onInvite(user.uid)}
                className="bg-color-brand hover:bg-color-brand/80 text-white px-3 py-1.5 rounded text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Convidar
              </button>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <p className="text-text-muted text-center py-4">Nenhum membro disponível para convidar.</p>
          )}
        </div>
      </div>
    </div>
  );
};
