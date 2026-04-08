import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Edit2, Loader2, Hash, Lock } from 'lucide-react';
import { Channel } from '@/src/types';

interface ChannelSettingsProps {
  channel: Channel;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (channelId: string) => Promise<void>;
  onUpdate: (channelId: string, data: Partial<Channel>) => Promise<void>;
  isOwner: boolean;
  isAdmin?: boolean;
}

export const ChannelSettings: React.FC<ChannelSettingsProps> = ({
  channel,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
  isOwner,
  isAdmin
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [name, setName] = React.useState(channel.name);

  const canManage = isOwner || isAdmin;

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o canal #${channel.name}? Esta ação não pode ser desfeita.`)) {
      setIsDeleting(true);
      try {
        await onDelete(channel.id);
        onClose();
      } catch (error) {
        console.error("Error deleting channel:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleUpdate = async () => {
    if (name.trim() && name !== channel.name) {
      setIsUpdating(true);
      try {
        await onUpdate(channel.id, { name });
        onClose();
      } catch (error) {
        console.error("Error updating channel:", error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-bg-primary w-full max-w-[440px] rounded-lg shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary flex items-center">
                   Configurações do Canal
                </h2>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-text-muted block">
                    Nome do Canal
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      disabled={!canManage}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      type="text"
                      className="w-full bg-bg-tertiary border-none rounded-md py-2.5 pl-10 pr-4 text-text-secondary focus:ring-2 focus:ring-[#5865f2] outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-text-muted block">
                    Tipo de Canal
                  </label>
                  <div className="flex items-center space-x-2 text-text-secondary bg-bg-tertiary p-3 rounded-md">
                    {channel.type === 'public' ? <Hash className="w-5 h-5 text-text-muted" /> : <Lock className="w-5 h-5 text-text-muted" />}
                    <span className="text-sm capitalize">{channel.type === 'public' ? 'Público' : 'Privado'}</span>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-4 space-y-4">
                    <button
                      disabled={isUpdating || name === channel.name}
                      onClick={handleUpdate}
                      className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Alterações"}
                    </button>
                    
                    <div className="border-t border-border-primary pt-4">
                      <button
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="w-full bg-transparent border border-[#f23f42] text-[#f23f42] hover:bg-[#f23f42] hover:text-white font-bold py-3 rounded-md transition-all flex items-center justify-center"
                      >
                        {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir Canal
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
