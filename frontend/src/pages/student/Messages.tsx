import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Send, User as UserIcon, Search, Loader2 } from 'lucide-react';

export default function StudentMessages() {
  const { user } = useAuthStore();
  const {
    conversations, messages, activeConversation, isLoading,
    initializeSocket, disconnectSocket, fetchConversations,
    setActiveConversation, sendMessage, setApiPrefix,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setApiPrefix('/student');
    if (user) {
      initializeSocket(user.id);
      fetchConversations();
    }
    return () => { disconnectSocket(); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversation) return;
    sendMessage(activeConversation, input.trim());
    setInput('');
  };

  const filtered = conversations.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <GlassCard className="h-[calc(100vh-12rem)] overflow-hidden flex flex-col lg:flex-row" hover={false}>
        <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Search..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${activeConversation === conv.id ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-500 flex-shrink-0">
                  {conv.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{conv.role}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No conversations</p>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-xs font-bold text-primary-500">
                  {conversations.find((c) => c.id === activeConversation)?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{conversations.find((c) => c.id === activeConversation)?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{conversations.find((c) => c.id === activeConversation)?.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-primary-500 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                <input
                  type="text" placeholder="Type a message..." value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
                />
                <Button type="submit" disabled={!input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
