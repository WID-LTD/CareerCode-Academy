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
    title: 'Mobile App Development',
    description: 'Build cross-platform mobile applications with React Native. Covers components, navigation, state management, native APIs, and deployment to iOS and Android app stores.',
    category: 'Mobile',
    level: 'intermediate',
    duration: 50,
    price: 9000,
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'React Native Fundamentals',
        lessons: [
          { title: 'Setting Up React Native Environment', duration: 30, description: 'Expo CLI, Android Studio, Xcode setup.' },
          { title: 'JSX and Components in React Native', duration: 35, description: 'Core components: View, Text, Image, ScrollView.' },
          { title: 'Styling and Layout', duration: 40, description: 'Flexbox, StyleSheet, responsive design for mobile.' },
          { title: 'State and Props', duration: 35, description: 'Managing component state in mobile apps.' },
        ],
      },
      {
        title: 'Navigation and Screens',
        lessons: [
          { title: 'React Navigation Setup', duration: 30, description: 'Stack, tab, and drawer navigators.' },
          { title: 'Passing Data Between Screens', duration: 25, description: 'Route params and context.' },
          { title: 'Bottom Tabs and Drawer Navigation', duration: 30, description: 'Multi-screen app architecture.' },
          { title: 'Deep Linking', duration: 25, description: 'Linking to specific app screens from URLs.' },
        ],
      },
      {
        title: 'Native Features & APIs',
        lessons: [
          { title: 'Camera and Image Picker', duration: 35, description: 'Using expo-camera and expo-image-picker.' },
          { title: 'Location and Maps', duration: 30, description: 'Geolocation and react-native-maps.' },
          { title: 'Push Notifications', duration: 30, description: 'Local and remote push notifications.' },
          { title: 'AsyncStorage and SQLite', duration: 35, description: 'Persistent local data storage.' },
        ],
      },
      {
        title: 'Deployment & App Store',
        lessons: [
          { title: 'Building for Production', duration: 40, description: 'EAS Build, app signing, OTA updates.' },
          { title: 'Publishing to Google Play Store', duration: 30, description: 'Developer account, store listing, review process.' },
          { title: 'Publishing to Apple App Store', duration: 30, description: 'Apple Developer program, TestFlight, app review.' },
          { title: 'Monitoring and Analytics', duration: 25, description: 'Crashlytics, analytics, performance monitoring.' },
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
  {
    title: 'Responsive Web Design',
    description: 'Learn HTML5, CSS3, Flexbox, CSS Grid, and responsive design principles. Build real projects including a survey form, tribute page, technical documentation page, product landing page, and personal portfolio.',
    category: 'Web Development',
    level: 'beginner',
    duration: 40,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'HTML5 Fundamentals',
        lessons: [
          { title: 'Basic HTML Structure', duration: 20, description: 'DOCTYPE, html, head, body tags and document outline.' },
          { title: 'Text Elements and Links', duration: 25, description: 'Headings, paragraphs, anchors, and navigation.' },
          { title: 'Images and Media', duration: 20, description: 'Embedding images, video, and audio.' },
          { title: 'Forms and Inputs', duration: 30, description: 'Form elements, validation, and accessibility.' },
        ],
      },
      {
        title: 'CSS3 Styling',
        lessons: [
          { title: 'Selectors and Specificity', duration: 25, description: 'Element, class, ID, attribute selectors and cascade.' },
          { title: 'Box Model and Layout', duration: 30, description: 'Margin, padding, border, width, height.' },
          { title: 'Colors, Typography, Backgrounds', duration: 25, description: 'Color systems, fonts, gradients, background images.' },
          { title: 'Responsive Design Principles', duration: 30, description: 'Media queries, mobile-first approach, breakpoints.' },
        ],
      },
      {
        title: 'Flexbox and CSS Grid',
        lessons: [
          { title: 'Flexbox Basics', duration: 35, description: 'Flex container, items, alignment, and wrapping.' },
          { title: 'Advanced Flexbox Patterns', duration: 30, description: 'Navigation bars, card layouts, centering.' },
          { title: 'CSS Grid Fundamentals', duration: 35, description: 'Grid container, tracks, areas, and gaps.' },
          { title: 'Combining Flexbox and Grid', duration: 25, description: 'When to use each layout method.' },
        ],
      },
      {
        title: 'Projects',
        lessons: [
          { title: 'Survey Form Project', duration: 45, description: 'Build a styled survey form with validation.' },
          { title: 'Product Landing Page', duration: 45, description: 'Build a responsive product landing page.' },
          { title: 'Technical Documentation Page', duration: 40, description: 'Build a documentation page with navigation.' },
          { title: 'Personal Portfolio Website', duration: 60, description: 'Build your own portfolio to showcase projects.' },
        ],
      },
    ],
  },
  {
    title: 'JavaScript Algorithms & Data Structures',
    description: 'Master JavaScript fundamentals, ES6, regular expressions, debugging, data structures, algorithm scripting, and object-oriented programming. Prepares you for technical interviews.',
    category: 'Programming',
    level: 'intermediate',
    duration: 50,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'JavaScript Basics',
        lessons: [
          { title: 'Variables and Data Types', duration: 25, description: 'var, let, const, strings, numbers, booleans, null, undefined.' },
          { title: 'Functions and Scope', duration: 30, description: 'Function declarations, expressions, arrow functions, closures.' },
          { title: 'Arrays and Objects', duration: 30, description: 'Array methods, object destructuring, spread operator.' },
          { title: 'Loops and Iteration', duration: 25, description: 'for, while, forEach, map, filter, reduce.' },
        ],
      },
      {
        title: 'ES6 and Modern JavaScript',
        lessons: [
          { title: 'Template Literals and Destructuring', duration: 20, description: 'String interpolation, array and object destructuring.' },
          { title: 'Promises and Async/Await', duration: 35, description: 'Asynchronous programming patterns.' },
          { title: 'Modules and Import/Export', duration: 20, description: 'ES modules, named and default exports.' },
          { title: 'Classes and OOP', duration: 30, description: 'Class syntax, inheritance, getters, setters.' },
        ],
      },
      {
        title: 'Data Structures',
        lessons: [
          { title: 'Stacks and Queues', duration: 30, description: 'LIFO and FIFO implementations in JavaScript.' },
          { title: 'Linked Lists', duration: 35, description: 'Singly and doubly linked lists.' },
          { title: 'Trees and Binary Search Trees', duration: 40, description: 'Tree traversal, BST operations.' },
          { title: 'Hash Tables and Sets', duration: 25, description: 'Implementing hash tables in JavaScript.' },
        ],
      },
      {
        title: 'Algorithm Scripting',
        lessons: [
          { title: 'Basic Algorithm Challenges', duration: 40, description: 'FizzBuzz, palindrome checker, caesar cipher.' },
          { title: 'Sorting Algorithms', duration: 35, description: 'Bubble, selection, insertion, merge, quick sort.' },
          { title: 'Search Algorithms', duration: 30, description: 'Linear search, binary search, BFS, DFS.' },
          { title: 'Dynamic Programming Intro', duration: 40, description: 'Memoization, tabulation, classic DP problems.' },
        ],
      },
    ],
  },
  {
    title: 'Front End Development Libraries',
    description: 'Learn popular front-end libraries and frameworks including React, Redux, jQuery, Bootstrap, and Sass. Build projects like a markdown previewer, drum machine, calculator, and pomodoro clock.',
    category: 'Web Development',
    level: 'intermediate',
    duration: 45,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Bootstrap and Sass',
        lessons: [
          { title: 'Bootstrap Grid and Components', duration: 30, description: 'Layout system, cards, navbars, modals.' },
          { title: 'Sass Variables and Mixins', duration: 25, description: 'SCSS syntax, nesting, partials, inheritance.' },
          { title: 'Bootstrap Themes', duration: 20, description: 'Customizing Bootstrap with Sass.' },
          { title: 'Responsive Utilities', duration: 20, description: 'Display, flex, spacing utilities.' },
        ],
      },
      {
        title: 'jQuery',
        lessons: [
          { title: 'DOM Manipulation with jQuery', duration: 25, description: 'Selectors, events, effects.' },
          { title: 'AJAX with jQuery', duration: 25, description: 'GET and POST requests, JSON parsing.' },
          { title: 'jQuery Plugins', duration: 20, description: 'Using and creating jQuery plugins.' },
          { title: 'When to Use Vanilla JS vs jQuery', duration: 15, description: 'Modern alternatives.' },
        ],
      },
      {
        title: 'React Fundamentals',
        lessons: [
          { title: 'JSX and Components', duration: 30, description: 'Creating components with JSX syntax.' },
          { title: 'State and Props', duration: 35, description: 'Managing data flow in React.' },
          { title: 'Lifecycle Methods and Hooks', duration: 35, description: 'useState, useEffect, useContext.' },
          { title: 'Handling Events and Forms', duration: 30, description: 'Event handlers, controlled components.' },
        ],
      },
      {
        title: 'Redux',
        lessons: [
          { title: 'Redux Store and Reducers', duration: 30, description: 'Actions, reducers, and the store.' },
          { title: 'React-Redux Integration', duration: 30, description: 'Provider, connect, useSelector, useDispatch.' },
          { title: 'Redux Middleware (Thunk)', duration: 25, description: 'Async actions with Redux Thunk.' },
          { title: 'Redux Toolkit', duration: 30, description: 'Modern Redux with createSlice.' },
        ],
      },
    ],
  },
  {
    title: 'Back End Development & APIs',
    description: 'Build web applications using Node.js, Express.js, MongoDB, Mongoose, and manage package dependencies with npm. Create RESTful APIs, handle authentication, and deploy applications.',
    category: 'Web Development',
    level: 'intermediate',
    duration: 45,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Node.js and npm',
        lessons: [
          { title: 'Node.js Runtime', duration: 25, description: 'Event loop, modules, global objects.' },
          { title: 'npm Package Manager', duration: 20, description: 'Installing, updating, and publishing packages.' },
          { title: 'File System and Streams', duration: 30, description: 'Reading/writing files, streaming data.' },
          { title: 'Building CLI Tools', duration: 25, description: 'Creating command-line applications.' },
        ],
      },
      {
        title: 'Express.js',
        lessons: [
          { title: 'Express Web Server', duration: 30, description: 'Routes, middleware, static files.' },
          { title: 'RESTful API Design', duration: 35, description: 'CRUD operations, status codes, URL structure.' },
          { title: 'Middleware and Error Handling', duration: 25, description: 'Custom middleware, error handling patterns.' },
          { title: 'Environment Variables and Configuration', duration: 20, description: 'dotenv, configuration management.' },
        ],
      },
      {
        title: 'Databases (MongoDB)',
        lessons: [
          { title: 'MongoDB and Mongoose', duration: 35, description: 'Schemas, models, CRUD operations.' },
          { title: 'Data Validation and Relationships', duration: 30, description: 'Schema validation, referencing documents.' },
          { title: 'REST API with Database', duration: 40, description: 'Connecting Express to MongoDB.' },
          { title: 'Authentication and Security', duration: 35, description: 'JWT, bcrypt, authorization middleware.' },
        ],
      },
      {
        title: 'Deployment',
        lessons: [
          { title: 'Git and GitHub', duration: 25, description: 'Version control basics.' },
          { title: 'Deploying to Render/Heroku', duration: 20, description: 'Production deployment.' },
          { title: 'Environment Variables in Production', duration: 15, description: 'Securing secrets.' },
          { title: 'API Documentation with Swagger', duration: 25, description: 'Documenting your API.' },
        ],
      },
    ],
  },
  {
    title: 'Quality Assurance',
    description: 'Learn testing methodologies including unit testing, integration testing, functional testing. Use Chai, Mocha, and assert libraries. Write tests for Node.js and Express applications.',
    category: 'Software Engineering',
    level: 'intermediate',
    duration: 35,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Testing Fundamentals',
        lessons: [
          { title: 'What is Testing?', duration: 20, description: 'Types of tests, testing pyramid.' },
          { title: 'Assertion Libraries', duration: 25, description: 'Node assert, Chai expect, should, assert.' },
          { title: 'Mocha Test Framework', duration: 30, description: 'describe, it, hooks, reporters.' },
          { title: 'Writing Your First Tests', duration: 25, description: 'Practical test examples.' },
        ],
      },
      {
        title: 'Unit and Integration Tests',
        lessons: [
          { title: 'Testing Functions and Modules', duration: 30, description: 'Unit testing Node.js modules.' },
          { title: 'Testing Express Routes', duration: 35, description: 'Supertest for HTTP integration tests.' },
          { title: 'Mocking and Stubbing', duration: 30, description: 'Sinon.js for mocks, stubs, spies.' },
          { title: 'Testing Database Operations', duration: 30, description: 'Test databases and fixtures.' },
        ],
      },
      {
        title: 'Functional and Advanced Testing',
        lessons: [
          { title: 'Functional Testing with Puppeteer', duration: 35, description: 'Browser automation and testing.' },
          { title: 'Continuous Integration', duration: 25, description: 'GitHub Actions for automated testing.' },
          { title: 'Test Coverage', duration: 20, description: 'Istanbul/nyc for coverage reports.' },
          { title: 'TDD and BDD Workflows', duration: 25, description: 'Test-driven development practices.' },
        ],
      },
    ],
  },
  {
    title: 'Scientific Computing with Python',
    description: 'Learn Python fundamentals for scientific computing. Covers variables, loops, conditionals, functions, lists, dictionaries, classes, file I/O, and third-party libraries like NumPy and SciPy.',
    category: 'Data Science',
    level: 'beginner',
    duration: 40,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Python for Science',
        lessons: [
          { title: 'Python Refresher', duration: 25, description: 'Data types, control flow, functions.' },
          { title: 'NumPy Arrays', duration: 35, description: 'Creating and manipulating arrays.' },
          { title: 'NumPy Math Operations', duration: 30, description: 'Linear algebra, statistics, random numbers.' },
          { title: 'SciPy Fundamentals', duration: 30, description: 'Optimization, integration, interpolation.' },
        ],
      },
      {
        title: 'Data Analysis with Python',
        lessons: [
          { title: 'Pandas DataFrames', duration: 40, description: 'Series, DataFrames, reading CSV files.' },
          { title: 'Data Cleaning', duration: 35, description: 'Handling missing data, duplicates, transformations.' },
          { title: 'Data Visualization with Matplotlib', duration: 35, description: 'Line plots, bar charts, histograms.' },
          { title: 'Seaborn for Statistical Plots', duration: 30, description: 'Heatmaps, pair plots, box plots.' },
        ],
      },
      {
        title: 'Projects',
        lessons: [
          { title: 'Arithmetic Formatter', duration: 30, description: 'Format arithmetic problems vertically.' },
          { title: 'Time Calculator', duration: 25, description: 'Add and subtract time durations.' },
          { title: 'Budget App', duration: 35, description: 'Build a budget tracking class.' },
          { title: 'Polygon Area Calculator', duration: 30, description: 'Object-oriented geometry calculator.' },
        ],
      },
    ],
  },
  {
    title: 'Data Visualization',
    description: 'Learn to present data visually using D3.js, JSON, and various charting techniques. Build interactive dashboards, scatter plots, heat maps, choropleth maps, and treemap diagrams.',
    category: 'Data Science',
    level: 'intermediate',
    duration: 35,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'D3.js Fundamentals',
        lessons: [
          { title: 'D3 Selections and Data Binding', duration: 30, description: 'Selecting DOM elements, data joins.' },
          { title: 'Scales and Axes', duration: 35, description: 'Linear, ordinal, time scales.' },
          { title: 'Shapes and Layouts', duration: 30, description: 'SVG shapes, pie layout, stack layout.' },
          { title: 'Transitions and Animations', duration: 25, description: 'Animated data visualizations.' },
        ],
      },
      {
        title: 'Chart Types',
        lessons: [
          { title: 'Bar Charts and Line Charts', duration: 30, description: 'Basic chart implementations.' },
          { title: 'Scatter Plots and Bubble Charts', duration: 25, description: 'Multi-dimensional data visualization.' },
          { title: 'Heat Maps and Choropleths', duration: 35, description: 'Geographic and matrix visualizations.' },
          { title: 'Treemaps and Hierarchical Data', duration: 30, description: 'Nested data visualization.' },
        ],
      },
      {
        title: 'Projects',
        lessons: [
          { title: 'Bar Chart: US GDP', duration: 40, description: 'Visualize US GDP data over time.' },
          { title: 'Scatter Plot: Doping in Cycling', duration: 35, description: 'Interactive scatter plot with tooltips.' },
          { title: 'Heat Map: Monthly Temperature', duration: 40, description: 'Temperature visualization by month.' },
          { title: 'Choropleth: Education Levels', duration: 45, description: 'US county education data map.' },
        ],
      },
    ],
  },
  {
    title: 'Information Security',
    description: 'Learn about ethical hacking, penetration testing, network security, and secure coding practices. Covers HelmetJS, port scanning, hash cracking, SQL injection prevention, and XSS protection.',
    category: 'Security',
    level: 'advanced',
    duration: 40,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Web Security Fundamentals',
        lessons: [
          { title: 'HelmetJS and Security Headers', duration: 25, description: 'HTTP security headers middleware.' },
          { title: 'OWASP Top 10', duration: 35, description: 'Understanding the top web vulnerabilities.' },
          { title: 'Cross-Site Scripting (XSS)', duration: 30, description: 'Prevention and mitigation.' },
          { title: 'SQL Injection Prevention', duration: 30, description: 'Parameterized queries and ORM security.' },
        ],
      },
      {
        title: 'Penetration Testing Tools',
        lessons: [
          { title: 'Port Scanning with Nmap', duration: 30, description: 'Network reconnaissance.' },
          { title: 'Hash Cracking (John the Ripper)', duration: 25, description: 'Password cracking techniques.' },
          { title: 'Packet Analysis with Wireshark', duration: 30, description: 'Network traffic analysis.' },
          { title: 'Vulnerability Scanning (Nikto, OpenVAS)', duration: 35, description: 'Automated vulnerability detection.' },
        ],
      },
      {
        title: 'Secure Coding Practices',
        lessons: [
          { title: 'Input Validation and Sanitization', duration: 25, description: 'Preventing injection attacks.' },
          { title: 'Authentication Best Practices', duration: 30, description: 'Secure password storage, MFA.' },
          { title: 'API Security (Rate Limiting, CORS)', duration: 25, description: 'Securing REST APIs.' },
          { title: 'Secure File Upload Handling', duration: 20, description: 'Validation, scanning, storage.' },
        ],
      },
    ],
  },
  {
    title: 'Coding Interview Prep',
    description: 'Prepare for technical interviews with algorithms, data structures, and problem-solving strategies. Covers recursion, backtracking, graph algorithms, system design, and behavioral questions.',
    category: 'Computer Science',
    level: 'advanced',
    duration: 50,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1489875347897-49f64b51c1f8?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Problem-Solving Strategies',
        lessons: [
          { title: 'Brute Force and Optimization', duration: 30, description: 'Naive solutions and how to improve them.' },
          { title: 'Two Pointers and Sliding Window', duration: 35, description: 'Efficient array and string techniques.' },
          { title: 'Recursion and Backtracking', duration: 40, description: 'Solving combinatorial problems.' },
          { title: 'Divide and Conquer', duration: 30, description: 'Merge sort, quick select.' },
        ],
      },
      {
        title: 'Data Structure Deep Dive',
        lessons: [
          { title: 'Arrays, Strings, Hash Tables', duration: 30, description: 'Most common interview topics.' },
          { title: 'Trees, Tries, and Graphs', duration: 45, description: 'Tree traversals, Trie for strings, graph algorithms.' },
          { title: 'Heaps and Priority Queues', duration: 30, description: 'Top K problems, median finding.' },
          { title: 'Union-Find (Disjoint Set)', duration: 25, description: 'Connected components, Kruskal algorithm.' },
        ],
      },
      {
        title: 'System Design',
        lessons: [
          { title: 'Designing Web Applications', duration: 35, description: 'URL shortener, TinyURL design.' },
          { title: 'Designing Distributed Systems', duration: 40, description: 'Chat systems, news feeds.' },
          { title: 'Database Design Interviews', duration: 30, description: 'Schema design, normalization trade-offs.' },
          { title: 'Scalability and Caching', duration: 35, description: 'CDN, caching strategies, load balancing.' },
        ],
      },
      {
        title: 'Interview Practice',
        lessons: [
          { title: 'Mock Technical Interviews', duration: 45, description: 'Simulated coding interviews.' },
          { title: 'Behavioral Questions', duration: 30, description: 'STAR method, common questions.' },
          { title: 'Whiteboarding Techniques', duration: 20, description: 'Communicating your thought process.' },
          { title: 'Negotiation and Job Search', duration: 25, description: 'Salary negotiation, offer evaluation.' },
        ],
      },
    ],
  },
  {
    title: 'Relational Database',
    description: 'Learn SQL, PostgreSQL, database design, normalization, indexing, and advanced queries. Build projects like a celestial bodies database, world cup database, salon appointment scheduler, and periodic table database.',
    category: 'Databases',
    level: 'intermediate',
    duration: 35,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'SQL Basics',
        lessons: [
          { title: 'Creating Tables and Constraints', duration: 25, description: 'CREATE TABLE, PRIMARY KEY, FOREIGN KEY, UNIQUE.' },
          { title: 'INSERT, SELECT, UPDATE, DELETE', duration: 30, description: 'Basic CRUD operations.' },
          { title: 'WHERE, ORDER BY, LIMIT', duration: 20, description: 'Filtering and sorting data.' },
          { title: 'Aggregate Functions (COUNT, SUM, AVG)', duration: 25, description: 'Data aggregation with GROUP BY.' },
        ],
      },
      {
        title: 'Advanced SQL',
        lessons: [
          { title: 'JOINs (INNER, LEFT, RIGHT, FULL)', duration: 35, description: 'Combining tables.' },
          { title: 'Subqueries and CTEs', duration: 30, description: 'Nested queries and WITH clauses.' },
          { title: 'Views and Indexes', duration: 25, description: 'Optimizing queries with indexes.' },
          { title: 'Transactions and ACID', duration: 25, description: 'BEGIN, COMMIT, ROLLBACK.' },
        ],
      },
      {
        title: 'Database Projects',
        lessons: [
          { title: 'Celestial Bodies Database', duration: 30, description: 'Design a database for astronomical data.' },
          { title: 'World Cup Database', duration: 35, description: 'Historical World Cup data modeling.' },
          { title: 'Salon Appointment Scheduler', duration: 40, description: 'Full-stack scheduling application.' },
          { title: 'Periodic Table Database', duration: 30, description: 'Chemical elements database with queries.' },
        ],
      },
    ],
  },
  {
    title: 'College Algebra with Python',
    description: 'Learn college-level algebra concepts using Python. Covers linear equations, functions, polynomials, quadratic equations, systems of equations, matrices, and practical data applications.',
    category: 'Data Science',
    level: 'beginner',
    duration: 30,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Algebra Basics with Python',
        lessons: [
          { title: 'Numbers and Arithmetic', duration: 20, description: 'Python as a calculator.' },
          { title: 'Variables and Expressions', duration: 25, description: 'Algebraic expressions in Python.' },
          { title: 'Linear Equations', duration: 30, description: 'Solving and graphing linear equations.' },
          { title: 'Functions and Graphs', duration: 30, description: 'Function notation, domain, range.' },
        ],
      },
      {
        title: 'Polynomials and Quadratics',
        lessons: [
          { title: 'Polynomial Operations', duration: 25, description: 'Adding, multiplying, factoring polynomials.' },
          { title: 'Quadratic Equations', duration: 30, description: 'Quadratic formula, completing the square.' },
          { title: 'Graphing Quadratics', duration: 25, description: 'Parabolas, vertex, axis of symmetry.' },
          { title: 'Systems of Equations', duration: 30, description: 'Solving systems with Python.' },
        ],
      },
      {
        title: 'Matrices and Applications',
        lessons: [
          { title: 'Matrix Operations with NumPy', duration: 30, description: 'Addition, multiplication, inverse.' },
          { title: 'Determinants and Cramer Rule', duration: 25, description: 'Solving systems with matrices.' },
          { title: 'Data Fitting and Regression', duration: 35, description: 'Linear regression with Python.' },
          { title: 'Real-World Algebra Projects', duration: 35, description: 'Applying algebra to real data.' },
        ],
      },
    ],
  },
  {
    title: 'Docker & Kubernetes Mastery',
    description: 'Master containerization and orchestration with Docker and Kubernetes. Covers container lifecycle, image building, multi-container apps, pod management, service discovery, and production cluster operations.',
    category: 'DevOps',
    level: 'intermediate',
    duration: 45,
    price: 8500,
    thumbnail: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Docker Fundamentals',
        lessons: [
          { title: 'Containers vs Virtual Machines', duration: 25, description: 'Understanding containerization concepts.' },
          { title: 'Dockerfile and Image Building', duration: 40, description: 'Writing efficient Dockerfiles.' },
          { title: 'Docker Compose for Multi-Container Apps', duration: 35, description: 'Orchestrating multiple services.' },
          { title: 'Docker Networking and Volumes', duration: 30, description: 'Persistent storage and container networking.' },
        ],
      },
      {
        title: 'Kubernetes Basics',
        lessons: [
          { title: 'Kubernetes Architecture', duration: 30, description: 'Pods, nodes, clusters, control plane.' },
          { title: 'Pods, Deployments, and Services', duration: 40, description: 'Running and exposing applications.' },
          { title: 'ConfigMaps and Secrets', duration: 25, description: 'Managing configuration in Kubernetes.' },
          { title: 'Ingress and Load Balancing', duration: 30, description: 'External access to cluster services.' },
        ],
      },
      {
        title: 'Advanced Kubernetes',
        lessons: [
          { title: 'Helm Charts and Package Management', duration: 35, description: 'Packaging Kubernetes applications.' },
          { title: 'StatefulSets and Persistent Volumes', duration: 30, description: 'Stateful applications in K8s.' },
          { title: 'Monitoring with Prometheus & Grafana', duration: 35, description: 'Cluster observability.' },
          { title: 'Kubernetes Security (RBAC, PodSecurity)', duration: 30, description: 'Securing cluster resources.' },
        ],
      },
    ],
  },
  {
    title: 'CI/CD Pipeline Engineering',
    description: 'Learn to design and implement robust CI/CD pipelines. Covers GitHub Actions, Jenkins, GitLab CI, automated testing, artifact management, and deployment strategies for modern applications.',
    category: 'DevOps',
    level: 'advanced',
    duration: 40,
    price: 9500,
    thumbnail: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'CI/CD Fundamentals',
        lessons: [
          { title: 'What is CI/CD?', duration: 20, description: 'Continuous integration and deployment concepts.' },
          { title: 'Version Control Integration', duration: 25, description: 'Triggering pipelines from git events.' },
          { title: 'Build and Test Automation', duration: 30, description: 'Automating builds and test suites.' },
          { title: 'Artifact Management', duration: 25, description: 'Storing and versioning build artifacts.' },
        ],
      },
      {
        title: 'Pipeline Tools',
        lessons: [
          { title: 'GitHub Actions Workflows', duration: 40, description: 'Writing YAML workflows with actions.' },
          { title: 'Jenkins Pipelines', duration: 40, description: 'Declarative and scripted pipelines.' },
          { title: 'GitLab CI/CD', duration: 35, description: 'GitLab runners and .gitlab-ci.yml.' },
          { title: 'Infrastructure as Code Pipelines', duration: 30, description: 'Terraform and Pulumi in CI/CD.' },
        ],
      },
      {
        title: 'Deployment Strategies',
        lessons: [
          { title: 'Blue-Green and Canary Deployments', duration: 35, description: 'Zero-downtime deployment patterns.' },
          { title: 'Rolling Updates and Rollbacks', duration: 25, description: 'Safe deployment with Kubernetes.' },
          { title: 'Feature Flags and A/B Testing', duration: 30, description: 'Gradual feature rollout.' },
          { title: 'Pipeline Security and Secrets Management', duration: 30, description: 'Vault, AWS Secrets Manager.' },
        ],
      },
    ],
  },
  {
    title: 'Digital Forensics & Incident Response',
    description: 'Learn to investigate cyber incidents and recover evidence. Covers forensic acquisition, memory analysis, disk forensics, malware triage, and incident response lifecycle management.',
    category: 'Security',
    level: 'intermediate',
    duration: 45,
    price: 7500,
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Forensic Fundamentals',
        lessons: [
          { title: 'Digital Evidence and Chain of Custody', duration: 25, description: 'Maintaining evidence integrity.' },
          { title: 'Forensic Acquisition Tools', duration: 35, description: 'FTK Imager, dd, Guymager.' },
          { title: 'File System Analysis', duration: 40, description: 'NTFS, ext4, FAT32 forensics.' },
          { title: 'Memory Acquisition and Analysis', duration: 35, description: 'Volatility framework for RAM analysis.' },
        ],
      },
      {
        title: 'Incident Response',
        lessons: [
          { title: 'Incident Response Lifecycle', duration: 30, description: 'Preparation, detection, containment, recovery.' },
          { title: 'Threat Hunting Techniques', duration: 35, description: 'Proactive threat detection.' },
          { title: 'Log Analysis and SIEM Queries', duration: 40, description: 'ELK, Splunk, and Sigma rules.' },
          { title: 'Containment and Eradication', duration: 30, description: 'Isolating and removing threats.' },
        ],
      },
      {
        title: 'Advanced Forensics',
        lessons: [
          { title: 'Network Forensics', duration: 35, description: 'PCAP analysis, NetFlow, Wireshark.' },
          { title: 'Mobile Device Forensics', duration: 30, description: 'iOS and Android forensic extraction.' },
          { title: 'Cloud Forensics', duration: 30, description: 'AWS, Azure, GCP forensic investigation.' },
          { title: 'Reporting and Legal Testimony', duration: 25, description: 'Writing forensic reports and court testimony.' },
        ],
      },
    ],
  },
  {
    title: 'Cloud Security & DevSecOps',
    description: 'Secure cloud infrastructure and integrate security into DevOps pipelines. Covers cloud security architecture, compliance, IaC security, container security, and automated security testing.',
    category: 'Security',
    level: 'advanced',
    duration: 50,
    price: 8500,
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Cloud Security Foundations',
        lessons: [
          { title: 'Shared Responsibility Model', duration: 25, description: 'Understanding cloud security boundaries.' },
          { title: 'IAM and Access Control', duration: 40, description: 'Least privilege, roles, policies.' },
          { title: 'Data Encryption in Cloud', duration: 35, description: 'KMS, encryption at rest and in transit.' },
          { title: 'Compliance Frameworks (SOC2, HIPAA, GDPR)', duration: 30, description: 'Meeting regulatory requirements in cloud.' },
        ],
      },
      {
        title: 'Cloud Provider Security',
        lessons: [
          { title: 'AWS Security Services', duration: 45, description: 'GuardDuty, Security Hub, WAF, Shield.' },
          { title: 'Azure Security Center', duration: 35, description: 'Azure Defender, Sentinel, policies.' },
          { title: 'GCP Security Tools', duration: 30, description: 'Cloud Armor, Security Command Center.' },
          { title: 'Multi-Cloud Security Strategy', duration: 30, description: 'Consistent security across providers.' },
        ],
      },
      {
        title: 'DevSecOps Practices',
        lessons: [
          { title: 'SAST and DAST Integration', duration: 35, description: 'SonarQube, Snyk, OWASP ZAP in pipelines.' },
          { title: 'Container Image Scanning', duration: 25, description: 'Trivy, Clair, Docker Bench.' },
          { title: 'IaC Security (Terraform, CloudFormation)', duration: 35, description: 'Checkov, tfsec, cfn-nag.' },
          { title: 'Supply Chain Security', duration: 30, description: 'SBOM, SLSA, Sigstore, Cosign.' },
        ],
      },
    ],
  },
  {
    title: 'Git & Version Control Mastery',
    description: 'Master Git for collaborative software development. Covers branching strategies, rebasing, merge conflicts, GitHub workflows, open source contributions, and advanced Git internals.',
    category: 'Software Engineering',
    level: 'beginner',
    duration: 25,
    price: 0,
    thumbnail: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Git Basics',
        lessons: [
          { title: 'What is Version Control?', duration: 15, description: 'Why Git matters in software development.' },
          { title: 'Installing and Configuring Git', duration: 20, description: 'Setup, config, SSH keys.' },
          { title: 'Basic Workflow: add, commit, push, pull', duration: 30, description: 'Core Git operations.' },
          { title: 'Viewing History with git log', duration: 20, description: 'Reading commit history and diffs.' },
        ],
      },
      {
        title: 'Branching and Merging',
        lessons: [
          { title: 'Creating and Managing Branches', duration: 25, description: 'git branch, checkout, switch.' },
          { title: 'Merging and Resolving Conflicts', duration: 35, description: 'Merge strategies and conflict resolution.' },
          { title: 'Rebasing and Cherry-Picking', duration: 30, description: 'Rewriting history safely.' },
          { title: 'Git Flow and Trunk-Based Development', duration: 25, description: 'Popular branching strategies.' },
        ],
      },
      {
        title: 'Collaboration & GitHub',
        lessons: [
          { title: 'Pull Requests and Code Review', duration: 30, description: 'PR workflow and review best practices.' },
          { title: 'Forking and Open Source Contributions', duration: 25, description: 'Contributing to open source projects.' },
          { title: 'GitHub Actions Basics', duration: 30, description: 'Automating workflows with GitHub.' },
          { title: 'Git Hooks and Automation', duration: 20, description: 'Pre-commit, lint-staged, husky.' },
        ],
      },
    ],
  },
  {
    title: 'Microservices Architecture',
    description: 'Design and build distributed microservices systems. Covers service decomposition, inter-service communication, API gateways, event-driven architecture, observability, and container orchestration.',
    category: 'Software Engineering',
    level: 'advanced',
    duration: 55,
    price: 10000,
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Microservices Design',
        lessons: [
          { title: 'Monolith vs Microservices', duration: 25, description: 'When and why to decompose.' },
          { title: 'Domain-Driven Design Basics', duration: 40, description: 'Bounded contexts and aggregates.' },
          { title: 'Service Decomposition Strategies', duration: 35, description: 'Decomposing by business capability.' },
          { title: 'API Design for Microservices', duration: 30, description: 'REST, gRPC, GraphQL choices.' },
        ],
      },
      {
        title: 'Communication Patterns',
        lessons: [
          { title: 'Synchronous Communication (HTTP/gRPC)', duration: 35, description: 'Service-to-service calls.' },
          { title: 'Event-Driven Architecture', duration: 40, description: 'Kafka, RabbitMQ, message brokers.' },
          { title: 'API Gateways and Service Mesh', duration: 35, description: 'Kong, Envoy, Istio.' },
          { title: 'Circuit Breakers and Resilience', duration: 30, description: 'Hystrix, resilience4j, bulkheads.' },
        ],
      },
      {
        title: 'Observability & Operations',
        lessons: [
          { title: 'Distributed Tracing', duration: 30, description: 'Jaeger, OpenTelemetry, Zipkin.' },
          { title: 'Centralized Logging', duration: 25, description: 'ELK stack, Loki, structured logging.' },
          { title: 'Metrics and Monitoring', duration: 30, description: 'Prometheus, Grafana dashboards.' },
          { title: 'Deploying Microservices on Kubernetes', duration: 40, description: 'Helm, Kustomize, service mesh.' },
        ],
      },
    ],
  },
  {
    title: 'UI/UX Design Fundamentals',
    description: 'Learn user interface and user experience design principles. Covers design thinking, wireframing, prototyping, visual hierarchy, color theory, typography, and usability testing for web and mobile.',
    category: 'Design',
    level: 'beginner',
    duration: 35,
    price: 5000,
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Design Thinking & Research',
        lessons: [
          { title: 'What is UX Design?', duration: 20, description: 'UX principles and design thinking process.' },
          { title: 'User Research Methods', duration: 30, description: 'Interviews, surveys, persona creation.' },
          { title: 'User Journey Mapping', duration: 25, description: 'Mapping user flows and pain points.' },
          { title: 'Information Architecture', duration: 25, description: 'Organizing content and navigation.' },
        ],
      },
      {
        title: 'Visual Design Principles',
        lessons: [
          { title: 'Color Theory and Palettes', duration: 30, description: 'Color schemes, contrast, accessibility.' },
          { title: 'Typography and Readability', duration: 25, description: 'Font selection, hierarchy, spacing.' },
          { title: 'Layout and Visual Hierarchy', duration: 30, description: 'Grid systems, white space, alignment.' },
          { title: 'Design Systems and Component Libraries', duration: 35, description: 'Building reusable UI components.' },
        ],
      },
      {
        title: 'Prototyping & Testing',
        lessons: [
          { title: 'Wireframing with Figma', duration: 35, description: 'Low and high-fidelity wireframes.' },
          { title: 'Interactive Prototypes', duration: 30, description: 'Clickable prototypes and animations.' },
          { title: 'Usability Testing', duration: 25, description: 'Planning, conducting, and analyzing tests.' },
          { title: 'Design Handoff to Developers', duration: 20, description: 'Specs, assets, and collaboration tools.' },
        ],
      },
    ],
  },
  {
    title: 'Graphic Design with Figma',
    description: 'Master digital graphic design using Figma. Covers vector illustration, icon design, typography, color theory, brand identity, social media graphics, and design system management.',
    category: 'Design',
    level: 'intermediate',
    duration: 40,
    price: 7500,
    thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Figma Fundamentals',
        lessons: [
          { title: 'Figma Interface and Tools', duration: 25, description: 'Canvas, layers, properties panel.' },
          { title: 'Vector Editing and Pen Tool', duration: 35, description: 'Creating and editing vector shapes.' },
          { title: 'Working with Text and Fonts', duration: 25, description: 'Text styles, Google Fonts, local fonts.' },
          { title: 'Components and Variants', duration: 30, description: 'Reusable design components.' },
        ],
      },
      {
        title: 'Visual Design Projects',
        lessons: [
          { title: 'Logo and Brand Identity Design', duration: 40, description: 'Designing logos and brand guidelines.' },
          { title: 'Social Media Graphics', duration: 30, description: 'Posts, stories, and ad creatives.' },
          { title: 'Presentation and Pitch Deck Design', duration: 25, description: 'Professional slide design.' },
          { title: 'Icon Set Creation', duration: 30, description: 'Consistent icon families and styles.' },
        ],
      },
      {
        title: 'Collaboration & Delivery',
        lessons: [
          { title: 'Figma Collaboration Features', duration: 20, description: 'Real-time collaboration and comments.' },
          { title: 'Design Systems in Figma', duration: 35, description: 'Tokens, styles, and library management.' },
          { title: 'Exporting and Asset Delivery', duration: 25, description: 'SVG, PNG, PDF export and optimization.' },
          { title: 'Developer Handoff with Figma', duration: 25, description: 'Inspect mode, plugins, and code export.' },
        ],
      },
    ],
  },
  {
    title: 'Network Administration',
    description: 'Learn to design, configure, and maintain computer networks. Covers routing, switching, VLANs, subnetting, network troubleshooting, and managing enterprise network infrastructure.',
    category: 'Networking',
    level: 'beginner',
    duration: 40,
    price: 5000,
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'Network Basics',
        lessons: [
          { title: 'Network Topologies and Devices', duration: 25, description: 'Routers, switches, hubs, access points.' },
          { title: 'IP Addressing and Subnetting', duration: 40, description: 'IPv4, IPv6, CIDR, VLSM.' },
          { title: 'Ethernet and Switching', duration: 30, description: 'MAC addresses, ARP, VLANs.' },
          { title: 'Routing Fundamentals', duration: 35, description: 'Static and dynamic routing (OSPF, BGP).' },
        ],
      },
      {
        title: 'Network Services',
        lessons: [
          { title: 'DHCP and DNS Configuration', duration: 30, description: 'Setting up and managing DNS/DHCP.' },
          { title: 'NAT and Port Forwarding', duration: 25, description: 'Network Address Translation.' },
          { title: 'VPNs and Remote Access', duration: 30, description: 'Site-to-site and client VPNs.' },
          { title: 'Wireless Networking', duration: 25, description: 'WiFi standards, security, and optimization.' },
        ],
      },
      {
        title: 'Network Management',
        lessons: [
          { title: 'Network Monitoring Tools', duration: 30, description: 'SNMP, Nagios, Zabbix, PRTG.' },
          { title: 'Troubleshooting Methodology', duration: 35, description: 'ping, traceroute, Wireshark analysis.' },
          { title: 'Network Documentation', duration: 20, description: 'Network diagrams, IPAM, documentation.' },
          { title: 'Disaster Recovery and Redundancy', duration: 25, description: 'Failover, load balancing, backups.' },
        ],
      },
    ],
  },
  {
    title: 'SDN & Network Automation',
    description: 'Modernize networks with software-defined networking and automation. Covers SDN architectures, network programmability, Python automation, Ansible, NETCONF, REST APIs, and intent-based networking.',
    category: 'Networking',
    level: 'advanced',
    duration: 45,
    price: 8500,
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop',
    modules: [
      {
        title: 'SDN Concepts',
        lessons: [
          { title: 'What is SDN?', duration: 25, description: 'Control plane vs data plane separation.' },
          { title: 'SDN Architectures (OpenFlow, ODL, ONOS)', duration: 35, description: 'Open SDN and overlay models.' },
          { title: 'Network Virtualization', duration: 30, description: 'VXLAN, NVGRE, network overlays.' },
          { title: 'Intent-Based Networking', duration: 25, description: 'Cisco DNA, Apstra, Juniper Apstra.' },
        ],
      },
      {
        title: 'Network Automation',
        lessons: [
          { title: 'Python for Network Automation', duration: 40, description: 'Netmiko, NAPALM, Nornir.' },
          { title: 'Ansible for Network Configuration', duration: 35, description: 'Playbooks, modules, inventory.' },
          { title: 'NETCONF and YANG Models', duration: 30, description: 'Programmatic network configuration.' },
          { title: 'REST APIs and Postman for Network Devices', duration: 25, description: 'Cisco, Juniper, Arista APIs.' },
        ],
      },
      {
        title: 'CI/CD for Networks',
        lessons: [
          { title: 'Git-Driven Network Automation', duration: 25, description: 'Version control for network configs.' },
          { title: 'Network Testing and Validation', duration: 30, description: 'batfish, pyATS, automated testing.' },
          { title: 'Monitoring with Telegraf and Grafana', duration: 30, description: 'Network telemetry and dashboards.' },
          { title: 'Network as Code Best Practices', duration: 25, description: 'Pipeline patterns for network changes.' },
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
