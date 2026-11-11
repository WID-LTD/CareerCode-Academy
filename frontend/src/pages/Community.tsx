import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    ? { icon: Globe, label: 'Public', cls: 'bg-emerald-500/20 text-emerald-400' }
    : community.visibility === 'private'
      ? { icon: Lock, label: 'Private', cls: 'bg-red-500/20 text-red-400' }
      : { icon: Key, label: 'Restricted', cls: 'bg-amber-500/20 text-amber-400' };

  const VisIcon = visibilityBadge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-primary-500/30 transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-bold text-lg">{community.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{community.name}</h3>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${visibilityBadge.cls}`}>
            <VisIcon size={12} />
            {visibilityBadge.label}
          </span>
        </div>
      </div>
      <p className="text-gray-400 text-sm line-clamp-2 mb-3 min-h-[2.5rem]">
        {community.description || 'No description'}
      </p>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1"><Users size={14} /> {community.member_count} members</span>
        <span className="flex items-center gap-1"><MessageSquare size={14} /> {community.channel_count} channels</span>
        <span className="px-2 py-0.5 bg-white/5 rounded-full text-gray-400">{community.category}</span>
      </div>
      <div className="flex gap-2">
        {community.is_member ? (
          <button
            onClick={() => onEnter(community.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Enter <ChevronRight size={16} />
          </button>
        ) : community.my_request_status === 'pending' ? (
          <span className="flex-1 text-center px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/20">Request pending</span>
        ) : community.join_policy === 'invite_only' ? (
          <span className="flex-1 text-center px-4 py-2 bg-white/5 text-gray-400 rounded-xl text-sm">Invite Only</span>
        ) : (
          <button
            onClick={() => onJoin(community.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-colors border border-white/10"
          >
            {community.join_policy === 'approval' ? 'Request to join' : 'Join Community'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CommunityBrowser({ onEnter }: { onEnter: (id: string) => void }) {
  const { communities, fetchCommunities, joinCommunity } = useCommunityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'joined' | 'discover'>('all');

  useEffect(() => {
    fetchCommunities();
  }, []);

  const filtered = communities.filter((c) => {
    if (filter === 'joined') return c.is_member;
    if (filter === 'discover') return !c.is_member;
    return true;
  }).filter((c) =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-950 overflow-hidden">
      <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="gradient-text">Community Forums</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Browse and join communities to connect with fellow learners</p>
          </div>
          <span className="text-sm text-gray-500 ml-3">{communities.length} communities</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/50 text-sm"
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-x-auto scrollbar-hide">
            {(['all', 'joined', 'discover'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  filter === tab
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">No communities found</p>
            <p className="text-sm mt-1">Check back later or ask an admin to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                onJoin={(id) => joinCommunity(id)}
                onEnter={onEnter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Community() {
  const { id } = useParams<{ id: string }>();
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
    if (id && isAuthenticated) {
      fetchCommunityById(id);
      fetchCommunityChannels(id);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!id || !channels.length) return;
    const currentStillExists = activeChannel && channels.some((c) => c.id === activeChannel.id);
    if (!currentStillExists) setActiveChannel(channels[0]);
  }, [id, channels, activeChannel]);

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

  if (!id) {
    return <CommunityBrowser onEnter={(communityId) => navigate(`/community/${communityId}`)} />;
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
              await joinCommunity(id);
              await fetchCommunityById(id);
              await fetchCommunityChannels(id);
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
