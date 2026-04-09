import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Shield, Palette, Bell, LogOut, ShieldAlert, Camera, Loader2, Check, AlertCircle, PlusCircle, Sun, Moon } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { AdminPanel } from './AdminPanel';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { updateUserPrivacy, updateUserProfile, updateUserPassword, updateUserEmail, uploadFile, deactivateAccount, deleteAccount } from '@/src/services/firebaseService';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogout: () => void;
}

type Tab = 'account' | 'profile' | 'privacy' | 'appearance' | 'notifications' | 'admin';

const accountSchema = z.object({
  email: z.string().email('E-mail inválido').optional(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  securityQuestion: z.string().optional(),
  securityAnswer: z.string().optional(),
});

const profileSchema = z.object({
  displayName: z.string().min(2, 'Nome muito curto'),
  username: z.string().min(2, 'Username muito curto').regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e sublinhados'),
  about: z.string().max(200, 'Máximo 200 caracteres').optional(),
});

export const UserSettings: React.FC<UserSettingsProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [localBackground, setLocalBackground] = useState(currentUser.background);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateLocalBackground = (updates: any) => {
    const newBackground = {
      ...localBackground,
      ...updates
    };
    if (newBackground.type !== 'pattern') {
      delete newBackground.patternId;
    }
    setLocalBackground(newBackground);
  };

  const { register: registerAccount, handleSubmit: handleSubmitAccount, formState: { errors: accountErrors } } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: currentUser.email,
      cpf: currentUser.cpf || '',
      phone: currentUser.phone || '',
      securityQuestion: currentUser.securityQuestion || '',
      securityAnswer: currentUser.securityAnswer || '',
    }
  });

  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: currentUser.displayName,
      username: currentUser.username || currentUser.displayName.toLowerCase().replace(/\s+/g, '_'),
      about: '', // Assuming about is not in UserProfile yet, but we can add it or just use it as a placeholder
    }
  });

  const onAccountSubmit = async (data: any) => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      const updates: any = {
        cpf: data.cpf,
        phone: data.phone,
        securityQuestion: data.securityQuestion,
        securityAnswer: data.securityAnswer,
      };

      if (data.password) {
        await updateUserPassword(data.password);
      }

      if (data.email && data.email !== currentUser.email) {
        await updateUserEmail(data.email);
      }

      await updateUserProfile(currentUser.uid, updates);
      setUpdateSuccess('Configurações da conta atualizadas com sucesso!');
    } catch (error: any) {
      setUpdateError(error.message || 'Erro ao atualizar conta');
    } finally {
      setIsUpdating(false);
    }
  };

  const onProfileSubmit = async (data: any) => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      await updateUserProfile(currentUser.uid, {
        displayName: data.displayName,
        username: data.username,
      });
      setUpdateSuccess('Perfil atualizado com sucesso!');
    } catch (error: any) {
      setUpdateError(error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsUpdating(false);
    }
  };

  const saveBackground = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      await updateUserProfile(currentUser.uid, { background: localBackground });
      setUpdateSuccess('Fundo atualizado!');
    } catch (error: any) {
      setUpdateError(error.message || 'Erro ao atualizar fundo');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    setUpdateError(null);
    try {
      const path = `avatars/${currentUser.uid}_${Date.now()}`;
      const photoURL = await uploadFile(file, path);
      await updateUserProfile(currentUser.uid, { photoURL });
      setUpdateSuccess('Foto de perfil atualizada!');
    } catch (error: any) {
      setUpdateError(error.message || 'Erro ao enviar foto');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex bg-bg-primary">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex w-full h-full"
        >
          {/* Sidebar */}
          <div className="w-[30%] min-w-[200px] max-w-[300px] bg-bg-secondary flex justify-end py-14 pr-4">
            <div className="w-full max-w-[200px] space-y-1">
              <div className="px-2 pb-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                Configurações de Usuário
              </div>
              <button
                onClick={() => setActiveTab('account')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'account' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                )}
              >
                Minha Conta
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'profile' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                )}
              >
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'privacy' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                )}
              >
                Privacidade e Segurança
              </button>
              
              <div className="h-px bg-border-primary my-3 mx-2" />
              
              <div className="px-2 pb-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                Configurações do Aplicativo
              </div>
              <button
                onClick={() => setActiveTab('appearance')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'appearance' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                )}
              >
                Aparência & Fundo
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === 'notifications' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                )}
              >
                Notificações
              </button>

              <div className="h-px bg-border-primary my-3 mx-2" />

              {currentUser.role === 'admin' && (
                <>
                  <div className="px-2 pb-2 text-xs font-bold text-[#f23f42] uppercase tracking-wider">
                    Administração
                  </div>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={cn(
                      "w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-colors",
                      activeTab === 'admin' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                    )}
                  >
                    Painel de Controle
                    <ShieldAlert className="w-4 h-4 ml-auto text-[#f23f42]" />
                  </button>
                  <div className="h-px bg-border-primary my-3 mx-2" />
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
          <div className="flex-1 bg-bg-primary py-14 pl-10 pr-4 relative overflow-y-auto">
            <div className="max-w-[740px]">
              {/* Feedback Messages */}
              <AnimatePresence>
                {updateSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6 p-3 bg-[#23a559]/20 border border-[#23a559] text-[#23a559] rounded-md flex items-center space-x-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>{updateSuccess}</span>
                  </motion.div>
                )}
                {updateError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6 p-3 bg-[#f23f42]/20 border border-[#f23f42] text-[#f23f42] rounded-md flex items-center space-x-2"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span>{updateError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-text-primary">Minha Conta</h2>
                  
                  <form onSubmit={handleSubmitAccount(onAccountSubmit)} className="space-y-4">
                    <div className="bg-bg-tertiary rounded-lg p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">E-mail</label>
                          <input 
                            {...registerAccount('email')}
                            className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                          />
                          {accountErrors.email && <p className="text-xs text-[#f23f42]">{accountErrors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Nova Senha</label>
                          <input 
                            {...registerAccount('password')}
                            type="password"
                            placeholder="Deixe em branco para não alterar"
                            className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                          />
                          {accountErrors.password && <p className="text-xs text-[#f23f42]">{accountErrors.password.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">CPF (Opcional)</label>
                          <input 
                            {...registerAccount('cpf')}
                            placeholder="000.000.000-00"
                            className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Telefone (Opcional)</label>
                          <input 
                            {...registerAccount('phone')}
                            placeholder="(00) 00000-0000"
                            className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border-primary">
                        <h3 className="text-sm font-bold text-text-primary uppercase">Recuperação de Segurança</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase">Pergunta de Segurança</label>
                            <input 
                              {...registerAccount('securityQuestion')}
                              placeholder="Ex: Qual o nome do seu cachorro?"
                              className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase">Resposta de Segurança</label>
                            <input 
                              {...registerAccount('securityAnswer')}
                              type="password"
                              placeholder="Sua resposta secreta"
                              className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between">
                        <button 
                          type="submit"
                          disabled={isUpdating}
                          className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                        >
                          {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                          <span>Salvar Alterações</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="mt-10 space-y-4">
                    <h3 className="text-sm font-bold text-[#f23f42] uppercase">Zona de Perigo</h3>
                    <div className="bg-bg-tertiary rounded-lg p-6 border border-[#f23f42]/30 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-text-primary font-medium">Desativar Conta</p>
                          <p className="text-xs text-text-muted">Desativar sua conta oculta seu perfil e impede novas mensagens. Você pode reativar depois.</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (window.confirm("Tem certeza que deseja desativar sua conta? Você será desconectado.")) {
                              try {
                                await deactivateAccount(currentUser.uid);
                              } catch (err: any) {
                                setUpdateError(err.message);
                              }
                            }
                          }}
                          className="border border-[#f23f42] text-[#f23f42] hover:bg-[#f23f42] hover:text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Desativar Conta
                        </button>
                      </div>

                      <div className="h-px bg-border-primary" />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-text-primary font-medium">Excluir Conta</p>
                          <p className="text-xs text-text-muted">Isso excluirá permanentemente todos os seus dados. Esta ação não pode ser desfeita.</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (window.confirm("AVISO CRÍTICO: Tem certeza que deseja EXCLUIR sua conta permanentemente? Todos os seus dados serão perdidos.")) {
                              try {
                                await deleteAccount(currentUser.uid);
                              } catch (err: any) {
                                setUpdateError(err.message);
                              }
                            }
                          }}
                          className="bg-[#f23f42] hover:bg-[#d83c3e] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Excluir Conta
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-text-primary">Perfil de Usuário</h2>
                  
                  <div className="bg-bg-tertiary rounded-lg p-6 space-y-8">
                    {/* Avatar Section */}
                    <div className="flex items-center space-x-6">
                      <div className="relative group">
                        <img 
                          src={currentUser.photoURL || DEFAULT_AVATAR} 
                          alt="Avatar" 
                          className="w-24 h-24 rounded-full object-cover border-4 border-bg-primary bg-bg-primary"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Camera className="w-8 h-8 text-white" />
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handlePhotoChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Mudar Avatar
                        </button>
                        <p className="text-xs text-text-muted">Recomendado: 128x128px. Máximo 2MB.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Nome de Exibição</label>
                          <input 
                            {...registerProfile('displayName')}
                            className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                          />
                          {profileErrors.displayName && <p className="text-xs text-[#f23f42]">{profileErrors.displayName.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Nome de Usuário (@)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">@</span>
                            <input 
                              {...registerProfile('username')}
                              className="w-full bg-bg-primary text-text-primary p-2.5 pl-8 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors"
                            />
                          </div>
                          {profileErrors.username && <p className="text-xs text-[#f23f42]">{profileErrors.username.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Sobre mim</label>
                          <textarea 
                            {...registerProfile('about')}
                            className="w-full bg-bg-primary text-text-primary p-3 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors resize-none h-24"
                            placeholder="Escreva algo sobre você..."
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isUpdating}
                        className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                      >
                        {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Salvar Perfil</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-text-primary">Privacidade e Segurança</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-bg-tertiary p-4 rounded-lg">
                      <div>
                        <p className="text-text-primary font-medium">Conta Privada</p>
                        <p className="text-sm text-text-muted">Ocultar seu perfil da lista de amigos e buscas.</p>
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
                  <h2 className="text-xl font-bold text-text-primary">Aparência & Personalização</h2>
                  
                  <div className="space-y-6 bg-bg-tertiary p-6 rounded-lg">
                    <div className="space-y-4">
                      <p className="text-text-primary font-medium">Tema do Sistema</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                          onClick={() => updateUserProfile(currentUser.uid, { theme: 'dark' })}
                          className={cn(
                            "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all group",
                            (!currentUser.theme || currentUser.theme === 'dark') 
                              ? "border-color-brand bg-bg-secondary" 
                              : "border-border-primary bg-bg-tertiary hover:border-text-muted"
                          )}
                        >
                          <div className="w-full aspect-video bg-[#313338] rounded-md mb-3 overflow-hidden border border-border-primary shadow-inner">
                             <div className="h-2 bg-[#2b2d31] w-full mb-1" />
                             <div className="flex h-full">
                               <div className="w-4 bg-[#1e1f22]" />
                               <div className="flex-1 p-1 space-y-1">
                                 <div className="h-1 bg-[#404249] w-3/4 rounded-full" />
                                 <div className="h-1 bg-[#404249] w-1/2 rounded-full" />
                               </div>
                             </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Moon className="w-4 h-4 text-text-primary" />
                            <span className="font-bold text-sm text-text-primary">Escuro</span>
                          </div>
                          {(!currentUser.theme || currentUser.theme === 'dark') && (
                            <div className="absolute top-2 right-2 bg-color-brand rounded-full p-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>

                        <button 
                          onClick={() => updateUserProfile(currentUser.uid, { theme: 'light' })}
                          className={cn(
                            "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all group",
                            (currentUser.theme === 'light') 
                              ? "border-color-brand bg-bg-secondary" 
                              : "border-border-primary bg-bg-tertiary hover:border-text-muted"
                          )}
                        >
                          <div className="w-full aspect-video bg-white rounded-md mb-3 overflow-hidden border border-border-primary shadow-inner">
                             <div className="h-2 bg-[#f2f3f5] w-full mb-1" />
                             <div className="flex h-full">
                               <div className="w-4 bg-[#e3e5e8]" />
                               <div className="flex-1 p-1 space-y-1">
                                 <div className="h-1 bg-[#ebedef] w-3/4 rounded-full" />
                                 <div className="h-1 bg-[#ebedef] w-1/2 rounded-full" />
                               </div>
                             </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Sun className="w-4 h-4 text-text-primary" />
                            <span className="font-bold text-sm text-text-primary">Claro</span>
                          </div>
                          {(currentUser.theme === 'light') && (
                            <div className="absolute top-2 right-2 bg-color-brand rounded-full p-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-bg-primary" />

                    <div className="space-y-4">
                      <p className="text-text-primary font-medium">Idioma do Aplicativo</p>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { id: 'pt', name: 'Português', flag: '🇧🇷' },
                          { id: 'en', name: 'English', flag: '🇺🇸' },
                          { id: 'es', name: 'Español', flag: '🇪🇸' },
                          { id: 'ja', name: '日本語', flag: '🇯🇵' }
                        ].map(lang => (
                          <button
                            key={lang.id}
                            onClick={() => updateUserProfile(currentUser.uid, { language: lang.id as any })}
                            className={cn(
                              "flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                              (currentUser.language === lang.id || (!currentUser.language && lang.id === 'pt'))
                                ? "border-color-brand bg-bg-secondary"
                                : "border-border-primary bg-bg-tertiary hover:border-text-muted"
                            )}
                          >
                            <span className="text-2xl mb-1">{lang.flag}</span>
                            <span className="text-xs font-bold text-text-primary">{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-bg-primary" />

                    <div className="space-y-4">
                      <p className="text-text-primary font-medium">Cores do Tema</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Cor Primária (Marca)</label>
                          <div className="flex items-center space-x-3">
                            <input 
                              type="color"
                              value={currentUser.primaryColor || '#5865f2'}
                              onChange={(e) => updateUserProfile(currentUser.uid, { primaryColor: e.target.value })}
                              className="h-10 w-20 bg-transparent border-none cursor-pointer"
                            />
                            <button 
                              onClick={() => updateUserProfile(currentUser.uid, { primaryColor: '#5865f2' })}
                              className="text-xs text-color-brand hover:underline"
                            >
                              Resetar
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Cor de Destaque (Accent)</label>
                          <div className="flex items-center space-x-3">
                            <input 
                              type="color"
                              value={currentUser.accentColor || '#eb459e'}
                              onChange={(e) => updateUserProfile(currentUser.uid, { accentColor: e.target.value })}
                              className="h-10 w-20 bg-transparent border-none cursor-pointer"
                            />
                            <button 
                              onClick={() => updateUserProfile(currentUser.uid, { accentColor: '#eb459e' })}
                              className="text-xs text-color-brand hover:underline"
                            >
                              Resetar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-bg-primary" />

                    <div className="space-y-4">
                      <p className="text-text-primary font-medium">Fundo Personalizado</p>
                      <button 
                        onClick={saveBackground}
                        disabled={isUpdating}
                        className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                      >
                        {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Salvar Fundo</span>
                      </button>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Tipo de Fundo</label>
                          <select 
                            value={localBackground?.type || 'color'}
                            onChange={(e) => {
                              const type = e.target.value as any;
                              let defaultValue = '';
                              if (type === 'color') defaultValue = '#313338';
                              if (type === 'gradient') defaultValue = 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)';
                              
                              updateLocalBackground({ 
                                type, 
                                value: defaultValue,
                                opacity: localBackground?.opacity ?? (type === 'color' || type === 'gradient' || type === 'pattern' ? 100 : 30),
                                patternId: type === 'pattern' ? 'dots' : undefined
                              });
                            }}
                            className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2]"
                          >
                            <option value="color">Cor Sólida</option>
                            <option value="gradient">Gradiente</option>
                            <option value="pattern">Padrão (Pattern)</option>
                            <option value="video">Vídeo (URL)</option>
                            <option value="gif">GIF (URL)</option>
                            <option value="image">Imagem (Upload)</option>
                          </select>
                        </div>

                        {localBackground?.type === 'gradient' && (
                          <div className="space-y-4 p-4 bg-bg-primary rounded border border-border-primary">
                            <label className="text-xs font-bold text-text-muted uppercase">Configurar Gradiente</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] text-text-muted uppercase">Cor Inicial</label>
                                <input 
                                  type="color"
                                  defaultValue="#5865f2"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const current = localBackground?.value || '';
                                    const endColor = current.match(/#[a-fA-F0-9]{6}/g)?.[1] || '#eb459e';
                                    updateLocalBackground({ value: `linear-gradient(135deg, ${val} 0%, ${endColor} 100%)` });
                                  }}
                                  className="w-full h-8 bg-transparent border-none cursor-pointer"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] text-text-muted uppercase">Cor Final</label>
                                <input 
                                  type="color"
                                  defaultValue="#eb459e"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const current = localBackground?.value || '';
                                    const startColor = current.match(/#[a-fA-F0-9]{6}/g)?.[0] || '#5865f2';
                                    updateLocalBackground({ value: `linear-gradient(135deg, ${startColor} 0%, ${val} 100%)` });
                                  }}
                                  className="w-full h-8 bg-transparent border-none cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {localBackground?.type === 'pattern' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase">Escolher Padrão</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['dots', 'lines', 'grid'].map(p => (
                                <button
                                  key={p}
                                  onClick={() => updateLocalBackground({ patternId: p })}
                                  className={cn(
                                    "p-2 rounded border text-xs capitalize transition-colors",
                                    localBackground?.patternId === p ? "bg-[#5865f2] text-white border-[#5865f2]" : "bg-bg-primary text-text-secondary border-border-primary hover:border-text-muted"
                                  )}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">
                            {localBackground?.type === 'color' ? 'Seletor de Cor' : 
                             localBackground?.type === 'gradient' ? 'CSS do Gradiente' :
                             localBackground?.type === 'pattern' ? 'Cor do Padrão' :
                             localBackground?.type === 'image' ? 'Upload de Imagem' :
                             'URL do Recurso'}
                          </label>
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                              {localBackground?.type === 'color' ? (
                                <input 
                                  type="color"
                                  value={localBackground?.value || '#313338'}
                                  onChange={(e) => updateLocalBackground({ type: 'color', value: e.target.value })}
                                  className="h-10 w-20 bg-transparent border-none cursor-pointer"
                                />
                              ) : localBackground?.type === 'gradient' ? (
                                <input 
                                  type="text"
                                  value={localBackground?.value || ''}
                                  onChange={(e) => updateLocalBackground({ value: e.target.value })}
                                  className="flex-1 bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2]"
                                />
                              ) : localBackground?.type === 'pattern' ? (
                                <div className="flex items-center space-x-4">
                                  <input 
                                    type="color"
                                    value={localBackground?.patternColor || '#ffffff'}
                                    onChange={(e) => updateLocalBackground({ patternColor: e.target.value })}
                                    className="h-10 w-20 bg-transparent border-none cursor-pointer"
                                  />
                                  <span className="text-xs text-text-muted italic">Escolha a cor das linhas/pontos.</span>
                                </div>
                              ) : (
                                <>
                                  <input 
                                    type="text"
                                    placeholder={localBackground?.type === 'image' ? "URL da imagem ou faça upload" : "https://exemplo.com/recurso.mp4 ou .gif"}
                                    value={localBackground?.value || ''}
                                    onChange={(e) => updateLocalBackground({ 
                                      type: localBackground?.type || 'video', 
                                      value: e.target.value 
                                    })}
                                    className="flex-1 bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2]"
                                  />
                                  <button 
                                    disabled={isUploadingBackground}
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = localBackground?.type === 'video' ? 'video/*' : 'image/*';
                                      input.onchange = async (e: any) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setIsUploadingBackground(true);
                                          try {
                                            const url = await uploadFile(file, `backgrounds/${currentUser.uid}_${Date.now()}`);
                                            updateLocalBackground({ 
                                              type: localBackground?.type || 'video', 
                                              value: url 
                                            });
                                          } catch (err) {
                                            alert("Erro ao fazer upload do fundo.");
                                          } finally {
                                            setIsUploadingBackground(false);
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                    className="bg-[#5865f2] text-white px-4 py-2 rounded hover:bg-[#4752c4] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isUploadingBackground ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                    <span>{isUploadingBackground ? 'Enviando...' : 'Upload'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {localBackground && (
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-text-muted uppercase">Opacidade do Fundo</label>
                                <span className="text-xs text-text-secondary">{localBackground.opacity ?? (localBackground.type === 'color' ? 100 : 30)}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="100"
                                value={localBackground.opacity ?? (localBackground.type === 'color' ? 100 : 30)}
                                onChange={(e) => updateLocalBackground({ opacity: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                              />
                              <p className="text-[10px] text-text-muted">
                                Ajuste a visibilidade do fundo. Para cores, 100% é o padrão. Para vídeos/gifs/imagens, valores menores (30-50%) funcionam melhor.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-text-muted uppercase">Brilho</label>
                                <span className="text-xs text-text-secondary">{localBackground.brightness ?? 100}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="200"
                                value={localBackground.brightness ?? 100}
                                onChange={(e) => updateLocalBackground({ brightness: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-text-muted uppercase">Contraste</label>
                                <span className="text-xs text-text-secondary">{localBackground.contrast ?? 100}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="200"
                                value={localBackground.contrast ?? 100}
                                onChange={(e) => updateLocalBackground({ contrast: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-text-primary">Notificações</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-bg-tertiary p-4 rounded-lg">
                      <div>
                        <p className="text-text-primary font-medium">Ativar Notificações na Área de Trabalho</p>
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
                className="w-9 h-9 rounded-full border-2 border-text-muted flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-secondary transition-colors mb-1"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-text-muted">ESC</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
