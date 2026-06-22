import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Send, User as UserIcon, Search, Trash2 } from 'lucide-react';

export default function InstructorMessages() {
  const { user } = useAuthStore();
  const {
    conversations, messages, activeConversation, isLoading,
    initializeSocket, disconnectSocket, fetchConversations,
    setActiveConversation, sendMessage, setApiPrefix,
    deleteMessage, emitTyping, onlineUsers, typingUsers,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

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

  const activeUser = conversations.find(c => c.id === activeConversation);
  const isOnline = activeUser ? onlineUsers.has(activeUser.id) : false;
  const isTyping = activeUser ? typingUsers.has(activeUser.id) : false;

  const filtered = conversations.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversation) return;
    await sendMessage(activeConversation, input);
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (activeConversation) {
      emitTyping(activeConversation, true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => emitTyping(activeConversation, false), 1500);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Messages</h1>
        <p className="text-gray-500">Real-time direct messaging with your students.</p>
      </div>

      <GlassCard className="flex-1 flex overflow-hidden" hover={false}>
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search conversations..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && !isLoading && (
              <div className="p-4 text-center text-gray-500 text-sm">No conversations</div>
            )}
            {filtered.map(conv => {
              const convOnline = onlineUsers.has(conv.id);
              return (
                <button key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left border-b border-gray-50 dark:border-gray-800/30 ${activeConversation === conv.id ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {conv.avatar ? <img src={conv.avatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-gray-400" />}
                    </div>
                    {convOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{conv.name}</div>
                      {conv.last_message_at && <span className="text-[10px] text-gray-400 ml-2">{formatTime(conv.last_message_at)}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 truncate flex-1">{conv.last_message || 'No messages yet'}</span>
                      {(conv.unread_count || 0) > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">{conv.unread_count}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 capitalize mt-0.5">{conv.role}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900/20 min-w-0">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {activeUser?.avatar ? <img src={activeUser.avatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-gray-400" />}
                  </div>
                  {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full" />}
                </div>
                <div>
                  <div className="font-medium">{activeUser?.name}</div>
                  <div className="text-xs">{isTyping ? <span className="text-primary-500 animate-pulse">typing...</span> : isOnline ? <span className="text-success-500">Online</span> : <span className="text-gray-400">Offline</span>}</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative max-w-[70%] rounded-2xl px-4 py-2 ${isMine ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-bl-none'}`}>
                        <div className="text-sm">{msg.content}</div>
                        <div className={`flex items-center gap-2 mt-1 ${isMine ? 'text-primary-100' : 'text-gray-400'} text-[10px]`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && <span>{msg.is_read ? '✓✓' : '✓'}</span>}
                        </div>
                        {isMine && (
                          <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setDeleteTarget(deleteTarget === msg.id ? null : msg.id)}
                              className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 shadow-md border border-gray-200 flex items-center justify-center hover:bg-danger-50">
                              <Trash2 className="w-3 h-3 text-danger-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 rounded-2xl rounded-bl-none px-4 py-2">
                      <div className="flex gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
                    </div>
                  </div>
                )}
                {isLoading && <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mx-4" />}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input type="text" value={input} onChange={handleInputChange}
                    placeholder="Type your message..."
                    className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <Button type="submit" variant="primary" className="rounded-xl px-4" disabled={!input.trim()}>
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center"><UserIcon className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="text-sm font-medium">Select a conversation</p></div>
            </div>
          )}
        </div>
      </GlassCard>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Delete Message</h3>
            <p className="text-sm text-gray-500 mb-4">Permanently delete this message?</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { deleteMessage(deleteTarget); setDeleteTarget(null); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
