import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Loader2, X, Users, MessageSquare, Edit, Trash2, Archive, ArchiveRestore, Globe, Lock, EyeOff, Hash, Calendar, BookOpen, Link2, Copy, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useCommunityStore } from '@/store/communityStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import type { Community } from '@/store/communityStore';

const CATEGORIES = ['General', 'Tech', 'Design', 'Business', 'Other'];
const VISIBILITY_ICONS: Record<string, any> = { public: Globe, private: Lock, restricted: EyeOff };

export default function InstructorCommunities() {
  const { communities, isLoading, fetchCommunities, createCommunity, updateCommunity, deleteCommunity, archiveCommunity } = useCommunityStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', category: 'General', visibility: 'public', join_policy: 'open' });
  const [requestsFor, setRequestsFor] = useState<Community | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('mine');
  const [inviteFor, setInviteFor] = useState<Community | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => { fetchCommunities(); }, [fetchCommunities]);

  const myCommunities = useMemo(() => communities.filter(c => (c as any).is_member || (c as any).created_by === user?.id), [communities, user?.id]);
  const list = activeTab === 'mine' ? myCommunities : communities;

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }, [list, search]);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    try {
      if (editingCommunity) {
        // Only own can edit — backend will enforce owner check, admin can edit any (this page is instructor own-only)
        if ((editingCommunity as any).created_by !== user?.id && user?.role !== 'admin' && user?.role !== 'super_admin') return;
        await updateCommunity(editingCommunity.id, { name: form.name, slug: form.slug, description: form.description || null, category: form.category, visibility: form.visibility as any, join_policy: form.join_policy as any } as any);
      } else {
        await createCommunity({ name: form.name, slug: form.slug, description: form.description || undefined, category: form.category, visibility: form.visibility as any, join_policy: form.join_policy as any } as any);
      }
      setShowForm(false); setEditingCommunity(null); setForm({ name: '', slug: '', description: '', category: 'General', visibility: 'public', join_policy: 'open' });
    } finally { setSaving(false); }
  };

  const canEdit = (c: Community) => (c as any).created_by === user?.id || ['owner', 'admin', 'moderator'].includes((c as any).my_role) || user?.role === 'admin' || user?.role === 'super_admin';
  const canDelete = (c: Community) => (c as any).created_by === user?.id || user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Communities</h1>
          <p className="text-gray-500 mt-1">Create and manage your communities. You can delete/rename only those you created; admins can manage any.</p>
        </div>
        <Button onClick={() => { setEditingCommunity(null); setForm({ name: '', slug: '', description: '', category: 'General', visibility: 'public', join_policy: 'open' }); setShowForm(true); }} icon={<Plus className="w-4 h-4" />}>Create Community</Button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setActiveTab('mine')} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTab === 'mine' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-gray-400 hover:bg-white/5'}`}>My Communities ({myCommunities.length})</button>
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTab === 'all' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-gray-400 hover:bg-white/5'}`}>Browse All ({communities.length})</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Search communities..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/30" />
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{editingCommunity ? 'Edit Community' : 'New Community'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-400 mb-1 block">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingCommunity ? form.slug : generateSlug(e.target.value) })} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="My Community" /></div>
                <div><label className="text-xs font-medium text-gray-400 mb-1 block">Slug *</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="my-community" /></div>
                <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-400 mb-1 block">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="Describe..." /></div>
                <div><label className="text-xs font-medium text-gray-400 mb-1 block">Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-xs font-medium text-gray-400 mb-1 block">Visibility</label><select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 capitalize">{['public','private','restricted'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                <div><label className="text-xs font-medium text-gray-400 mb-1 block">Join Policy</label><select value={form.join_policy} onChange={(e) => setForm({ ...form, join_policy: e.target.value })} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary-500/30 capitalize">{['open','approval','invite_only'].map(p => <option key={p} value={p}>{p.replace('_',' ')}</option>)}</select></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}{editingCommunity ? 'Update' : 'Create'}</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && communities.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No communities found. {activeTab === 'mine' ? 'Create one to get started.' : ''}</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((community) => {
            const VisIcon = VISIBILITY_ICONS[community.visibility] || Globe;
            const isOwn = (community as any).created_by === user?.id;
            return (
              <GlassCard key={community.id} hover={false} className="p-5">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    {community.image_url ? <img src={community.image_url} alt={community.name} className="w-full h-full object-cover rounded-xl" /> : <MessageSquare className="w-8 h-8 text-primary-400/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{community.name}</h3>
                      <Badge variant={community.visibility === 'public' ? 'success' : community.visibility === 'private' ? 'danger' : 'warning'} size="sm"><VisIcon className="w-3 h-3 mr-1" />{community.visibility}</Badge>
                      {isOwn && <Badge variant="default" size="sm">Owned</Badge>}
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{community.description || 'No description'}</p>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3 h-3" /> {community.member_count} members</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Hash className="w-3 h-3" /> {community.channel_count} channels</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Calendar className="w-3 h-3" /> {new Date(community.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {canEdit(community as Community) && <Button variant="ghost" size="sm" onClick={() => { setEditingCommunity(community as Community); setForm({ name: community.name, slug: community.slug, description: community.description || '', category: community.category, visibility: community.visibility, join_policy: community.join_policy }); setShowForm(true); }} icon={<Edit className="w-3.5 h-3.5" />}>Rename</Button>}
                      {canEdit(community as Community) && (
                        <Button variant="ghost" size="sm" onClick={async () => {
                          setInviteFor(community as Community); setInviteLink(''); setInviteCopied(false); setInviteLoading(true);
                          try {
                            const { data } = await api.post(`/community/communities/${community.id}/invites`, {});
                            setInviteLink(`${window.location.origin}/community/join/${data.data.code}`);
                          } catch (err: any) {
                            setInviteLink('');
                          } finally { setInviteLoading(false); }
                        }} icon={<Link2 className="w-3.5 h-3.5" />}>Invite link</Button>
                      )}
                      {canEdit(community as Community) && (
                        <Button variant="ghost" size="sm" onClick={async () => {
                          setRequestsFor(community as Community); setRequestsLoading(true);
                          try { const { data } = await api.get(`/community/communities/${community.id}/requests`); setRequests(data.data || []); }
                          catch { setRequests([]); } finally { setRequestsLoading(false); }
                        }} icon={<Users className="w-3.5 h-3.5" />}>Requests</Button>
                      )}
                      {canDelete(community as Community) && <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setConfirmAction({ type: 'delete', id: community.id, name: community.name })} icon={<Trash2 className="w-3.5 h-3.5" />}>Delete</Button>}
                      {!isOwn && activeTab === 'all' && <Button variant="ghost" size="sm" onClick={() => window.location.assign(`/community/${community.id}`)} icon={<BookOpen className="w-3.5 h-3.5" />}>View</Button>}
                      {isOwn && <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'archive', id: community.id, name: community.name })} icon={community.is_archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}>{community.is_archived ? 'Unarchive' : 'Archive'}</Button>}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {inviteFor && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm p-4 grid place-items-center" role="dialog" aria-label="Community invite link">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Invite to {inviteFor.name}</h3>
              <button onClick={() => setInviteFor(null)} className="text-gray-400" aria-label="Close">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Anyone with this link can join this community, including invite-only communities.</p>
            {inviteLoading ? <p className="text-sm text-gray-400">Creating link…</p> : inviteLink ? (
              <>
                <div className="flex gap-2">
                  <input readOnly value={inviteLink} className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-gray-200" />
                  <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 1500); } catch { /* ignore */ } }} icon={inviteCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>{inviteCopied ? 'Copied' : 'Copy'}</Button>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" variant="outline" onClick={async () => {
                    setInviteLoading(true);
                    try { const { data } = await api.post(`/community/communities/${inviteFor.id}/invites`, {}); setInviteLink(`${window.location.origin}/community/join/${data.data.code}`); setInviteCopied(false); }
                    finally { setInviteLoading(false); }
                  }}>New link</Button>
                </div>
              </>
            ) : <p className="text-sm text-red-400">Could not create an invite link.</p>}
          </div>
        </div>
      )}

      <AnimatePresence>
        {requestsFor && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-lg mx-auto my-10 rounded-2xl bg-gray-900 border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Join requests · {requestsFor.name}</h3>
              <button onClick={() => setRequestsFor(null)} className="text-gray-400">✕</button>
            </div>
            {requestsLoading ? <p className="text-sm text-gray-400">Loading…</p> : requests.length === 0 ? (
              <p className="text-sm text-gray-400">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.id} className="rounded-xl border border-gray-800 p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.email}</p>
                      {r.message && <p className="text-xs text-gray-500 mt-1">{r.message}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={async () => {
                        await api.put(`/community/communities/${requestsFor.id}/requests/${r.id}`, { status: 'approved' });
                        setRequests((x) => x.filter((i) => i.id !== r.id));
                      }}>Approve</Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={async () => {
                        await api.put(`/community/communities/${requestsFor.id}/requests/${r.id}`, { status: 'rejected' });
                        setRequests((x) => x.filter((i) => i.id !== r.id));
                      }}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmAction(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
              <h3 className="font-semibold">{confirmAction.type === 'delete' ? 'Delete Community' : 'Archive Community'}</h3>
              <p className="text-sm text-gray-400 mt-2">Are you sure you want to {confirmAction.type} <strong>{confirmAction.name}</strong>? {confirmAction.type === 'delete' ? 'Only admins can delete any, you can delete only your own.' : ''}</p>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                <Button variant={confirmAction.type === 'delete' ? 'danger' : 'primary'} onClick={async () => { if (confirmAction.type === 'delete') await deleteCommunity(confirmAction.id); else await archiveCommunity(confirmAction.id); setConfirmAction(null); }}>{confirmAction.type === 'delete' ? 'Delete' : 'Archive'}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
