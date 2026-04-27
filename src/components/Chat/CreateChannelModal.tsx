import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { X, Hash, Lock, Loader2, Folder } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Channel } from '@/src/types';

const channelSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório').max(50, 'O nome é muito longo'),
  type: z.enum(['public', 'private', 'category', 'private_group', 'community', 'project', 'server', 'topic']),
  parentId: z.string().optional()
});

type ChannelFormValues = z.infer<typeof channelSchema>;

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (values: ChannelFormValues) => Promise<void>;
  isLoading?: boolean;
  categories: Channel[];
  defaultParentId?: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  categories,
  defaultParentId
}) => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: '',
      type: 'public',
      parentId: defaultParentId || ''
    }
  });

  const selectedType = watch('type');

  const onSubmit = async (values: ChannelFormValues) => {
    try {
      await onCreate(values);
      reset();
      onClose();
    } catch (error) {
      console.error("Error creating channel in modal:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-text-primary">Criar</h2>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase text-text-muted block">
                    Tipo
                  </label>
                  
                  <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors border border-transparent hover:border-[#5865f2]/30">
                    <div className="flex items-center space-x-3">
                      <Hash className="w-6 h-6 text-text-muted" />
                      <div>
                        <p className="text-text-primary font-medium text-sm">Público</p>
                        <p className="text-text-muted text-xs">Qualquer pessoa pode ver e entrar.</p>
                      </div>
                    </div>
                    <input 
                      {...register('type')} 
                      type="radio" 
                      value="public" 
                      className="w-5 h-5 accent-[#5865f2] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors border border-transparent hover:border-[#5865f2]/30">
                    <div className="flex items-center space-x-3">
                      <Folder className="w-6 h-6 text-text-muted" />
                      <div>
                        <p className="text-text-primary font-medium text-sm">Comunidade</p>
                        <p className="text-text-muted text-xs">Crie uma comunidade para compartilhar interesses.</p>
                      </div>
                    </div>
                    <input 
                      {...register('type')} 
                      type="radio" 
                      value="community" 
                      className="w-5 h-5 accent-[#5865f2] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors border border-transparent hover:border-[#5865f2]/30">
                    <div className="flex items-center space-x-3">
                      <Folder className="w-6 h-6 text-text-muted" />
                      <div>
                        <p className="text-text-primary font-medium text-sm">Projeto</p>
                        <p className="text-text-muted text-xs">Colabore em um projeto específico.</p>
                      </div>
                    </div>
                    <input 
                      {...register('type')} 
                      type="radio" 
                      value="project" 
                      className="w-5 h-5 accent-[#5865f2] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors border border-transparent hover:border-[#5865f2]/30">
                    <div className="flex items-center space-x-3">
                      <Folder className="w-6 h-6 text-text-muted" />
                      <div>
                        <p className="text-text-primary font-medium text-sm">Servidor</p>
                        <p className="text-text-muted text-xs">Crie um servidor personalizável.</p>
                      </div>
                    </div>
                    <input 
                      {...register('type')} 
                      type="radio" 
                      value="server" 
                      className="w-5 h-5 accent-[#5865f2] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors border border-transparent hover:border-[#5865f2]/30">
                    <div className="flex items-center space-x-3">
                      <Hash className="w-6 h-6 text-text-muted" />
                      <div>
                        <p className="text-text-primary font-medium text-sm">Tópico</p>
                        <p className="text-text-muted text-xs">Um canal focado em um tópico específico.</p>
                      </div>
                    </div>
                    <input 
                      {...register('type')} 
                      type="radio" 
                      value="topic" 
                      className="w-5 h-5 accent-[#5865f2] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors border border-transparent hover:border-[#5865f2]/30">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-6 h-6 text-color-brand" />
                      <div>
                        <p className="text-text-primary font-medium text-sm">Canal Privado 2</p>
                        <p className="text-text-muted text-xs">Grupo privado com membros selecionados.</p>
                      </div>
                    </div>
                    <input 
                      {...register('type')} 
                      type="radio" 
                      value="private_group" 
                      className="w-5 h-5 accent-[#5865f2] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-md cursor-pointer hover:bg-bg-tertiary transition-colors border border-transparent hover:border-[#5865f2]/30">
                    <div className="flex items-center space-x-3">
                      <Folder className="w-6 h-6 text-text-muted" />
                      <div>
                        <p className="text-text-primary font-medium text-sm">Categoria</p>
                        <p className="text-text-muted text-xs">Agrupe seus canais.</p>
                      </div>
                    </div>
                    <input 
                      {...register('type')} 
                      type="radio" 
                      value="category" 
                      className="w-5 h-5 accent-[#5865f2] cursor-pointer"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-text-muted block">
                    Nome <span className="text-[#f23f42]">*</span>
                  </label>
                  <div className="relative">
                    {selectedType === 'category' ? (
                      <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    ) : (
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    )}
                    <input
                      {...register('name')}
                      autoFocus
                      type="text"
                      className={cn(
                        "w-full bg-bg-tertiary border-none rounded-md py-2.5 pl-10 pr-4 text-text-secondary focus:ring-2 focus:ring-[#5865f2] outline-none transition-all",
                        errors.name && "ring-2 ring-[#f23f42]"
                      )}
                      placeholder={selectedType === 'category' ? "nova-categoria" : "novo-canal"}
                    />
                  </div>
                  {errors.name && <p className="text-[#f23f42] text-xs mt-1">{errors.name.message}</p>}
                </div>

                {selectedType !== 'category' && categories.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-muted block">
                      Categoria (Opcional)
                    </label>
                    <select
                      {...register('parentId')}
                      className="w-full bg-bg-tertiary border-none rounded-md py-2.5 px-4 text-text-secondary focus:ring-2 focus:ring-[#5865f2] outline-none transition-all"
                    >
                      <option value="">Nenhuma (Canais de Texto)</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-bg-secondary -mx-6 -mb-6 p-4 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-text-primary text-sm font-medium hover:underline"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isLoading}
                    type="submit"
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center justify-center min-w-[120px]"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
