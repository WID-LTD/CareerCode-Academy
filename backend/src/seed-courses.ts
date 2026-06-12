import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { query } from './config/db';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const courses = [
  {
    title: 'Python for Everybody',
    description: 'Learn to program and analyze data with Python. This course covers variables, data structures, web scraping, databases, and data visualization. No prior programming experience required.',
    category: 'Programming',
    level: 'beginner',
    duration: 40,
    price: 5000,
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Getting Started with Python',
        lessons: [
          { title: 'Why Python? Installing Python', duration: 30, description: 'Introduction to Python and setting up your development environment.' },
          { title: 'Variables and Data Types', duration: 45, description: 'Understanding strings, numbers, booleans, and type conversion.' },
          { title: 'Operators and Expressions', duration: 40, description: 'Arithmetic, comparison, logical operators and expression evaluation.' },
          { title: 'String Operations', duration: 35, description: 'String methods, formatting, slicing, and f-strings.' },
        ],
      },
      {
        title: 'Control Flow and Functions',
        lessons: [
          { title: 'Conditional Statements (if/elif/else)', duration: 40, description: 'Making decisions in code with conditionals.' },
          { title: 'Loops: for and while', duration: 45, description: 'Iterating over data with loops.' },
          { title: 'Functions and Scope', duration: 50, description: 'Defining reusable code blocks with functions.' },
          { title: 'Lambda and Built-in Functions', duration: 35, description: 'Anonymous functions and Python built-ins.' },
        ],
      },
      {
        title: 'Data Structures',
        lessons: [
          { title: 'Lists and List Comprehensions', duration: 45, description: 'Creating and manipulating lists.' },
          { title: 'Tuples and Sets', duration: 35, description: 'Immutable sequences and unordered collections.' },
          { title: 'Dictionaries', duration: 40, description: 'Key-value pairs and dictionary methods.' },
          { title: 'Working with JSON Data', duration: 30, description: 'Parsing and generating JSON.' },
        ],
      },
      {
        title: 'File Handling and Modules',
        lessons: [
          { title: 'Reading and Writing Files', duration: 40, description: 'File I/O operations in Python.' },
          { title: 'Working with CSV and Excel', duration: 35, description: 'Data processing with csv module and pandas basics.' },
          { title: 'Modules and Packages', duration: 30, description: 'Organizing code with imports.' },
          { title: 'Error Handling with Try/Except', duration: 35, description: 'Graceful error handling.' },
        ],
      },
    ],
  },
  {
    title: 'Machine Learning',
    description: 'Master machine learning fundamentals including supervised and unsupervised learning, neural networks, and model evaluation. Build real-world ML models with scikit-learn and TensorFlow.',
    category: 'Data Science',
    level: 'intermediate',
    duration: 60,
    price: 10000,
    thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'ML Fundamentals',
        lessons: [
          { title: 'What is Machine Learning?', duration: 30, description: 'Types of ML and real-world applications.' },
          { title: 'The ML Pipeline', duration: 40, description: 'Data collection, preprocessing, training, evaluation.' },
          { title: 'Data Preprocessing', duration: 50, description: 'Handling missing data, scaling, and encoding.' },
          { title: 'Train/Test Split and Cross-Validation', duration: 35, description: 'Evaluating model performance.' },
        ],
      },
      {
        title: 'Supervised Learning',
        lessons: [
          { title: 'Linear Regression', duration: 45, description: 'Predicting continuous values.' },
          { title: 'Logistic Regression', duration: 40, description: 'Binary classification.' },
          { title: 'Decision Trees and Random Forests', duration: 50, description: 'Ensemble learning methods.' },
          { title: 'Support Vector Machines', duration: 40, description: 'Maximum margin classification.' },
        ],
      },
      {
        title: 'Unsupervised Learning',
        lessons: [
          { title: 'K-Means Clustering', duration: 35, description: 'Grouping unlabeled data.' },
          { title: 'Hierarchical Clustering', duration: 30, description: 'Dendrograms and cluster analysis.' },
          { title: 'Principal Component Analysis', duration: 40, description: 'Dimensionality reduction.' },
          { title: 'Anomaly Detection', duration: 35, description: 'Identifying outliers.' },
        ],
      },
      {
        title: 'Neural Networks & Deep Learning',
        lessons: [
          { title: 'Introduction to Neural Networks', duration: 45, description: 'Perceptrons, activation functions.' },
          { title: 'TensorFlow Basics', duration: 50, description: 'Building models with Keras.' },
          { title: 'Convolutional Neural Networks', duration: 55, description: 'Image classification with CNNs.' },
          { title: 'Model Deployment with Flask', duration: 40, description: 'Serving ML models as APIs.' },
        ],
      },
    ],
  },
  {
    title: 'Data Structures & Algorithms',
    description: 'A comprehensive course on fundamental data structures and algorithms used in technical interviews and real-world software engineering. Covers arrays, trees, graphs, dynamic programming, and more.',
    category: 'Computer Science',
    level: 'intermediate',
    duration: 55,
    price: 8500,
    thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Arrays and Strings',
        lessons: [
          { title: 'Array Operations', duration: 40, description: 'Traversal, insertion, deletion, and two-pointer techniques.' },
          { title: 'Sliding Window Techniques', duration: 45, description: 'Efficient subarray problems.' },
          { title: 'String Manipulation', duration: 35, description: 'Pattern matching, anagrams, palindromes.' },
          { title: 'Hash Tables and Sets', duration: 40, description: 'O(1) lookup data structures.' },
        ],
      },
      {
        title: 'Linked Lists and Stacks',
        lessons: [
          { title: 'Singly and Doubly Linked Lists', duration: 45, description: 'Pointer manipulation and traversal.' },
          { title: 'Stacks and Queues', duration: 35, description: 'LIFO and FIFO structures.' },
          { title: 'Priority Queues (Heaps)', duration: 40, description: 'Min-heaps and max-heaps.' },
          { title: 'Implementing a Stack with Linked List', duration: 30, description: 'Hands-on implementation.' },
        ],
      },
      {
        title: 'Trees and Graphs',
        lessons: [
          { title: 'Binary Trees and BSTs', duration: 50, description: 'Tree traversal and search.' },
          { title: 'Tree Traversals (DFS/BFS)', duration: 40, description: 'Inorder, preorder, postorder, level-order.' },
          { title: 'Graph Representations', duration: 35, description: 'Adjacency lists and matrices.' },
          { title: 'Dijkstra and A* Algorithms', duration: 50, description: 'Shortest path algorithms.' },
        ],
      },
      {
        title: 'Advanced Algorithms',
        lessons: [
          { title: 'Dynamic Programming I', duration: 55, description: 'Memoization and tabulation.' },
          { title: 'Dynamic Programming II', duration: 55, description: 'Knapsack, LCS, edit distance.' },
          { title: 'Greedy Algorithms', duration: 40, description: 'Interval scheduling, Huffman coding.' },
          { title: 'System Design Fundamentals', duration: 45, description: 'Designing scalable systems.' },
        ],
      },
    ],
  },
  {
    title: 'Full-Stack Web Development',
    description: 'Build modern web applications from scratch. Covers React, Node.js, Express, TypeScript, PostgreSQL, authentication, deployment, and cloud hosting.',
    category: 'Web Development',
    level: 'beginner',
    duration: 70,
    price: 12000,
    thumbnail: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'HTML, CSS & JavaScript Fundamentals',
        lessons: [
          { title: 'Semantic HTML5', duration: 30, description: 'Structuring web pages with HTML5.' },
          { title: 'CSS Flexbox and Grid', duration: 45, description: 'Modern layout techniques.' },
          { title: 'JavaScript Basics', duration: 50, description: 'Variables, functions, DOM manipulation.' },
          { title: 'ES6+ Features', duration: 40, description: 'Arrow functions, destructuring, modules.' },
        ],
      },
      {
        title: 'React Frontend Development',
        lessons: [
          { title: 'React Components and JSX', duration: 45, description: 'Building reusable UI components.' },
          { title: 'State and Props', duration: 40, description: 'Managing component state.' },
          { title: 'React Hooks (useState, useEffect)', duration: 50, description: 'Functional component patterns.' },
          { title: 'React Router and SPA Navigation', duration: 35, description: 'Client-side routing.' },
        ],
      },
      {
        title: 'Node.js & Express Backend',
        lessons: [
          { title: 'Introduction to Node.js', duration: 35, description: 'Event loop, modules, npm.' },
          { title: 'Express.js REST API', duration: 50, description: 'Building RESTful APIs.' },
          { title: 'Authentication with JWT', duration: 45, description: 'Login, registration, protected routes.' },
          { title: 'Database Integration with PostgreSQL', duration: 40, description: 'CRUD operations with node-postgres.' },
        ],
      },
      {
        title: 'Deployment & DevOps',
        lessons: [
          { title: 'Docker for Developers', duration: 40, description: 'Containerizing web applications.' },
          { title: 'CI/CD with GitHub Actions', duration: 35, description: 'Automated testing and deployment.' },
          { title: 'Deploying to Vercel and Railway', duration: 30, description: 'Production deployment.' },
          { title: 'Monitoring and Logging', duration: 25, description: 'Application observability.' },
        ],
      },
    ],
  },
  {
    title: 'Database Systems & SQL',
    description: 'Master relational databases, SQL queries, indexing, normalization, transactions, and NoSQL databases. Design efficient database schemas for real-world applications.',
    category: 'Databases',
    level: 'intermediate',
    duration: 45,
    price: 7500,
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Relational Database Design',
        lessons: [
          { title: 'Database Concepts and Architecture', duration: 30, description: 'Tables, rows, relationships.' },
          { title: 'Entity-Relationship Diagrams', duration: 40, description: 'Designing database schemas.' },
          { title: 'Normalization (1NF, 2NF, 3NF)', duration: 45, description: 'Eliminating data redundancy.' },
          { title: 'Creating Tables with Constraints', duration: 35, description: 'Primary keys, foreign keys, indexes.' },
        ],
      },
      {
        title: 'SQL Query Mastery',
        lessons: [
          { title: 'SELECT, WHERE, ORDER BY', duration: 40, description: 'Basic query operations.' },
          { title: 'JOINs (INNER, LEFT, RIGHT, FULL)', duration: 50, description: 'Combining tables.' },
          { title: 'Subqueries and CTEs', duration: 45, description: 'Advanced query techniques.' },
          { title: 'Aggregate Functions and GROUP BY', duration: 35, description: 'Data analysis queries.' },
        ],
      },
      {
        title: 'Advanced Database Topics',
        lessons: [
          { title: 'Transactions and ACID', duration: 40, description: 'Atomicity, consistency, isolation, durability.' },
          { title: 'Indexing and Query Optimization', duration: 45, description: 'EXPLAIN, query planning.' },
          { title: 'Stored Procedures and Triggers', duration: 35, description: 'Server-side logic.' },
          { title: 'NoSQL: MongoDB Crash Course', duration: 40, description: 'Document databases.' },
        ],
      },
    ],
  },
  {
    title: 'Computer Networks & Security',
    description: 'Understand how the internet works. Learn TCP/IP, HTTP/HTTPS, DNS, network security, firewalls, encryption, and common cyber attack vectors.',
    category: 'Networking',
    level: 'intermediate',
    duration: 50,
    price: 7500,
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Network Fundamentals',
        lessons: [
          { title: 'OSI and TCP/IP Models', duration: 35, description: 'Layered network architecture.' },
          { title: 'IP Addressing and Subnetting', duration: 45, description: 'IPv4, IPv6, CIDR notation.' },
          { title: 'DNS and DHCP', duration: 30, description: 'Name resolution and IP assignment.' },
          { title: 'HTTP/HTTPS and Web Protocols', duration: 35, description: 'Request-response cycle, status codes.' },
        ],
      },
      {
        title: 'Network Security',
        lessons: [
          { title: 'Encryption and Public Key Infrastructure', duration: 45, description: 'Symmetric vs asymmetric encryption.' },
          { title: 'Firewalls and VPNs', duration: 35, description: 'Network security tools.' },
          { title: 'Common Attack Vectors', duration: 40, description: 'Phishing, DDoS, MITM, SQL injection.' },
          { title: 'OWASP Top 10 Web Vulnerabilities', duration: 50, description: 'Web application security.' },
        ],
      },
      {
        title: 'Practical Security',
        lessons: [
          { title: 'Setting Up a Secure Server', duration: 40, description: 'SSL/TLS, SSH hardening.' },
          { title: 'Penetration Testing Basics', duration: 45, description: 'Using Nmap, Wireshark.' },
          { title: 'Incident Response', duration: 30, description: 'Detecting and responding to breaches.' },
          { title: 'Compliance and Governance (GDPR, SOC2)', duration: 25, description: 'Security standards.' },
        ],
      },
    ],
  },
  {
    title: 'Cloud Computing with AWS',
    description: 'Learn cloud architecture, AWS services (EC2, S3, Lambda, RDS), infrastructure as code, container orchestration with Kubernetes, and cloud cost optimization.',
    category: 'Cloud Computing',
    level: 'advanced',
    duration: 55,
    price: 10000,
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Cloud Concepts',
        lessons: [
          { title: 'What is Cloud Computing?', duration: 30, description: 'IaaS, PaaS, SaaS models.' },
          { title: 'AWS Global Infrastructure', duration: 25, description: 'Regions, AZs, edge locations.' },
          { title: 'AWS Free Tier and Account Setup', duration: 20, description: 'Creating your AWS account.' },
          { title: 'IAM: Identity and Access Management', duration: 40, description: 'Users, groups, roles, policies.' },
        ],
      },
      {
        title: 'Core AWS Services',
        lessons: [
          { title: 'EC2: Virtual Servers', duration: 45, description: 'Launching and managing instances.' },
          { title: 'S3: Object Storage', duration: 40, description: 'Buckets, versioning, lifecycle policies.' },
          { title: 'RDS: Managed Databases', duration: 35, description: 'PostgreSQL, MySQL on AWS.' },
          { title: 'Lambda: Serverless Functions', duration: 50, description: 'Event-driven computing.' },
        ],
      },
      {
        title: 'Containers and Orchestration',
        lessons: [
          { title: 'Docker on AWS', duration: 40, description: 'ECS and ECR.' },
          { title: 'Kubernetes with EKS', duration: 55, description: 'Pod, service, deployment, ingress.' },
          { title: 'Infrastructure as Code (Terraform)', duration: 45, description: 'Declarative cloud provisioning.' },
          { title: 'CI/CD Pipelines with AWS', duration: 35, description: 'CodePipeline, CodeBuild, CodeDeploy.' },
        ],
      },
    ],
  },
  {
    title: 'Artificial Intelligence',
    description: 'Explore AI concepts including search algorithms, knowledge representation, natural language processing, computer vision, and building intelligent agents.',
    category: 'AI',
    level: 'advanced',
    duration: 65,
    price: 12500,
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'AI Fundamentals',
        lessons: [
          { title: 'History and Philosophy of AI', duration: 25, description: 'Turing test, Chinese room.' },
          { title: 'Intelligent Agents', duration: 35, description: 'Agent architectures and environments.' },
          { title: 'Search Algorithms (BFS, DFS, A*)', duration: 50, description: 'Problem-solving through search.' },
          { title: 'Constraint Satisfaction', duration: 35, description: 'Solving CSPs with backtracking.' },
        ],
      },
      {
        title: 'Natural Language Processing',
        lessons: [
          { title: 'Text Preprocessing and Tokenization', duration: 40, description: 'NLP pipelines.' },
          { title: 'Word Embeddings (Word2Vec, GloVe)', duration: 45, description: 'Vector representations of words.' },
          { title: 'Transformers and BERT', duration: 55, description: 'Attention mechanisms.' },
          { title: 'Building a Chatbot with GPT APIs', duration: 50, description: 'LLM integration.' },
        ],
      },
      {
        title: 'Computer Vision',
        lessons: [
          { title: 'Image Processing Basics', duration: 35, description: 'Filters, edges, features.' },
          { title: 'Object Detection (YOLO, R-CNN)', duration: 50, description: 'Real-time object detection.' },
          { title: 'Image Segmentation', duration: 40, description: 'U-Net, Mask R-CNN.' },
          { title: 'Face Recognition Systems', duration: 35, description: 'Face detection and verification.' },
        ],
      },
    ],
  },
  {
    title: 'Software Engineering & Design Patterns',
    description: 'Learn professional software engineering practices: design patterns, SOLID principles, clean architecture, testing, version control, and agile methodologies.',
    category: 'Software Engineering',
    level: 'intermediate',
    duration: 50,
    price: 8500,
    thumbnail: 'https://images.unsplash.com/photo-1580894742597-87bc8789db3d?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Software Design Principles',
        lessons: [
          { title: 'SOLID Principles', duration: 45, description: 'Single responsibility, open-closed, Liskov, interface segregation, dependency inversion.' },
          { title: 'Design Patterns: Creational', duration: 50, description: 'Singleton, factory, builder, prototype.' },
          { title: 'Design Patterns: Structural', duration: 45, description: 'Adapter, decorator, facade, proxy.' },
          { title: 'Design Patterns: Behavioral', duration: 50, description: 'Observer, strategy, command, iterator.' },
        ],
      },
      {
        title: 'Clean Architecture & Testing',
        lessons: [
          { title: 'Clean Architecture', duration: 40, description: 'Layers, dependency rule, boundaries.' },
          { title: 'Unit Testing with Jest', duration: 45, description: 'TDD, mocks, code coverage.' },
          { title: 'Integration and E2E Testing', duration: 35, description: 'Cypress, Playwright.' },
          { title: 'Refactoring and Code Smells', duration: 30, description: 'Improving existing code.' },
        ],
      },
      {
        title: 'Professional Practices',
        lessons: [
          { title: 'Git and GitHub Workflows', duration: 40, description: 'Branching, rebasing, PRs.' },
          { title: 'Agile and Scrum', duration: 30, description: 'Sprints, standups, retrospectives.' },
          { title: 'Code Review Best Practices', duration: 25, description: 'Giving and receiving feedback.' },
          { title: 'Technical Writing and Documentation', duration: 20, description: 'Writing clear docs and ADRs.' },
        ],
      },
    ],
  },
  {
    title: 'Cybersecurity',
    description: 'Master offensive and defensive cybersecurity. Learn ethical hacking, cryptography, network defense, malware analysis, and security operations.',
    category: 'Security',
    level: 'advanced',
    duration: 60,
    price: 10000,
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Foundations of Cybersecurity',
        lessons: [
          { title: 'CIA Triad and Security Principles', duration: 30, description: 'Confidentiality, integrity, availability.' },
          { title: 'Cryptography Fundamentals', duration: 45, description: 'Symmetric, asymmetric, hashing, digital signatures.' },
          { title: 'Network Security Architecture', duration: 40, description: 'Segmentation, DMZ, Zero Trust.' },
          { title: 'Security Policies and Governance', duration: 25, description: 'ISO 27001, NIST framework.' },
        ],
      },
      {
        title: 'Ethical Hacking',
        lessons: [
          { title: 'Reconnaissance and Footprinting', duration: 40, description: 'OSINT, passive and active reconnaissance.' },
          { title: 'Vulnerability Scanning with Nessus', duration: 35, description: 'Automated vulnerability detection.' },
          { title: 'Web Application Penetration Testing', duration: 55, description: 'Burp Suite, SQL injection, XSS.' },
          { title: 'Social Engineering and Phishing', duration: 30, description: 'Human-centric attacks.' },
        ],
      },
      {
        title: 'Defense and Operations',
        lessons: [
          { title: 'SIEM and Log Analysis (ELK Stack)', duration: 45, description: 'Security information and event management.' },
          { title: 'Incident Response Lifecycle', duration: 35, description: 'Prepare, detect, contain, eradicate, recover.' },
          { title: 'Malware Analysis and Reverse Engineering', duration: 50, description: 'Static and dynamic analysis.' },
          { title: 'Cloud Security (CSPM, CASB)', duration: 35, description: 'Securing AWS, Azure, GCP.' },
        ],
      },
    ],
  },
];

