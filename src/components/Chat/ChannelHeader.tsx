import React from 'react';
import { Hash, Bell, Pin, Users, Search, HelpCircle, Settings, Menu, Phone, Video, AtSign } from 'lucide-react';
import { Channel, UserProfile } from '@/src/types';

interface ChannelHeaderProps {
  channel: Channel;
  otherUser?: UserProfile | null;
  onShowUsers: () => void;
  onShowSettings: () => void;
  showUsers: boolean;
  onToggleSidebar?: () => void;
  onStartCall: (video: boolean) => void;
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  otherUser,
  onShowUsers,
  onShowSettings,
  showUsers,
  onToggleSidebar,
  onStartCall
}) => {
  return (
    <div className="h-12 px-4 flex items-center justify-between border-b border-[#1e1f22]/50 shadow-sm bg-[#313338] z-10">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="md:hidden text-[#b5bac1] hover:text-white mr-2"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        {channel.type === 'private' ? (
          <AtSign className="w-6 h-6 text-[#80848e] flex-shrink-0" />
        ) : (
          <Hash className="w-6 h-6 text-[#80848e] flex-shrink-0" />
        )}
        <h2 className="font-bold text-white truncate">
          {channel.type === 'private' && otherUser ? otherUser.displayName : channel.name}
        </h2>
        {channel.description && channel.type !== 'private' && (
          <div className="hidden md:flex items-center space-x-2 ml-2 border-l border-[#3f4147] pl-2 overflow-hidden">
            <span className="text-xs text-[#b5bac1] truncate">{channel.description}</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4 text-[#b5bac1]">
        <button 
          onClick={() => onStartCall(false)}
          className="hover:text-white transition-colors"
          title="Iniciar Chamada de Voz"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onStartCall(true)}
          className="hover:text-white transition-colors"
          title="Iniciar Chamada de Vídeo"
        >
          <Video className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-[#3f4147] mx-1" />
        <button className="hover:text-white transition-colors hidden sm:block"><Bell className="w-5 h-5" /></button>
        <button className="hover:text-white transition-colors hidden sm:block"><Pin className="w-5 h-5" /></button>
        <button 
          onClick={onShowUsers}
          className={`hover:text-white transition-colors ${showUsers ? 'text-white' : ''}`}
        >
          <Users className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block">
           <input 
             type="text" 
             placeholder="Buscar" 
             className="bg-[#1e1f22] text-xs py-1 px-2 rounded w-32 focus:w-48 transition-all outline-none"
           />
           <Search className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2" />
        </div>
        <button 
          onClick={onShowSettings}
          className="hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button className="hover:text-white transition-colors"><HelpCircle className="w-5 h-5" /></button>
      </div>
    </div>
  );
};
