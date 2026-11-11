import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Volume2, Megaphone, ChevronDown, ChevronRight, Plus, Users, Settings, LogOut, Search, Menu, ArrowLeft } from 'lucide-react';
import { useCommunityStore, CommunityChannel, CommunityCategory } from '@/store/communityStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const channelIcons: Record<string, typeof Hash> = {
  text: Hash,
  announcement: Megaphone,
  project_showcase: Volume2,
};

export function ChannelSidebar({ onToggleMembers, showMembers, onBack }: { onToggleMembers: () => void; showMembers: boolean; onBack?: () => void }) {
  const { categories, channels, activeChannel, setActiveChannel, joinChannel, leaveChannel, activeCommunity } = useCommunityStore();
  const { user } = useAuthStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([...categories.map((c) => c.slug), 'channels']));
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setExpandedCategories((prev) => new Set([...prev, ...categories.map((c) => c.slug), 'channels']));
  }, [categories]);

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const categorized = categories.map((cat) => ({
    ...cat,
    channels: channels.filter((ch: CommunityChannel) => ch.category_id === cat.id),
  }));
  const uncategorized = channels.filter((ch: CommunityChannel) => !ch.category_id || !categories.some((cat) => cat.id === ch.category_id));
  const groupedChannels = [
    ...categorized,
    ...(uncategorized.length ? [{ id: 'uncategorized', name: 'Channels', slug: 'channels', channels: uncategorized } as any] : []),
  ];

  const filteredGrouped = search
    ? groupedChannels.map((g) => ({
        ...g,
        channels: g.channels.filter(
          (ch: CommunityChannel) => ch.name.toLowerCase().includes(search.toLowerCase()) || ch.description?.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.channels.length > 0)
    : groupedChannels;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Back to communities"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="gradient-text">{activeCommunity?.name || 'Community'}</span>
          </h2>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredGrouped.map((group) => (
          <div key={group.id}>
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(group.slug)}
              className="flex items-center gap-1 px-2 py-1.5 w-full text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-300 transition-colors"
            >
              {expandedCategories.has(group.slug) ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {group.name}
            </button>

            {/* Channels */}
            <AnimatePresence>
              {expandedCategories.has(group.slug) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {group.channels.map((ch: CommunityChannel) => {
                    const Icon = channelIcons[ch.type] || Hash;
                    const isActive = activeChannel?.id === ch.id;
                    const isMember = ch.is_member !== false;

                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          if (isMember) {
                            setActiveChannel(ch);
                          } else {
                            joinChannel(ch.id);
                            setActiveChannel(ch);
                          }
                          setMobileOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-all group',
                          isActive
                            ? 'bg-primary-500/20 text-primary-400'
                            : isMember
                            ? 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                            : 'text-gray-500 hover:bg-gray-800/30 hover:text-gray-400'
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate flex-1 text-left">{ch.name}</span>
                        {!isMember && (
                          <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        {ch.member_count > 0 && (
                          <span className="text-[10px] text-gray-600">{ch.member_count}</span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Footer */}
      {activeChannel && (
        <div className="p-3 border-t border-gray-700/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                leaveChannel(activeChannel.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>
            <button
              onClick={onToggleMembers}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
                showMembers ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Members
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-300"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop */}
      <div className="hidden lg:flex w-64 flex-shrink-0 bg-gray-900/80 border-r border-gray-700/50 h-full flex-col">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-gray-900 z-50 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
