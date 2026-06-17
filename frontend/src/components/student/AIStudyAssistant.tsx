import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, Sparkles, Bot, User,
  Loader2, BookOpen, HelpCircle, FileText, ListChecks,
  Mic, MicOff, Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

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

const WELCOME_KEY = 'ai_assistant_welcome';
const welcomeMessage: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm your AI study assistant. I can help you understand concepts, create quizzes, summarize lessons, and build study plans. What would you like help with?",
};

function renderMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-gray-950 dark:bg-gray-950 text-xs rounded-lg p-3 my-2 overflow-x-auto text-green-400 font-mono leading-relaxed">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      return;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (line.trim() === '') {
      elements.push(<div key={`space-${i}`} className="h-2" />);
      return;
    }

    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={i} className="font-semibold mt-2 first:mt-0">{line.replace(/\*\*/g, '')}</p>);
      return;
    }

    let formattedLine = line;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match: RegExpExecArray | null;

    const tempMatches: { start: number; end: number; text: string }[] = [];
    while ((match = boldRegex.exec(formattedLine)) !== null) {
      tempMatches.push({ start: match.index, end: match.index + match[0].length, text: match[1] });
    }

    if (tempMatches.length > 0) {
      let idx = 0;
      tempMatches.forEach((m, mi) => {
        if (m.start > idx) parts.push(<span key={`${i}-t${mi}`}>{formattedLine.slice(idx, m.start)}</span>);
        parts.push(<strong key={`${i}-b${mi}`}>{m.text}</strong>);
        idx = m.end;
      });
      if (idx < formattedLine.length) parts.push(<span key={`${i}-e`}>{formattedLine.slice(idx)}</span>);
    } else {
      parts.push(<span key={i}>{formattedLine}</span>);
    }

    elements.push(<p key={i} className="mt-1 first:mt-0">{parts}</p>);
  });

  return elements;
}

function TypewriterText({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <>{renderMarkdown(displayed)}</>;
}

export function AIStudyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_history');
      return saved ? JSON.parse(saved) : [welcomeMessage];
    } catch {
      return [welcomeMessage];
    }
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [typewriterKey, setTypewriterKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const location = useLocation();

  // Persist chat history
  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Get context from current page
  const getContext = useCallback(() => {
    const path = location.pathname;
    if (path.includes('/course/') || path.includes('/courses/')) {
      const titleEl = document.querySelector('h1');
      return `The student is currently viewing a course: "${titleEl?.textContent || 'Unknown Course'}".`;
    }
    if (path.includes('/challenge')) {
      return 'The student is looking at coding challenges.';
    }
    return '';
  }, [location.pathname]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: content.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const context = getContext();
      const payload = context
        ? { messages: updatedMessages, context }
        : { messages: updatedMessages };
      const { data } = await api.post('/student/ai/chat', payload);
      if (data.success && data.data) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.content }]);
        setTypewriterKey(k => k + 1);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error in AI assistant:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while communicating with the AI service. Please try again.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      setTimeout(() => handleSend(transcript), 200);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setMessages([welcomeMessage]);
                      localStorage.removeItem('ai_chat_history');
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                    title="Clear chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                    aria-label="Close assistant"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
                      {msg.role === 'assistant' && i === messages.length - 1 && !isTyping
                        ? <TypewriterText text={msg.content} key={typewriterKey} />
                        : renderMarkdown(msg.content)}
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
                  <button
                    onClick={toggleVoice}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                      isListening
                        ? 'bg-danger-500 text-white animate-pulse'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    aria-label="Voice input"
                    title={isListening ? 'Listening...' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
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
