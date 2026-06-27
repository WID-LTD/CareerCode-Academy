import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';
import {
  Send, User as UserIcon, Search, Loader2, Trash2, X,
  PlusCircle, CheckCheck, Reply, Smile, MessageSquare,
  Users, GraduationCap, Shield, ChevronDown, Check,
  Clock, Filter,
} from 'lucide-react';

const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','👍','👎','🎉','❤️','🔥','💯','🙌','🚀','✨','💡','📚','🎓','✅','⭐'];

const roleTabs = [
  { label: 'All', icon: MessageSquare, filter: '' },
  { label: 'Students', icon: Users, filter: 'student' },
  { label: 'Instructors', icon: GraduationCap, filter: 'instructor' },
  { label: 'Admins', icon: Shield, filter: 'admin' },
];

interface ChatViewProps {
  apiPrefix: string;
  title?: string;
  subtitle?: string;
  showRoleFilter?: boolean;
  showNewChat?: boolean;
  userSearchEndpoint?: string;
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatConversationTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shouldShowDateSeparator(messages: any[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].created_at);
  const prev = new Date(messages[index - 1].created_at);
  return curr.toDateString() !== prev.toDateString();
}

function shouldGroup(messages: any[], index: number): boolean {
  if (index === 0) return false;
  const curr = messages[index];
  const prev = messages[index - 1];
  return curr.sender_id === prev.sender_id && new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < 300000;
}

