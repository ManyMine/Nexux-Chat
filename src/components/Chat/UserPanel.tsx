import React, { useState, useEffect, useRef } from 'react';
import { Settings, Mic, Headphones, LogOut, Sun, Moon, Clock, Circle, CheckCircle2, MinusCircle, Code, Settings2 } from 'lucide-react';
import { UserProfile, Channel } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { updateUserProfile } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AccessibilityMenu } from '../AccessibilityMenu';

interface UserPanelProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenSettings: () => void;
  onToggleDevMode?: () => void;
  onOpenDevTools?: () => void;
  isDevMode?: boolean;
  activeChannel?: Channel | null;
}

export const UserPanel: React.FC<UserPanelProps> = ({
  user,
  onLogout,
  onOpenSettings,
  onToggleDevMode,
  onOpenDevTools,
  isDevMode,
  activeChannel
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [themeClickCount, setThemeClickCount] = useState(0);
  const [devModeClickCount, setDevModeClickCount] = useState(0);
  const isLight = user.theme === 'light';
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user.role === 'admin';

  const handleThemeClick = () => {
    toggleTheme();
    // Use a timeout to schedule the state update after the current render cycle
    setTimeout(() => {
      setThemeClickCount(prev => {
        const newCount = prev + 1;
        if (newCount === 3) {
          if (onToggleDevMode && !isDevMode) onToggleDevMode();
          return 0;
        }
        return newCount;
      });
    }, 0);
  };

  const handleDevModeClick = () => {
    // Use a timeout to schedule the state update after the current render cycle
    setTimeout(() => {
      setDevModeClickCount(prev => {
        const newCount = prev + 1;
        if (newCount === 3) {
          if (onToggleDevMode && isDevMode) onToggleDevMode();
          return 0;
        }
        return newCount;
      });
    }, 0);
  };

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

  const handleStatusChange = async (status: 'online' | 'away' | 'dnd' | 'invisible' | 'auto') => {
    try {
      await updateUserProfile(user.uid, { status });
      setShowStatusMenu(false);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

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

  const channelBgStyles = React.useMemo(() => {
    if (!activeChannel?.background) return {};
    
    const bg = activeChannel.background;
    const styles: any = {};
    
    if (bg.type === 'color') {
      styles['backgroundColor'] = bg.value;
    } else if (bg.type === 'gradient') {
      styles['background'] = bg.value;
    } else if (bg.type === 'pattern') {
      const patterns: Record<string, string> = {
        'dots': 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        'lines': 'linear-gradient(45deg, currentColor 1px, transparent 1px)',
        'grid': 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)'
      };
      styles['backgroundImage'] = patterns[bg.patternId || 'dots'];
      styles['backgroundSize'] = '20px 20px';
      styles['color'] = bg.patternColor || '#ffffff11';
      styles['backgroundColor'] = 'transparent';
    }

    const filters = [];
    if (bg.brightness !== undefined) {
      filters.push(`brightness(${bg.brightness}%)`);
    }
    if (bg.contrast !== undefined) {
      filters.push(`contrast(${bg.contrast}%)`);
    }
    if (filters.length > 0) {
      styles['filter'] = filters.join(' ');
    }
    
    if (bg.opacity !== undefined) {
      styles['opacity'] = bg.opacity / 100;
    } else {
      styles['opacity'] = 0.3;
    }

    return styles;
  }, [activeChannel?.background]);

  return (
    <div className="bg-bg-tertiary h-[57px] px-2 flex items-center justify-between relative" style={channelBgStyles}>
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
              onClick={() => handleStatusChange('auto')}
              className="w-full flex items-center px-3 py-2 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="w-3 h-3 rounded-full bg-color-brand mr-3" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary">Automático</span>
            </button>
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
              onClick={() => handleStatusChange('dnd')}
              className="w-full flex items-center px-3 py-2 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="w-3 h-3 rounded-full bg-color-danger mr-3 flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-bg-overlay rounded-full" />
              </div>
              <span className="text-sm text-text-secondary group-hover:text-text-primary">Não incomodar</span>
            </button>
            <button 
              onClick={() => handleStatusChange('invisible')}
              className="w-full flex items-center px-3 py-2 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="w-3 h-3 rounded-full bg-text-muted mr-3 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-bg-overlay rounded-full" />
              </div>
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
            className="w-[37px] h-[37px] rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className={cn(
            "absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-bg-tertiary rounded-full",
            getStatusColor(user.status)
          )}>
            {user.status === 'dnd' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-bg-tertiary rounded-full" />
              </div>
            )}
            {user.status === 'invisible' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-bg-tertiary rounded-full" />
              </div>
            )}
          </div>
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
            ) : getStatusText(user.status)}
          </p>
        </div>
      </div>
      <div className="flex items-center text-text-muted">
        <button 
          onClick={handleThemeClick}
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
        <AccessibilityMenu triggerClassName="p-1.5 hover:bg-bg-secondary hover:text-text-secondary rounded transition-colors text-text-muted" />
        {isAdmin && (
          <div className="flex items-center">
            <button 
              onClick={handleDevModeClick}
              className={cn(
                "p-1.5 hover:bg-bg-secondary rounded transition-colors",
                isDevMode ? "text-color-brand" : "hover:text-text-secondary text-text-muted"
              )}
              title="Alternar Modo Desenvolvedor"
            >
              <Code className="w-5 h-5" />
            </button>
            {isDevMode && (
              <button 
                onClick={onOpenDevTools}
                className="p-1.5 hover:bg-bg-secondary text-color-brand rounded transition-colors"
                title="Abrir Ferramentas de Desenvolvedor"
              >
                <Settings className="w-4 h-4 animate-spin-slow" />
              </button>
            )}
          </div>
        )}
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
