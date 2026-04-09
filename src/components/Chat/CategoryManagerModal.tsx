import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, FolderEdit, ChevronRight, Hash, Check } from 'lucide-react';
import { Channel } from '@/src/types';
import { updateChannel, deleteChannel, deleteField } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';

interface CategoryManagerModalProps {
  category: Channel;
  allChannels: Channel[];
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  category,
  allChannels,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState(category.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const publicChannels = allChannels.filter(c => c.type === 'public');
  const categoryChannels = publicChannels.filter(c => c.parentId === category.id);
  const otherChannels = publicChannels.filter(c => c.parentId !== category.id);

  const handleUpdateName = async () => {
    if (!name.trim() || name === category.name) return;
    setIsUpdating(true);
    try {
      await updateChannel(category.id, { name });
      onClose();
    } catch (error) {
      console.error("Error updating category name:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async () => {
    setIsDeleting(true);
    try {
      // First, remove parentId from all channels in this category
      const movePromises = categoryChannels.map(c => updateChannel(c.id, { parentId: deleteField() as any }));
      await Promise.all(movePromises);
      
      // Then delete the category
      await deleteChannel(category.id);
      onClose();
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleChannelInCategory = async (channel: Channel) => {
    const isInCategory = channel.parentId === category.id;
    try {
      await updateChannel(channel.id, { 
        parentId: (isInCategory ? deleteField() : category.id) as any
      });
    } catch (error) {
      console.error("Error moving channel:", error);
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
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-bg-tertiary">
            <div className="flex items-center space-x-3">
              <FolderEdit className="w-5 h-5 text-color-brand" />
              <h2 className="text-lg font-bold text-text-primary">Gerenciar Categoria</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-bg-secondary rounded-full text-text-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-border-primary">
            {/* Rename Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nome da Categoria</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-bg-primary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-color-brand transition-all"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={isUpdating || !name.trim() || name === category.name}
                  className="bg-color-brand hover:bg-color-brand-hover text-white px-4 py-2 rounded-md text-sm font-bold transition-all disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>

            {/* Channels Management */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mover Canais</label>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border-primary">
                {publicChannels.map(channel => {
                  const isInCategory = channel.parentId === category.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => toggleChannelInCategory(channel)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-md text-sm transition-all group",
                        isInCategory ? "bg-color-brand/10 text-color-brand" : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
                      )}
                    >
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 mr-2 opacity-50" />
                        <span>{channel.name}</span>
                      </div>
                      {isInCategory ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delete Section */}
            <div className="pt-4 border-t border-border-primary">
              <button
                onClick={handleDeleteCategory}
                disabled={isDeleting}
                className="w-full flex items-center justify-center space-x-2 bg-color-error/10 text-color-error hover:bg-color-error hover:text-white p-3 rounded-md text-sm font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Categoria</span>
              </button>
              <p className="text-[10px] text-text-muted mt-2 text-center">
                Os canais dentro desta categoria não serão excluídos.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
