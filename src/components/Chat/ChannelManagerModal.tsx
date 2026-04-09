import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Hash, FolderInput, Settings } from 'lucide-react';
import { Channel } from '@/src/types';
import { updateChannel, deleteChannel, deleteField } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';

interface ChannelManagerModalProps {
  channel: Channel;
  categories: Channel[];
  isOpen: boolean;
  onClose: () => void;
}

export const ChannelManagerModal: React.FC<ChannelManagerModalProps> = ({
  channel,
  categories,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState(channel.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (data: Partial<Channel>) => {
    setIsUpdating(true);
    try {
      await updateChannel(channel.id, data);
      if (data.name) onClose();
    } catch (error) {
      console.error("Error updating channel:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteChannel(channel.id);
      onClose();
    } catch (error) {
      console.error("Error deleting channel:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-bg-secondary w-full max-w-md rounded-xl shadow-2xl border border-border-primary overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-bg-tertiary">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-color-brand" />
              <h2 className="text-lg font-bold text-text-primary">Gerenciar Canal</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-bg-secondary rounded-full text-text-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nome do Canal</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-bg-primary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-color-brand transition-all"
                />
                <button
                  onClick={() => handleUpdate({ name })}
                  disabled={isUpdating || !name.trim() || name === channel.name}
                  className="bg-color-brand hover:bg-color-brand-hover text-white px-4 py-2 rounded-md text-sm font-bold transition-all disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mover para Categoria</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleUpdate({ parentId: deleteField() as any })}
                  className={cn(
                    "flex items-center p-2 rounded-md text-sm transition-all border",
                    !channel.parentId ? "bg-color-brand/10 border-color-brand text-color-brand" : "border-border-primary text-text-muted hover:bg-bg-tertiary"
                  )}
                >
                  <Hash className="w-4 h-4 mr-2" />
                  Sem Categoria
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleUpdate({ parentId: cat.id })}
                    className={cn(
                      "flex items-center p-2 rounded-md text-sm transition-all border",
                      channel.parentId === cat.id ? "bg-color-brand/10 border-color-brand text-color-brand" : "border-border-primary text-text-muted hover:bg-bg-tertiary"
                    )}
                  >
                    <FolderInput className="w-4 h-4 mr-2" />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border-primary">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center space-x-2 bg-color-error/10 text-color-error hover:bg-color-error hover:text-white p-3 rounded-md text-sm font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Canal</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
