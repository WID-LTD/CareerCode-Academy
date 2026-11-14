import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, Smile, Reply, MoreVertical, Pencil, Trash2, Pin, MessageSquare, FileText, Image as ImageIcon, Hash } from 'lucide-react';
import { useCommunityStore, ChannelMessage } from '@/store/communityStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { ReactionPicker } from './ReactionPicker';

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shouldShowDateSeparator(messages: ChannelMessage[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].created_at);
  const prev = new Date(messages[index - 1].created_at);
  return curr.toDateString() !== prev.toDateString();
}

function shouldGroup(messages: ChannelMessage[], index: number): boolean {
  if (index === 0) return false;
  const curr = messages[index];
  const prev = messages[index - 1];
  return (
    curr.author_id === prev.author_id &&
    !prev.deleted &&
    new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < 300000
  );
}

function DateSeparator({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);

  let label = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (diffDays === 0) label = 'Today';
  if (diffDays === 1) label = 'Yesterday';

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-700/50" />
      <span className="text-[11px] font-medium text-gray-500 bg-gray-900/50 px-2">{label}</span>
      <div className="flex-1 h-px bg-gray-700/50" />
    </div>
  );
}

function MessageBubble({ message, isGrouped }: { message: ChannelMessage; isGrouped: boolean }) {
  const { user } = useAuthStore();
  const { editMessage, deleteMessage, addReaction, removeReaction, fetchThread, activeChannel } = useCommunityStore();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const currentUserId = user?.id;

  const isOwn = message.author_id === currentUserId;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const canDelete = isOwn || isAdmin;

  const handleSaveEdit = async () => {
    if (editContent.trim() && activeChannel) {
      await editMessage(activeChannel.id, message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (activeChannel && confirm('Delete this message?')) {
      await deleteMessage(activeChannel.id, message.id);
    }
  };

  const toggleReaction = (emoji: string) => {
    const existing = message.reactions?.find((r) => r.emoji === emoji && r.user_ids.includes(currentUserId || ''));
    if (existing) {
      removeReaction(message.id, emoji);
    } else {
      addReaction(message.id, emoji);
    }
  };

  const roleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'bg-red-500/20 text-red-400';
      case 'instructor':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-primary-500/20 text-primary-400';
    }
  };

  if (message.deleted) {
    return (
      <div className={cn('px-4', isGrouped ? 'py-0.5' : 'pt-2')}>
        <p className="text-sm text-gray-500 italic">This message was deleted</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative px-4 hover:bg-gray-800/30 transition-colors flex',
        isOwn ? 'justify-end' : 'justify-start',
        isGrouped ? 'py-0.5' : 'pt-3 pb-1'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      {/* Hover actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-3 right-4 flex items-center bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10"
          >
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              title="Add reaction"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchThread(message.id)}
              className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              title="Reply in thread"
            >
              <Reply className="w-4 h-4" />
            </button>
            {isOwn && message.can_edit !== false && (
              <button
                onClick={() => { setIsEditing(true); setEditContent(message.content); }}
                className="p-1.5 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction picker */}
      {showReactionPicker && (
        <div className="absolute -top-2 right-16 z-20">
          <ReactionPicker
            onSelect={(emoji) => { toggleReaction(emoji); setShowReactionPicker(false); }}
            onClose={() => setShowReactionPicker(false)}
          />
        </div>
      )}

      {/* Avatar (only for non-grouped messages) */}
      {!isGrouped && (
        <div className={cn('flex items-start gap-3 max-w-[85%]', isOwn && 'flex-row-reverse')}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
            {message.author_avatar ? (
              <img src={message.author_avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              (message.author_name || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm text-gray-200">{message.author_name}</span>
              {message.author_role && message.author_role !== 'student' && (
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', roleBadgeColor(message.author_role))}>
                  {message.author_role.toUpperCase()}
                </span>
              )}
              <span className="text-[11px] text-gray-500">{formatMessageTime(message.created_at)}</span>
              {message.edited && <span className="text-[11px] text-gray-500 italic">(edited)</span>}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="mt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-primary-500/50"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 mt-1">
                  <button onClick={handleSaveEdit} className="text-xs px-2 py-1 bg-primary-500 rounded text-white">Save</button>
                  <button onClick={() => setIsEditing(false)} className="text-xs px-2 py-1 text-gray-400 hover:text-gray-200">Cancel</button>
                </div>
              </div>
            ) : (
              <p className={cn('text-sm whitespace-pre-wrap break-words inline-block rounded-xl px-3 py-2', isOwn ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-200')}>{message.content}</p>
            )}

            {/* Attachment */}
            {message.attachment_url && (
              <div className="mt-2">
                {message.attachment_type?.startsWith('image/') ? (
                  <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                    <img src={message.attachment_url} alt={message.attachment_name || ''} className="max-w-xs max-h-48 rounded-lg border border-gray-700" />
                  </a>
                ) : (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-primary-400" />
                    <span className="text-sm text-gray-300 truncate">{message.attachment_name}</span>
                  </a>
                )}
              </div>
            )}

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {message.reactions.map((reaction) => {
                  const hasReacted = reaction.user_ids.includes(currentUserId || '');
                  return (
                    <button
                      key={reaction.emoji}
                      onClick={() => toggleReaction(reaction.emoji)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                        hasReacted
                          ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                          : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      <span>{reaction.emoji}</span>
                      <span>{reaction.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Read receipt for your own messages */}
            {isOwn && typeof message.read_percent === 'number' && (
              <p className="text-[10px] text-gray-500 mt-1">
                {message.read_percent >= 100 ? 'Read by everyone' : `${message.read_percent}% read`}
              </p>
            )}

            {/* Thread indicator */}
            {message.thread_count > 0 && (
              <button
                onClick={() => fetchThread(message.id)}
                className="flex items-center gap-1.5 mt-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grouped message (only content) */}
      {isGrouped && (
        <div className={cn(isOwn ? 'mr-[52px]' : 'ml-[52px]')}>
          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-primary-500/50"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button onClick={handleSaveEdit} className="text-xs px-2 py-1 bg-primary-500 rounded text-white">Save</button>
                <button onClick={() => setIsEditing(false)} className="text-xs px-2 py-1 text-gray-400 hover:text-gray-200">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className={cn('text-sm whitespace-pre-wrap break-words inline-block rounded-xl px-3 py-2', isOwn ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-200')}>{message.content}</p>
              {message.attachment_url && (
                <div className="mt-1">
                  {message.attachment_type?.startsWith('image/') ? (
                    <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                      <img src={message.attachment_url} alt="" className="max-w-xs max-h-48 rounded-lg border border-gray-700" />
                    </a>
                  ) : (
                    <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800 transition-colors">
                      <FileText className="w-4 h-4 text-primary-400" />
                      <span className="text-sm text-gray-300 truncate">{message.attachment_name}</span>
                    </a>
                  )}
                </div>
              )}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {message.reactions.map((reaction) => {
                    const hasReacted = reaction.user_ids.includes(currentUserId || '');
                    return (
                      <button
                        key={reaction.emoji}
                        onClick={() => toggleReaction(reaction.emoji)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                          hasReacted ? 'bg-primary-500/20 border-primary-500/50 text-primary-400' : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                        )}
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {message.thread_count > 0 && (
                <button onClick={() => fetchThread(message.id)} className="flex items-center gap-1.5 mt-1 text-xs text-primary-400 hover:text-primary-300 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {message.thread_count} replies
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageFeed() {
  const { messages, activeChannel, isLoading, typingUsers, fetchMessages } = useCommunityStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const channelTypers = typingUsers.get(activeChannel?.id || '') || new Set();
  const typingNames = Array.from(channelTypers).filter((id) => id !== user?.id);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    if (!activeChannel) return;
    const timer = window.setInterval(() => fetchMessages(activeChannel.id), 8000);
    return () => window.clearInterval(timer);
  }, [activeChannel?.id]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);

    // Load more on scroll to top
    if (scrollTop === 0 && messages.length > 0) {
      const oldest = messages[0];
      if (activeChannel) {
        fetchMessages(activeChannel.id);
      }
    }
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Select a channel</h3>
          <p className="text-sm text-gray-500">Choose a channel from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Channel Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <h3 className="font-semibold text-gray-200 truncate">{activeChannel.name}</h3>
          {activeChannel.description && (
            <span className="text-sm text-gray-500 truncate hidden sm:inline">— {activeChannel.description}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{activeChannel.member_count} members</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Hash className="w-12 h-12 text-gray-600 mb-3" />
            <h4 className="text-lg font-semibold text-gray-400 mb-1">Welcome to #{activeChannel.name}</h4>
            <p className="text-sm text-gray-500">This is the start of the conversation.</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={msg.id}>
                {shouldShowDateSeparator(messages, i) && <DateSeparator dateStr={msg.created_at} />}
                <MessageBubble message={msg} isGrouped={shouldGroup(messages, i)} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-4 py-1 text-xs text-gray-400 flex-shrink-0">
          <span className="inline-flex items-center gap-1">
            {typingNames.length === 1 ? 'Someone is typing' : `${typingNames.length} people are typing`}
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </span>
        </div>
      )}

      {/* Composer */}
      <MessageComposer />
    </div>
  );
}

function MessageComposer() {
  const { activeChannel, sendMessage, socket } = useCommunityStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSend = async () => {
    if (!input.trim() || !activeChannel || sending) return;
    setSending(true);
    await sendMessage(activeChannel.id, input.trim(), file || undefined);
    setInput('');
    setFile(null);
    setSending(false);
    // Stop typing
    socket?.emit('community:typing', { channelId: activeChannel.id, isTyping: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (value: string) => {
    setInput(value);
    // Emit typing
    if (activeChannel && socket) {
      socket.emit('community:typing', { channelId: activeChannel.id, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('community:typing', { channelId: activeChannel.id, isTyping: false });
      }, 2000);
    }
  };

  if (!activeChannel) return null;

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        {file && (
          <div className="px-3 py-2 border-b border-gray-700/50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-gray-300 truncate flex-1">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept="image/*,.pdf,.doc,.docx,.txt,.js,.ts,.jsx,.tsx,.py,.json,.css,.html"
          />
          <textarea
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${activeChannel.name}`}
            className="flex-1 bg-transparent px-0 py-3 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none max-h-32"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              'p-3 transition-colors flex-shrink-0',
              input.trim() ? 'text-primary-400 hover:text-primary-300' : 'text-gray-600'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
