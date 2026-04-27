import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Activity, Database, Trash2, Layout, Zap, User } from 'lucide-react';
import { UserProfile } from '@/src/types';

interface DevToolsProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const DevTools: React.FC<DevToolsProps> = ({ user, isOpen, onClose }) => {
  const [fps, setFps] = useState(0);
  const [showFps, setShowFps] = useState(false);
  const [showDebugOutlines, setShowDebugOutlines] = useState(false);
  const [showUserJson, setShowUserJson] = useState(false);

  useEffect(() => {
    if (!showFps) return;
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const loop = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [showFps]);

  useEffect(() => {
    if (showDebugOutlines) {
      document.body.classList.add('debug-outlines');
    } else {
      document.body.classList.remove('debug-outlines');
    }
  }, [showDebugOutlines]);

  if (!isOpen) return null;

  return (
    <>
      {showFps && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] bg-black/80 text-green-400 px-2 py-1 rounded font-mono text-xs pointer-events-none border border-green-400/30">
          FPS: {fps}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed top-20 right-4 w-80 bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl z-[1000] flex flex-col max-h-[70vh]"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-sm text-white">Developer Tools</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Feature 1: FPS Counter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/80">Monitor de FPS</span>
            </div>
            <button 
              onClick={() => setShowFps(!showFps)}
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors",
                showFps ? "bg-green-500" : "bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                showFps ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          {/* Feature 2: Debug Outlines */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white/80">Debug Outlines</span>
            </div>
            <button 
              onClick={() => setShowDebugOutlines(!showDebugOutlines)}
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors",
                showDebugOutlines ? "bg-green-500" : "bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                showDebugOutlines ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          {/* Feature 3: User Inspector */}
          <div className="space-y-2">
            <button 
              onClick={() => setShowUserJson(!showUserJson)}
              className="w-full flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-white/80">Inspecionar Usuário</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showUserJson && "rotate-180")} />
            </button>
            {showUserJson && (
              <pre className="p-2 bg-black/40 rounded text-[10px] text-green-300 overflow-x-auto font-mono">
                {JSON.stringify(user, null, 2)}
              </pre>
            )}
          </div>

          {/* Feature 4: Clear Local Cache */}
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="w-full flex items-center gap-2 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Cache e Recarregar
          </button>

          {/* Feature 5: Database Stats (Mock) */}
          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white/60 uppercase">Estatísticas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-black/20 p-2 rounded">
                <p className="text-white/40">Sessão</p>
                <p className="text-white font-mono">{performance.now().toFixed(0)}ms</p>
              </div>
              <div className="bg-black/20 p-2 rounded">
                <p className="text-white/40">Memória</p>
                <p className="text-white font-mono">{(performance as any).memory?.usedJSHeapSize ? `${((performance as any).memory.usedJSHeapSize / 1048576).toFixed(1)}MB` : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

import { cn } from '@/src/lib/utils';
import { ChevronDown } from 'lucide-react';
