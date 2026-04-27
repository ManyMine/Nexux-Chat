import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { Hash, Settings, LogOut, Plus, UserCircle, ChevronDown, MessageSquare, UserPlus, Lock, PlayCircle, Shield, Menu, CheckSquare, Square, Trash2, Eye, VolumeX, FolderInput, Download, X } from 'lucide-react';
import { PromptModal } from './PromptModal';
import { UserProfile, Channel } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { DEFAULT_AVATAR } from '@/src/constants';
import { CreateChannelModal } from './CreateChannelModal';
import { createChannel, updateChannelsOrder, deleteChannel, updateChannel } from '@/src/services/firebaseService';
import { UserPanel } from './UserPanel';
import { CategoryManagerModal } from './CategoryManagerModal';
import { ChannelManagerModal } from './ChannelManagerModal';

interface SidebarProps {
  currentUser: UserProfile;
  channels: Channel[];
  activeChannel: Channel | null;
  unreadChannels: Set<string>;
  allUsers: UserProfile[];
  onChannelSelect: (channel: Channel) => void;
  onLogout: () => void;
  onOpenUserSearch: () => void;
  onOpenUserSettings: () => void;
  onOpenStatus: () => void;
  onOpenReports?: () => void;
  pendingReportsCount?: number;
  onClearUnreads: (channelIds: string[]) => void;
  onMuteChannels: (channelIds: string[], mute: boolean) => void;
  hasUnreadStatuses?: boolean;
  onToggleDevMode?: () => void;
  onOpenDevTools?: () => void;
  isDevMode?: boolean;
  isLeftHanded?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  channels,
  activeChannel,
  unreadChannels,
  allUsers,
  onChannelSelect,
  onLogout,
  onOpenUserSearch,
  onOpenUserSettings,
  onOpenStatus,
  onOpenReports,
  pendingReportsCount,
  onClearUnreads,
  onMuteChannels,
  hasUnreadStatuses,
  onToggleDevMode,
  onOpenDevTools,
  isDevMode,
  isLeftHanded
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [selectedCategoryForManager, setSelectedCategoryForManager] = useState<Channel | null>(null);
  const [selectedChannelForManager, setSelectedChannelForManager] = useState<Channel | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [showCategoryPrompt, setShowCategoryPrompt] = useState(false);
  const [categoryPromptData, setCategoryPromptData] = useState<{resolve: (val: string | null) => void, reject: () => void} | null>(null);

