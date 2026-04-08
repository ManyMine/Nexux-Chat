import React from 'react';
import { Settings, Mic, Headphones, LogOut } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';

interface UserPanelProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const UserPanel: React.FC<UserPanelProps> = ({
  user,
  onLogout,
  onOpenSettings
}) => {
  return (
    <div className="bg-bg-tertiary h-[52px] px-2 flex items-center justify-between">
      <div className="flex items-center min-w-0 flex-1 hover:bg-bg-secondary p-1 rounded cursor-pointer transition-colors group">
        <div className="relative flex-shrink-0">
          <img 
            src={user.photoURL || DEFAULT_AVATAR} 
            alt={user.displayName}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] border-2 border-bg-tertiary rounded-full" />
        </div>
        <div className="ml-2 min-w-0">
          <p className="text-sm font-bold text-text-primary truncate leading-tight group-hover:text-text-secondary">
            {user.displayName}
          </p>
          <p className="text-[10px] text-text-muted truncate leading-tight">
            Online
          </p>
        </div>
      </div>
      <div className="flex items-center text-text-muted">
        <button className="p-1.5 hover:bg-bg-secondary hover:text-text-secondary rounded transition-colors">
          <Mic className="w-5 h-5" />
        </button>
        <button className="p-1.5 hover:bg-bg-secondary hover:text-text-secondary rounded transition-colors">
          <Headphones className="w-5 h-5" />
        </button>
        <button 
          onClick={onOpenSettings}
          className="p-1.5 hover:bg-bg-secondary hover:text-text-secondary rounded transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button 
          onClick={onLogout}
          className="p-1.5 hover:bg-bg-secondary hover:text-[#f23f42] rounded transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
