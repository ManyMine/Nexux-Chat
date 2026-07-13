import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, Ban, Mail, CheckCircle2, Loader2, AlertCircle, Trash2, Search, X, Camera } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { getUsers, getCensoredWords, updateCensoredWords, toggleUserBlock, updateUserRole, resetPassword, adminDeleteUser, uploadFile, updateUserProfile } from '@/src/services/firebaseService';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  currentUser: UserProfile;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'censorship'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [censoredWords, setCensoredWords] = useState<string[]>([]);
  const [newCensoredWord, setNewCensoredWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedAdminUser, setSelectedAdminUser] = useState<UserProfile | null>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdminAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAdminUser) return;

    if (file.type === 'image/gif' && file.size > 800 * 1024) {
      setMessage({ type: 'error', text: 'O arquivo GIF é muito grande (máximo de 800KB para garantir imagens animadas fluidas).' });
      return;
    } else if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'A imagem é muito grande. O limite é de 5MB.' });
      return;
    }

    try {
      setActionLoading(`avatar-${selectedAdminUser.uid}`);
      setMessage(null);
      
      const path = `avatars/${selectedAdminUser.uid}_${Date.now()}`;
      const photoURL = await uploadFile(file, path);
      
      await updateUserProfile(selectedAdminUser.uid, { photoURL });
      
      setUsers(prev => prev.map(u => u.uid === selectedAdminUser.uid ? { ...u, photoURL } : u));
      setMessage({ type: 'success', text: `Avatar de ${selectedAdminUser.displayName} de email/usuário alterado e sincronizado com sucesso!` });
    } catch (error: any) {
      console.error("Error setting user avatar by admin:", error);
      setMessage({ type: 'error', text: error.message || 'Erro ao alterar avatar do usuário.' });
    } finally {
      setActionLoading(null);
      setSelectedAdminUser(null);
      if (adminFileInputRef.current) {
        adminFileInputRef.current.value = '';
      }
      setTimeout(() => setMessage(null), 3500);
    }
  };

  
  const handleAddCensoredWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCensoredWord.trim()) return;
    const word = newCensoredWord.trim().toLowerCase();
    if (censoredWords.includes(word)) return;
    
    setActionLoading('add-word');
    try {
      const newWords = [...censoredWords, word];
      await updateCensoredWords(newWords);
      setCensoredWords(newWords);
      setNewCensoredWord('');
      setMessage({ type: 'success', text: 'Palavra adicionada com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao adicionar palavra.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveCensoredWord = async (wordToRemove: string) => {
    setActionLoading('remove-word-' + wordToRemove);
    try {
      const newWords = censoredWords.filter(w => w !== wordToRemove);
      await updateCensoredWords(newWords);
      setCensoredWords(newWords);
      setMessage({ type: 'success', text: 'Palavra removida com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover palavra.' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({ type: 'error', text: 'Erro ao carregar usuários.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (user: UserProfile) => {
    if (user.uid === currentUser.uid) {
      setMessage({ type: 'error', text: 'Você não pode bloquear a si mesmo.' });
      return;
    }

    if (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com') {
      setMessage({ type: 'error', text: 'Você não tem permissão para bloquear outro administrador.' });
      return;
    }
    
    try {
      setActionLoading(`block-${user.uid}`);
      const newStatus = !user.isBlocked;
      await toggleUserBlock(user.uid, newStatus);
      setUsers(users.map(u => u.uid === user.uid ? { ...u, isBlocked: newStatus } : u));
      setMessage({ type: 'success', text: `Usuário ${newStatus ? 'bloqueado' : 'desbloqueado'} com sucesso.` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao alterar status do usuário.' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.uid === currentUser.uid) {
      setMessage({ type: 'error', text: 'Você não pode excluir a si mesmo.' });
      return;
    }

    if (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com') {
      setMessage({ type: 'error', text: 'Você não tem permissão para excluir outro administrador.' });
      return;
    }

    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setActionLoading(`delete-${userToDelete.uid}`);
      await adminDeleteUser(userToDelete.uid);
      setUsers(users.filter(u => u.uid !== userToDelete.uid));
      setMessage({ type: 'success', text: `Perfil de ${userToDelete.displayName} excluído com sucesso.` });
      setUserToDelete(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir usuário.' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    if (user.uid === currentUser.uid) {
      setMessage({ type: 'error', text: 'Você não pode alterar seu próprio cargo.' });
      return;
    }

    if (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com') {
      setMessage({ type: 'error', text: 'Você não tem permissão para alterar o cargo de outro administrador.' });
      return;
    }

    try {
      setActionLoading(`role-${user.uid}`);
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await updateUserRole(user.uid, newRole);
      setUsers(users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
      setMessage({ type: 'success', text: `Cargo alterado para ${newRole}.` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao alterar cargo do usuário.' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSendRecovery = async (user: UserProfile) => {
    if (!user.email) {
      setMessage({ type: 'error', text: 'Usuário não possui e-mail cadastrado.' });
      return;
    }

    try {
      setActionLoading(`recovery-${user.uid}`);
      await resetPassword(user.email);
      setMessage({ type: 'success', text: `E-mail de recuperação enviado para ${user.email}.` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao enviar e-mail de recuperação.' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary flex items-center">
          <ShieldAlert className="w-6 h-6 mr-2 text-[#f23f42]" />
          Painel de Administração
        </h2>
        <p className="text-text-muted mt-1">Gerencie usuários, permissões e configurações do sistema.</p>
      </div>

      {message && (
        <div className={cn(
          "p-3 rounded-md flex items-center space-x-2",
          message.type === 'success' ? "bg-[#23a559]/10 text-[#23a559] border border-[#23a559]/20" : "bg-[#f23f42]/10 text-[#f23f42] border border-[#f23f42]/20"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-bg-secondary rounded-lg border border-border-primary overflow-hidden">
        <div className="p-4 border-b border-border-primary space-y-4 bg-bg-tertiary/50">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-text-primary">Usuários Cadastrados ({users.length})</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchUsers}
                className="text-xs bg-[#5865f2] hover:bg-[#4752c4] text-white px-3 py-1.5 rounded transition-colors"
              >
                Atualizar Lista
              </button>
              {currentUser.email === 'belepuff@gmail.com' && (
                <button 
                  onClick={() => setMessage({ type: 'success', text: 'Funcionalidade de Adicionar Mods disponível.' })}
                  className="text-xs bg-[#f23f42] hover:bg-[#d63538] text-white px-3 py-1.5 rounded transition-colors"
                >
                  Adicionar Mods
                </button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text"
              placeholder="Pesquisar por nome, e-mail ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-primary text-text-primary pl-10 pr-4 py-2 rounded border border-border-primary outline-none focus:border-[#5865f2] transition-colors text-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {activeTab === 'censorship' ? (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <form onSubmit={handleAddCensoredWord} className="flex space-x-2">
            <input
              type="text"
              value={newCensoredWord}
              onChange={(e) => setNewCensoredWord(e.target.value)}
              placeholder="Digite a palavra para censurar..."
              className="flex-1 bg-bg-tertiary text-text-primary px-4 py-2 rounded border border-border-primary focus:outline-none focus:border-color-brand"
            />
            <button
              type="submit"
              disabled={actionLoading === 'add-word' || !newCensoredWord.trim()}
              className="bg-color-brand hover:brightness-110 text-white px-4 py-2 rounded font-bold disabled:opacity-50 flex items-center"
            >
              {actionLoading === 'add-word' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mt-4">
            {censoredWords.map(word => (
              <div key={word} className="bg-bg-tertiary border border-border-primary rounded-full px-3 py-1 flex items-center space-x-2">
                <span className="text-text-primary text-sm font-medium">{word}</span>
                <button 
                  onClick={() => handleRemoveCensoredWord(word)}
                  disabled={actionLoading === 'remove-word-' + word}
                  className="text-text-muted hover:text-[#f23f42] transition-colors"
                >
                  {actionLoading === 'remove-word-' + word ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              </div>
            ))}
            {censoredWords.length === 0 && (
              <p className="text-text-muted text-sm italic w-full text-center py-4">Nenhuma palavra censurada configurada.</p>
            )}
          </div>
        </div>
      ) : loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border-primary">
            {filteredUsers.length > 0 ? filteredUsers.map(user => (
              <div key={user.uid} className="p-4 flex items-center justify-between hover:bg-bg-primary/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div 
                    className={cn(
                      "relative group", 
                      (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com') ? "" : "cursor-pointer"
                    )}
                    title={user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com' ? undefined : "Clique para alterar o avatar deste usuário"}
                    onClick={() => {
                      if (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com') return;
                      setSelectedAdminUser(user);
                      setTimeout(() => adminFileInputRef.current?.click(), 100);
                    }}
                  >
                    {actionLoading === `avatar-${user.uid}` ? (
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-[#5865f2] animate-spin" />
                      </div>
                    ) : (
                      <>
                        <img 
                          src={user.photoURL || DEFAULT_AVATAR} 
                          alt={user.displayName}
                          className={cn("w-10 h-10 rounded-full object-cover transition-transform group-hover:scale-105", user.isBlocked && "opacity-50 grayscale")}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </>
                    )}
                    {user.role === 'admin' && (
                      <div className="absolute -bottom-1 -right-1 bg-bg-secondary rounded-full p-0.5">
                        <Shield className="w-3.5 h-3.5 text-[#f1c40f]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={cn("font-bold", user.isBlocked ? "text-text-muted line-through" : "text-text-primary")}>
                        {user.displayName}
                      </span>
                      {user.role === 'admin' && (
                        <span className="text-[10px] bg-[#5865f2]/20 text-[#5865f2] px-1.5 py-0.5 rounded font-bold uppercase">
                          Admin
                        </span>
                      )}
                      {user.isBlocked && (
                        <span className="text-[10px] bg-[#f23f42]/20 text-[#f23f42] px-1.5 py-0.5 rounded font-bold uppercase">
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted">
                      {user.email === 'belepuff@gmail.com' && currentUser.email !== 'belepuff@gmail.com' 
                        ? 'E-mail Oculto' 
                        : (user.email || 'Sem e-mail')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSendRecovery(user)}
                    disabled={actionLoading !== null || !user.email || (user.email === 'belepuff@gmail.com' && currentUser.email !== 'belepuff@gmail.com')}
                    className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors disabled:opacity-50"
                    title="Enviar e-mail de recuperação"
                  >
                    {actionLoading === `recovery-${user.uid}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => handleToggleRole(user)}
                    disabled={actionLoading !== null || user.uid === currentUser.uid || (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com')}
                    className={cn(
                      "p-2 rounded transition-colors disabled:opacity-50",
                      user.role === 'admin' 
                        ? "text-[#f1c40f] hover:bg-[#f1c40f]/20" 
                        : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                    )}
                    title={user.role === 'admin' ? "Remover Admin" : "Tornar Admin"}
                  >
                    {actionLoading === `role-${user.uid}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleToggleBlock(user)}
                    disabled={actionLoading !== null || user.uid === currentUser.uid || (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com')}
                    className={cn(
                      "p-2 rounded transition-colors disabled:opacity-50",
                      user.isBlocked 
                        ? "text-[#23a559] hover:bg-[#23a559]/20" 
                        : "text-[#f23f42] hover:bg-[#f23f42]/20"
                    )}
                    title={user.isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                  >
                    {actionLoading === `block-${user.uid}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAdminUser(user);
                      setTimeout(() => adminFileInputRef.current?.click(), 100);
                    }}
                    disabled={actionLoading !== null || (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com')}
                    className="p-2 text-text-muted hover:text-[#5865f2] hover:bg-[#5865f2]/10 rounded transition-colors disabled:opacity-50"
                    title="Alterar Avatar"
                  >
                    {actionLoading === `avatar-${user.uid}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={actionLoading !== null || user.uid === currentUser.uid || (user.role === 'admin' && currentUser.email !== 'belepuff@gmail.com')}
                    className="p-2 text-text-muted hover:text-[#f23f42] hover:bg-[#f23f42]/10 rounded transition-colors disabled:opacity-50"
                    title="Excluir Usuário"
                  >
                    {actionLoading === `delete-${user.uid}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-text-muted">
                Nenhum usuário encontrado para "{searchTerm}".
              </div>
            )}
          </div>
        )}
        <input 
          type="file" 
          ref={adminFileInputRef} 
          onChange={handleAdminAvatarChange} 
          style={{ display: 'none' }} 
          accept="image/*,image/gif" 
        />
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg-secondary w-full max-w-md rounded-xl shadow-2xl border border-border-primary overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3 text-[#f23f42]">
                  <ShieldAlert className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
                </div>
                
                <div className="p-4 bg-[#f23f42]/10 rounded-lg border border-[#f23f42]/20">
                  <p className="text-sm text-text-primary">
                    Você está prestes a excluir permanentemente a conta de:
                  </p>
                  <div className="mt-3 flex items-center space-x-3">
                    <img 
                      src={userToDelete.photoURL || DEFAULT_AVATAR} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-bold text-text-primary">{userToDelete.displayName}</p>
                      <p className="text-xs text-text-muted">
                        {userToDelete.email === 'belepuff@gmail.com' && currentUser.email !== 'belepuff@gmail.com' 
                          ? 'E-mail Oculto' 
                          : (userToDelete.email || userToDelete.username)}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-text-muted">
                  Esta ação é irreversível e removerá todos os dados do usuário do banco de dados.
                </p>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setUserToDelete(null)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary text-text-primary font-medium hover:bg-bg-primary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteUser}
                    disabled={actionLoading !== null}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#f23f42] text-white font-medium hover:bg-[#d83c3e] transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {actionLoading?.startsWith('delete-') ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>Excluir Perfil</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