async function seedCourses() {
  try {
    console.log('=== CareerCode Academy Course Seeder ===\n');

    // Find or create instructor
    const instructorEmail = 'instructor@careercode.com';
    let instructorResult = await query('SELECT id FROM users WHERE email = $1', [instructorEmail]);
    let instructorId: string;

    if (instructorResult.rows.length === 0) {
      console.log('Creating instructor account...');
      const hashedPassword = await bcrypt.hash('Instructor123!', 12);
      instructorResult = await query(
        `INSERT INTO users (name, email, password, role, is_verified)
         VALUES ($1, $2, $3, 'instructor', true)
         RETURNING id`,
        ['Course Instructor', instructorEmail, hashedPassword]
      );
      instructorId = instructorResult.rows[0].id;
      console.log(`  Created instructor: ${instructorEmail} / Instructor123!\n`);
    } else {
      instructorId = instructorResult.rows[0].id;
      console.log(`Using existing instructor (${instructorEmail})\n`);
    }

    let totalCourses = 0;
    let totalModules = 0;
    let totalLessons = 0;

    for (const course of courses) {
      // Check if course already exists by slug
      const slug = slugify(course.title);
      const existingCourse = await query('SELECT id FROM courses WHERE slug = $1', [slug]);
      if (existingCourse.rows.length > 0) {
        console.log(`  SKIP: "${course.title}" already exists`);
        continue;
      }

      // Insert course
      const courseResult = await query(
        `INSERT INTO courses (title, description, category, level, duration, price, thumbnail, instructor_id, published, slug)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [course.title, course.description, course.category, course.level, course.duration, course.price, course.thumbnail, instructorId, true, slug]
      );
      const courseId = courseResult.rows[0].id;
      totalCourses++;
      console.log(`  ✓ "${course.title}" (${course.category}, ${course.level})`);

      // Insert modules and lessons
      for (let mi = 0; mi < course.modules.length; mi++) {
        const mod = course.modules[mi];
        const modResult = await query(
          `INSERT INTO modules (course_id, title, order_index)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [courseId, mod.title, mi]
        );
        const moduleId = modResult.rows[0].id;
        totalModules++;

        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li];
          await query(
            `INSERT INTO lessons (course_id, module_id, title, description, duration, order_index, is_free)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [courseId, moduleId, lesson.title, lesson.description, lesson.duration, li, li < 2]
          );
          totalLessons++;
        }
      }
    }

    console.log(`\n=== Seeding Complete ===`);
    console.log(`  Courses:  ${totalCourses}`);
    console.log(`  Modules:  ${totalModules}`);
    console.log(`  Lessons:  ${totalLessons}`);
    console.log(`\nInstructor login: ${instructorEmail} / Instructor123!`);

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed courses:', error);
    process.exit(1);
  }
}

seedCourses();
