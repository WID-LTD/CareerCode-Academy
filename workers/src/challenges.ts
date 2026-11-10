import type { DbClient } from './db';

// Coding-challenge model helpers (backend/src/models/codingChallenge.ts) plus
// the Piston code-runner service (backend/src/services/codeRunner.ts) and the
// small lesson/enrollment/progress/notification helpers the route needs.

export interface CodingChallenge {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  instructions: string;
  type: string;
  starter_code: string;
  test_code: string;
  expected_output: string | null;
  test_cases: any[];
  timeout_seconds: number;
  language: string;
  difficulty: string;
  submission_type: string;
  allowed_file_types: string;
  rubric: any[];
  max_file_size: number;
  created_at: string;
  updated_at: string;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  user_id: string;
  code: string;
  file_url: string | null;
  text_answer: string | null;
  passed: boolean;
  score: number | null;
  feedback: string | null;
  output: string | null;
  expected_output: string | null;
  test_results: any[] | null;
  submitted_at: string;
}

export async function getChallengesByLesson(db: DbClient, lessonId: string): Promise<CodingChallenge[]> {
  const { rows } = await db.query<CodingChallenge>(
    'SELECT * FROM coding_challenges WHERE lesson_id = $1 ORDER BY created_at ASC',
    [lessonId]
  );
  return rows;
}

