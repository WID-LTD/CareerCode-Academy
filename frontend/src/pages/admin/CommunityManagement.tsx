import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Loader2, X, Users, MessageSquare, Eye, Edit, Trash2,
  Archive, ArchiveRestore, Shield, ShieldOff, VolumeX, Volume2,
  ChevronDown, AlertCircle, Hash, Globe, Lock, EyeOff, Calendar,
  UserMinus, UserPlus, Settings, BookOpen, ArrowRight, Upload,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useCommunityStore } from '@/store/communityStore';
import api from '@/lib/axios';
import type { Community, CommunityMember, CommunityRule } from '@/store/communityStore';

const CATEGORIES = ['General', 'Tech', 'Design', 'Business', 'Other'];
const VISIBILITY_OPTIONS = ['public', 'private', 'restricted'];
const JOIN_POLICY_OPTIONS = ['open', 'approval', 'invite_only'];
const MEMBER_ROLES = ['admin', 'moderator', 'member'];

const CATEGORY_COLORS: Record<string, string> = {
  General: 'bg-gray-500/20 text-gray-400',
  Tech: 'bg-blue-500/20 text-blue-400',
  Design: 'bg-purple-500/20 text-purple-400',
  Business: 'bg-green-500/20 text-green-400',
  Other: 'bg-yellow-500/20 text-yellow-400',
};

const VISIBILITY_ICONS: Record<string, any> = {
  public: Globe,
  private: Lock,
  restricted: EyeOff,
};

