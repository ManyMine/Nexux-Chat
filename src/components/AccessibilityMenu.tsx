import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, X, Ear, Eye, Brain, Focus, Type, Volume2, Contrast, GraduationCap, ExternalLink } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { cn } from '../lib/utils';
import { StudentModePanel } from './StudentModePanel';

export const AccessibilityMenu: React.FC<{ triggerClassName?: string }> = ({ triggerClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isStudentPanelOpen, setIsStudentPanelOpen] = useState(false);
  const { settings, updateSettings } = useAccessibility();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  React.useEffect(() => {
    if (!('speechSynthesis' in window) || !window.speechSynthesis) return;

    const loadVoices = () => {
      if (window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={triggerClassName || "flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary hover:bg-bg-tertiary border border-border-primary text-text-secondary transition-colors"}
        title="Acessibilidade"
      >
        <Settings2 className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-primary rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-border-primary"
            >
              <div className="flex items-center justify-between p-4 border-b border-border-primary">
                <h2 className="text-lg font-bold text-text-primary flex items-center">
                  <Settings2 className="w-5 h-5 mr-2" />
                  Acessibilidade
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Autismo */}
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Tema Autismo</h3>
                      <p className="text-xs text-text-muted">Cores suaves e padrão calmante</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.autismTheme}
                      onChange={(e) => updateSettings({ autismTheme: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                  </label>
                </div>

                {/* Cegos (Código Morse) */}
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Código Morse</h3>
                      <p className="text-xs text-text-muted">Toca mensagens em código Morse</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.morseCode}
                      onChange={(e) => updateSettings({ morseCode: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                  </label>
                </div>

                {/* Surdos (Libras) */}
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                      <Ear className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Libras (VLibras)</h3>
                      <p className="text-xs text-text-muted">Ativa o tradutor de Libras</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.libras}
                      onChange={(e) => updateSettings({ libras: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                  </label>
                </div>

                {/* TDAH (Foco) */}
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                      <Focus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Modo Foco (TDAH)</h3>
                      <p className="text-xs text-text-muted">Reduz distrações e animações</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.adhdFocus}
                      onChange={(e) => updateSettings({ adhdFocus: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                  </label>
                </div>

                {/* Dislexia (Fonte) */}
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                      <Type className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Fonte para Dislexia</h3>
                      <p className="text-xs text-text-muted">Aumenta espaçamento e legibilidade</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.dyslexiaFont}
                      onChange={(e) => updateSettings({ dyslexiaFont: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                  </label>
                </div>

                {/* Text-to-Speech */}
                <div className="space-y-3 p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">Leitor de Tela (TTS)</h3>
                        <p className="text-xs text-text-muted">Lê novas mensagens em voz alta</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={settings.textToSpeech}
                        onChange={(e) => updateSettings({ textToSpeech: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                    </label>
                  </div>
                  {settings.textToSpeech && (
                    <select
                      className="w-full p-2 bg-bg-primary border border-border-primary rounded-lg text-sm text-text-primary"
                      value={settings.ttsVoiceName}
                      onChange={(e) => updateSettings({ ttsVoiceName: e.target.value })}
                    >
                      <option value="">Voz Padrão</option>
                      {voices.map(voice => (
                        <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Alto Contraste */}
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
                      <Contrast className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Alto Contraste</h3>
                      <p className="text-xs text-text-muted">Cores fortes para baixa visão</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.highContrast}
                      onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                  </label>
                </div>

                {/* Modo Estudante */}
                <div className="space-y-3 p-3 bg-bg-secondary rounded-lg border border-border-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-lg">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">Modo Estudante</h3>
                        <p className="text-xs text-text-muted">Interface limpa e focada em estudos</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={settings.studentMode}
                        onChange={(e) => updateSettings({ studentMode: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-color-brand"></div>
                    </label>
                  </div>
                  {settings.studentMode && (
                    <button
                      onClick={() => setIsStudentPanelOpen(true)}
                      className="w-full flex items-center justify-center p-2 bg-cyan-500 text-white rounded-lg text-sm font-bold hover:bg-cyan-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir Portal do Aluno
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StudentModePanel 
        isOpen={isStudentPanelOpen} 
        onClose={() => setIsStudentPanelOpen(false)} 
      />
    </>
  );
};
