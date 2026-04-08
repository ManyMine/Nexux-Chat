import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Shield, Palette, Bell, LogOut, ShieldAlert, Camera, Loader2, Check, AlertCircle, PlusCircle } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { AdminPanel } from './AdminPanel';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { updateUserPrivacy, updateUserProfile, updateUserPassword, updateUserEmail, uploadFile } from '@/src/services/firebaseService';

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
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

                      <div className="pt-4">
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
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="theme" 
                            checked={!currentUser.theme || currentUser.theme === 'dark'} 
                            onChange={() => updateUserProfile(currentUser.uid, { theme: 'dark' })}
                            className="text-[#5865f2]" 
                          />
                          <span className="text-text-secondary">Escuro</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="theme" 
                            checked={currentUser.theme === 'light'} 
                            onChange={() => updateUserProfile(currentUser.uid, { theme: 'light' })}
                            className="text-[#5865f2]" 
                          />
                          <span className="text-text-secondary">Claro</span>
                        </label>
                      </div>
                    </div>

                    <div className="h-px bg-bg-primary" />

                    <div className="space-y-4">
                      <p className="text-text-primary font-medium">Fundo Personalizado</p>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">Tipo de Fundo</label>
                          <select 
                            value={currentUser.background?.type || 'color'}
                            onChange={(e) => updateUserProfile(currentUser.uid, { 
                              background: { 
                                type: e.target.value as any, 
                                value: currentUser.background?.value || (e.target.value === 'color' ? '#313338' : '') 
                              } 
                            })}
                            className="w-full bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2]"
                          >
                            <option value="color">Cor Sólida</option>
                            <option value="video">Vídeo (URL)</option>
                            <option value="gif">GIF (URL)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase">
                            {currentUser.background?.type === 'color' ? 'Seletor de Cor' : 'URL do Recurso'}
                          </label>
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                              {currentUser.background?.type === 'color' ? (
                                <input 
                                  type="color"
                                  value={currentUser.background?.value || '#313338'}
                                  onChange={(e) => updateUserProfile(currentUser.uid, { 
                                    background: { type: 'color', value: e.target.value } 
                                  })}
                                  className="h-10 w-20 bg-transparent border-none cursor-pointer"
                                />
                              ) : (
                                <>
                                  <input 
                                    type="text"
                                    placeholder="https://exemplo.com/recurso.mp4 ou .gif"
                                    value={currentUser.background?.value || ''}
                                    onChange={(e) => updateUserProfile(currentUser.uid, { 
                                      background: { 
                                        type: currentUser.background?.type || 'video', 
                                        value: e.target.value 
                                      } 
                                    })}
                                    className="flex-1 bg-bg-primary text-text-primary p-2.5 rounded border border-border-primary outline-none focus:border-[#5865f2]"
                                  />
                                  <button 
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = currentUser.background?.type === 'video' ? 'video/*' : 'image/gif';
                                      input.onchange = async (e: any) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const url = await uploadFile(file, `backgrounds/${currentUser.uid}_${Date.now()}`);
                                            updateUserProfile(currentUser.uid, { 
                                              background: { 
                                                type: currentUser.background?.type || 'video', 
                                                value: url 
                                              } 
                                            });
                                          } catch (err) {
                                            alert("Erro ao fazer upload do fundo.");
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                    className="bg-[#5865f2] text-white px-4 py-2 rounded hover:bg-[#4752c4] transition-colors flex items-center space-x-2"
                                  >
                                    <PlusCircle className="w-4 h-4" />
                                    <span>Upload</span>
                                  </button>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] text-text-muted">
                              {currentUser.background?.type === 'color' 
                                ? 'Escolha uma cor para o fundo do seu aplicativo.' 
                                : 'Insira um link direto ou faça upload de um arquivo. Ele rodará em loop.'}
                            </p>
                          </div>
                        </div>
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
