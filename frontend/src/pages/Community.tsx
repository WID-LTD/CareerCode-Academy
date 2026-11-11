import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useCommunityStore, Community as CommunityType } from '@/store/communityStore';
import { ChannelSidebar } from '@/components/community/ChannelSidebar';
import { MessageFeed } from '@/components/community/MessageFeed';
import { MemberSidebar } from '@/components/community/MemberSidebar';
import { ThreadPanel } from '@/components/community/ThreadPanel';
import { Users, Globe, Lock, Key, ArrowLeft, MessageSquare, Search, ChevronRight } from 'lucide-react';

function CommunityCard({ community, onJoin, onEnter }: {
  community: CommunityType;
  onJoin: (id: string) => void;
  onEnter: (id: string) => void;
}) {
  const categoryColors: Record<string, string> = {
    General: 'from-blue-500 to-cyan-500',
    Tech: 'from-purple-500 to-pink-500',
    Design: 'from-pink-500 to-rose-500',
    Business: 'from-amber-500 to-orange-500',
    Other: 'from-emerald-500 to-teal-500',
  };
  const gradient = categoryColors[community.category] || categoryColors.General;

  const visibilityBadge = community.visibility === 'public'
    ? { icon: Globe, label: 'Public', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' }
    : community.visibility === 'private'
      ? { icon: Lock, label: 'Private', cls: 'bg-red-500/15 text-red-400 border-red-500/20' }
      : { icon: Key, label: 'Restricted', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };

  const VisIcon = visibilityBadge.icon;
  const unread = Number((community as any).unread_count || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl hover:border-primary-500/40 hover:shadow-[0_18px_50px_-20px_rgba(99,102,241,0.45)] transition-all"
    >
      <div className="relative h-28 overflow-hidden">
        {community.image_url ? (
          <img src={community.image_url} alt={community.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-90`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/20 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-md ${visibilityBadge.cls}`}>
            <VisIcon size={11} /> {visibilityBadge.label}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/40 text-gray-200 border border-white/10 backdrop-blur-md">{community.category}</span>
        </div>
        {unread > 0 && (
          <span className="absolute top-3 right-3 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white grid place-items-center text-[11px] font-bold shadow-lg">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        {!community.image_url && (
          <div className="absolute bottom-3 left-4 w-11 h-11 rounded-xl bg-black/30 backdrop-blur-md border border-white/20 grid place-items-center text-white font-bold text-lg">
            {community.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-white font-semibold text-base truncate">{community.name}</h3>
        <p className="text-gray-400 text-sm line-clamp-2 mt-1 min-h-[2.5rem]">
          {community.description || 'A place to connect, ask questions and grow together.'}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-3">
          <span className="flex items-center gap-1"><Users size={13} /> {community.member_count || 0}</span>
          <span className="flex items-center gap-1"><MessageSquare size={13} /> {community.channel_count || 0} channels</span>
        </div>
        <div className="mt-4">
          {community.is_member ? (
            <button
              onClick={() => onEnter(community.id)}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Open community <ChevronRight size={16} />
            </button>
          ) : community.my_request_status === 'pending' ? (
            <span className="block text-center px-4 py-2.5 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/20">Request pending</span>
          ) : community.join_policy === 'invite_only' ? (
            <span className="block text-center px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl text-sm border border-white/10">Invite only</span>
          ) : (
            <button
              onClick={() => onJoin(community.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold transition-colors border border-white/10"
            >
              {community.join_policy === 'approval' ? 'Request to join' : 'Join community'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CommunityBrowser({ onEnter }: { onEnter: (id: string) => void }) {
  const { communities, fetchCommunities, joinCommunity } = useCommunityStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'joined' | 'discover'>('all');
  const [category, setCategory] = useState('All');
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const categories = ['All', ...Array.from(new Set(communities.map((c) => c.category).filter(Boolean)))];

  const filtered = communities.filter((c) => {
    if (filter === 'joined') return c.is_member;
    if (filter === 'discover') return !c.is_member;
    return true;
  }).filter((c) => category === 'All' || c.category === category)
    .filter((c) =>
      !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const joinedCount = communities.filter((c) => c.is_member).length;
  const canCreate = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'super_admin';

  const handleJoin = async (communityId: string) => {
    setJoining(communityId);
    try { await joinCommunity(communityId); }
    finally { setJoining(null); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-950">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-secondary-500/10 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-400 mb-3">
                <Users size={13} /> CareerCode communities
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Find your people.</h1>
              <p className="text-gray-400 mt-2 max-w-xl">Join communities, share what you're building and learn alongside other students and instructors.</p>
            </div>
            {canCreate && (
              <button
                onClick={() => navigate('/instructor/communities')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold self-start sm:self-auto"
              >
                <MessageSquare size={16} /> Create a community
              </button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm">
            <span className="text-gray-300"><strong className="text-white">{communities.length}</strong> communities</span>
            <span className="text-gray-300"><strong className="text-white">{joinedCount}</strong> joined</span>
            <span className="text-gray-500">Be respectful, stay curious.</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/60 text-sm"
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto scrollbar-hide">
            {(['all', 'joined', 'discover'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors rounded-lg flex-shrink-0 ${
                  filter === tab ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'joined' ? 'Joined' : 'Discover'}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  category === cat ? 'bg-white text-gray-900 border-white' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500 rounded-2xl border border-dashed border-white/10">
              <Users size={48} className="mb-3 opacity-40" />
              <p className="text-lg font-medium text-gray-300">No communities found</p>
              <p className="text-sm mt-1">Try a different search, or join one of the public communities.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  onJoin={(id) => void handleJoin(id)}
                  onEnter={onEnter}
                />
              ))}
            </div>
          )}
          {joining && <p className="text-xs text-gray-500 mt-3">Joining community…</p>}
        </div>
      </div>
    </div>
  );
}

export default function Community() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const [resolvedId, setResolvedId] = useState<string | null>(id || null);
  const requestedChannel = searchParams.get('channel');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    fetchCategories,
    channels,
    activeChannel,
    setActiveChannel,
    initializeSocket,
    disconnectSocket,
    activeThread,
    fetchCommunityById,
    fetchCommunityChannels,
    activeCommunity,
    joinCommunity,
    setActiveCommunity,
  } = useCommunityStore();

  const [showMembers, setShowMembers] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      initializeSocket();
      fetchCategories();
    }
    return () => { disconnectSocket(); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (id) {
      setResolvedId(id);
      fetchCommunityById(id);
      fetchCommunityChannels(id);
      return;
    }
    if (slug) {
      api.get(`/community/communities/slug/${slug}`)
        .then(({ data }) => {
          const community = data.data;
          if (!community?.id) return;
          setResolvedId(community.id);
          setActiveCommunity(community);
          fetchCommunityChannels(community.id);
        })
        .catch(() => { setResolvedId(null); });
    }
  }, [id, slug, isAuthenticated]);

  const communityId = resolvedId || activeCommunity?.id || null;

  useEffect(() => {
    if (!communityId || !channels.length) return;
    if (requestedChannel) {
      const requested = channels.find((c) => c.id === requestedChannel);
      if (requested && activeChannel?.id !== requested.id) {
        setActiveChannel(requested);
        return;
      }
    }
    const currentStillExists = activeChannel && channels.some((c) => c.id === activeChannel.id);
    if (!currentStillExists) setActiveChannel(channels[0]);
  }, [communityId, channels, activeChannel, requestedChannel]);

  useEffect(() => {
    if (!communityId || !isAuthenticated) return;
    const timer = window.setInterval(() => {
      fetchCommunityChannels(communityId);
      fetchCommunityById(communityId);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [communityId, isAuthenticated]);

  useEffect(() => {
    if (!communityId || !activeChannel) return;
    api.get('/notifications?unread=true').then(({ data }) => {
      const items = (data.data || []).filter((n: any) => String(n.link || '').startsWith(`/community/${communityId}`));
      items.forEach((n: any) => { api.put(`/notifications/${n.id}/read`).catch(() => {}); });
    }).catch(() => {});
  }, [communityId, activeChannel?.id]);

  useEffect(() => {
    if (!activeCommunity) return;
    const prevTitle = document.title;
    const title = `${activeCommunity.name} — CareerCode Community`;
    document.title = title;
    const description = activeCommunity.description || `Join ${activeCommunity.name} on CareerCode Academy.`;
    const setMeta = (key: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); el.setAttribute('data-community-meta', '1'); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', description);
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', 'website', 'property');
    const canonical = `https://careercode.com.ng/c/${activeCommunity.slug}`;
    setMeta('og:url', canonical, 'property');
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; link.setAttribute('data-community-meta', '1'); document.head.appendChild(link); }
    link.href = canonical;
    return () => {
      document.title = prevTitle;
      document.head.querySelectorAll('[data-community-meta]').forEach((el) => el.remove());
    };
  }, [activeCommunity]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center max-w-md px-4">
          <h1 className="text-3xl font-bold mb-3"><span className="gradient-text">Community Forums</span></h1>
          <p className="text-gray-400 mb-6">Join the CareerCode Academy community to connect with fellow developers, ask questions, and grow together.</p>
          <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors">Log In to Join</a>
        </div>
      </div>
    );
  }

  if (!id && !slug) {
    return <CommunityBrowser onEnter={(communityId) => { const c = useCommunityStore.getState().communities.find((x) => x.id === communityId); navigate(c?.slug ? `/c/${c.slug}` : `/community/${communityId}`); }} />;
  }

  if (activeCommunity && !activeCommunity.is_member) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-950 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{activeCommunity.name}</h1>
          <p className="text-gray-400 text-sm mb-5">{activeCommunity.description || 'Join this community to see its channels and discussions.'}</p>
          <button
            onClick={async () => {
              setJoining(true);
              await joinCommunity(communityId!);
              await fetchCommunityById(communityId!);
              await fetchCommunityChannels(communityId!);
              setJoining(false);
            }}
            disabled={joining || activeCommunity.join_policy === 'invite_only'}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {joining ? 'Joining…' : activeCommunity.join_policy === 'invite_only' ? 'Invite only' : activeCommunity.join_policy === 'approval' ? 'Request to join' : 'Join Community'}
          </button>
          <button onClick={() => navigate('/community')} className="ml-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm">Back</button>
        </div>
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white mb-2">{activeCommunity?.name || 'Community'}</h1>
          <p className="text-gray-400 text-sm mb-4">This community has no channels yet.</p>
          <button onClick={() => navigate('/community')} className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm">Back to communities</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-gray-950">
      <ChannelSidebar
        onToggleMembers={() => setShowMembers(!showMembers)}
        showMembers={showMembers}
        onBack={() => navigate('/community')}
      />
      <MessageFeed />
      <AnimatePresence mode="wait">
        {activeThread ? <ThreadPanel key="thread" /> : null}
      </AnimatePresence>
      <MemberSidebar showMembers={showMembers} />
    </div>
  );
}
