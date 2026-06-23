const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

interface PistonFile {
  content: string;
  name?: string;
}

interface PistonRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  compile_timeout?: number;
  run_timeout?: number;
}

interface PistonRunResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number;
  signal: string | null;
}

interface PistonResponse {
  run: PistonRunResult;
  compile?: PistonRunResult;
  language: string;
  version: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  javascript: '18',
  js: '18',
  python: '3.10.0',
  py: '3.10.0',
  java: '15.0.2',
  cpp: '10.2.0',
  'c++': '10.2.0',
  c: '10.2.0',
  go: '1.22.2',
  rust: '1.80.0',
  rs: '1.80.0',
  typescript: '5.4.5',
  ts: '5.4.5',
  ruby: '3.3.0',
  rb: '3.3.0',
  php: '8.3.6',
  swift: '5.9.0',
  kotlin: '1.9.22',
  r: '4.3.3',
  dart: '3.2.6',
  csharp: '6.12.0',
  cs: '6.12.0',
  scala: '3.4.1',
  perl: '5.38.2',
  haskell: '9.4.8',
  lua: '5.4.6',
  bash: '5.2.26',
  sqlite3: '3.40.1',
};

function resolveLanguage(language: string): { language: string; version: string } {
  const lang = language.toLowerCase().trim();
  const version = LANGUAGE_MAP[lang];
  if (version) {
    return { language: lang === 'js' ? 'javascript' : lang === 'py' ? 'python' : lang === 'rs' ? 'rust' : lang === 'rb' ? 'ruby' : lang === 'cs' ? 'csharp' : lang === 'ts' ? 'typescript' : lang, version };
  }
  return { language: lang, version: '*' };
}

export async function runCode(code: string, language: string, stdin?: string): Promise<{
  output: string;
  error: string | null;
  exitCode: number;
  success: boolean;
}> {
  const { language: resolvedLang, version } = resolveLanguage(language);

  try {
    const response = await fetch(PISTON_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: resolvedLang,
        version,
        files: [{ content: code }],
        stdin: stdin || '',
        compile_timeout: 10000,
        run_timeout: 5000,
      } as PistonRequest),
    });

    if (!response.ok) {
      const text = await response.text();
      return { output: '', error: `Execution service error: ${response.status} ${text}`, exitCode: 1, success: false };
    }

    const data = await response.json() as PistonResponse;

    if (data.compile && data.compile.code !== 0) {
      return {
        output: data.compile.stdout || '',
        error: data.compile.stderr || 'Compilation failed',
        exitCode: data.compile.code,
        success: false,
      };
    }

    const run = data.run;
    return {
      output: run.stdout || '',
      error: run.stderr || null,
      exitCode: run.code,
      success: run.code === 0,
    };
  } catch (error: any) {
    return {
      output: '',
      error: error?.message || 'Failed to execute code',
      exitCode: 1,
      success: false,
    };
  }
}

interface TestCase {
  input: string;
  expected: string;
}

export interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export async function runWithTestCases(
  code: string,
  language: string,
  testCases: TestCase[]
): Promise<{ testResults: TestResult[]; allPassed: boolean }> {
  const testResults: TestResult[] = [];

  for (const tc of testCases) {
    const result = await runCode(code, language, tc.input);
    const actual = result.output.trim();
    const expected = tc.expected.trim();
    testResults.push({
      input: tc.input,
      expected,
      actual,
      passed: actual === expected && result.success,
    });
  }

  return {
    testResults,
    allPassed: testResults.every((t) => t.passed),
  };
}

export async function runWithExpectedOutput(
  code: string,
  language: string,
  expectedOutput: string
): Promise<{ output: string; passed: boolean; error: string | null }> {
  const result = await runCode(code, language);
  const actualOutput = result.output.trim();
  const expected = expectedOutput.trim();

  return {
    output: actualOutput,
    passed: actualOutput === expected && result.success,
    error: result.error,
  };
}

export function getSupportedLanguages(): Array<{ id: string; name: string; monacoId: string }> {
  return [
    { id: 'javascript', name: 'JavaScript', monacoId: 'javascript' },
    { id: 'python', name: 'Python', monacoId: 'python' },
    { id: 'java', name: 'Java', monacoId: 'java' },
    { id: 'cpp', name: 'C++', monacoId: 'cpp' },
    { id: 'c', name: 'C', monacoId: 'c' },
    { id: 'go', name: 'Go', monacoId: 'go' },
    { id: 'rust', name: 'Rust', monacoId: 'rust' },
    { id: 'typescript', name: 'TypeScript', monacoId: 'typescript' },
    { id: 'ruby', name: 'Ruby', monacoId: 'ruby' },
    { id: 'php', name: 'PHP', monacoId: 'php' },
    { id: 'swift', name: 'Swift', monacoId: 'swift' },
    { id: 'kotlin', name: 'Kotlin', monacoId: 'kotlin' },
    { id: 'r', name: 'R', monacoId: 'r' },
    { id: 'dart', name: 'Dart', monacoId: 'dart' },
    { id: 'csharp', name: 'C#', monacoId: 'csharp' },
    { id: 'scala', name: 'Scala', monacoId: 'scala' },
    { id: 'perl', name: 'Perl', monacoId: 'perl' },
    { id: 'haskell', name: 'Haskell', monacoId: 'haskell' },
    { id: 'lua', name: 'Lua', monacoId: 'lua' },
    { id: 'bash', name: 'Bash', monacoId: 'shell' },
    { id: 'sqlite3', name: 'SQLite', monacoId: 'sql' },
  ];
}
