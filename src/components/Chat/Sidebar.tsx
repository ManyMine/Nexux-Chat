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
    <div className="w-[240px] bg-bg-secondary flex flex-col h-full border-r border-border-primary/50 select-none">
      {/* Server Header */}
      <div className="relative">
        <button 
          onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
          className="h-12 w-full px-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors border-b border-border-primary/50 shadow-sm group"
        >
          <h1 className="font-bold text-text-primary truncate">Nexus Chat</h1>
          <ChevronDown className={cn(
            "w-4 h-4 text-text-muted transition-transform",
            isServerMenuOpen && "rotate-180"
          )} />
        </button>

        {isServerMenuOpen && (
          <div className="absolute top-11 left-2 right-2 bg-bg-overlay rounded-md shadow-xl p-2 z-50 border border-border-primary">
             <button 
               onClick={() => { setIsModalOpen(true); setIsServerMenuOpen(false); }}
               className="w-full flex items-center justify-between p-2 text-sm text-text-muted hover:bg-[#5865f2] hover:text-white rounded transition-colors group"
             >
               <span>Criar Canal</span>
               <Plus className="w-4 h-4" />
             </button>
             <button 
               onClick={() => { onOpenUserSearch(); setIsServerMenuOpen(false); }}
               className="w-full flex items-center justify-between p-2 text-sm text-text-muted hover:bg-[#5865f2] hover:text-white rounded transition-colors group"
             >
               <span>Adicionar Amigos</span>
               <UserPlus className="w-4 h-4" />
             </button>
             <div className="h-px bg-border-primary my-1" />
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
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent">
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <div className="flex items-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="text-xs font-bold uppercase tracking-wider">Canais de Texto</span>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
              title="Criar Canal"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-0.5">
            {channels.filter(c => c.type === 'public').map((channel) => {
              const isUnread = unreadChannels.has(channel.id) && activeChannel?.id !== channel.id;
              
              return (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel)}
                  className={cn(
                    "w-full flex items-center px-2 py-1.5 rounded-md transition-all group relative",
                    activeChannel?.id === channel.id 
                      ? "bg-bg-tertiary text-text-primary" 
                      : isUnread
                        ? "text-text-primary font-semibold"
                        : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                  )}
                >
                  {/* Unread Indicator Dot on the left */}
                  {isUnread && (
                    <div className="absolute -left-1 w-1 h-2 bg-text-primary rounded-r-full" />
                  )}
                  
                  <Hash className={cn(
                    "w-5 h-5 mr-1.5 transition-colors",
                    activeChannel?.id === channel.id || isUnread ? "text-text-secondary" : "text-text-muted group-hover:text-text-secondary"
                  )} />
                  <span className="truncate flex-1 text-left">{channel.name}</span>
                  
                  {isUnread && (
                    <div className="w-4 h-4 bg-[#f23f42] rounded-full flex items-center justify-center ml-2 shadow-[0_0_8px_rgba(242,63,66,0.5)]">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <div className="flex items-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="text-xs font-bold uppercase tracking-wider">Mensagens Diretas</span>
            </div>
            <button 
              onClick={onOpenUserSearch}
              className="text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
              title="Nova DM"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            {channels.filter(c => c.type === 'private').length === 0 ? (
              <div className="px-2 py-2 text-xs text-text-muted italic">Nenhuma conversa recente</div>
            ) : (
              channels.filter(c => c.type === 'private').map((channel) => {
                const isUnread = unreadChannels.has(channel.id) && activeChannel?.id !== channel.id;

                return (
                  <button
                    key={channel.id}
                    onClick={() => onChannelSelect(channel)}
                    className={cn(
                      "w-full flex items-center px-2 py-1.5 rounded-md transition-all group relative",
                      activeChannel?.id === channel.id 
                        ? "bg-bg-tertiary text-text-primary" 
                        : isUnread
                          ? "text-text-primary font-semibold"
                          : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                    )}
                  >
                    {/* Unread Indicator Dot on the left */}
                    {isUnread && (
                      <div className="absolute -left-1 w-1 h-2 bg-text-primary rounded-r-full" />
                    )}

                    <Lock className={cn(
                      "w-4 h-4 mr-2 transition-colors",
                      activeChannel?.id === channel.id || isUnread ? "text-text-secondary" : "text-text-muted group-hover:text-text-secondary"
                    )} />
                    <span className="truncate flex-1 text-left">{channel.name}</span>
                    
                    {isUnread && (
                      <div className="w-4 h-4 bg-[#f23f42] rounded-full flex items-center justify-center ml-2 shadow-[0_0_8px_rgba(242,63,66,0.5)]">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      </div>
                    )}
                  </button>
                );
              })
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



