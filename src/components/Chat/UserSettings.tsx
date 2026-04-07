import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Shield, Palette, Bell, LogOut, ShieldAlert } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { AdminPanel } from './AdminPanel';

import { updateUserPrivacy } from '@/src/services/firebaseService';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogout: () => void;
}

type Tab = 'account' | 'profile' | 'privacy' | 'appearance' | 'notifications' | 'admin';

export const UserSettings: React.FC<UserSettingsProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('account');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex bg-[#313338]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex w-full h-full"
        >
          {/* Sidebar */}
          <div className="w-[30%] min-w-[200px] max-w-[300px] bg-[#2b2d31] flex justify-end py-14 pr-4">
            <div className="w-full max-w-[200px] space-y-1">
              <div className="px-2 pb-2 text-xs font-bold text-[#949ba4] uppercase tracking-wider">
                Configurações de Usuário
              </div>
              <button
                onClick={() => setActiveTab('account')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'account' ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                )}
              >
                Minha Conta
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'profile' ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                )}
              >
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'privacy' ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                )}
              >
                Privacidade e Segurança
              </button>
              
              <div className="h-px bg-[#1e1f22] my-3 mx-2" />
              
              <div className="px-2 pb-2 text-xs font-bold text-[#949ba4] uppercase tracking-wider">
                Configurações do Aplicativo
              </div>
              <button
                onClick={() => setActiveTab('appearance')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'appearance' ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                )}
              >
                Aparência
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'notifications' ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                )}
              >
                Notificações
              </button>

              <div className="h-px bg-[#1e1f22] my-3 mx-2" />

              {currentUser.role === 'admin' && (
                <>
                  <div className="px-2 pb-2 text-xs font-bold text-[#f23f42] uppercase tracking-wider">
                    Administração
                  </div>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={cn(
                      "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                      activeTab === 'admin' ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                    )}
                  >
                    Painel de Controle
                    <ShieldAlert className="w-4 h-4 ml-auto text-[#f23f42]" />
                  </button>
                  <div className="h-px bg-[#1e1f22] my-3 mx-2" />
                </>
              )}

              <button
                onClick={onLogout}
                className="w-full flex items-center px-2 py-1.5 rounded-md text-sm text-[#f23f42] hover:bg-[#f23f42] hover:text-white transition-colors"
              >
                Sair
                <LogOut className="w-4 h-4 ml-auto" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-[#313338] py-14 pl-10 pr-4 relative overflow-y-auto">
            <div className="max-w-[740px]">
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Minha Conta</h2>
                  
                  <div className="bg-[#1e1f22] rounded-lg p-4">
                    <div className="h-24 bg-[#5865f2] rounded-t-lg -mx-4 -mt-4 mb-12 relative">
                      <img 
                        src={currentUser.photoURL || DEFAULT_AVATAR} 
                        alt="Avatar" 
                        className="w-20 h-20 rounded-full border-4 border-[#1e1f22] absolute -bottom-10 left-4 object-cover bg-[#313338]"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex justify-between items-center bg-[#2b2d31] p-4 rounded-md">
                      <div>
                        <p className="text-sm text-[#b5bac1] font-bold uppercase">Nome de Exibição</p>
                        <p className="text-white text-lg">{currentUser.displayName}</p>
                      </div>
                      <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
                        Editar
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-[#2b2d31] p-4 rounded-md mt-2">
                      <div>
                        <p className="text-sm text-[#b5bac1] font-bold uppercase">E-mail</p>
                        <p className="text-white text-lg">{currentUser.email || 'Não informado'}</p>
                      </div>
                      <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Perfil de Usuário</h2>
                  <p className="text-[#b5bac1]">Personalize como você aparece para os outros.</p>
                  <div className="bg-[#2b2d31] p-4 rounded-md border border-[#1e1f22]">
                    <p className="text-sm text-[#b5bac1] mb-2 font-bold uppercase">Sobre mim</p>
                    <textarea 
                      className="w-full bg-[#1e1f22] text-[#dbdee1] p-3 rounded-md border-none outline-none focus:ring-2 focus:ring-[#5865f2] resize-none h-24"
                      placeholder="Escreva algo sobre você..."
                    />
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Privacidade e Segurança</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Conta Privada</p>
                        <p className="text-sm text-[#b5bac1]">Ocultar seu perfil da lista de amigos e buscas.</p>
                      </div>
                      <div 
                        onClick={() => updateUserPrivacy(currentUser.uid, !currentUser.isPrivate)}
                        className={cn(
                          "w-10 h-6 rounded-full relative cursor-pointer transition-colors",
                          currentUser.isPrivate ? "bg-[#23a559]" : "bg-[#80848e]"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                          currentUser.isPrivate ? "right-1" : "left-1"
                        )} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Aparência</h2>
                  <div className="space-y-4">
                    <p className="text-white font-medium">Tema</p>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="theme" defaultChecked className="text-[#5865f2]" />
                        <span className="text-[#dbdee1]">Escuro</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="theme" disabled className="text-[#5865f2]" />
                        <span className="text-[#b5bac1]">Claro (Em breve)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Notificações</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Ativar Notificações na Área de Trabalho</p>
                      </div>
                      <div className="w-10 h-6 bg-[#80848e] rounded-full relative cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'admin' && currentUser.role === 'admin' && (
                <AdminPanel currentUser={currentUser} />
              )}
            </div>

            {/* Close Button */}
            <div className="absolute top-14 right-10 flex flex-col items-center">
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-full border-2 border-[#b5bac1] flex items-center justify-center text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors mb-1"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-[#b5bac1]">ESC</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
