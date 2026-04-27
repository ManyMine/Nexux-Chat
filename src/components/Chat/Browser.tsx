import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Globe, ArrowLeft, ArrowRight, RotateCcw, X, ExternalLink, Shield, Lock, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface BrowserProps {
  onClose: () => void;
  initialUrl?: string;
}

export const Browser: React.FC<BrowserProps> = ({ onClose, initialUrl = 'https://www.google.com' }) => {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let targetUrl = inputUrl.trim();
    if (!targetUrl) return;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }
    setIsLoading(true);
    setUrl(targetUrl);
    setInputUrl(targetUrl);
  };

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const goHome = () => {
    setIsLoading(true);
    setUrl('https://www.google.com');
    setInputUrl('https://www.google.com');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[150] bg-bg-primary flex flex-col overflow-hidden md:m-4 md:rounded-2xl shadow-2xl border border-border-primary"
    >
      {/* Browser Header */}
      <div className="bg-bg-secondary p-2 md:p-3 border-b border-border-primary flex items-center space-x-2 md:space-x-4">
        <div className="hidden md:flex items-center space-x-1 md:space-x-2">
          <button className="p-1.5 md:p-2 hover:bg-bg-tertiary rounded-full text-text-muted transition-colors">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button className="p-1.5 md:p-2 hover:bg-bg-tertiary rounded-full text-text-muted transition-colors">
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button onClick={handleReload} className="p-1.5 md:p-2 hover:bg-bg-tertiary rounded-full text-text-muted transition-colors">
            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        <form onSubmit={handleNavigate} className="flex-1 relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <Lock className="w-3 h-3 text-color-success" />
            <Globe className="w-4 h-4 text-text-muted" />
          </div>
          <input 
            type="text" 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-bg-tertiary border border-border-primary rounded-full py-2 md:py-2 pl-10 pr-10 text-sm text-text-primary focus:ring-2 focus:ring-color-brand outline-none transition-all"
            placeholder="Pesquisar ou digitar URL"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-color-brand">
            <Search className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center space-x-1 md:space-x-2">
          <button 
            onClick={() => window.open(url, '_blank')}
            className="p-1.5 md:p-2 hover:bg-bg-tertiary rounded-full text-text-muted transition-colors"
            title="Abrir no navegador externo"
          >
            <ExternalLink className="w-5 h-5 md:w-5 md:h-5" />
          </button>
          <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-color-danger/10 text-color-danger rounded-full transition-colors">
            <X className="w-5 h-5 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Security Warning for iFrames */}
      <div className="bg-bg-tertiary/50 px-4 py-1 flex items-center justify-center space-x-2 border-b border-border-primary">
        <Shield className="w-3 h-3 text-color-warning" />
        <span className="text-[10px] text-text-muted italic text-center">
          Alguns sites podem não carregar devido a restrições de segurança (X-Frame-Options).
        </span>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="w-10 h-10 border-4 border-color-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe 
          ref={iframeRef}
          src={url || undefined} 
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>

      {/* Mobile Footer */}
      <div className="md:hidden bg-bg-secondary p-3 border-t border-border-primary flex items-center justify-around">
        <button className="p-2 text-text-muted hover:text-text-primary transition-colors"><ArrowLeft className="w-7 h-7" /></button>
        <button className="p-2 text-text-muted hover:text-text-primary transition-colors"><ArrowRight className="w-7 h-7" /></button>
        <button onClick={handleReload} className="p-2 text-text-muted hover:text-text-primary transition-colors"><RotateCcw className="w-7 h-7" /></button>
        <button onClick={goHome} className="p-2 text-text-muted hover:text-text-primary transition-colors"><Globe className="w-7 h-7" /></button>
      </div>
    </motion.div>
  );
};