export async function getChallengeById(db: DbClient, id: string): Promise<CodingChallenge | null> {
  const { rows } = await db.query<CodingChallenge>(
    'SELECT * FROM coding_challenges WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function getChallengesByCourse(db: DbClient, courseId: string): Promise<CodingChallenge[]> {
  const { rows } = await db.query<CodingChallenge>(
    `SELECT cc.* FROM coding_challenges cc
     JOIN lessons l ON cc.lesson_id = l.id
     WHERE l.course_id = $1
     ORDER BY l.order_index, cc.created_at`,
    [courseId]
  );
  return rows;
}

export async function createChallenge(db: DbClient, input: {
  lesson_id: string;
  title: string;
  description: string;
  instructions: string;
  type?: string;
  starter_code?: string;
  test_code?: string;
  expected_output?: string;
  test_cases?: any[];
  timeout_seconds?: number;
  language?: string;
  difficulty?: string;
  submission_type?: string;
  allowed_file_types?: string;
  rubric?: any[];
  max_file_size?: number;
}): Promise<CodingChallenge> {
  const { rows } = await db.query<CodingChallenge>(
    `INSERT INTO coding_challenges (lesson_id, title, description, instructions, type, starter_code, test_code, expected_output, test_cases, timeout_seconds, language, difficulty, submission_type, allowed_file_types, rubric, max_file_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      input.lesson_id, input.title, input.description, input.instructions,
      input.type || 'code',
      input.starter_code || '', input.test_code || '',
      input.expected_output || null, JSON.stringify(input.test_cases || []),
      input.timeout_seconds || 5, input.language || 'javascript', input.difficulty || 'easy',
      input.submission_type || '', input.allowed_file_types || '', JSON.stringify(input.rubric || []),
      input.max_file_size || 10,
    ]
  );
  return rows[0];
}

const CHALLENGE_COLUMNS: Record<string, string> = {
  lessonId: 'lesson_id',
  lesson_id: 'lesson_id',
  title: 'title',
  description: 'description',
  instructions: 'instructions',
  type: 'type',
  starterCode: 'starter_code',
  starter_code: 'starter_code',
  testCode: 'test_code',
  test_code: 'test_code',
  expectedOutput: 'expected_output',
  expected_output: 'expected_output',
  testCases: 'test_cases',
  test_cases: 'test_cases',
  timeoutSeconds: 'timeout_seconds',
  timeout_seconds: 'timeout_seconds',
  language: 'language',
  difficulty: 'difficulty',
  submissionType: 'submission_type',
  submission_type: 'submission_type',
  allowedFileTypes: 'allowed_file_types',
  allowed_file_types: 'allowed_file_types',
  rubric: 'rubric',
  maxFileSize: 'max_file_size',
  max_file_size: 'max_file_size',
};

function snakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export async function updateChallenge(db: DbClient, id: string, input: Record<string, any>): Promise<CodingChallenge | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined) continue;
    const col = CHALLENGE_COLUMNS[key] || CHALLENGE_COLUMNS[snakeKey(key)];
    if (!col) continue;
    fields.push(`${col} = $${values.length + 1}`);
    values.push(col === 'test_cases' || col === 'rubric' ? JSON.stringify(value) : value);
  }

  if (fields.length === 0) return null;
  values.push(id);
  const { rows } = await db.query<CodingChallenge>(
    `UPDATE coding_challenges SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteChallenge(db: DbClient, id: string): Promise<boolean> {
  const { rows } = await db.query('DELETE FROM coding_challenges WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

export async function submitChallenge(db: DbClient, input: {
  challenge_id: string;
  user_id: string;
  code?: string;
  file_url?: string;
  text_answer?: string;
  passed: boolean;
  score?: number;
  output?: string;
  expected_output?: string;
  test_results?: any[];
}): Promise<ChallengeSubmission> {
  const { rows } = await db.query<ChallengeSubmission>(
    `INSERT INTO challenge_submissions (challenge_id, user_id, code, file_url, text_answer, passed, score, output, expected_output, test_results)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.challenge_id, input.user_id, input.code || '',
      input.file_url || null, input.text_answer || null, input.passed,
      input.score || null, input.output || null, input.expected_output || null,
      JSON.stringify(input.test_results || []),
    ]
  );
  return rows[0];
}

export async function getSubmissionByUserAndChallenge(
  db: DbClient,
  userId: string,
  challengeId: string
): Promise<ChallengeSubmission | null> {
  const { rows } = await db.query<ChallengeSubmission>(
    'SELECT * FROM challenge_submissions WHERE user_id = $1 AND challenge_id = $2 ORDER BY submitted_at DESC LIMIT 1',
    [userId, challengeId]
  );
  return rows[0] || null;
}

export async function getSubmissionsByChallenge(db: DbClient, challengeId: string): Promise<any[]> {
  const { rows } = await db.query<any>(
    `SELECT cs.*, u.name as user_name, u.email as user_email
     FROM challenge_submissions cs
     JOIN users u ON cs.user_id = u.id
     WHERE cs.challenge_id = $1
     ORDER BY cs.submitted_at DESC`,
    [challengeId]
  );
  return rows;
}

export async function gradeChallengeSubmission(
  db: DbClient,
  id: string,
  score: number,
  feedback?: string
): Promise<ChallengeSubmission | null> {
  const { rows } = await db.query<ChallengeSubmission>(
    'UPDATE challenge_submissions SET score = $1, feedback = $2 WHERE id = $3 RETURNING *',
    [score, feedback || null, id]
  );
  return rows[0] || null;
}

// ── Small supporting lookups / side effects ──────────────────────────────

export async function getLessonById(db: DbClient, id: string): Promise<any | null> {
  const { rows } = await db.query<any>('SELECT * FROM lessons WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getEnrollment(db: DbClient, userId: string, courseId: string): Promise<any | null> {
  const { rows } = await db.query<any>(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}

// Ported from backend/src/models/progress.ts upsertLessonProgress().
export async function upsertLessonProgress(
  db: DbClient,
  userId: string,
  lessonId: string,
  courseId: string,
  completed: boolean,
  watchPosition?: number,
  watchPercentage?: number
): Promise<any> {
  const { rows } = await db.query<any>(
    `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, watch_position, watch_percentage)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, lesson_id)
     DO UPDATE SET
       completed = COALESCE($4, lesson_progress.completed),
       watch_position = COALESCE($5, lesson_progress.watch_position),
       watch_percentage = COALESCE($6, lesson_progress.watch_percentage),
       completed_at = CASE WHEN $4 = true AND lesson_progress.completed = false THEN NOW() ELSE lesson_progress.completed_at END,
       updated_at = NOW()
     RETURNING *`,
    [userId, lessonId, courseId, completed, watchPosition ?? 0, watchPercentage ?? 0]
  );
  return rows[0];
}

export async function createNotification(db: DbClient, input: {
  user_id: string;
  title: string;
  message: string;
  type?: string;
}): Promise<any> {
  const { rows } = await db.query<any>(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.user_id, input.title, input.message, input.type || 'info']
  );
  return rows[0];
}

// ── Code runner (Piston) ─────────────────────────────────────────────────

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

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
    return {
      language: lang === 'js' ? 'javascript'
        : lang === 'py' ? 'python'
        : lang === 'rs' ? 'rust'
        : lang === 'rb' ? 'ruby'
        : lang === 'cs' ? 'csharp'
        : lang === 'ts' ? 'typescript'
        : lang,
      version,
    };
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
      }),
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

export interface TestCase {
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
