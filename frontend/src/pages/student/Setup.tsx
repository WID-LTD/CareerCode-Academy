import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Copy, Check, ExternalLink, Loader2, Rocket, Sparkles, Terminal, Github, Database, Code2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const KEY = 'careercode-setup-progress';

const STEPS = [
  { id: 'node', title: 'Install Node.js LTS', detail: 'Download the LTS installer for your operating system and finish the setup.', command: 'node -v && npm -v', link: 'https://nodejs.org/en/download', tool: 'Node.js' },
  { id: 'vscode', title: 'Install VS Code', detail: 'Use VS Code as your editor. Install the ESLint and Prettier extensions later.', command: 'code --version', link: 'https://code.visualstudio.com/Download', tool: 'VS Code' },
  { id: 'git', title: 'Install Git', detail: 'Git tracks your work and is required for every project submission.', command: 'git --version', link: 'https://git-scm.com/downloads', tool: 'Git' },
  { id: 'github', title: 'Connect GitHub', detail: 'Create a GitHub account, then sign in with the CLI if you use it.', command: 'gh auth status', link: 'https://github.com/signup', tool: 'GitHub' },
  { id: 'mongo', title: 'Create a free MongoDB Atlas cluster', detail: 'You will need a connection string for the Express/MongoDB lessons. Never commit it.', command: 'mongosh --version', link: 'https://www.mongodb.com/cloud/atlas/register', tool: 'MongoDB Atlas' },
  { id: 'first', title: 'Run your first Node command', detail: 'Open a terminal in an empty folder and confirm Node can execute JavaScript.', command: 'node -e "console.log(\'CareerCode setup complete\')"', link: '', tool: 'Terminal' },
];

export default function StudentSetup() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [github, setGithub] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* ignore */ }
    void checkGithub();
  }, []);

  const checkGithub = async () => {
    setChecking(true);
    try { const { data } = await api.get('/course-projects/github/status'); setGithub(data.data); }
    catch { setGithub({ reachable: false, message: 'Could not check GitHub' }); }
    finally { setChecking(false); }
  };

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const copy = async (command: string) => {
    try { await navigator.clipboard.writeText(command); setCopied(command); setTimeout(() => setCopied(null), 1400); }
    catch { toast.error('Could not copy'); }
  };

  const completed = STEPS.filter((s) => done[s.id]).length;
  const percent = Math.round((completed / STEPS.length) * 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-6 sm:p-8 text-white">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-100"><Rocket className="w-3.5 h-3.5" /> First-run setup</span>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2">Get your machine ready in 20 minutes.</h1>
        <p className="text-indigo-100/90 text-sm mt-2 max-w-2xl">Work through these checks before Lesson 1. If a command fails, copy the error into GiGo or upload a screenshot — do not guess.</p>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-1"><span>{completed}/{STEPS.length} complete</span><span>{percent}%</span></div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-white transition-all" style={{ width: `${percent}%` }} /></div>
        </div>
      </div>

      <GlassCard className="p-5" hover={false}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 text-white grid place-items-center flex-shrink-0"><Github className="w-5 h-5" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">GitHub reachability</p>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${github?.reachable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{checking ? 'checking…' : github?.reachable ? 'reachable' : 'not reachable'}</span>
              <button onClick={checkGithub} className="ml-auto text-xs text-indigo-500">Refresh</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{github?.message || 'Checking GitHub from CareerCode…'}</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              {(github?.local_commands || []).map((c: any) => (
                <div key={c.command} className="rounded-lg border border-gray-200 dark:border-gray-800 p-2">
                  <code className="text-[11px] text-indigo-500 font-mono">{c.command}</code>
                  <p className="text-[10px] text-gray-500 mt-0.5">{c.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3">
        {STEPS.map((step, index) => (
          <GlassCard key={step.id} className="p-5" hover={false}>
            <div className="flex items-start gap-4">
              <button onClick={() => toggle(step.id)} className="mt-0.5 flex-shrink-0" aria-label={done[step.id] ? 'Mark incomplete' : 'Mark complete'}>
                {done[step.id] ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-gray-300 dark:text-gray-700" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-400">STEP {index + 1}</span>
                  <h3 className={`font-semibold ${done[step.id] ? 'line-through text-gray-400' : ''}`}>{step.title}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">{step.detail}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-900 px-3 py-1.5">
                    <Terminal className="w-3.5 h-3.5 text-gray-500" />
                    <code className="text-[11px] font-mono">{step.command}</code>
                    <button onClick={() => copy(step.command)} aria-label="Copy command">{copied === step.command ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}</button>
                  </div>
                  {step.link && <a href={step.link} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 inline-flex items-center gap-1">Download {step.tool} <ExternalLink className="w-3 h-3" /></a>}
                  <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt: `I am on setup step "${step.title}". My command "${step.command}" failed or I am not sure what to do. Give me a safe step-by-step fix and tell me what output you need to see.` } }))}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Ask GiGo
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}
