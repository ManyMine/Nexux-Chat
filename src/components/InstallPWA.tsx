import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const InstallPWA = () => {
  const { showToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      showToast("Para instalar como app: No Chrome, clique nos três pontinhos e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'.", "info");
    }
  };

  return (
    <div className="space-y-2 mt-4">
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="flex items-center justify-center space-x-2 bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-2 px-4 rounded transition-colors w-full"
        >
          <Download className="w-5 h-5" />
          <span>Instalar como App (APK/PWA)</span>
        </button>
      )}
    </div>
  );
};