const VISIBILITY_BADGES: Record<string, 'success' | 'danger' | 'warning'> = {
  public: 'success',
  private: 'danger',
  restricted: 'warning',
};

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—';
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function CommunityManagement() {
  const navigate = useNavigate();
  const {
    communities, isLoading, fetchCommunities, createCommunity, updateCommunity,
    deleteCommunity, archiveCommunity, fetchCommunityMembers, communityMembers,
    updateMemberRole, banMember, unbanMember, muteMember, unmuteMember,
    fetchCommunityRules, communityRules, createCommunityRule, updateCommunityRule,
    deleteCommunityRule, fetchCommunityStats, communityStats, searchCommunities,
  } = useCommunityStore();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', image_url: '', category: 'General',
    visibility: 'public', join_policy: 'open', rules: '',
  });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id?: string; name?: string } | null>(null);

  const [memberPanel, setMemberPanel] = useState<Community | null>(null);
  const [rulePanel, setRulePanel] = useState<Community | null>(null);
  const [ruleForm, setRuleForm] = useState({ title: '', description: '' });
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchCommunities(search);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, searchCommunities]);

  useEffect(() => {
    if (memberPanel) {
      fetchCommunityMembers(memberPanel.id);
    }
  }, [memberPanel, fetchCommunityMembers]);

  useEffect(() => {
    if (rulePanel) {
      fetchCommunityRules(rulePanel.id);
    }
  }, [rulePanel, fetchCommunityRules]);

  const stats = useMemo(() => {
    const s = { total: communities.length, public: 0, private: 0, restricted: 0, archived: 0, totalMembers: 0 };
    communities.forEach((c) => {
      if (c.visibility === 'public') s.public++;
      else if (c.visibility === 'private') s.private++;
      else if (c.visibility === 'restricted') s.restricted++;
      if (c.is_archived) s.archived++;
      s.totalMembers += c.member_count;
    });
    return s;
  }, [communities]);

  const filtered = useMemo(() => {
    let list = communities;
    if (activeTab === 'public') list = list.filter((c) => c.visibility === 'public');
    else if (activeTab === 'private') list = list.filter((c) => c.visibility === 'private');
    else if (activeTab === 'restricted') list = list.filter((c) => c.visibility === 'restricted');
    else if (activeTab === 'archived') list = list.filter((c) => c.is_archived);
    else if (activeTab === 'active') list = list.filter((c) => !c.is_archived);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    return list;
  }, [communities, activeTab, search]);

  const resetForm = useCallback(() => {
    setForm({ name: '', slug: '', description: '', image_url: '', category: 'General', visibility: 'public', join_policy: 'open', rules: '' });
    setEditingCommunity(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((community: Community) => {
    setForm({
      name: community.name, slug: community.slug, description: community.description || '',
      image_url: community.image_url || '', category: community.category, visibility: community.visibility,
      join_policy: community.join_policy, rules: community.rules || '',
    });
    setEditingCommunity(community);
    setShowForm(true);
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    try {
      if (editingCommunity) {
        await updateCommunity(editingCommunity.id, {
          name: form.name, slug: form.slug, description: form.description || null,
          image_url: form.image_url || null, category: form.category,
          visibility: form.visibility as any, join_policy: form.join_policy as any,
          rules: form.rules || null,
        });
      } else {
        await createCommunity({
          name: form.name, slug: form.slug, description: form.description || undefined,
          category: form.category, visibility: form.visibility, join_policy: form.join_policy,
          image_url: form.image_url || undefined,
        });
      }
      resetForm();
    } finally { setSaving(false); }
  };

  const handleArchive = async (id: string) => {
    setActionLoading(id);
    try { await archiveCommunity(id); } finally { setActionLoading(null); setConfirmAction(null); }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try { await deleteCommunity(id); } finally { setActionLoading(null); setConfirmAction(null); }
  };

  const handleMemberRole = async (communityId: string, userId: string, role: string) => {
    setActionLoading(`role-${userId}`);
    try { await updateMemberRole(communityId, userId, role); } finally { setActionLoading(null); }
  };

  const handleBan = async (communityId: string, userId: string) => {
    setActionLoading(`ban-${userId}`);
    try { await banMember(communityId, userId); } finally { setActionLoading(null); }
  };

  const handleUnban = async (communityId: string, userId: string) => {
    setActionLoading(`ban-${userId}`);
    try { await unbanMember(communityId, userId); } finally { setActionLoading(null); }
  };

  const handleMute = async (communityId: string, userId: string) => {
    setActionLoading(`mute-${userId}`);
    try { await muteMember(communityId, userId); } finally { setActionLoading(null); }
  };

  const handleUnmute = async (communityId: string, userId: string) => {
    setActionLoading(`mute-${userId}`);
    try { await unmuteMember(communityId, userId); } finally { setActionLoading(null); }
  };

  const handleRuleSave = async () => {
    if (!ruleForm.title || !rulePanel) return;
    setRuleSaving(true);
    try {
      if (editingRule) {
        await updateCommunityRule(rulePanel.id, editingRule, { title: ruleForm.title, description: ruleForm.description || undefined });
      } else {
        await createCommunityRule(rulePanel.id, { title: ruleForm.title, description: ruleForm.description || undefined });
      }
      setRuleForm({ title: '', description: '' });
      setEditingRule(null);
    } finally { setRuleSaving(false); }
  };

  const handleRuleDelete = async (ruleId: string) => {
    if (!rulePanel) return;
    await deleteCommunityRule(rulePanel.id, ruleId);
  };

  const tabs = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'active', label: 'Active', count: stats.total - stats.archived },
    { key: 'public', label: 'Public', count: stats.public },
    { key: 'private', label: 'Private', count: stats.private },
    { key: 'restricted', label: 'Restricted', count: stats.restricted },
    { key: 'archived', label: 'Archived', count: stats.archived },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Community Management</h1>
          <p className="text-gray-500 mt-1">Manage all communities, members, and rules.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} icon={<Plus className="w-4 h-4" />}>
          Create Community
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: MessageSquare, color: 'text-primary-400' },
          { label: 'Members', value: stats.totalMembers, icon: Users, color: 'text-blue-400' },
          { label: 'Public', value: stats.public, icon: Globe, color: 'text-green-400' },
          { label: 'Private', value: stats.private, icon: Lock, color: 'text-red-400' },
          { label: 'Restricted', value: stats.restricted, icon: EyeOff, color: 'text-yellow-400' },
          { label: 'Archived', value: stats.archived, icon: Archive, color: 'text-gray-400' },
        ].map((s) => (
          <GlassCard key={s.label} hover={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
              activeTab === tab.key
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/30"
        />
      </div>

      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{editingCommunity ? 'Edit Community' : 'New Community'}</h2>
                <button onClick={resetForm} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingCommunity ? form.slug : generateSlug(e.target.value) })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="My Community" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Slug *</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="my-community" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="Describe the community..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Image URL</label>
                  <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="https://..." />
                  <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 cursor-pointer">
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload image
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      try { const fd = new FormData(); fd.append('file', file); const { data } = await api.post('/upload', fd); setForm((f: any) => ({ ...f, image_url: data.data.url })); }
                      finally { setUploadingImage(false); }
                    }} />
                  </label>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Category</label>
                  <div className="relative">
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 appearance-none cursor-pointer">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Visibility</label>
                  <div className="relative">
                    <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 appearance-none cursor-pointer capitalize">
                      {VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Join Policy</label>
                  <div className="relative">
                    <select value={form.join_policy} onChange={(e) => setForm({ ...form, join_policy: e.target.value })}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 appearance-none cursor-pointer capitalize">
                      {JOIN_POLICY_OPTIONS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Rules</label>
                  <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} rows={3}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="Community rules (one per line)..." />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editingCommunity ? 'Update' : 'Create'}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && communities.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          Loading communities...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No communities found.</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((community) => {
            const VisIcon = VISIBILITY_ICONS[community.visibility] || Globe;
            return (
              <motion.div key={community.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard hover={false} className="p-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                      {community.image_url ? (
                        <img src={community.image_url} alt={community.name} className="w-full h-full object-cover" />
                      ) : (
                        <MessageSquare className="w-8 h-8 text-primary-400/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg truncate">{community.name}</h3>
                            <Badge variant={VISIBILITY_BADGES[community.visibility]} size="sm">
                              <VisIcon className="w-3 h-3 mr-1" />
                              {community.visibility}
                            </Badge>
                            {community.is_archived && (
                              <Badge variant="danger" size="sm"><Archive className="w-3 h-3 mr-1" />Archived</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{community.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[community.category] || CATEGORY_COLORS.Other}`}>
                          {community.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" /> {community.member_count} members
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Hash className="w-3 h-3" /> {community.channel_count} channels
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" /> {formatRelative(community.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/c/${community.slug}`)}
                          icon={<Eye className="w-3.5 h-3.5" />}>View community</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(community)}
                          icon={<Edit className="w-3.5 h-3.5" />}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setMemberPanel(community)}
                          icon={<Users className="w-3.5 h-3.5" />}>Members</Button>
                        <Button variant="ghost" size="sm" onClick={() => setRulePanel(community)}
                          icon={<BookOpen className="w-3.5 h-3.5" />}>Rules</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'archive', id: community.id, name: community.name })}
                          icon={community.is_archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}>
                          {community.is_archived ? 'Unarchive' : 'Archive'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setConfirmAction({ type: 'delete', id: community.id, name: community.name })}
                          icon={<Trash2 className="w-3.5 h-3.5" />}>Delete</Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {confirmAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmAction(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${confirmAction.type === 'delete' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                  <AlertCircle className={`w-5 h-5 ${confirmAction.type === 'delete' ? 'text-red-400' : 'text-yellow-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{confirmAction.type === 'delete' ? 'Delete Community' : 'Archive Community'}</h3>
                  <p className="text-sm text-gray-400">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-6">
                Are you sure you want to {confirmAction.type === 'delete' ? 'permanently delete' : 'archive'} <strong>{confirmAction.name}</strong>?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                <Button variant={confirmAction.type === 'delete' ? 'danger' : 'primary'}
                  loading={actionLoading === confirmAction.id}
                  onClick={() => confirmAction.id && (confirmAction.type === 'delete' ? handleDelete(confirmAction.id) : handleArchive(confirmAction.id))}>
                  {confirmAction.type === 'delete' ? 'Delete' : 'Archive'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {memberPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={() => setMemberPanel(null)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-950 border-l border-white/10 h-full overflow-y-auto shadow-2xl">
              <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{memberPanel.name} Members</h2>
                  <p className="text-sm text-gray-400">{communityMembers.length} members</p>
                </div>
                <button onClick={() => setMemberPanel(null)} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-2">
                {communityMembers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No members found.</p>
                ) : (
                  communityMembers.map((member) => (
                    <div key={member.id} className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 ${member.is_banned ? 'opacity-50' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/30 to-purple-500/30 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {member.user_avatar ? (
                          <img src={member.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          member.user_name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.user_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative">
                          <select value={member.role} onChange={(e) => handleMemberRole(memberPanel.id, member.user_id, e.target.value)}
                            disabled={member.role === 'owner' || actionLoading === `role-${member.user_id}`}
                            className="text-xs rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-white appearance-none cursor-pointer pr-6 disabled:opacity-50 disabled:cursor-not-allowed">
                            {MEMBER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                        {member.is_muted ? (
                          <button onClick={() => handleUnmute(memberPanel.id, member.user_id)} disabled={actionLoading === `mute-${member.user_id}`}
                            className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-400" title="Unmute">
                            {actionLoading === `mute-${member.user_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <button onClick={() => handleMute(memberPanel.id, member.user_id)} disabled={actionLoading === `mute-${member.user_id}`}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-400" title="Mute">
                            {actionLoading === `mute-${member.user_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VolumeX className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {member.is_banned ? (
                          <button onClick={() => handleUnban(memberPanel.id, member.user_id)} disabled={actionLoading === `ban-${member.user_id}`}
                            className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400" title="Unban">
                            {actionLoading === `ban-${member.user_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <button onClick={() => handleBan(memberPanel.id, member.user_id)} disabled={actionLoading === `ban-${member.user_id}` || member.role === 'owner'}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 disabled:opacity-30" title="Ban">
                            {actionLoading === `ban-${member.user_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rulePanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={() => { setRulePanel(null); setEditingRule(null); setRuleForm({ title: '', description: '' }); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-950 border-l border-white/10 h-full overflow-y-auto shadow-2xl">
              <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{rulePanel.name} Rules</h2>
                  <p className="text-sm text-gray-400">{communityRules.length} rules</p>
                </div>
                <button onClick={() => { setRulePanel(null); setEditingRule(null); setRuleForm({ title: '', description: '' }); }} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-sm font-medium mb-3">{editingRule ? 'Edit Rule' : 'Add Rule'}</h3>
                  <div className="space-y-3">
                    <input value={ruleForm.title} onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Rule title" />
                    <textarea value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} rows={2}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="Rule description (optional)" />
                    <div className="flex justify-end gap-2">
                      {editingRule && (
                        <Button variant="ghost" size="sm" onClick={() => { setEditingRule(null); setRuleForm({ title: '', description: '' }); }}>Cancel</Button>
                      )}
                      <Button size="sm" onClick={handleRuleSave} disabled={ruleSaving || !ruleForm.title}>
                        {ruleSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                        {editingRule ? 'Update' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </GlassCard>

                {communityRules.length === 0 ? (
                  <p className="text-center text-gray-500 py-6 text-sm">No rules yet.</p>
                ) : (
                  <div className="space-y-2">
                    {communityRules.map((rule, i) => (
                      <div key={rule.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                        <span className="text-xs text-gray-500 font-mono mt-1">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rule.title}</p>
                          {rule.description && <p className="text-xs text-gray-400 mt-1">{rule.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingRule(rule.id); setRuleForm({ title: rule.title, description: rule.description || '' }); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-primary-400" title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleRuleDelete(rule.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
