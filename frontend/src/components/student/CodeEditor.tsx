import { useRef, useState, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Play, RotateCcw, CheckCircle, XCircle, Loader2, Terminal, Bug } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

interface RunResult {
  output: string;
  error: string | null;
  exitCode: number;
  success: boolean;
}

interface SubmitResult {
  passed: boolean;
  score: number;
  output: string;
  expected_output?: string;
  testResults?: TestResult[];
}

interface CodeEditorProps {
  starterCode?: string;
  language?: string;
  challengeId?: string;
  onSubmit?: (code: string) => Promise<SubmitResult>;
  readOnly?: boolean;
  initialCode?: string;
  expectedOutput?: string;
  testCases?: TestResult[];
  showExpected?: boolean;
  mode?: 'practice' | 'challenge';
  onPass?: () => void;
}

export default function CodeEditor({
  starterCode = '',
  language = 'javascript',
  challengeId,
  onSubmit,
  readOnly = false,
  initialCode,
  expectedOutput,
  testCases: _testCases,
  showExpected = false,
  mode = 'challenge',
  onPass,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [code, setCode] = useState(initialCode || starterCode);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [practiceResult, setPracticeResult] = useState<RunResult | null>(null);

  useEffect(() => {
    setCode(initialCode || starterCode);
  }, [initialCode, starterCode]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onKeyDown((e: any) => {
      if (e.key === 'Tab') {
        const model = editor.getModel();
        if (model) {
          const position = editor.getPosition();
          if (position) {
            e.preventDefault();
            editor.executeEdits('tab', [
              { range: new (window as any).monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: '  ' }
            ]);
          }
        }
      }
    });
  };

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setPracticeResult(null);

    try {
      if (onSubmit && challengeId) {
        const res = await onSubmit(code);
        setResult(res);
        if (res.passed && onPass) onPass();
      } else {
        const { data } = await api.post('/challenges/run', { code, language });
        setPracticeResult(data.data);
      }
    } catch {
      setResult({ passed: false, score: 0, output: 'Error running code' });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setCode(starterCode);
    setResult(null);
    setPracticeResult(null);
  };

  const testResults = result?.testResults;

  return (
    <div className="space-y-3">
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/50 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase font-mono">{language}</span>
            {mode === 'challenge' && challengeId && (
              <span className="text-[10px] text-gray-600 bg-gray-800/80 px-1.5 py-0.5 rounded">Challenge</span>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
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
          height="300px"
          language={language}
          value={code}
          onChange={(val) => setCode(val || '')}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            readOnly,
            theme: 'vs-dark',
            padding: { top: 8 },
            tabSize: 2,
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            snippetSuggestions: 'inline',
            wordBasedSuggestions: 'currentDocument',
            'semanticHighlighting.enabled': true,
            renderValidationDecorations: 'editable',
          }}
        />
      </div>

      {/* Show expected output (challenge mode) */}
      {showExpected && expectedOutput && (
        <div className="p-3 rounded-xl bg-gray-800/40 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Expected Output</span>
          </div>
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{expectedOutput}</pre>
        </div>
      )}

      {/* Pass/fail result */}
      {result && (
        <div className={cn(
          'rounded-xl border text-sm overflow-hidden',
          result.passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
        )}>
          <div className={cn(
            'flex items-center gap-2 px-4 py-2.5 border-b',
            result.passed ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'
          )}>
            {result.passed ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className={cn(
              'font-medium text-sm',
              result.passed ? 'text-emerald-400' : 'text-red-400'
            )}>
              {result.passed ? 'All tests passed!' : 'Tests failed'}
            </span>
            {result.score !== undefined && (
              <span className="text-xs text-gray-500 ml-auto">{result.score}/100</span>
            )}
          </div>

          {/* Test case results */}
          {testResults && testResults.length > 0 && (
            <div className="px-4 py-2 space-y-1.5">
              {testResults.map((tr, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-2 text-xs p-2 rounded',
                  tr.passed ? 'bg-emerald-500/5' : 'bg-red-500/5'
                )}>
                  {tr.passed ? (
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                  )}
                  <span className="text-gray-500">Test {i + 1}:</span>
                  {!tr.passed && (
                    <>
                      <span className="text-gray-500">expected</span>
                      <code className="text-gray-300 font-mono">{tr.expected}</code>
                      <span className="text-gray-500">got</span>
                      <code className="text-red-400 font-mono">{tr.actual || '(empty)'}</code>
                    </>
                  )}
                  {tr.passed && <span className="text-emerald-400">Passed</span>}
                </div>
              ))}
            </div>
          )}

          {/* Output */}
          {result.output && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] text-gray-500 font-medium uppercase">Output</span>
              </div>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap bg-gray-900/50 rounded-lg p-2 max-h-32 overflow-auto">{result.output}</pre>
            </div>
          )}

          {/* Expected output comparison */}
          {result.expected_output && result.output !== result.expected_output && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <Bug className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-amber-500 font-medium uppercase">Expected</span>
              </div>
              <pre className="text-xs text-amber-300 font-mono whitespace-pre-wrap bg-amber-500/10 rounded-lg p-2 max-h-32 overflow-auto">{result.expected_output}</pre>
            </div>
          )}
        </div>
      )}

      {/* Practice mode result */}
      {practiceResult && !result && (
        <div className={cn(
          'rounded-xl border text-sm overflow-hidden',
          practiceResult.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
        )}>
          <div className={cn(
            'flex items-center gap-2 px-4 py-2.5 border-b',
            practiceResult.success ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'
          )}>
            {practiceResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className={cn(
              'font-medium text-sm',
              practiceResult.success ? 'text-emerald-400' : 'text-red-400'
            )}>
              {practiceResult.success ? 'Code executed successfully' : 'Execution error'}
            </span>
            {practiceResult.error && <span className="text-xs text-red-400 ml-auto">Exit code: {practiceResult.exitCode}</span>}
          </div>
          {practiceResult.output && (
            <div className="px-4 py-2">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap bg-gray-900/50 rounded-lg p-2 max-h-32 overflow-auto">{practiceResult.output}</pre>
            </div>
          )}
          {practiceResult.error && (
            <div className="px-4 pb-2">
              <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap bg-red-500/10 rounded-lg p-2 max-h-32 overflow-auto">{practiceResult.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