  // Sync local channels with props, sorting by order if available
  useEffect(() => {
    const sorted = [...channels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setLocalChannels(sorted);
  }, [channels]);

  const handleReorder = async (newOrder: Channel[], type: 'public' | 'private' | 'category', parentId?: string) => {
    // Update local state immediately for smooth UI
    const updatedLocal = localChannels.map(c => {
      const found = newOrder.find(nc => nc.id === c.id);
      if (found) {
        // Find index in newOrder
        const index = newOrder.indexOf(found);
        return { ...c, order: index };
      }
      return c;
    });
    setLocalChannels(updatedLocal);

    // Persist to Firebase
    const updates = newOrder.map((c, index) => ({
      id: c.id,
      order: index
    }));
    
    try {
      await updateChannelsOrder(updates);
    } catch (error) {
      console.error("Error updating channels order:", error);
    }
  };

  const handleCreateChannel = async (values: { name: string, type: 'public' | 'private' | 'category', parentId?: string }) => {
    setIsCreating(true);
    try {
      await createChannel(values.name, values.type, currentUser.uid, values.parentId);
    } catch (error) {
      console.error("Error creating channel:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannelIds(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId) 
        : [...prev, channelId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedChannelIds.length === 0) return;
    try {
      for (const id of selectedChannelIds) {
        await deleteChannel(id);
      }
      setSelectedChannelIds([]);
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error("Error deleting channels:", error);
    }
  };

  const handleMarkAsReadSelected = () => {
    onClearUnreads(selectedChannelIds);
    setSelectedChannelIds([]);
    setIsMultiSelectMode(false);
  };

  const handleMuteSelected = () => {
    onMuteChannels(selectedChannelIds, true);
    setSelectedChannelIds([]);
    setIsMultiSelectMode(false);
  };

  const handleMoveToCategorySelected = async () => {
    const categoryName = await new Promise<string | null>((resolve, reject) => {
      setCategoryPromptData({ resolve, reject });
      setShowCategoryPrompt(true);
    });
    if (categoryName === null) return;

    let categoryId: string | undefined = undefined;
    if (categoryName.trim()) {
      const existingCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        // Create new category
        try {
          const newCat = await createChannel(categoryName, 'category', currentUser.uid);
          categoryId = newCat.id;
        } catch (error) {
          console.error("Error creating category:", error);
          return;
        }
      }
    }

    try {
      for (const id of selectedChannelIds) {
        const channel = localChannels.find(c => c.id === id);
        if (channel && (channel.type === 'public' || channel.type === 'private_group')) {
          await updateChannel(id, { parentId: categoryId || null as any });
        }
      }
      setSelectedChannelIds([]);
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error("Error moving channels:", error);
    }
  };

  const handleExportSelected = () => {
    const selectedChannels = localChannels.filter(c => selectedChannelIds.includes(c.id));
    const data = selectedChannels.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      createdAt: new Date(c.createdAt).toLocaleString(),
      membersCount: c.members?.length || 0
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-conversations-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSelectedChannelIds([]);
    setIsMultiSelectMode(false);
  };

  const categories = localChannels.filter(c => c.type === 'category');
  const uncategorizedChannels = localChannels.filter(c => 
    ['public', 'private_group', 'community', 'project', 'server', 'topic'].includes(c.type) && !c.parentId
  );
  const privateChannels = localChannels.filter(c => c.type === 'private');

  return (
    <div className={cn("w-[240px] bg-bg-secondary flex flex-col h-full select-none", isLeftHanded ? "border-l border-border-primary/50" : "border-r border-border-primary/50")}>
      {/* Server Header */}
      <PromptModal
        isOpen={showCategoryPrompt}
        title="Mover para Categoria"
        message="Digite o nome da categoria para mover (ou deixe vazio para remover):"
        placeholder="Nome da categoria"
        onConfirm={(val) => {
          setShowCategoryPrompt(false);
          categoryPromptData?.resolve(val);
        }}
        onCancel={() => {
          setShowCategoryPrompt(false);
          categoryPromptData?.resolve(null);
        }}
      />
      <div className="relative">
        <div 
          onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
          className="h-16 w-full px-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors border-b border-border-primary/50 shadow-sm group cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsServerMenuOpen(!isServerMenuOpen); }}
        >
          <div className="flex flex-col items-center justify-center w-full gpu-accelerated">
            <img 
              src="https://img.sanishtech.com/u/47612354b3429905a0e4183c638bcdfb.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain mb-1 will-change-transform"
              referrerPolicy="no-referrer"
            />
            <h1 className="font-bold text-text-primary truncate text-sm">Noton Nexus</h1>
          </div>
          <div className="flex items-center space-x-2 absolute right-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedChannelIds([]);
              }}
              className={cn(
                "p-1 rounded hover:bg-bg-secondary transition-colors",
                isMultiSelectMode ? "text-color-brand" : "text-text-muted"
              )}
              title="Multi-seleção de conversas"
              aria-label="Ativar multi-seleção de conversas"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <ChevronDown className={cn(
              "w-4 h-4 text-text-muted transition-transform",
              isServerMenuOpen && "rotate-180"
            )} />
          </div>
        </div>

        {isServerMenuOpen && (
          <div className="absolute top-11 left-2 right-2 bg-bg-overlay rounded-md shadow-xl p-2 z-50 border border-border-primary">
             <button 
               onClick={() => { setIsModalOpen(true); setIsServerMenuOpen(false); }}
               className="w-full flex items-center justify-between p-2 text-sm text-text-muted hover:bg-color-brand hover:text-white rounded transition-colors group"
             >
               <span>Criar Canal ou Categoria</span>
               <Plus className="w-4 h-4" />
             </button>
             <button 
               onClick={() => { onOpenUserSearch(); setIsServerMenuOpen(false); }}
               className="w-full flex items-center justify-between p-2 text-sm text-text-muted hover:bg-color-brand hover:text-white rounded transition-colors group"
             >
               <span>Adicionar Amigos</span>
               <UserPlus className="w-4 h-4" />
             </button>
             {currentUser.role === 'admin' && onOpenReports && (
               <button 
                 onClick={() => { onOpenReports(); setIsServerMenuOpen(false); }}
                 className="w-full flex items-center justify-between p-2 text-sm text-text-muted hover:bg-color-brand hover:text-white rounded transition-colors group"
               >
                 <div className="flex items-center">
                   <span>Denúncias</span>
                   {pendingReportsCount && pendingReportsCount > 0 ? (
                     <span className="ml-2 px-1.5 py-0.5 bg-color-error text-white text-[10px] font-bold rounded-full animate-pulse">
                       {pendingReportsCount}
                     </span>
                   ) : null}
                 </div>
                 <Shield className="w-4 h-4" />
               </button>
             )}
             <div className="h-px bg-border-primary my-1" />
             <button 
               onClick={onLogout}
               className="w-full flex items-center justify-between p-2 text-sm text-[#f23f42] hover:bg-[#f23f42] hover:text-white rounded transition-colors group"
             >
               <span>Sair do Servidor</span>
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent">
        {/* Status Button */}
        <button 
          onClick={onOpenStatus}
          className="w-full flex items-center px-2 py-2 rounded-md transition-all bg-bg-tertiary/30 hover:bg-bg-tertiary text-text-secondary border border-border-primary/30 group mb-4 relative"
        >
          <div className="w-8 h-8 rounded-full bg-color-brand/20 flex items-center justify-center mr-3 group-hover:bg-color-brand/30 transition-colors relative">
            <PlayCircle className="w-5 h-5 text-color-brand" />
            {hasUnreadStatuses && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-color-brand rounded-full border-2 border-bg-secondary animate-pulse" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-primary">Status</p>
            <p className="text-[10px] text-text-muted">Veja as atualizações</p>
          </div>
          {hasUnreadStatuses && (
            <div className="w-2 h-2 bg-color-brand rounded-full shadow-[0_0_8px_var(--brand)]" />
          )}
        </button>

        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-1 group">
              <div className="flex items-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
                <ChevronDown className="w-3 h-3 mr-1" />
                <span className="text-xs font-bold uppercase tracking-wider">Canais de Texto</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
                title="Criar Canal"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <Reorder.Group 
              axis="y" 
              values={uncategorizedChannels} 
              onReorder={(newOrder) => handleReorder(newOrder, 'public')}
              className="space-y-0.5"
            >
              {uncategorizedChannels.map((channel) => (
                <ChannelItem 
                  key={channel.id}
                  channel={channel}
                  activeChannel={activeChannel}
                  unreadChannels={unreadChannels}
                  onChannelSelect={onChannelSelect}
                  onManage={(c) => setSelectedChannelForManager(c)}
                  isMultiSelectMode={isMultiSelectMode}
                  isSelected={selectedChannelIds.includes(channel.id)}
                  onToggleSelect={() => toggleChannelSelection(channel.id)}
                />
              ))}
            </Reorder.Group>
          </div>
        )}

        {/* Categories */}
        <Reorder.Group 
          axis="y" 
          values={categories} 
          onReorder={(newOrder) => handleReorder(newOrder, 'category')}
          className="space-y-4"
        >
            {categories.map(category => (
              <CategoryItem 
                key={category.id}
                category={category}
                localChannels={localChannels}
                onManageCategory={(c) => setSelectedCategoryForManager(c)}
                onManageChannel={(c) => setSelectedChannelForManager(c)}
                setIsModalOpen={setIsModalOpen}
                handleReorder={handleReorder}
                activeChannel={activeChannel}
                unreadChannels={unreadChannels}
                onChannelSelect={onChannelSelect}
                isMultiSelectMode={isMultiSelectMode}
                selectedChannelIds={selectedChannelIds}
                onToggleSelect={toggleChannelSelection}
              />
            ))}
        </Reorder.Group>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group mt-4">
            <div className="flex items-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="text-xs font-bold uppercase tracking-wider">Mensagens Diretas</span>
            </div>
            <button 
              onClick={onOpenUserSearch}
              className="text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
              title="Nova DM"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Reorder.Group 
            axis="y" 
            values={privateChannels} 
            onReorder={(newOrder) => handleReorder(newOrder, 'private')}
            className="space-y-0.5"
          >
            {privateChannels.length === 0 ? (
              <div className="px-2 py-2 text-xs text-text-muted italic">Nenhuma conversa recente</div>
            ) : (
              privateChannels.map((channel) => (
                <PrivateChannelItem 
                  key={channel.id}
                  channel={channel}
                  currentUser={currentUser}
                  allUsers={allUsers}
                  unreadChannels={unreadChannels}
                  activeChannel={activeChannel}
                  onChannelSelect={onChannelSelect}
                  onManage={(c) => setSelectedChannelForManager(c)}
                  isMultiSelectMode={isMultiSelectMode}
                  isSelected={selectedChannelIds.includes(channel.id)}
                  onToggleSelect={() => toggleChannelSelection(channel.id)}
                />
              ))
            )}
          </Reorder.Group>
        </div>
      </div>

      {/* User Panel */}
      <UserPanel 
        user={currentUser}
        onLogout={onLogout}
        onOpenSettings={onOpenUserSettings}
        onToggleDevMode={onToggleDevMode}
        onOpenDevTools={onOpenDevTools}
        isDevMode={isDevMode}
        activeChannel={activeChannel}
      />

      <CreateChannelModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateChannel}
        isLoading={isCreating}
        categories={categories}
      />

      {selectedCategoryForManager && (
        <CategoryManagerModal 
          category={selectedCategoryForManager}
          allChannels={localChannels}
          isOpen={!!selectedCategoryForManager}
          onClose={() => setSelectedCategoryForManager(null)}
        />
      )}

      {selectedChannelForManager && (
        <ChannelManagerModal 
          channel={selectedChannelForManager}
          categories={categories}
          isOpen={!!selectedChannelForManager}
          onClose={() => setSelectedChannelForManager(null)}
        />
      )}

      {/* Sidebar Multi-Select Toolbar */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 bg-bg-overlay border border-border-primary rounded-lg shadow-2xl p-3 flex flex-col space-y-3 z-50"
          >
            <div className="flex items-center justify-between border-b border-border-primary pb-2">
              <span className="text-xs font-bold text-text-primary">{selectedChannelIds.length} selecionados</span>
              <button 
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedChannelIds([]);
                }}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <button 
                onClick={handleMarkAsReadSelected}
                disabled={selectedChannelIds.length === 0}
                className="flex flex-col items-center justify-center p-2 hover:bg-bg-tertiary rounded transition-colors disabled:opacity-30"
                title="Marcar como lido"
              >
                <Eye className="w-4 h-4 text-text-secondary" />
              </button>
              
