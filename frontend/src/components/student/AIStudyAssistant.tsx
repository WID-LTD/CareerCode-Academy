import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, Sparkles, Bot, User,
  Loader2, BookOpen, HelpCircle, FileText, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const quickActions = [
  { label: 'Summarize', icon: FileText, prompt: 'Summarize my current lesson' },
  { label: 'Explain', icon: HelpCircle, prompt: 'Explain this concept simply' },
  { label: 'Quiz Me', icon: ListChecks, prompt: 'Generate a quick quiz' },
  { label: 'Study Plan', icon: BookOpen, prompt: 'Create a study plan for me' },
];

const welcomeMessage: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm your AI study assistant. I can help you understand concepts, create quizzes, summarize lessons, and build study plans. What would you like help with?",
};

export function AIStudyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const responses: Record<string, string> = {
      summarize: "Here's a summary of your current lesson:\n\n**Key Points:**\n1. Core concepts and fundamentals covered\n2. Practical examples demonstrated\n3. Best practices and common patterns\n4. Next steps for deeper learning\n\nWould you like me to elaborate on any section?",
      explain: "Let me break this down simply:\n\nThink of it like building blocks. Each concept builds on the previous one. The main idea is to **understand the relationship** between components and how they work together.\n\nDoes that help? Would you like a more detailed explanation?",
      quiz: "Here's a quick quiz:\n\n1. What is the primary purpose of this concept?\n   a) Data management\n   b) User interface\n   c) Performance optimization\n   d) All of the above\n\n2. Which pattern is most commonly used?\n   a) Singleton\n   b) Observer\n   c) Factory\n   d) Decorator\n\nReply with your answers!",
      plan: "Here's a personalized study plan:\n\n**Week 1:** Foundation & Basics\n- Complete core modules\n- Practice exercises daily\n\n**Week 2:** Intermediate Concepts\n- Build a small project\n- Review community examples\n\n**Week 3:** Advanced Topics\n- Deep dive into complex patterns\n- Contribute to open source\n\n**Week 4:** Mastery\n- Build a portfolio project\n- Teach others to solidify knowledge",
    };

    const lower = content.toLowerCase();
    let reply: string;
    if (lower.includes('summar')) {
      reply = responses.summarize;
    } else if (lower.includes('explain')) {
      reply = responses.explain;
    } else if (lower.includes('quiz')) {
      reply = responses.quiz;
    } else if (lower.includes('plan')) {
      reply = responses.plan;
    } else {
      reply = `Great question about "${content}"!\n\nBased on your learning history and current courses, here's what I recommend:\n\n1. **Review the core concepts** in your current lesson\n2. **Practice with the exercises** provided\n3. **Check the community forum** for discussions\n4. **Try the hands-on project** to solidify understanding\n\nWould you like me to dive deeper into any specific aspect?`;
    }

    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setIsTyping(false);
  };

  return (
    <>
      {/* FAB Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl gradient-bg text-white shadow-xl shadow-primary-500/30 flex items-center justify-center hover:shadow-primary-500/50 transition-shadow lg:bottom-8 lg:right-8"
        aria-label="Open AI Study Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-20 right-4 lg:bottom-24 lg:right-8 z-50 w-[360px] sm:w-[400px] h-[560px] max-h-[80vh] glass-card flex flex-col overflow-hidden shadow-2xl"
              role="dialog"
              aria-label="AI Study Assistant"
            >
              {/* Header */}
              <div className="gradient-bg px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-white" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">AI Study Assistant</h3>
                    <p className="text-[10px] text-white/70">Powered by CareerCode AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                  aria-label="Close assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary-500 text-white rounded-tr-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                    )}>
                      {msg.content.split('\n').map((line, j) => (
                        <p key={j} className={line.startsWith('**') && line.endsWith('**') ? 'font-semibold mt-2 first:mt-0' : 'mt-1 first:mt-0'}>
                          {line.replace(/\*\*/g, '')}
                        </p>
                      ))}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide flex-shrink-0">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <action.icon className="w-3 h-3" />
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-500/30 border border-transparent focus:border-primary-500/50"
                    aria-label="Type your question"
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isTyping}
                    className="w-10 h-10 rounded-xl gradient-bg text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary-500/30 transition-all flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
