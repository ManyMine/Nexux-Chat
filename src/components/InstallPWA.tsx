import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export const InstallPWA = () => {
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
      alert("Para instalar como app: No Chrome, clique nos três pontinhos e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'.");
    }
  };

  return (
    <button
      onClick={handleInstall}
      className="flex items-center justify-center space-x-2 bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-2 px-4 rounded transition-colors w-full mt-4"
    >
      <Download className="w-5 h-5" />
      <span>Instalar como App (APK/PWA)</span>
    </button>
  );
};