              <button 
                onClick={handleMuteSelected}
                disabled={selectedChannelIds.length === 0}
                className="flex flex-col items-center justify-center p-2 hover:bg-bg-tertiary rounded transition-colors disabled:opacity-30"
                title="Silenciar"
              >
                <VolumeX className="w-4 h-4 text-text-secondary" />
              </button>

              <button 
                onClick={handleMoveToCategorySelected}
                disabled={selectedChannelIds.length === 0}
                className="flex flex-col items-center justify-center p-2 hover:bg-bg-tertiary rounded transition-colors disabled:opacity-30"
                title="Mover para Categoria"
              >
                <FolderInput className="w-4 h-4 text-text-secondary" />
              </button>

              <button 
                onClick={handleExportSelected}
                disabled={selectedChannelIds.length === 0}
                className="flex flex-col items-center justify-center p-2 hover:bg-bg-tertiary rounded transition-colors disabled:opacity-30"
                title="Exportar"
              >
                <Download className="w-4 h-4 text-text-secondary" />
              </button>

              <button 
                onClick={handleDeleteSelected}
                disabled={selectedChannelIds.length === 0}
                className="flex flex-col items-center justify-center p-2 hover:bg-bg-tertiary rounded transition-colors disabled:opacity-30"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4 text-color-error" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CategoryItemProps {
  category: Channel;
  localChannels: Channel[];
  onManageCategory: (category: Channel) => void;
  onManageChannel: (channel: Channel) => void;
  setIsModalOpen: (open: boolean) => void;
  handleReorder: (newOrder: Channel[], type: 'public' | 'private' | 'category', parentId?: string) => void;
  activeChannel: Channel | null;
  unreadChannels: Set<string>;
  onChannelSelect: (channel: Channel) => void;
  isMultiSelectMode?: boolean;
  selectedChannelIds?: string[];
  onToggleSelect?: (channelId: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  localChannels,
  onManageCategory,
  onManageChannel,
  setIsModalOpen,
  handleReorder,
  activeChannel,
  unreadChannels,
  onChannelSelect,
  isMultiSelectMode,
  selectedChannelIds,
  onToggleSelect
}) => {
  const categoryChannels = localChannels.filter(c => 
    ['public', 'private_group', 'community', 'project', 'server', 'topic'].includes(c.type) && c.parentId === category.id
  );

  return (
    <Reorder.Item 
      key={category.id} 
      value={category}
      className="space-y-1 relative"
    >
      <div 
        className={cn(
          "flex items-center justify-between px-2 mb-1 group cursor-pointer rounded-md transition-colors",
          isMultiSelectMode && selectedChannelIds?.includes(category.id) && "bg-bg-tertiary"
        )}
        onDoubleClick={() => onManageCategory(category)}
        onClick={() => isMultiSelectMode && onToggleSelect?.(category.id)}
      >
        <div className="flex items-center text-text-muted hover:text-text-secondary transition-colors flex-1">
          {isMultiSelectMode ? (
            <div className="mr-2">
              {selectedChannelIds?.includes(category.id) ? (
                <CheckSquare className="w-3 h-3 text-color-brand" />
              ) : (
                <Square className="w-3 h-3 text-text-muted" />
              )}
            </div>
          ) : (
            <ChevronDown className="w-3 h-3 mr-1" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider">{category.name}</span>
        </div>
        {!isMultiSelectMode && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
            className="text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
            title="Criar Canal nesta Categoria"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <Reorder.Group 
        axis="y" 
        values={categoryChannels} 
        onReorder={(newOrder) => handleReorder(newOrder, 'public', category.id)}
        className="space-y-0.5"
      >
        {categoryChannels.length === 0 ? (
          <div className="px-6 py-1 text-xs text-text-muted italic">Nenhum canal</div>
        ) : (
          categoryChannels.map((channel) => (
            <ChannelItem 
              key={channel.id}
              channel={channel}
              activeChannel={activeChannel}
              unreadChannels={unreadChannels}
              onChannelSelect={onChannelSelect}
              onManage={onManageChannel}
              isMultiSelectMode={isMultiSelectMode}
              isSelected={selectedChannelIds?.includes(channel.id)}
              onToggleSelect={() => onToggleSelect?.(channel.id)}
            />
          ))
        )}
      </Reorder.Group>
    </Reorder.Item>
  );
};

interface PrivateChannelItemProps {
  channel: Channel;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  unreadChannels: Set<string>;
  activeChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  onManage?: (channel: Channel) => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const PrivateChannelItem: React.FC<PrivateChannelItemProps> = ({
  channel,
  currentUser,
  allUsers,
  unreadChannels,
  activeChannel,
  onChannelSelect,
  onManage,
  isMultiSelectMode,
  isSelected,
  onToggleSelect
}) => {
  const isUnread = unreadChannels.has(channel.id) && activeChannel?.id !== channel.id;
  
  // Find the other user in this private channel
  const otherUserId = channel.members?.find(id => id !== currentUser.uid);
  const otherUser = allUsers.find(u => u.uid === otherUserId);
  const displayName = otherUser?.displayName || channel.name;
  const photoURL = otherUser?.photoURL || DEFAULT_AVATAR;

  return (
    <Reorder.Item
      key={channel.id}
      value={channel}
    >
      <button
        onClick={() => isMultiSelectMode ? onToggleSelect?.() : onChannelSelect(channel)}
        onDoubleClick={() => !isMultiSelectMode && onManage?.(channel)}
        className={cn(
          "w-full flex items-center px-3 py-2.5 md:py-1.5 rounded-xl md:rounded-md transition-all group relative cursor-pointer",
          (activeChannel?.id === channel.id || isSelected)
            ? "bg-bg-tertiary text-text-primary" 
            : isUnread
              ? "text-text-primary font-semibold"
              : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
        )}
      >
        {isMultiSelectMode && (
          <div className="mr-3">
            {isSelected ? (
              <CheckSquare className="w-5 h-5 md:w-4 md:h-4 text-color-brand" />
            ) : (
              <Square className="w-5 h-5 md:w-4 md:h-4 text-text-muted" />
            )}
          </div>
        )}
        {isUnread && !isMultiSelectMode && <div className="absolute -left-1 w-1 h-3 bg-text-primary rounded-r-full" />}
        <span className="truncate flex-1 text-left text-sm md:text-xs">{displayName}</span>

        <div className="relative ml-3">
          <img 
            src={photoURL} 
            alt={displayName}
            className="w-7 h-7 md:w-6 md:h-6 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          {otherUser?.status === 'online' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-2.5 md:h-2.5 bg-color-success rounded-full border-2 border-bg-secondary" />
          )}
        </div>
        
        {isUnread && !isMultiSelectMode && (
          <div className="w-5 h-5 md:w-4 md:h-4 bg-color-accent rounded-full flex items-center justify-center ml-3 shadow-[0_0_8px_var(--accent)]">
            <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </button>
    </Reorder.Item>
  );
};

interface ChannelItemProps {
  channel: Channel;
  activeChannel: Channel | null;
  unreadChannels: Set<string>;
  onChannelSelect: (channel: Channel) => void;
  onManage?: (channel: Channel) => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  activeChannel,
  unreadChannels,
  onChannelSelect,
  onManage,
  isMultiSelectMode,
  isSelected,
  onToggleSelect
}) => {
  const isUnread = unreadChannels.has(channel.id) && activeChannel?.id !== channel.id;
  
  return (
    <Reorder.Item
      value={channel}
      key={channel.id}
      className="relative"
    >
      <button
        onClick={() => isMultiSelectMode ? onToggleSelect?.() : onChannelSelect(channel)}
        onDoubleClick={() => !isMultiSelectMode && onManage?.(channel)}
        className={cn(
          "w-full flex items-center px-3 py-2.5 md:py-1.5 rounded-xl md:rounded-md transition-all group relative cursor-pointer",
          (activeChannel?.id === channel.id || isSelected)
            ? "bg-bg-tertiary text-text-primary" 
            : isUnread
              ? "text-text-primary font-semibold"
              : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
        )}
      >
        {isMultiSelectMode && (
          <div className="mr-3">
            {isSelected ? (
              <CheckSquare className="w-5 h-5 md:w-4 md:h-4 text-color-brand" />
            ) : (
              <Square className="w-5 h-5 md:w-4 md:h-4 text-text-muted" />
            )}
          </div>
        )}
        {isUnread && !isMultiSelectMode && <div className="absolute -left-1 w-1 h-3 bg-text-primary rounded-r-full" />}
        {channel.type === 'private_group' ? (
          <Lock className={cn(
            "w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2 transition-colors",
            (activeChannel?.id === channel.id || isUnread || isSelected) ? "text-color-brand" : "text-text-muted group-hover:text-text-secondary"
          )} />
        ) : ['community', 'project', 'server', 'topic'].includes(channel.type) ? (
          <FolderInput className={cn(
            "w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2 transition-colors",
            (activeChannel?.id === channel.id || isUnread || isSelected) ? "text-color-brand" : "text-text-muted group-hover:text-text-secondary"
          )} />
        ) : (
          <Hash className={cn(
            "w-6 h-6 md:w-5 md:h-5 mr-2 md:mr-1.5 transition-colors",
            (activeChannel?.id === channel.id || isUnread || isSelected) ? "text-text-secondary" : "text-text-muted group-hover:text-text-secondary"
          )} />
        )}
        <span className="truncate flex-1 text-left text-sm md:text-xs">{channel.name}</span>
        {isUnread && !isMultiSelectMode && (
          <div className="w-5 h-5 md:w-4 md:h-4 bg-color-accent rounded-full flex items-center justify-center ml-3 shadow-[0_0_8px_var(--accent)]">
            <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </button>
    </Reorder.Item>
  );
};



