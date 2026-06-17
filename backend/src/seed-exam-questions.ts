import dotenv from 'dotenv';
dotenv.config();

import { query } from './config/db';

async function main() {
  try {
    // Find the Full-Stack Web Development course
    const { rows: courses } = await query(
      `SELECT id, title FROM courses WHERE title ILIKE $1 LIMIT 1`,
      ['%full-stack%']
    );

    if (courses.length === 0) {
      console.error('Full-Stack Web Development course not found. Run seed-courses.ts first.');
      process.exit(1);
    }

    const course = courses[0];
    console.log(`Found course: ${course.title} (${course.id})`);

    // Find an admin/instructor user to be the creator
    const { rows: users } = await query(
      `SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'instructor') LIMIT 1`
    );
    if (users.length === 0) {
      console.error('No admin/instructor user found. Run seed-admin.ts first.');
      process.exit(1);
    }

    // Create the exam (no schedule — students can answer anytime)
    const { rows: exams } = await query(
      `INSERT INTO exams (course_id, title, description, duration_minutes, passing_score, max_attempts, shuffle_questions, show_results, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title`,
      [
        course.id,
        'Full-Stack Web Development Certification Exam',
        'Test your knowledge of modern full-stack web development including React, Node.js, Express, TypeScript, PostgreSQL, authentication, deployment, and cloud hosting.',
        90,  // 90 minutes
        60,  // passing score 60%
        3,   // max 3 attempts
        true, // shuffle questions
        true, // show results
        true, // published
      ]
    );

    const exam = exams[0];
    console.log(`Created exam: ${exam.title} (${exam.id})`);

    // Add 20 questions (10 original + 10 new researched questions)
    const questions = [
      // ── Original 10 ──────────────────────────────────────────────
      {
        question: 'What is the primary purpose of React\'s Virtual DOM?',
        questionType: 'mcq',
        options: ['To directly manipulate the browser DOM', 'To create a lightweight representation of the DOM for efficient updates', 'To replace JavaScript entirely', 'To handle server-side rendering only'],
        correctAnswer: 'To create a lightweight representation of the DOM for efficient updates',
        points: 5,
        orderIndex: 0,
      },
      {
        question: 'Which of the following is the correct way to handle state in a functional React component?',
        questionType: 'mcq',
        options: ['this.state', 'useState() hook', 'createState() method', 'state = {} property'],
        correctAnswer: 'useState() hook',
        points: 5,
        orderIndex: 1,
      },
      {
        question: 'What does the Express.js `app.use()` function do?',
        questionType: 'mcq',
        options: ['Starts the server', 'Defines a route handler', 'Mounts middleware functions at a specified path', 'Creates a new Express application'],
        correctAnswer: 'Mounts middleware functions at a specified path',
        points: 5,
        orderIndex: 2,
      },
      {
        question: 'In TypeScript, what is the difference between `interface` and `type`?',
        questionType: 'mcq',
        options: ['They are exactly the same', 'Interfaces can be extended; types cannot', 'Types can define unions and intersections; interfaces primarily describe object shapes', 'Types are only for primitives'],
        correctAnswer: 'Types can define unions and intersections; interfaces primarily describe object shapes',
        points: 5,
        orderIndex: 3,
      },
      {
        question: 'Which PostgreSQL technique prevents SQL injection when building dynamic queries?',
        questionType: 'mcq',
        options: ['ESCAPE keyword', 'PREPARE statement', 'Parameterized queries with $1, $2 placeholders', 'SANITIZE function'],
        correctAnswer: 'Parameterized queries with $1, $2 placeholders',
        points: 5,
        orderIndex: 4,
      },
      {
        question: 'What is the purpose of JWT (JSON Web Token) in web authentication?',
        questionType: 'mcq',
        options: ['To encrypt user passwords', 'To create a stateless authentication mechanism where the server verifies a signed token', 'To store session data on the server', 'To replace cookies entirely'],
        correctAnswer: 'To create a stateless authentication mechanism where the server verifies a signed token',
        points: 5,
        orderIndex: 5,
      },
      {
        question: 'In React, what is the primary role of the `useEffect` hook?',
        questionType: 'mcq',
        options: ['To manage component state', 'To perform side effects such as data fetching, subscriptions, or DOM manipulation', 'To optimize rendering performance', 'To create context for prop drilling'],
        correctAnswer: 'To perform side effects such as data fetching, subscriptions, or DOM manipulation',
        points: 5,
        orderIndex: 6,
      },
      {
        question: 'Which HTTP status code indicates a resource was successfully created?',
        questionType: 'mcq',
        options: ['200 OK', '201 Created', '204 No Content', '301 Moved Permanently'],
        correctAnswer: '201 Created',
        points: 5,
        orderIndex: 7,
      },
      {
        question: 'Node.js uses a non-blocking I/O model. What does "non-blocking" mean?',
        questionType: 'mcq',
        options: ['The CPU never blocks execution', 'File reads and network requests do not halt subsequent code execution', 'Only one callback can run at a time', 'Errors are silently ignored'],
        correctAnswer: 'File reads and network requests do not halt subsequent code execution',
        points: 5,
        orderIndex: 8,
      },
      {
        question: 'What is the primary advantage of using environment variables (e.g., via a `.env` file)?',
        questionType: 'mcq',
        options: ['They make the application run faster', 'They keep sensitive configuration (API keys, DB credentials) out of source code', 'They are required by all web frameworks', 'They automatically encrypt all data'],
        correctAnswer: 'They keep sensitive configuration (API keys, DB credentials) out of source code',
        points: 5,
        orderIndex: 9,
      },
      // ── New researched questions ─────────────────────────────────
      {
        question: 'What is the key difference between `useCallback` and `useMemo` in React?',
        questionType: 'mcq',
        options: ['useCallback caches a function reference; useMemo caches the result of calling a function', 'useCallback is for class components; useMemo is for functional components', 'They are identical in behavior', 'useCallback caches values; useMemo caches components'],
        correctAnswer: 'useCallback caches a function reference; useMemo caches the result of calling a function',
        points: 5,
        orderIndex: 10,
      },
      {
        question: 'In React, what distinguishes a controlled component from an uncontrolled component?',
        questionType: 'mcq',
        options: ['Controlled components are faster than uncontrolled ones', 'In a controlled component, form data is handled by React state; in an uncontrolled component, the DOM itself manages the value', 'Controlled components use class syntax; uncontrolled components use hooks', 'There is no difference — the terms are interchangeable'],
        correctAnswer: 'In a controlled component, form data is handled by React state; in an uncontrolled component, the DOM itself manages the value',
        points: 5,
        orderIndex: 11,
      },
      {
        question: 'How should async errors be handled in Express.js route handlers?',
        questionType: 'mcq',
        options: ['Wrap the handler in try/catch and call next(error)', 'Express automatically catches all promise rejections', 'Use process.on(\'unhandledRejection\') only', 'Async errors are impossible in Express'],
        correctAnswer: 'Wrap the handler in try/catch and call next(error)',
        points: 5,
        orderIndex: 12,
      },
      {
        question: 'What is the primary purpose of Node.js Streams?',
        questionType: 'mcq',
        options: ['To execute code in parallel threads', 'To process data chunk-by-chunk without loading the entire dataset into memory', 'To replace the HTTP module', 'To implement real-time communication only'],
        correctAnswer: 'To process data chunk-by-chunk without loading the entire dataset into memory',
        points: 5,
        orderIndex: 13,
      },
      {
        question: 'What is the purpose of generic constraints (e.g., `T extends HasLength`) in TypeScript?',
        questionType: 'mcq',
        options: ['They make the code run faster', 'They restrict a generic type parameter to types that satisfy a certain shape', 'They disable type checking for the generic', 'They are only used for class decorators'],
        correctAnswer: 'They restrict a generic type parameter to types that satisfy a certain shape',
        points: 5,
        orderIndex: 14,
      },
      {
        question: 'What does the TypeScript utility type `Partial<T>` do?',
        questionType: 'mcq',
        options: ['Removes all properties from T', 'Makes all properties of T optional', 'Makes all properties of T required', 'Picks a subset of properties from T'],
        correctAnswer: 'Makes all properties of T optional',
        points: 5,
        orderIndex: 15,
      },
      {
        question: 'What is the key behavioral difference between `INNER JOIN` and `LEFT JOIN` in PostgreSQL?',
        questionType: 'mcq',
        options: ['LEFT JOIN returns only matching rows; INNER JOIN returns all rows from the left table', 'INNER JOIN returns only rows with matches in both tables; LEFT JOIN returns all rows from the left table with NULLs for non-matching right-side rows', 'INNER JOIN is faster but less safe than LEFT JOIN', 'They are functionally identical'],
        correctAnswer: 'INNER JOIN returns only rows with matches in both tables; LEFT JOIN returns all rows from the left table with NULLs for non-matching right-side rows',
        points: 5,
        orderIndex: 16,
      },
      {
        question: 'What is PostgreSQL\'s default index type and what is it best suited for?',
        questionType: 'mcq',
        options: ['GIN — best for full-text search and JSONB queries', 'B-Tree — best for equality, range, and sorting queries', 'Hash — best for exact-equality lookups only', 'BRIN — best for time-series data'],
        correctAnswer: 'B-Tree — best for equality, range, and sorting queries',
        points: 5,
        orderIndex: 17,
      },
      {
        question: 'Which HTTP methods are defined as idempotent by the HTTP specification?',
        questionType: 'mcq',
        options: ['POST and PATCH', 'GET, PUT, DELETE, HEAD, OPTIONS, and TRACE', 'Only GET', 'GET and POST'],
        correctAnswer: 'GET, PUT, DELETE, HEAD, OPTIONS, and TRACE',
        points: 5,
        orderIndex: 18,
      },
      {
        question: 'Why should a production web application expose a `/health` endpoint?',
        questionType: 'mcq',
        options: ['To allow users to check their own health data', 'To enable load balancers and orchestrators to verify the service is alive and ready to serve traffic', 'To serve static health articles', 'It is only needed during development'],
        correctAnswer: 'To enable load balancers and orchestrators to verify the service is alive and ready to serve traffic',
        points: 5,
        orderIndex: 19,
      },
    ];

    for (const q of questions) {
      await query(
        `INSERT INTO exam_questions (exam_id, question, question_type, options, correct_answer, points, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [exam.id, q.question, q.questionType, JSON.stringify(q.options), q.correctAnswer, q.points, q.orderIndex]
      );
    }

    console.log(`Added ${questions.length} questions to "${exam.title}"`);
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
