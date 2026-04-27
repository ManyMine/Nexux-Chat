import React from 'react';
import { Hash, Bell, Pin, Users, Search, HelpCircle, Settings, Menu, Phone, Video, AtSign, UserPlus, Lock, CheckSquare } from 'lucide-react';
import { Channel, UserProfile } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface ChannelHeaderProps {
  channel: Channel;
  otherUser?: UserProfile | null;
  onShowUsers: () => void;
  onShowSettings: () => void;
  onAddMembers: () => void;
  showUsers: boolean;
  onToggleSidebar?: () => void;
  onStartCall: (video: boolean) => void;
  onSearch: (query: string) => void;
  onShowPinned: () => void;
  onToggleMultiSelect: () => void;
  isMultiSelectMode: boolean;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'online': return 'bg-color-success';
    case 'away': return 'bg-color-warning';
    case 'dnd': return 'bg-color-danger';
    case 'invisible': return 'bg-text-muted';
    case 'auto': return 'bg-color-brand';
    default: return 'bg-text-muted';
  }
};

const getStatusText = (status?: string) => {
  switch (status) {
    case 'online': return 'Online';
    case 'away': return 'Ausente';
    case 'dnd': return 'Não incomodar';
    case 'invisible': return 'Invisível';
    case 'auto': return 'Automático';
    default: return 'Offline';
  }
};

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  otherUser,
  onShowUsers,
  onShowSettings,
  onAddMembers,
  showUsers,
  onToggleSidebar,
  onStartCall,
  onSearch,
  onShowPinned,
  onToggleMultiSelect,
  isMultiSelectMode
}) => {
  return (
    <div className="h-12 px-4 flex items-center justify-between border-b border-border-primary/50 shadow-sm bg-transparent z-10">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="md:hidden text-text-muted hover:text-text-primary mr-2"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        {channel.type === 'private' ? (
          <div className="relative flex-shrink-0">
            <AtSign className="w-6 h-6 text-text-muted" />
            {otherUser && (
              <div className={cn(
                "absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-bg-primary rounded-full",
                getStatusColor(otherUser.status)
              )}>
                {otherUser.status === 'dnd' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-0.5 bg-bg-primary rounded-full" />
                  </div>
                )}
                {otherUser.status === 'invisible' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-bg-primary rounded-full" />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : channel.type === 'private_group' ? (
          <Lock className="w-6 h-6 text-color-brand flex-shrink-0" />
        ) : (
          <Hash className="w-6 h-6 text-text-muted flex-shrink-0" />
        )}
        <h2 className="font-bold text-text-primary truncate flex items-center space-x-2">
          <span>{channel.type === 'private' && otherUser ? otherUser.displayName : channel.name}</span>
          {channel.type === 'private' && otherUser && (
            <span className="text-[10px] uppercase font-bold text-text-muted px-1.5 py-0.5 rounded bg-bg-tertiary">
              {getStatusText(otherUser.status)}
            </span>
          )}
        </h2>
        {channel.description && channel.type !== 'private' && (
          <div className="hidden md:flex items-center space-x-2 ml-2 border-l border-border-primary pl-2 overflow-hidden">
            <span className="text-xs text-text-muted truncate">{channel.description}</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4 text-text-muted">
        <button 
          onClick={() => onStartCall(false)}
          className="hover:text-text-primary transition-colors"
          title="Iniciar Chamada de Voz"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onStartCall(true)}
          className="hover:text-text-primary transition-colors"
          title="Iniciar Chamada de Vídeo"
        >
          <Video className="w-5 h-5" />
        </button>
        <button 
          onClick={onShowPinned}
          className="hover:text-text-primary transition-colors"
          title="Mensagens Fixadas"
        >
          <Pin className="w-5 h-5" />
        </button>
        <button 
          onClick={onToggleMultiSelect}
          className={cn(
            "hover:text-text-primary transition-colors",
            isMultiSelectMode ? "text-color-brand" : ""
          )}
          title="Multi-seleção"
        >
          <CheckSquare className="w-5 h-5" />
        </button>
        {channel.type === 'private_group' && (
          <button 
            onClick={onAddMembers}
            className="hover:text-text-primary transition-colors"
            title="Adicionar Membros"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}
        <div className="w-px h-6 bg-border-primary mx-1" />
        <button className="hover:text-text-primary transition-colors hidden sm:block"><Bell className="w-5 h-5" /></button>
        <button 
          onClick={onShowUsers}
          className={`hover:text-text-primary transition-colors ${showUsers ? 'text-text-primary' : ''}`}
        >
          <Users className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block">
           <input 
             type="text" 
             placeholder="Buscar" 
             onChange={(e) => onSearch(e.target.value)}
             className="bg-bg-tertiary text-text-secondary text-xs py-1 px-2 rounded w-32 focus:w-48 transition-all outline-none"
           />
           <Search className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2" />
        </div>
        <button 
          onClick={onShowSettings}
          className="hover:text-text-primary transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button className="hover:text-text-primary transition-colors"><HelpCircle className="w-5 h-5" /></button>
      </div>
    </div>
  );
};