export function ChatView({
  apiPrefix,
  title = 'Messages',
  subtitle,
  showRoleFilter = false,
  showNewChat = false,
  userSearchEndpoint = '/admin/users',
}: ChatViewProps) {
  const { user } = useAuthStore();
  const {
    conversations, messages, activeConversation, isLoading,
    initializeSocket, disconnectSocket, fetchConversations,
    setActiveConversation, sendMessage, setApiPrefix,
    deleteMessage, emitTyping, onlineUsers, typingUsers,
    markAllAsRead,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [msgSearch, setMsgSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [quoteMsg, setQuoteMsg] = useState<{ id: string; content: string; sender: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const emojiRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setApiPrefix(apiPrefix);
    if (user) {
      initializeSocket(user.id);
      fetchConversations();
    }
    return () => { disconnectSocket(); };
  }, [user, apiPrefix]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeConversation) { setShowScrollBtn(false); return; }
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(dist > 300);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [activeConversation]);

  useEffect(() => {
    if (!showNewChatModal) { setUserSearchQuery(''); setUserSearchResults([]); setIsSearchingUsers(false); }
  }, [showNewChatModal]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleUserSearch = useCallback(async (val: string) => {
    setUserSearchQuery(val);
    if (!val.trim()) { setUserSearchResults([]); setIsSearchingUsers(false); return; }
    setIsSearchingUsers(true);
    try {
      const { data } = await api.get(`${userSearchEndpoint}?search=${encodeURIComponent(val)}&limit=20`);
      setUserSearchResults(data.data || []);
    } catch { setUserSearchResults([]); }
    setIsSearchingUsers(false);
  }, [userSearchEndpoint]);

  const startConversation = async (targetUser: any) => {
    await setActiveConversation(targetUser.id);
    setShowNewChatModal(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setIsSearchingUsers(false);
  };

  const activeUser = conversations.find(c => c.id === activeConversation);
  const isOnline = activeUser ? onlineUsers.has(activeUser.id) : false;
  const isTyping = activeUser ? typingUsers.has(activeUser.id) : false;

  const filtered = conversations.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || c.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredMessages = msgSearch
    ? messages.filter(m => m.content.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages;

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-amber-300 dark:bg-amber-600/40 rounded px-0.5">{part}</mark>
        : part
    );
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !activeConversation) return;
    let finalContent = content;
    if (quoteMsg) finalContent = `> ${quoteMsg.content}\n\n${content}`;
    await sendMessage(activeConversation, finalContent);
    setInput('');
    setQuoteMsg(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (activeConversation) {
      emitTyping(activeConversation, true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => emitTyping(activeConversation, false), 1500);
    }
  };

  const handleDelete = async (msgId: string) => {
    await deleteMessage(msgId);
    setDeleteTarget(null);
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversation(convId);
    setMsgSearch('');
    setQuoteMsg(null);
    setShowScrollBtn(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const insertEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const msgVariants = {
    initial: { opacity: 0, y: 12, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
      </div>

      <GlassCard className="flex-1 flex overflow-hidden" hover={false}>
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search conversations..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {showNewChat && (
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="w-9 h-9 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 flex items-center justify-center transition-colors flex-shrink-0"
                  title="New conversation"
                >
                  <PlusCircle className="w-5 h-5 text-primary-500" />
                </button>
              )}
            </div>
            {showRoleFilter && (
              <div className="flex gap-1">
                {roleTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = roleFilter === tab.filter;
                  return (
                    <button
                      key={tab.filter}
                      onClick={() => setRoleFilter(tab.filter)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      <Icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
            {unreadTotal > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read ({unreadTotal})
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && !isLoading && (
              <div className="p-6 text-center text-gray-500 text-sm">
                {search || roleFilter ? 'No matching conversations' : 'No conversations yet'}
              </div>
            )}
            {filtered.map(conv => {
              const convOnline = onlineUsers.has(conv.id);
              const isActive = activeConversation === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left border-b border-gray-50 dark:border-gray-800/30 ${isActive ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
                      {conv.avatar ? (
                        <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-gray-500">{conv.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    {convOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{highlightText(conv.name, search)}</div>
                      {conv.last_message_at && (
                        <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">{formatConversationTime(conv.last_message_at)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="text-xs text-gray-500 truncate flex-1">
                        {conv.last_message ? highlightText(conv.last_message, search) : <span className="italic opacity-60">No messages yet</span>}
                      </div>
                      {(conv.unread_count || 0) > 0 && (
                        <span className="min-w-[20px] h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 flex-shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium capitalize ${conv.role === 'admin' ? 'text-purple-500' : conv.role === 'instructor' ? 'text-cyan-500' : 'text-gray-400'}`}>{conv.role}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900/20 min-w-0 relative">
          {activeConversation && activeUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
                    {activeUser.avatar ? (
                      <img src={activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-500">{activeUser.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{activeUser.name}</div>
                  <div className="text-xs">
                    {isTyping ? (
                      <span className="text-primary-500">typing...</span>
                    ) : isOnline ? (
                      <span className="text-success-500">Online</span>
                    ) : (
                      <span className="text-gray-400">Offline</span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text" placeholder="Search in chat..." value={msgSearch}
                    onChange={(e) => setMsgSearch(e.target.value)}
                    className="w-40 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {msgSearch && (
                    <button onClick={() => setMsgSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
                <AnimatePresence initial={false}>
                  {filteredMessages.length === 0 && msgSearch && (
                    <div className="text-center text-sm text-gray-400 py-8">No messages match your search.</div>
                  )}
                  {filteredMessages.length === 0 && !msgSearch && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-sm font-medium">Start chatting with {activeUser.name}</p>
                      <p className="text-xs mt-1">Send your first message below.</p>
                    </div>
                  )}
                  {filteredMessages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const isQuoting = msg.content.startsWith('> ');
                    const quoteContent = isQuoting ? msg.content.split('\n\n')[0].replace('> ', '') : null;
                    const actualContent = isQuoting ? msg.content.split('\n\n').slice(1).join('\n\n') : msg.content;
                    const isGrouped = shouldGroup(filteredMessages, idx);
                    const showDate = shouldShowDateSeparator(filteredMessages, idx);

                    return (
                      <motion.div key={msg.id} variants={msgVariants} initial="initial" animate="animate" transition={{ duration: 0.2 }}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-[11px] font-medium text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                              {formatDateSeparator(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'} ${msgSearch ? 'bg-amber-50 dark:bg-amber-900/5 -mx-4 px-4 py-1' : ''}`}>
                          <div className={`relative max-w-[75%] group ${isMine ? 'order-1' : 'order-1'}`}>
                            <div
                              className={`px-4 py-2 text-sm leading-relaxed break-words shadow-sm ${
                                isMine
                                  ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                                  : 'bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md border border-gray-100 dark:border-gray-700'
                              }`}
                            >
                              {isQuoting && quoteContent && (
                                <div className={`mb-1.5 pl-3 border-l-2 ${isMine ? 'border-primary-300' : 'border-gray-300 dark:border-gray-500'}`}>
                                  <p className={`text-[11px] ${isMine ? 'text-primary-200' : 'text-gray-400'} italic truncate`}>{quoteContent}</p>
                                </div>
                              )}
                              <div>{highlightText(actualContent || msg.content, msgSearch)}</div>
                              <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
                                {!isGrouped && (
                                  <span className="text-[10px]" title={new Date(msg.created_at).toLocaleString()}>
                                    {formatMessageTime(msg.created_at)}
                                  </span>
                                )}
                                {isMine && !isGrouped && (
                                  <span className="text-[10px] ml-0.5" title={msg.is_read ? 'Read' : 'Sent'}>
                                    {msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Hover actions */}
                            {!isGrouped && (
                              <div className={`absolute top-0 ${isMine ? 'left-0 -translate-x-full pl-1' : 'right-0 translate-x-full pr-1'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5`}>
                                {!isMine && (
                                  <button
                                    onClick={() => setQuoteMsg({ id: msg.id, content: actualContent || msg.content, sender: activeUser.name })}
                                    className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                    title="Reply"
                                  >
                                    <Reply className="w-3 h-3 text-primary-500" />
                                  </button>
                                )}
                                {isMine && (
                                  <button
                                    onClick={() => setDeleteTarget(msg.id)}
                                    className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3 text-danger-500" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex justify-start mt-3">
                      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
                {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400 my-4" />}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom button */}
              {showScrollBtn && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-28 right-8 w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
                >
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                </button>
              )}

              {/* Input */}
              <div className="relative p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                {quoteMsg && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-primary-500">
                    <Reply className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-primary-600 dark:text-primary-400">Replying to {quoteMsg.sender}</p>
                      <p className="text-xs text-gray-500 truncate">{quoteMsg.content}</p>
                    </div>
                    <button onClick={() => setQuoteMsg(null)} className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-primary-500/40 transition-shadow">
                  <div className="relative" ref={emojiRef}>
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors mb-0.5">
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-xl grid grid-cols-5 gap-1 z-10">
                        {EMOJIS.map(emoji => (
                          <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg transition-colors">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 bg-transparent border-none py-1.5 text-sm resize-none focus:ring-0 outline-none max-h-32 scrollbar-thin"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center transition-colors flex-shrink-0 mb-0.5"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center px-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/20 dark:to-cyan-900/20 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-primary-500/60" />
                </div>
                <p className="text-base font-medium text-gray-600 dark:text-gray-300">Your Messages</p>
                <p className="text-sm mt-1 text-gray-400">Select a conversation from the sidebar<br />or start a new one.</p>
                {showNewChat && (
                  <Button variant="outline" size="sm" className="mt-5" onClick={() => setShowNewChatModal(true)}>
                    <PlusCircle className="w-4 h-4 mr-1.5" /> New Conversation
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* New Conversation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewChatModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">New Conversation</h3>
              <button onClick={() => setShowNewChatModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Search users by name or email..." value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {isSearchingUsers && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                </div>
              )}
              {!isSearchingUsers && userSearchQuery && userSearchResults.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">No users found</p>
              )}
              {!isSearchingUsers && !userSearchQuery && (
                <p className="text-center text-sm text-gray-400 py-6">Type to search for users</p>
              )}
              {userSearchResults.map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-500">{u.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' :
                    u.role === 'instructor' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-2">Delete Message</h3>
            <p className="text-sm text-gray-500 mb-4">This will permanently delete this message. Continue?</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(deleteTarget)}>Delete</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}