import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Edit2, Loader2, Hash, Lock, PlusCircle, Upload, Maximize2 } from 'lucide-react';
import { Channel } from '@/src/types';
import { uploadFile } from '@/src/services/firebaseService';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/context/ToastContext';
import { ConfirmationModal } from '../ConfirmationModal';

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
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = React.useState(false);
  const [name, setName] = React.useState(channel.name);
  const [localBackground, setLocalBackground] = React.useState(channel.background);

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

  const canManage = isOwner || isAdmin;

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(channel.id);
      onClose();
    } catch (error) {
      console.error("Error deleting channel:", error);
      showToast("Erro ao excluir canal.", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const updates: Partial<Channel> = {};
      if (name.trim() && name !== channel.name) {
        updates.name = name;
      }
      
      // Only update background if it has changed
      if (JSON.stringify(localBackground) !== JSON.stringify(channel.background)) {
        updates.background = localBackground === undefined ? null as any : localBackground;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdate(channel.id, updates);
      }
      onClose();
    } catch (error) {
      console.error("Error updating channel:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
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
                      style={{ objectFit: localBackground.objectFit || 'cover' }}
                      referrerPolicy="no-referrer"
                    />
                  )
                )}
              </div>
            )}

            <div className="p-6 relative z-10">
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
                  <div className="space-y-6 pt-4 border-t border-border-primary">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-text-muted uppercase">Fundo do Canal</label>
                      <select 
                        value={localBackground?.type || ''}
                        onChange={(e) => {
                          const type = e.target.value as any;
                          if (!type) {
                            setLocalBackground(undefined);
                            return;
                          }
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
                        className="w-full bg-bg-tertiary text-text-primary p-2.5 rounded border-none outline-none focus:ring-2 focus:ring-[#5865f2]"
                      >
                        <option value="">Nenhum (Usar fundo do usuário)</option>
                        <option value="color">Cor Sólida</option>
                        <option value="gradient">Gradiente</option>
                        <option value="pattern">Padrão (Pattern)</option>
                        <option value="video">Vídeo (URL)</option>
                        <option value="gif">GIF (URL)</option>
                        <option value="image">Imagem (Upload)</option>
                      </select>
                    </div>

                    {localBackground?.type === 'gradient' && (
                      <div className="space-y-4 p-4 bg-bg-tertiary rounded">
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
                                localBackground?.patternId === p ? "bg-[#5865f2] text-white border-[#5865f2]" : "bg-bg-tertiary text-text-secondary border-transparent hover:border-text-muted"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {localBackground && (
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
                                className="flex-1 bg-bg-tertiary text-text-primary p-2.5 rounded border-none outline-none focus:ring-2 focus:ring-[#5865f2]"
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
                                  className="flex-1 bg-bg-tertiary text-text-primary p-2.5 rounded border-none outline-none focus:ring-2 focus:ring-[#5865f2]"
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
                                          const url = await uploadFile(file, `backgrounds/channel_${channel.id}_${Date.now()}`);
                                          updateLocalBackground({ 
                                            type: localBackground?.type || 'video', 
                                            value: url 
                                          });
                                        } catch (err) {
                                          showToast("Erro ao fazer upload do fundo.", "error");
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
                    )}

                    {localBackground?.type === 'image' && (
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            const fits: any[] = ['cover', 'contain', 'fill', 'none', 'scale-down'];
                            const currentIndex = fits.indexOf(localBackground?.objectFit || 'cover');
                            const nextIndex = (currentIndex + 1) % fits.length;
                            updateLocalBackground({ objectFit: fits[nextIndex] });
                          }}
                          className="flex items-center space-x-2 text-xs text-[#5865f2] hover:underline"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Redimensionar: <span className="font-bold uppercase">{localBackground?.objectFit || 'cover'}</span></span>
                        </button>
                      </div>
                    )}

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
                            className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                          />
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
                            className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
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
                            className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {canManage && (
                  <div className="pt-4 space-y-4">
                    <button
                      disabled={isUpdating || (name === channel.name && JSON.stringify(localBackground) === JSON.stringify(channel.background))}
                      onClick={handleUpdate}
                      className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Alterações"}
                    </button>
                    
                    <div className="border-t border-border-primary pt-4">
                      <button
                        disabled={isDeleting}
                        onClick={() => setShowDeleteConfirm(true)}
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

    <ConfirmationModal
      isOpen={showDeleteConfirm}
      title="Excluir Canal"
      message={`Tem certeza que deseja excluir o canal #${channel.name}? Esta ação não pode ser desfeita.`}
      onConfirm={handleDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
  </>
);
};
