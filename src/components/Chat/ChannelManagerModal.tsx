import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Hash, FolderInput, Settings, PlusCircle, Image, Maximize2, Loader2, Camera } from 'lucide-react';
import { Channel, ObjectFit } from '@/src/types';
import { updateChannel, deleteChannel, deleteField, uploadFile } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/context/ToastContext';

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
  const { showToast } = useToast();
  const [name, setName] = useState(channel.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [localBackground, setLocalBackground] = useState<NonNullable<Channel['background']>>(channel.background || {
    type: 'color',
    value: '',
    opacity: 100,
    objectFit: 'cover',
    brightness: 100,
    contrast: 100,
    patternId: 'dots',
    patternColor: '#ffffff'
  });

  const bgStyles = React.useMemo(() => {
    if (!localBackground) return {};
    const bg = localBackground;
    const styles: any = {
      opacity: (bg.opacity ?? 100) / 100,
      filter: `brightness(${bg.brightness ?? 100}%) contrast(${bg.contrast ?? 100}%)`
    };
    if (bg.type === 'color') styles.backgroundColor = bg.value;
    if (bg.type === 'gradient') styles.background = bg.value;
    if (bg.type === 'pattern') {
      const patterns: Record<string, string> = {
        'dots': 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        'lines': 'linear-gradient(45deg, currentColor 1px, transparent 1px)',
        'grid': 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)'
      };
      styles.backgroundImage = patterns[bg.patternId || 'dots'];
      styles.backgroundSize = '20px 20px';
      styles.color = bg.patternColor || '#ffffff11';
    }
    return styles;
  }, [localBackground]);

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
          className="relative bg-bg-secondary w-full max-w-md rounded-xl shadow-2xl border border-border-primary overflow-hidden flex flex-col"
        >
          {/* Background Layer */}
          {localBackground && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0" style={bgStyles} />
              {['image', 'gif', 'video'].includes(localBackground.type) && localBackground.value && (
                localBackground.type === 'video' ? (
                  <video autoPlay muted loop playsInline className="w-full h-full object-cover">
                    <source src={localBackground.value} />
                  </video>
                ) : (
                  <img 
                    src={localBackground.value} 
                    className="w-full h-full" 
                    style={{ objectFit: (localBackground.objectFit || 'cover') as any }}
                    referrerPolicy="no-referrer"
                  />
                )
              )}
            </div>
          )}

          <div className="relative z-10 px-6 py-4 border-b border-border-primary flex items-center justify-between bg-bg-tertiary">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-color-brand" />
              <h2 className="text-lg font-bold text-text-primary">Gerenciar Canal</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-bg-secondary rounded-full text-text-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

            <div className="relative z-10 p-6 space-y-6">
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Fundo do Canal</label>
                <select 
                  value={localBackground.type}
                  onChange={(e) => setLocalBackground({ ...localBackground, type: e.target.value as any })}
                  className="bg-bg-tertiary text-text-primary text-[10px] font-bold uppercase p-1 rounded border border-border-primary outline-none"
                >
                  <option value="color">Cor</option>
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                  <option value="gif">GIF</option>
                  <option value="gradient">Gradiente</option>
                  <option value="pattern">Padrão</option>
                </select>
              </div>

              <div className="bg-bg-primary p-4 rounded-lg border border-border-primary space-y-4">
                <div className="flex space-x-2">
                  <input
                    type={localBackground.type === 'color' ? 'color' : 'text'}
                    placeholder={localBackground.type === 'color' ? "#000000" : "URL do Recurso"}
                    value={localBackground.value || ''}
                    onChange={(e) => setLocalBackground({ ...localBackground, value: e.target.value })}
                    className={cn(
                      "flex-1 bg-bg-tertiary border border-border-primary rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-color-brand",
                      localBackground.type === 'color' && "h-10 p-1 cursor-pointer"
                    )}
                  />
                  {(localBackground.type === 'image' || localBackground.type === 'video' || localBackground.type === 'gif') && (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = localBackground.type === 'video' ? 'video/*' : 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploading(true);
                            try {
                              const url = await uploadFile(file, `channel_backgrounds/${channel.id}_${Date.now()}`);
                              const updatedBg = { ...localBackground, value: url };
                              setLocalBackground(updatedBg);
                              // Instant update
                              await handleUpdate({ background: updatedBg });
                            } catch (err) {
                              showToast("Erro ao fazer upload.", "error");
                            } finally {
                              setIsUploading(false);
                            }
                          }
                        };
                        input.click();
                      }}
                      disabled={isUploading}
                      className="bg-bg-tertiary hover:bg-bg-secondary p-2 rounded-md border border-border-primary text-text-muted transition-all"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {(localBackground.type === 'image' || localBackground.type === 'video' || localBackground.type === 'gif') && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Maximize2 className="w-3 h-3 text-text-muted" />
                      <span className="text-[10px] font-bold text-text-muted uppercase">Redimensionar Imagem</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['cover', 'contain', 'fill', 'none'].map((fit) => (
                        <button
                          key={fit}
                          onClick={() => setLocalBackground({ ...localBackground, objectFit: fit as any })}
                          className={cn(
                            "px-2 py-1.5 rounded text-[9px] font-bold uppercase transition-all border",
                            localBackground.objectFit === fit 
                              ? "bg-color-brand border-color-brand text-white" 
                              : "bg-bg-tertiary border-border-primary text-text-muted hover:text-text-secondary"
                          )}
                        >
                          {fit === 'cover' ? 'Cobrir' : fit === 'contain' ? 'Conter' : fit === 'fill' ? 'Preencher' : 'Original'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Opacidade</label>
                    <span className="text-[10px] text-text-secondary">{localBackground.opacity ?? 100}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={localBackground.opacity ?? 100}
                    onChange={(e) => setLocalBackground({ ...localBackground, opacity: parseInt(e.target.value) })}
                    className="w-full h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-color-brand"
                  />
                </div>

                <button
                  onClick={() => handleUpdate({ background: localBackground })}
                  disabled={isUpdating}
                  className="w-full bg-color-brand hover:bg-color-brand-hover text-white py-2 rounded-md text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Salvando...' : 'Aplicar Fundo ao Canal'}
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
