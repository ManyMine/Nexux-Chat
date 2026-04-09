import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Hash, Settings, LogOut, Plus, UserCircle, ChevronDown, MessageSquare, UserPlus, Lock, PlayCircle } from 'lucide-react';
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
  allUsers: UserProfile[];
  onChannelSelect: (channel: Channel) => void;
  onLogout: () => void;
  onOpenUserSearch: () => void;
  onOpenUserSettings: () => void;
  onOpenStatus: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  channels,
  activeChannel,
  unreadChannels,
  allUsers,
  onChannelSelect,
  onLogout,
  onOpenUserSearch,
  onOpenUserSettings,
  onOpenStatus
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);

  const handleCreateChannel = async (values: { name: string, type: 'public' | 'private' | 'category', parentId?: string }) => {
    setIsCreating(true);
    try {
      await createChannel(values.name, values.type, currentUser.uid, values.parentId);
    } catch (error) {
      console.error("Error creating channel:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const categories = channels.filter(c => c.type === 'category');
  const uncategorizedChannels = channels.filter(c => c.type === 'public' && !c.parentId);
  const privateChannels = channels.filter(c => c.type === 'private');

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
               className="w-full flex items-center justify-between p-2 text-sm text-text-muted hover:bg-color-brand hover:text-white rounded transition-colors group"
             >
               <span>Criar Canal ou Categoria</span>
               <Plus className="w-4 h-4" />
             </button>
             <button 
               onClick={() => { onOpenUserSearch(); setIsServerMenuOpen(false); }}
               className="w-full flex items-center justify-between p-2 text-sm text-text-muted hover:bg-color-brand hover:text-white rounded transition-colors group"
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
        {/* Status Button */}
        <button 
          onClick={onOpenStatus}
          className="w-full flex items-center px-2 py-2 rounded-md transition-all bg-bg-tertiary/30 hover:bg-bg-tertiary text-text-secondary border border-border-primary/30 group mb-4"
        >
          <div className="w-8 h-8 rounded-full bg-color-brand/20 flex items-center justify-center mr-3 group-hover:bg-color-brand/30 transition-colors">
            <PlayCircle className="w-5 h-5 text-color-brand" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-primary">Status</p>
            <p className="text-[10px] text-text-muted">Veja as atualizações</p>
          </div>
        </button>

        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-1 group">
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
              {uncategorizedChannels.map((channel) => {
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
                    {isUnread && <div className="absolute -left-1 w-1 h-2 bg-text-primary rounded-r-full" />}
                    <Hash className={cn(
                      "w-5 h-5 mr-1.5 transition-colors",
                      activeChannel?.id === channel.id || isUnread ? "text-text-secondary" : "text-text-muted group-hover:text-text-secondary"
                    )} />
                    <span className="truncate flex-1 text-left">{channel.name}</span>
                    {isUnread && (
                      <div className="w-4 h-4 bg-color-accent rounded-full flex items-center justify-center ml-2 shadow-[0_0_8px_var(--accent)]">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.map(category => {
          const categoryChannels = channels.filter(c => c.type === 'public' && c.parentId === category.id);
          return (
            <div key={category.id}>
              <div className="flex items-center justify-between px-2 mb-1 group">
                <div className="flex items-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
                  <ChevronDown className="w-3 h-3 mr-1" />
                  <span className="text-xs font-bold uppercase tracking-wider">{category.name}</span>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
                  title="Criar Canal nesta Categoria"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-0.5">
                {categoryChannels.length === 0 ? (
                  <div className="px-6 py-1 text-xs text-text-muted italic">Nenhum canal</div>
                ) : (
                  categoryChannels.map((channel) => {
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
                        {isUnread && <div className="absolute -left-1 w-1 h-2 bg-text-primary rounded-r-full" />}
                        <Hash className={cn(
                          "w-5 h-5 mr-1.5 transition-colors",
                          activeChannel?.id === channel.id || isUnread ? "text-text-secondary" : "text-text-muted group-hover:text-text-secondary"
                        )} />
                        <span className="truncate flex-1 text-left">{channel.name}</span>
                        {isUnread && (
                          <div className="w-4 h-4 bg-color-accent rounded-full flex items-center justify-center ml-2 shadow-[0_0_8px_var(--accent)]">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group mt-4">
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
            {privateChannels.length === 0 ? (
              <div className="px-2 py-2 text-xs text-text-muted italic">Nenhuma conversa recente</div>
            ) : (
              privateChannels.map((channel) => {
                const isUnread = unreadChannels.has(channel.id) && activeChannel?.id !== channel.id;
                
                // Find the other user in this private channel
                const otherUserId = channel.members?.find(id => id !== currentUser.uid);
                const otherUser = allUsers.find(u => u.uid === otherUserId);
                const displayName = otherUser?.displayName || channel.name;
                const photoURL = otherUser?.photoURL || DEFAULT_AVATAR;

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
                    {isUnread && <div className="absolute -left-1 w-1 h-2 bg-text-primary rounded-r-full" />}
                    <span className="truncate flex-1 text-left">{displayName}</span>

                    <div className="relative ml-2">
                      <img 
                        src={photoURL} 
                        alt={displayName}
                        className="w-6 h-6 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {otherUser?.status === 'online' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-color-success rounded-full border-2 border-bg-secondary" />
                      )}
                    </div>
                    
                    {isUnread && (
                      <div className="w-4 h-4 bg-color-accent rounded-full flex items-center justify-center ml-2 shadow-[0_0_8px_var(--accent)]">
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
        categories={categories}
      />
    </div>
  );
};



