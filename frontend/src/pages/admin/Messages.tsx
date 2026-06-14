import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Send, User as UserIcon, Search, Loader2 } from 'lucide-react';

export default function AdminMessages() {
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
    setApiPrefix('/instructor');
    if (user) {
      initializeSocket(user.id);
      fetchConversations();
    }
    return () => { disconnectSocket(); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversation) return;
    await sendMessage(activeConversation, input);
    setInput('');
  };

  const activeUser = conversations.find(c => c.id === activeConversation);
  const filtered = conversations.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Messages</h1>
        <p className="text-gray-500">Direct messaging with platform users.</p>
      </div>

      <GlassCard className="flex-1 flex overflow-hidden" hover={false}>
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Search..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && !isLoading && (
              <div className="p-4 text-center text-gray-500 text-sm">No conversations</div>
            )}
            {filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left ${activeConversation === conv.id ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex flex-shrink-0 items-center justify-center overflow-hidden">
                  {conv.avatar ? (
                    <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{conv.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{conv.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900/20">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {activeUser?.avatar ? (
                    <img src={activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{activeUser?.name}</div>
                  <div className="text-xs text-green-500">Online</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMine ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-bl-none'}`}>
                        <div className="text-sm">{msg.content}</div>
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-primary-100' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text" value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                  <Button type="submit" variant="primary" className="rounded-xl px-4">
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
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
