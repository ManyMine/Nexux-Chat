import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Hash, Settings, LogOut, Plus, UserCircle, ChevronDown, MessageSquare, UserPlus, Lock } from 'lucide-react';
import { UserProfile, Channel } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { DEFAULT_AVATAR } from '@/src/constants';
import { CreateChannelModal } from './CreateChannelModal';
import { createChannel } from '@/src/services/firebaseService';
import { UserPanel } from './UserPanel';

interface SidebarProps {
  currentUser: UserProfile;
  channels: Channel[];
  activeChannel: Channel | null;
  unreadChannels: Set<string>;
  onChannelSelect: (channel: Channel) => void;
  onLogout: () => void;
  onOpenUserSearch: () => void;
  onOpenUserSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  channels,
  activeChannel,
  unreadChannels,
  onChannelSelect,
  onLogout,
  onOpenUserSearch,
  onOpenUserSettings
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);

  const handleCreateChannel = async (values: { name: string, type: 'public' | 'private' }) => {
    setIsCreating(true);
    try {
      await createChannel(values.name, values.type, currentUser.uid);
    } catch (error) {
      console.error("Error creating channel:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-[240px] bg-[#2b2d31] flex flex-col h-full border-r border-[#1e1f22]/50 select-none">
      {/* Server Header */}
      <div className="relative">
        <button 
          onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
          className="h-12 w-full px-4 flex items-center justify-between hover:bg-[#35373c] transition-colors border-b border-[#1e1f22]/50 shadow-sm group"
        >
          <h1 className="font-bold text-white truncate">Nexus Chat</h1>
          <ChevronDown className={cn(
            "w-4 h-4 text-[#b5bac1] transition-transform",
            isServerMenuOpen && "rotate-180"
          )} />
        </button>

        {isServerMenuOpen && (
          <div className="absolute top-11 left-2 right-2 bg-[#111214] rounded-md shadow-xl p-2 z-50 border border-[#1e1f22]">
             <button 
               onClick={() => { setIsModalOpen(true); setIsServerMenuOpen(false); }}
               className="w-full flex items-center justify-between p-2 text-sm text-[#949ba4] hover:bg-[#5865f2] hover:text-white rounded transition-colors group"
             >
               <span>Criar Canal</span>
               <Plus className="w-4 h-4" />
             </button>
             <button 
               onClick={() => { onOpenUserSearch(); setIsServerMenuOpen(false); }}
               className="w-full flex items-center justify-between p-2 text-sm text-[#949ba4] hover:bg-[#5865f2] hover:text-white rounded transition-colors group"
             >
               <span>Adicionar Amigos</span>
               <UserPlus className="w-4 h-4" />
             </button>
             <div className="h-px bg-[#1e1f22] my-1" />
             <button 
               onClick={onLogout}
               className="w-full flex items-center justify-between p-2 text-sm text-[#f23f42] hover:bg-[#f23f42] hover:text-white rounded transition-colors group"
             >
               <span>Sair do Servidor</span>
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 scrollbar-thin scrollbar-thumb-[#1e1f22] scrollbar-track-transparent">
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <div className="flex items-center text-[#949ba4] hover:text-[#dbdee1] cursor-pointer transition-colors">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="text-xs font-bold uppercase tracking-wider">Canais de Texto</span>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-[#949ba4] hover:text-[#dbdee1] transition-colors opacity-0 group-hover:opacity-100"
              title="Criar Canal"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-0.5">
            {channels.filter(c => c.type === 'public').map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md transition-all group",
                  activeChannel?.id === channel.id 
                    ? "bg-[#3f4147] text-white" 
                    : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
                )}
              >
                <Hash className="w-5 h-5 mr-1.5 text-[#80848e] group-hover:text-[#dbdee1]" />
                <span className="truncate font-medium flex-1 text-left">{channel.name}</span>
                {unreadChannels.has(channel.id) && (
                  <div className="w-2 h-2 bg-[#f23f42] rounded-full ml-2 shadow-[0_0_8px_rgba(242,63,66,0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <div className="flex items-center text-[#949ba4] hover:text-[#dbdee1] cursor-pointer transition-colors">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="text-xs font-bold uppercase tracking-wider">Mensagens Diretas</span>
            </div>
            <button 
              onClick={onOpenUserSearch}
              className="text-[#949ba4] hover:text-[#dbdee1] transition-colors opacity-0 group-hover:opacity-100"
              title="Nova DM"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            {channels.filter(c => c.type === 'private').length === 0 ? (
              <div className="px-2 py-2 text-xs text-[#949ba4] italic">Nenhuma conversa recente</div>
            ) : (
              channels.filter(c => c.type === 'private').map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel)}
                  className={cn(
                    "w-full flex items-center px-2 py-1.5 rounded-md transition-all group",
                    activeChannel?.id === channel.id 
                      ? "bg-[#3f4147] text-white" 
                      : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
                  )}
                >
                  <Lock className="w-4 h-4 mr-2 text-[#80848e] group-hover:text-[#dbdee1]" />
                  <span className="truncate font-medium flex-1 text-left">{channel.name}</span>
                  {unreadChannels.has(channel.id) && (
                    <div className="w-2 h-2 bg-[#f23f42] rounded-full ml-2 shadow-[0_0_8px_rgba(242,63,66,0.5)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Panel */}
      <UserPanel 
        user={currentUser}
        onLogout={onLogout}
        onOpenSettings={onOpenUserSettings}
      />

      <CreateChannelModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateChannel}
        isLoading={isCreating}
      />
    </div>
  );
};



