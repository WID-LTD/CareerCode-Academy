import { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Play, RotateCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface CodeEditorProps {
  starterCode?: string;
  language?: string;
  challengeId?: string;
  onSubmit?: (code: string) => Promise<{ passed: boolean; output?: string }>;
  readOnly?: boolean;
  initialCode?: string;
}

export default function CodeEditor({
  starterCode = '',
  language = 'javascript',
  challengeId: _challengeId,
  onSubmit,
  readOnly = false,
  initialCode,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [code, setCode] = useState(initialCode || starterCode);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; output?: string } | null>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleRun = async () => {
    if (!onSubmit) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await onSubmit(code);
      setResult(res);
    } catch {
      setResult({ passed: false, output: 'Error running code' });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setCode(starterCode);
    setResult(null);
  };

  return (
    <div className="space-y-3">
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/50 border-b border-gray-800">
          <span className="text-xs text-gray-500 uppercase">{language}</span>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-white transition-colors"
                title="Reset code"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <Button size="sm" onClick={handleRun} disabled={running}>
                {running ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Running</>
                ) : (
                  <><Play className="w-3.5 h-3.5 mr-1" /> Run</>
                )}
              </Button>
            </div>
          )}
        </div>
        <Editor
          height="250px"
          language={language}
          value={code}
          onChange={(val) => setCode(val || '')}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            readOnly,
            theme: 'vs-dark',
            padding: { top: 8 },
          }}
        />
      </div>

      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
          result.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {result.passed ? (
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-medium">{result.passed ? 'All tests passed!' : 'Tests failed'}</p>
            {result.output && <pre className="mt-1 text-xs whitespace-pre-wrap opacity-80">{result.output}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}
