import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Volume2, Megaphone, ChevronDown, ChevronRight, Plus, Users, Settings, LogOut, Search, Menu, ArrowLeft, X, Trash2, Pencil, Loader2, Upload, Camera } from 'lucide-react';
import { useCommunityStore, CommunityChannel, CommunityCategory } from '@/store/communityStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const channelIcons: Record<string, typeof Hash> = {
  text: Hash,
  announcement: Megaphone,
  project_showcase: Volume2,
};

export function ChannelSidebar({ onToggleMembers, showMembers, onBack }: { onToggleMembers: () => void; showMembers: boolean; onBack?: () => void }) {
  const { categories, channels, activeChannel, setActiveChannel, joinChannel, leaveChannel, activeCommunity, fetchCommunityChannels, updateCommunity, fetchCommunityById } = useCommunityStore();
  const { user } = useAuthStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([...categories.map((c) => c.slug), 'channels']));
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', type: 'text' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [managing, setManaging] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [communityForm, setCommunityForm] = useState({ name: '', description: '', image_url: '' });
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [uploadingCommunityImage, setUploadingCommunityImage] = useState(false);

  const canManage = !!activeCommunity && (
    ['owner', 'admin', 'moderator'].includes((activeCommunity as any).my_role) ||
    (activeCommunity as any).created_by === user?.id ||
    ['admin', 'super_admin'].includes(user?.role || '')
  );

  const openCommunitySettings = () => {
    if (!activeCommunity) return;
    setCommunityForm({
      name: activeCommunity.name || '',
      description: (activeCommunity as any).description || '',
      image_url: (activeCommunity as any).image_url || '',
    });
    setShowCommunity(true);
  };

  const uploadCommunityImage = async (file: File) => {
    setUploadingCommunityImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload', fd);
      setCommunityForm((f) => ({ ...f, image_url: data.data.url }));
      toast.success('Image uploaded — save to apply');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingCommunityImage(false); }
  };

  const saveCommunitySettings = async () => {
    if (!activeCommunity || !communityForm.name.trim()) return;
    setSavingCommunity(true);
    try {
      await updateCommunity(activeCommunity.id, {
        name: communityForm.name.trim(),
        description: communityForm.description.trim() || null,
        image_url: communityForm.image_url || null,
      } as any);
      await fetchCommunityById(activeCommunity.id);
      setShowCommunity(false);
      toast.success('Community updated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not update community');
    } finally { setSavingCommunity(false); }
  };

  const createChannel = async () => {
    if (!activeCommunity || !newChannel.name.trim()) return;
    setCreating(true);
    try {
      const slug = newChannel.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data } = await api.post('/community/channels', {
        community_id: activeCommunity.id,
        name: newChannel.name.trim(),
        slug,
        description: newChannel.description.trim() || undefined,
        type: newChannel.type,
      });
      await fetchCommunityChannels(activeCommunity.id);
      if (data?.data) setActiveChannel(data.data);
      setShowCreate(false);
      setNewChannel({ name: '', description: '', type: 'text' });
      toast.success('Channel created');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not create channel');
    } finally { setCreating(false); }
  };

  const renameChannel = async (id: string) => {
    if (!editName.trim() || !activeCommunity) return;
    setManaging(true);
    try {
      await api.put(`/community/channels/${id}`, { name: editName.trim() });
      await fetchCommunityChannels(activeCommunity.id);
      setEditingId(null);
      toast.success('Channel renamed');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not rename channel');
    } finally { setManaging(false); }
  };

  const removeChannel = async (id: string) => {
    if (!activeCommunity || !confirm('Delete this channel and its messages?')) return;
    setManaging(true);
    try {
      await api.delete(`/community/channels/${id}`);
      await fetchCommunityChannels(activeCommunity.id);
      if (activeChannel?.id === id) setActiveChannel(null as any);
      toast.success('Channel deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not delete channel');
    } finally { setManaging(false); }
  };

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
          <h2 className="text-lg font-bold text-white flex items-center gap-2 min-w-0">
            <span className="gradient-text truncate">{activeCommunity?.name || 'Community'}</span>
          </h2>
          {canManage && (
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setShowCreate(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white" title="Add channel" aria-label="Add channel"><Plus size={17} /></button>
              <button onClick={() => setShowManage(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white" title="Manage channels" aria-label="Manage channels"><Settings size={16} /></button>
              <button onClick={openCommunitySettings} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white" title="Community settings" aria-label="Community settings"><Pencil size={15} /></button>
            </div>
          )}
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

      {showCommunity && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-label="Community settings">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Community settings</h3>
              <button onClick={() => setShowCommunity(false)} aria-label="Close"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {communityForm.image_url ? (
                    <img src={communityForm.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 grid place-items-center text-white font-bold text-xl">{communityForm.name.charAt(0) || 'C'}</div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-500 text-white grid place-items-center cursor-pointer">
                    {uploadingCommunityImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingCommunityImage} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCommunityImage(f); }} />
                  </label>
                </div>
                <div className="text-xs text-gray-400">Upload a community logo or cover image. Recommended square, at least 256×256.</div>
              </div>
              <input value={communityForm.name} onChange={(e) => setCommunityForm({ ...communityForm, name: e.target.value })} placeholder="Community name" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
              <textarea value={communityForm.description} onChange={(e) => setCommunityForm({ ...communityForm, description: e.target.value })} rows={3} placeholder="Description" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCommunity(false)} className="px-3 py-2 text-sm text-gray-300">Cancel</button>
                <button onClick={saveCommunitySettings} disabled={savingCommunity || !communityForm.name.trim()} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5">{savingCommunity && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-label="Create channel">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">New channel</h3>
              <button onClick={() => setShowCreate(false)} aria-label="Close"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={newChannel.name} onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })} placeholder="Channel name" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
              <input value={newChannel.description} onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })} placeholder="Description (optional)" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
              <select value={newChannel.type} onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="text">Text channel</option>
                <option value="announcement">Announcement channel</option>
                <option value="project_showcase">Project showcase</option>
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-gray-300">Cancel</button>
                <button onClick={createChannel} disabled={creating || !newChannel.name.trim()} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5">{creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManage && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-label="Manage channels">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Manage channels</h3>
              <button onClick={() => setShowManage(false)} aria-label="Close"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {channels.map((ch: CommunityChannel) => (
                <div key={ch.id} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
                  {editingId === ch.id ? (
                    <>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-sm text-white" />
                      <button onClick={() => renameChannel(ch.id)} disabled={managing} className="text-xs text-primary-400">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                    </>
                  ) : (
                    <>
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="flex-1 text-sm text-gray-200 truncate">{ch.name}</span>
                      <button onClick={() => { setEditingId(ch.id); setEditName(ch.name); }} aria-label="Rename channel" className="p-1 text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeChannel(ch.id)} disabled={managing} aria-label="Delete channel" className="p-1 text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
              {!channels.length && <p className="text-sm text-gray-400">No channels yet.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
