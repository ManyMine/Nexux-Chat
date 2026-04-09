import React, { useState, useEffect, useRef } from 'react';
import { Settings, Mic, Headphones, LogOut, Sun, Moon, Clock, Circle, CheckCircle2, MinusCircle } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { updateUserProfile } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const isLight = user.theme === 'light';
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user.isAnonymous && user.expiresAt) {
      const updateTimer = () => {
        const now = Date.now();
        const diff = user.expiresAt! - now;
        
        if (diff <= 0) {
          setTimeLeft('Expirado');
          onLogout(); // Trigger logout/deletion
          return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [user.isAnonymous, user.expiresAt, onLogout]);

  const toggleTheme = async () => {
    try {
      await updateUserProfile(user.uid, { theme: isLight ? 'dark' : 'light' });
    } catch (error) {
      console.error("Error toggling theme:", error);
    }
  };

  const handleStatusChange = async (status: 'online' | 'away' | 'offline') => {
    try {
      await updateUserProfile(user.uid, { status });
      setShowStatusMenu(false);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="bg-bg-tertiary h-[52px] px-2 flex items-center justify-between relative">
      <AnimatePresence>
        {showStatusMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-2 mb-2 w-48 bg-bg-overlay border border-border-primary rounded-lg shadow-2xl py-2 z-50"
          >
            <div className="px-3 py-1.5 text-xs font-bold text-text-muted uppercase">Status</div>
            <button 
              onClick={() => handleStatusChange('online')}
              className="w-full flex items-center px-3 py-2 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="w-3 h-3 rounded-full bg-color-success mr-3" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary">Online</span>
            </button>
            <button 
              onClick={() => handleStatusChange('away')}
              className="w-full flex items-center px-3 py-2 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="w-3 h-3 rounded-full bg-color-warning mr-3" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary">Ausente</span>
            </button>
            <button 
              onClick={() => handleStatusChange('offline')}
              className="w-full flex items-center px-3 py-2 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="w-3 h-3 rounded-full bg-text-muted mr-3" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary">Invisível</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        onClick={() => setShowStatusMenu(!showStatusMenu)}
        className="flex items-center min-w-0 flex-1 hover:bg-bg-secondary p-1 rounded cursor-pointer transition-colors group"
      >
        <div className="relative flex-shrink-0">
          <img 
            src={user.photoURL || DEFAULT_AVATAR} 
            alt={user.displayName}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className={cn(
            "absolute bottom-0 right-0 w-3 h-3 border-2 border-bg-tertiary rounded-full",
            user.status === 'online' ? "bg-color-success" : 
            user.status === 'away' ? "bg-color-warning" : "bg-text-muted"
          )} />
        </div>
        <div className="ml-2 min-w-0">
          <p className="text-sm font-bold text-text-primary truncate leading-tight group-hover:text-text-secondary">
            {user.displayName}
          </p>
          <p className="text-[10px] text-text-muted truncate leading-tight capitalize">
            {user.isAnonymous ? (
              <span className="flex items-center text-color-warning">
                <Clock className="w-2.5 h-2.5 mr-1" />
                {timeLeft}
              </span>
            ) : (user.status || 'offline')}
          </p>
        </div>
      </div>
      <div className="flex items-center text-text-muted">
        <button 
          onClick={toggleTheme}
          className="p-1.5 hover:bg-bg-secondary hover:text-text-secondary rounded transition-colors"
          title={isLight ? "Tema Escuro" : "Tema Claro"}
        >
          {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
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
          className="p-1.5 hover:bg-bg-secondary hover:text-color-danger rounded transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
