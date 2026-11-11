DELETE FROM courses WHERE slug = 'backend-development-foundations-nodejs';
DELETE FROM learning_paths WHERE slug = 'backend-engineering-mastery';
DELETE FROM courses WHERE slug = 'backend-apis-databases-nodejs';
DELETE FROM learning_paths WHERE slug = 'backend-engineering-mastery';
DELETE FROM courses WHERE slug = 'advanced-backend-engineering-system-design';
DELETE FROM learning_paths WHERE slug = 'backend-engineering-mastery';
INSERT INTO courses (id,title,description,thumbnail,price,category,instructor_id,level,duration,published,slug,learning_outcomes,featured,status,discount_percentage,banner_image,promo_video_url,rules)
VALUES ('bacc0001-0001-0000-4000-8000-000000000001','Backend Development Foundations with Node.js','A beginner-friendly, project-based introduction to backend development with Node.js, Express, EJS and MongoDB. You will install the tools, build a real server, connect a database and deploy a working CRUD application. No prior backend experience is required, but you should be comfortable with basic JavaScript.','https://pub-a2269f45348a44958044822fb0428bb7.r2.dev/courses/backend-development-foundations-nodejs.jpg',95000,'Backend Development','3138b673-4204-44b6-8bf9-b6ea520cc2b2','beginner',18,1,'backend-development-foundations-nodejs','["Explain how Node.js and the event loop work", "Build and route an Express application", "Render dynamic pages with EJS", "Model and query data with MongoDB and Mongoose", "Handle forms, POST and DELETE requests", "Deploy a Node/Express/MongoDB project"]',0,'published',0,NULL,NULL,'Learn by building. Watch each lesson, complete the practice task, submit the challenge and ask GiGo for help when you are stuck. Do not copy-paste without understanding — explain your code back to GiGo before moving on.');
INSERT INTO courses (id,title,description,thumbnail,price,category,instructor_id,level,duration,published,slug,learning_outcomes,featured,status,discount_percentage,banner_image,promo_video_url,rules)
VALUES ('bacc0001-0002-0000-4000-8000-000000000002','Backend APIs & Databases with Node.js','Design and build production-style REST APIs with Node.js, Express, MongoDB and Mongoose. This course covers resource modelling, validation, error handling, Postman testing, authentication-ready architecture and a portfolio-grade bookstore API.','https://pub-a2269f45348a44958044822fb0428bb7.r2.dev/courses/backend-apis-databases-nodejs.jpg',165000,'Backend Development','3138b673-4204-44b6-8bf9-b6ea520cc2b2','intermediate',24,1,'backend-apis-databases-nodejs','["Design RESTful resources and routes", "Validate request bodies and return correct status codes", "Model data with Mongoose schemas and indexes", "Write consistent error-handling middleware", "Test CRUD APIs with Postman", "Build a portfolio-grade REST API"]',0,'published',0,NULL,NULL,'Learn by building. Watch each lesson, complete the practice task, submit the challenge and ask GiGo for help when you are stuck. Do not copy-paste without understanding — explain your code back to GiGo before moving on.');
INSERT INTO courses (id,title,description,thumbnail,price,category,instructor_id,level,duration,published,slug,learning_outcomes,featured,status,discount_percentage,banner_image,promo_video_url,rules)
VALUES ('bacc0001-0003-0000-4000-8000-000000000003','Advanced Backend Engineering & System Design','Go beyond CRUD into the engineering that keeps backends fast and reliable: runtime models, TCP/TLS, HTTP/3, load balancing, Envoy, high availability, query cost, race conditions, RabbitMQ and WebSockets. Built for developers who can already write an API and now need to operate one at scale.','https://pub-a2269f45348a44958044822fb0428bb7.r2.dev/courses/advanced-backend-engineering-system-design.jpg',245000,'Backend Development','3138b673-4204-44b6-8bf9-b6ea520cc2b2','advanced',30,1,'advanced-backend-engineering-system-design','["Reason about async, threads and CPU vs I/O workloads", "Explain TCP, TLS, HTTP/3 and connection cost", "Choose L4 vs L7 load balancing and design failover", "Diagnose latency with DevTools and query plans", "Prevent race conditions and double bookings", "Design queue-backed and realtime services"]',0,'published',0,NULL,NULL,'Learn by building. Watch each lesson, complete the practice task, submit the challenge and ask GiGo for help when you are stuck. Do not copy-paste without understanding — explain your code back to GiGo before moving on.');
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1100-0000-4000-8000-000000000000','bacc0001-0001-0000-4000-8000-000000000001','Node.js Foundations',0);
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1101-0000-4000-8000-000000000001','bacc0001-0001-0000-4000-8000-000000000001','Express & Dynamic Views',1);
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1102-0000-4000-8000-000000000002','bacc0001-0001-0000-4000-8000-000000000001','Data & APIs',2);
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1103-0000-4000-8000-000000000003','bacc0001-0001-0000-4000-8000-000000000001','Capstone & Deployment',3);
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2100-0000-4000-8000-000000000000','bacc0001-0001-0000-4000-8000-000000000001','Introduction & Setup','WHAT THIS LESSON COVERS
What Node.js is, why JavaScript can run outside the browser, the V8 + libuv partnership, and how to install the current LTS release on Windows, macOS or Linux.

WHY IT MATTERS
A clean installation is the difference between fighting your machine and learning backend engineering. You also need to understand that Node is not a language — it is a runtime that executes JavaScript on the server.

WATCH FOR
The difference between the Node runtime and the browser; how to check `node -v` and `npm -v`; what `node app.js` actually does; why the LTS release is safer than the newest experimental release.

TOOLS YOU NEED
Node.js LTS (download link), VS Code (editor), Git (version control).

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a folder called `backend-foundations`, open it in VS Code, run `npm init -y`, create `hello.js` that prints your name and today''s date, then run it with `node hello.js`. Commit the folder to Git.

CHECKPOINT
You can explain what Node.js is, run a JavaScript file with Node, and show your terminal output to GiGo if you get stuck.','https://www.youtube.com/watch?v=zb3Qk8SG5Ms','youtube',960,0,'[]',1,'bacc1100-0000-4000-8000-000000000000','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3100-0000-4000-8000-000000000000','bacc0001-0001-0000-4000-8000-000000000001','bacc2100-0000-4000-8000-000000000000','Introduction & Setup — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410000-0000-4000-8000-000000000000','bacc3100-0000-4000-8000-000000000000','What is Node.js?','["A programming language that replaces JavaScript", "A JavaScript runtime built on V8 and libuv", "A database engine", "A CSS framework"]','A JavaScript runtime built on V8 and libuv',1,0,'Node.js executes JavaScript outside the browser using the V8 engine and libuv for asynchronous I/O.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410001-0000-4000-8000-000000000001','bacc3100-0000-4000-8000-000000000000','Which command checks the installed Node version?','["node --version or node -v", "npm install node", "node run", "git node"]','node --version or node -v',1,1,'Both `node --version` and `node -v` print the installed runtime version.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410002-0000-4000-8000-000000000002','bacc3100-0000-4000-8000-000000000000','What does `node app.js` do?','["Starts a browser preview", "Runs app.js in the Node runtime", "Compiles app.js to HTML", "Uploads app.js to GitHub"]','Runs app.js in the Node runtime',1,2,'The node command loads and executes the JavaScript file on the server.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-888290-0000-4000-8000-000000888290', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2100-0000-4000-8000-000000000000', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-416125-0000-4000-8000-000000416125', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2100-0000-4000-8000-000000000000', 'Download Visual Studio Code', 'https://code.visualstudio.com/Download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-101818-0000-4000-8000-000000101818', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2100-0000-4000-8000-000000000000', 'Download Git', 'https://git-scm.com/downloads', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-504739-0000-4000-8000-000000504739', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2100-0000-4000-8000-000000000000', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2101-0000-4000-8000-000000000001','bacc0001-0001-0000-4000-8000-000000000001','Node.js Basics: Globals, Modules, File System & Streams','WHAT THIS LESSON COVERS
The Node global object, CommonJS modules and require, reading and writing files with fs, and why streams and buffers matter for large files.

WHY IT MATTERS
Almost every backend task touches the file system, environment variables or a module boundary. Streams are how production systems move files and request bodies without loading everything into memory.

WATCH FOR
`__dirname` and `__filename`; `module.exports` and `require`; synchronous vs asynchronous fs methods; how a buffer differs from a string; when to use `createReadStream`.

TOOLS YOU NEED
Node.js, VS Code, the Net Ninja starter repository.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Build a small CLI that reads a text file, counts its words and writes a report file. Then rewrite the read step with `createReadStream` and compare memory behaviour.

CHECKPOINT
You can split code into modules, read/write files asynchronously, and explain why streams are used for large data.','https://www.youtube.com/watch?v=OIBIXYLJjsI','youtube',2520,1,'[]',1,'bacc1100-0000-4000-8000-000000000000','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3101-0000-4000-8000-000000000001','bacc0001-0001-0000-4000-8000-000000000001','bacc2101-0000-4000-8000-000000000001','Node.js Basics: Globals, Modules, File System & Streams — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410100-0000-4000-8000-000000000010','bacc3101-0000-4000-8000-000000000001','Which object is available globally in Node but not in the browser?','["window", "document", "process", "localStorage"]','process',1,0,'Node exposes `process`, which gives access to environment variables, arguments and runtime information.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410101-0000-4000-8000-000000000011','bacc3101-0000-4000-8000-000000000001','What does `require()` do in CommonJS?','["Downloads a package from the internet", "Loads a module and returns its exports", "Starts an HTTP server", "Compiles TypeScript"]','Loads a module and returns its exports',1,1,'require resolves a module path and returns the value assigned to module.exports.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410102-0000-4000-8000-000000000012','bacc3101-0000-4000-8000-000000000001','Why use `fs.createReadStream()` for a large file?','["It loads the entire file into memory at once", "It reads the file in chunks to reduce memory pressure", "It converts the file to JSON", "It uploads the file automatically"]','It reads the file in chunks to reduce memory pressure',1,2,'Streams process data incrementally, so memory use stays bounded.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-581796-0000-4000-8000-000000581796', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2101-0000-4000-8000-000000000001', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-645635-0000-4000-8000-000000645635', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2101-0000-4000-8000-000000000001', 'Download Visual Studio Code', 'https://code.visualstudio.com/Download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-27942-0000-4000-8000-000000027942', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2101-0000-4000-8000-000000000001', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2102-0000-4000-8000-000000000002','bacc0001-0001-0000-4000-8000-000000000001','Clients, Servers & Your First HTTP Server','WHAT THIS LESSON COVERS
The client-server model, HTTP requests and responses, ports, localhost, and creating a server with Node''s built-in `http` module.

WHY IT MATTERS
Every API you build is a server listening on a port. Understanding the raw HTTP module makes Express feel like a convenience layer instead of magic.

WATCH FOR
What `localhost` means; why port 3000 is common; the request listener signature `(req, res)`; `server.listen()`; how to stop a server with Ctrl+C.

TOOLS YOU NEED
Node.js, VS Code, Postman or Hoppscotch for testing requests.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create `server.js` that listens on port 3000 and responds with "Hello from Node" for every request. Test it in the browser and in Postman.

CHECKPOINT
You can start and stop a Node server, explain what a port is, and send a request from Postman.','https://www.youtube.com/watch?v=-HPZ1leCV8k','youtube',822,2,'[]',0,'bacc1100-0000-4000-8000-000000000000','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3102-0000-4000-8000-000000000002','bacc0001-0001-0000-4000-8000-000000000001','bacc2102-0000-4000-8000-000000000002','Clients, Servers & Your First HTTP Server — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410200-0000-4000-8000-000000000020','bacc3102-0000-4000-8000-000000000002','What is a port?','["A physical cable", "A numbered endpoint that identifies a network service on a host", "A JavaScript module", "A database table"]','A numbered endpoint that identifies a network service on a host',1,0,'Ports let one host run multiple network services, each identified by a number.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410201-0000-4000-8000-000000000021','bacc3102-0000-4000-8000-000000000002','Which method starts a Node HTTP server listening for connections?','["server.start()", "server.listen()", "server.open()", "server.connect()"]','server.listen()',1,1,'The listen method binds the server to a port and begins accepting connections.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410202-0000-4000-8000-000000000022','bacc3102-0000-4000-8000-000000000002','What is localhost?','["A public DNS record", "The loopback address of your own machine", "A cloud database", "A GitHub repository"]','The loopback address of your own machine',1,2,'localhost resolves to the loopback address 127.0.0.1, meaning this computer.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-409341-0000-4000-8000-000000409341', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2102-0000-4000-8000-000000000002', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-576488-0000-4000-8000-000000576488', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2102-0000-4000-8000-000000000002', 'Download Visual Studio Code', 'https://code.visualstudio.com/Download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-836630-0000-4000-8000-000000836630', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2102-0000-4000-8000-000000000002', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-263596-0000-4000-8000-000000263596', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2102-0000-4000-8000-000000000002', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2103-0000-4000-8000-000000000003','bacc0001-0001-0000-4000-8000-000000000001','Requests, Responses, Routing & Status Codes','WHAT THIS LESSON COVERS
Reading the request URL and method, writing response headers and bodies, returning HTML, basic routing, status codes and redirects.

WHY IT MATTERS
Clients judge your API by its status codes and response shape. A correct 404 or 301 is part of the contract, not decoration.

WATCH FOR
`req.url` vs `req.method`; `res.writeHead()`; `res.end()`; 200 vs 201 vs 204; 301/302 redirects; 404 for unknown routes; why headers must be sent before the body.

TOOLS YOU NEED
Node.js, VS Code, Postman, browser DevTools Network tab.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Extend your server with three routes: `/` returns HTML, `/about` returns text, and any other path returns a 404 response. Add a redirect from `/home` to `/`.

CHECKPOINT
You can route by URL, return the right status code, and explain the difference between a 200 and a 404.','https://www.youtube.com/watch?v=DQD00NAUPNk','youtube',1560,3,'[]',0,'bacc1100-0000-4000-8000-000000000000','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3103-0000-4000-8000-000000000003','bacc0001-0001-0000-4000-8000-000000000001','bacc2103-0000-4000-8000-000000000003','Requests, Responses, Routing & Status Codes — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410300-0000-4000-8000-000000000030','bacc3103-0000-4000-8000-000000000003','Which status code means "Not Found"?','["200", "301", "404", "500"]','404',1,0,'404 tells the client the requested resource does not exist.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410301-0000-4000-8000-000000000031','bacc3103-0000-4000-8000-000000000003','Which response method ends the response and sends the body?','["res.writeHead()", "res.end()", "res.sendFile()", "res.redirect()"]','res.end()',1,1,'res.end() finishes the response; the body can be passed directly to it.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410302-0000-4000-8000-000000000032','bacc3103-0000-4000-8000-000000000003','What does a 301 status code indicate?','["The request succeeded", "The resource moved permanently", "The server crashed", "The user is unauthorized"]','The resource moved permanently',1,2,'301 is a permanent redirect and should include a Location header.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-121121-0000-4000-8000-000000121121', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2103-0000-4000-8000-000000000003', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-627679-0000-4000-8000-000000627679', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2103-0000-4000-8000-000000000003', 'Download Visual Studio Code', 'https://code.visualstudio.com/Download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-892982-0000-4000-8000-000000892982', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2103-0000-4000-8000-000000000003', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-332371-0000-4000-8000-000000332371', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2103-0000-4000-8000-000000000003', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2104-0000-4000-8000-000000000004','bacc0001-0001-0000-4000-8000-000000000001','NPM, package.json & Managing Dependencies','WHAT THIS LESSON COVERS
Third-party packages, global vs local installs, package.json, dependencies, devDependencies, nodemon and semantic versioning.

WHY IT MATTERS
Real Node projects are assembled from packages. Understanding package.json prevents "it works on my machine" bugs and keeps secrets and build output out of Git.

WATCH FOR
`npm init`; `npm install express`; `--save-dev`; caret and tilde ranges; why `node_modules` is not committed; what `package-lock.json` locks.

TOOLS YOU NEED
Node.js, npm, VS Code, Git.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a new project, install Express and nodemon, add `dev` and `start` scripts, then run the app with both scripts.

CHECKPOINT
You can explain dependencies vs devDependencies and show your package.json scripts.','https://www.youtube.com/watch?v=bdHE2wHT-gQ','youtube',960,4,'[]',0,'bacc1101-0000-4000-8000-000000000001','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3104-0000-4000-8000-000000000004','bacc0001-0001-0000-4000-8000-000000000001','bacc2104-0000-4000-8000-000000000004','NPM, package.json & Managing Dependencies — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410400-0000-4000-8000-000000000040','bacc3104-0000-4000-8000-000000000004','Which file records a project''s dependencies and scripts?','["index.html", "package.json", "server.js", "README.md"]','package.json',1,0,'package.json is the project manifest for npm.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410401-0000-4000-8000-000000000041','bacc3104-0000-4000-8000-000000000004','Which flag installs a package as a development dependency?','["--global", "--save-dev", "--production", "--force"]','--save-dev',1,1,'`--save-dev` (or `-D`) records the package in devDependencies.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410402-0000-4000-8000-000000000042','bacc3104-0000-4000-8000-000000000004','Should node_modules normally be committed to Git?','["Yes, always", "No, it can be regenerated from package.json and the lockfile", "Only on Fridays", "Only for Express"]','No, it can be regenerated from package.json and the lockfile',1,2,'node_modules is generated output; commit package.json and package-lock.json instead.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-853497-0000-4000-8000-000000853497', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2104-0000-4000-8000-000000000004', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-780959-0000-4000-8000-000000780959', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2104-0000-4000-8000-000000000004', 'Download Visual Studio Code', 'https://code.visualstudio.com/Download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-49845-0000-4000-8000-000000049845', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2104-0000-4000-8000-000000000004', 'Download Git', 'https://git-scm.com/downloads', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-396199-0000-4000-8000-000000396199', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2104-0000-4000-8000-000000000004', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2105-0000-4000-8000-000000000005','bacc0001-0001-0000-4000-8000-000000000001','Express Apps, Routes & 404 Handling','WHAT THIS LESSON COVERS
Why Express exists, creating an app, GET routes, sending HTML files, redirects and a catch-all 404 handler.

WHY IT MATTERS
Express is the most common Node web framework in Nigerian job listings. You will use its routing and middleware model in almost every backend role.

WATCH FOR
`const app = express()`; `app.get()`; `res.sendFile()` and absolute paths; `app.use()` for 404s; `app.listen()`; route order.

TOOLS YOU NEED
Express (installed with npm), Node.js, VS Code, Postman.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Rebuild your three-page site with Express instead of the raw http module. Add a custom 404 page and a redirect.

CHECKPOINT
You can create an Express app, define routes, serve an HTML file and return a custom 404.','https://www.youtube.com/watch?v=Lr9WUkeYSA8','youtube',1140,5,'[]',0,'bacc1101-0000-4000-8000-000000000001','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3105-0000-4000-8000-000000000005','bacc0001-0001-0000-4000-8000-000000000001','bacc2105-0000-4000-8000-000000000005','Express Apps, Routes & 404 Handling — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410500-0000-4000-8000-000000000050','bacc3105-0000-4000-8000-000000000005','Which Express method defines a GET route?','["app.post()", "app.get()", "app.listen()", "app.use()"]','app.get()',1,0,'app.get(path, handler) registers a handler for GET requests.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410501-0000-4000-8000-000000000051','bacc3105-0000-4000-8000-000000000005','Where should a catch-all 404 middleware be placed?','["Before every route", "After all specific routes", "Inside package.json", "In the database"]','After all specific routes',1,1,'A catch-all must run last so real routes get a chance to match first.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410502-0000-4000-8000-000000000052','bacc3105-0000-4000-8000-000000000005','What does `app.listen(3000)` do?','["Creates a database", "Starts the HTTP server on port 3000", "Installs Express", "Redirects to port 3000"]','Starts the HTTP server on port 3000',1,2,'listen binds the Express app to the port and starts accepting requests.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-659701-0000-4000-8000-000000659701', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2105-0000-4000-8000-000000000005', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-732466-0000-4000-8000-000000732466', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2105-0000-4000-8000-000000000005', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-290563-0000-4000-8000-000000290563', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2105-0000-4000-8000-000000000005', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-686494-0000-4000-8000-000000686494', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2105-0000-4000-8000-000000000005', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2106-0000-4000-8000-000000000006','bacc0001-0001-0000-4000-8000-000000000001','View Engines, EJS & Dynamic Templates','WHAT THIS LESSON COVERS
Server-side rendering with EJS, passing data into templates, using partials, and serving static CSS.

WHY IT MATTERS
Many Nigerian companies still run server-rendered dashboards and admin panels. EJS teaches the request → data → template → HTML flow that underpins every web app.

WATCH FOR
`app.set(''view engine'', ''ejs'')`; `<%= %>` for escaped output vs `<%- %>` for raw HTML; `res.render()`; partials; `express.static()`.

TOOLS YOU NEED
EJS, Express, Node.js, VS Code.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a blog list page that renders an array of posts with EJS. Extract the header and footer into partials and style the page with a static CSS file.

CHECKPOINT
You can render dynamic data safely and explain why escaping matters.','https://www.youtube.com/watch?v=yXEesONd_54','youtube',2100,6,'[]',0,'bacc1101-0000-4000-8000-000000000001','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3106-0000-4000-8000-000000000006','bacc0001-0001-0000-4000-8000-000000000001','bacc2106-0000-4000-8000-000000000006','View Engines, EJS & Dynamic Templates — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410600-0000-4000-8000-000000000060','bacc3106-0000-4000-8000-000000000006','Which EJS tag outputs escaped data?','["<%= value %>", "<%- value %>", "<% value %>", "<%# value %>"]','<%= value %>',1,0,'<%= %> HTML-escapes output, which helps prevent script injection.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410601-0000-4000-8000-000000000061','bacc3106-0000-4000-8000-000000000006','Which Express method renders a view template?','["res.send()", "res.render()", "res.json()", "res.redirect()"]','res.render()',1,1,'res.render() renders a view engine template and sends the resulting HTML.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410602-0000-4000-8000-000000000062','bacc3106-0000-4000-8000-000000000006','What is a partial in EJS?','["A database row", "A reusable template fragment such as a header or footer", "A failed request", "A CSS framework"]','A reusable template fragment such as a header or footer',1,2,'Partials let you reuse template fragments across pages.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-844736-0000-4000-8000-000000844736', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2106-0000-4000-8000-000000000006', 'EJS documentation', 'https://ejs.co/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-880915-0000-4000-8000-000000880915', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2106-0000-4000-8000-000000000006', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-2701-0000-4000-8000-000000002701', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2106-0000-4000-8000-000000000006', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-383577-0000-4000-8000-000000383577', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2106-0000-4000-8000-000000000006', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2107-0000-4000-8000-000000000007','bacc0001-0001-0000-4000-8000-000000000001','Middleware, next() & Static Files','WHAT THIS LESSON COVERS
What middleware is, the request-response pipeline, calling next(), third-party middleware and serving static assets.

WHY IT MATTERS
Authentication, logging, validation and error handling are all middleware. If you cannot reason about middleware order, you cannot debug a production API.

WATCH FOR
Middleware signature `(req, res, next)`; why forgetting `next()` hangs a request; `express.static()`; order of registration; error middleware with four arguments.

TOOLS YOU NEED
Express, Node.js, Postman, browser DevTools.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Add a logger middleware that prints method, path and time for every request. Add `express.static` for a public folder and confirm CSS loads.

CHECKPOINT
You can explain the middleware chain and show a request that passes through two middleware functions.','https://www.youtube.com/watch?v=_GJKAs7A0_4','youtube',900,7,'[]',0,'bacc1101-0000-4000-8000-000000000001','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3107-0000-4000-8000-000000000007','bacc0001-0001-0000-4000-8000-000000000001','bacc2107-0000-4000-8000-000000000007','Middleware, next() & Static Files — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410700-0000-4000-8000-000000000070','bacc3107-0000-4000-8000-000000000007','What happens if a middleware function never calls next() or ends the response?','["The request hangs", "Express automatically continues", "The server restarts", "The database rolls back"]','The request hangs',1,0,'The chain stops until the response ends or next() is called.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410701-0000-4000-8000-000000000071','bacc3107-0000-4000-8000-000000000007','Which Express middleware serves static files?','["express.json()", "express.static()", "express.Router()", "express.urlencoded()"]','express.static()',1,1,'express.static(root) serves files such as CSS, images and JavaScript.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410702-0000-4000-8000-000000000072','bacc3107-0000-4000-8000-000000000007','In what order does Express run middleware?','["Random order", "In the order it is registered", "Alphabetically", "Only after the response"]','In the order it is registered',1,2,'Middleware runs in registration order, which is why placement matters.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-660019-0000-4000-8000-000000660019', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2107-0000-4000-8000-000000000007', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-65292-0000-4000-8000-000000065292', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2107-0000-4000-8000-000000000007', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-216180-0000-4000-8000-000000216180', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2107-0000-4000-8000-000000000007', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-293594-0000-4000-8000-000000293594', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2107-0000-4000-8000-000000000007', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2108-0000-4000-8000-000000000008','bacc0001-0001-0000-4000-8000-000000000001','MongoDB, Mongoose & Saving Data','WHAT THIS LESSON COVERS
NoSQL concepts, MongoDB Atlas setup, connecting with Mongoose, schemas and models, saving and reading documents, and rendering documents in views.

WHY IT MATTERS
Most Node job stacks pair Express with MongoDB. You need to know how data is modelled, validated and queried before you build an API.

WATCH FOR
Database vs collection vs document; connection strings and environment variables; schema vs model; `await Model.find()`; `new Model().save()`; why you never commit credentials.

TOOLS YOU NEED
MongoDB Atlas free cluster, Mongoose, Node.js, VS Code.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a `Book` model with title, author and year. Add three books through a seed script and render them on an EJS page.

CHECKPOINT
You can connect to Atlas, save a document and query it back without exposing your connection string.','https://www.youtube.com/watch?v=bxsemcrY4gQ','youtube',2100,8,'[]',0,'bacc1102-0000-4000-8000-000000000002','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3108-0000-4000-8000-000000000008','bacc0001-0001-0000-4000-8000-000000000001','bacc2108-0000-4000-8000-000000000008','MongoDB, Mongoose & Saving Data — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410800-0000-4000-8000-000000000080','bacc3108-0000-4000-8000-000000000008','In MongoDB, a record is called a what?','["Table", "Row", "Document", "Column"]','Document',1,0,'MongoDB stores records as BSON documents inside collections.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410801-0000-4000-8000-000000000081','bacc3108-0000-4000-8000-000000000008','What does Mongoose provide on top of MongoDB?','["A CSS framework", "Schemas, models and validation", "A browser engine", "A load balancer"]','Schemas, models and validation',1,1,'Mongoose adds schema-based modelling and validation to MongoDB.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410802-0000-4000-8000-000000000082','bacc3108-0000-4000-8000-000000000008','Where should the MongoDB connection string live?','["In a public GitHub file", "In an environment variable or secret", "In the HTML head", "In package-lock.json"]','In an environment variable or secret',1,2,'Connection strings contain credentials and must never be committed.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-156882-0000-4000-8000-000000156882', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2108-0000-4000-8000-000000000008', 'Create a free MongoDB Atlas cluster', 'https://www.mongodb.com/cloud/atlas/register', 'Cloud database');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-102127-0000-4000-8000-000000102127', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2108-0000-4000-8000-000000000008', 'Mongoose documentation', 'https://mongoosejs.com/docs/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-183694-0000-4000-8000-000000183694', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2108-0000-4000-8000-000000000008', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-555318-0000-4000-8000-000000555318', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2108-0000-4000-8000-000000000008', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2109-0000-4000-8000-000000000009','bacc0001-0001-0000-4000-8000-000000000001','GET, POST, DELETE & Route Parameters','WHAT THIS LESSON COVERS
Handling different HTTP methods, reading POST bodies, route parameters, deleting documents and redirecting after a mutation.

WHY IT MATTERS
CRUD is the core of backend work. Knowing which method to use and how to read input safely is what separates an API from a static site.

WATCH FOR
`req.params` vs `req.query` vs `req.body`; `express.urlencoded({ extended: true })`; POST → save → redirect; DELETE with a route parameter; 201 vs 200.

TOOLS YOU NEED
Express, MongoDB Atlas, Postman, Node.js.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Add create and delete flows to your book app: a form posts a new book, and a delete button removes a book by id.

CHECKPOINT
You can create and delete a document through HTTP and explain where each input value comes from.','https://www.youtube.com/watch?v=VVGgacjzc2Y','youtube',1980,9,'[]',0,'bacc1102-0000-4000-8000-000000000002','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3109-0000-4000-8000-000000000009','bacc0001-0001-0000-4000-8000-000000000001','bacc2109-0000-4000-8000-000000000009','GET, POST, DELETE & Route Parameters — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410900-0000-4000-8000-000000000090','bacc3109-0000-4000-8000-000000000009','In the route `/books/:id`, where does Express put the value of id?','["req.body.id", "req.params.id", "req.query.id", "req.headers.id"]','req.params.id',1,0,'Route parameters are available on req.params.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410901-0000-4000-8000-000000000091','bacc3109-0000-4000-8000-000000000009','Which middleware parses URL-encoded form bodies?','["express.static()", "express.urlencoded()", "express.Router()", "express.json()"]','express.urlencoded()',1,1,'express.urlencoded() parses form submissions into req.body.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc410902-0000-4000-8000-000000000092','bacc3109-0000-4000-8000-000000000009','Which status code is best for a successfully created resource?','["200", "201", "301", "404"]','201',1,2,'201 Created indicates a new resource was created.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-520030-0000-4000-8000-000000520030', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2109-0000-4000-8000-000000000009', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-35585-0000-4000-8000-000000035585', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2109-0000-4000-8000-000000000009', 'Create a free MongoDB Atlas cluster', 'https://www.mongodb.com/cloud/atlas/register', 'Cloud database');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-281679-0000-4000-8000-000000281679', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2109-0000-4000-8000-000000000009', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-843007-0000-4000-8000-000000843007', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2109-0000-4000-8000-000000000009', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2110-0000-4000-8000-000000000010','bacc0001-0001-0000-4000-8000-000000000001','Express Router, Controllers & MVC','WHAT THIS LESSON COVERS
Splitting routes into an Express Router, moving handlers into controllers, and organising a project with the MVC pattern.

WHY IT MATTERS
A single app.js stops scaling after a few routes. Employers expect you to separate routing, business logic and data access.

WATCH FOR
`express.Router()`; `module.exports = router`; mounting with `app.use()`; controller functions; why controllers should stay thin; folder structure.

TOOLS YOU NEED
Express, Node.js, VS Code, Git.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Refactor your book app into `routes/books.js`, `controllers/bookController.js` and `models/Book.js`. Keep app.js focused on setup.

CHECKPOINT
You can add a new resource without making app.js longer.','https://www.youtube.com/watch?v=zW_tZR0Ir3Q','youtube',1320,10,'[]',0,'bacc1102-0000-4000-8000-000000000002','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3110-0000-4000-8000-000000000010','bacc0001-0001-0000-4000-8000-000000000001','bacc2110-0000-4000-8000-000000000010','Express Router, Controllers & MVC — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc411000-0000-4000-8000-000000000100','bacc3110-0000-4000-8000-000000000010','What is the purpose of express.Router()?','["To create a database", "To group related routes in a separate module", "To compile EJS", "To start the server"]','To group related routes in a separate module',1,0,'A Router is a mini Express app that can be mounted under a path.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc411001-0000-4000-8000-000000000101','bacc3110-0000-4000-8000-000000000010','In MVC, what should a controller do?','["Store HTML and CSS", "Handle request logic and coordinate models/views", "Replace the database", "Manage Git branches"]','Handle request logic and coordinate models/views',1,1,'Controllers receive requests, call models/services, and choose a response.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc411002-0000-4000-8000-000000000102','bacc3110-0000-4000-8000-000000000010','How do you export an Express router from a module?','["export default router only", "module.exports = router", "router.save()", "app.export(router)"]','module.exports = router',1,2,'CommonJS modules expose the router with module.exports.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-451776-0000-4000-8000-000000451776', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2110-0000-4000-8000-000000000010', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-474964-0000-4000-8000-000000474964', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2110-0000-4000-8000-000000000010', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-97659-0000-4000-8000-000000097659', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2110-0000-4000-8000-000000000010', 'Download Git', 'https://git-scm.com/downloads', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-152921-0000-4000-8000-000000152921', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2110-0000-4000-8000-000000000010', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2111-0000-4000-8000-000000000011','bacc0001-0001-0000-4000-8000-000000000001','Wrap Up, Deployment & Your Next Step','WHAT THIS LESSON COVERS
Finishing the CRUD app, replacing unsafe delete links with forms, preparing environment variables, deploying, and choosing the intermediate course.

WHY IT MATTERS
A project is not finished until someone else can open it. Deployment, environment variables and a clean README turn practice into portfolio evidence.

WATCH FOR
Why GET links should not delete data; `.env` and `.gitignore`; production vs development settings; README structure; next course path.

TOOLS YOU NEED
Git, GitHub, Node.js, a hosting provider such as Render or Railway.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Deploy your book app, add a README with screenshots and setup steps, and submit the live URL plus repository URL as your capstone assignment.

CHECKPOINT
You have a deployed Node/Express/MongoDB app and a README that a stranger can follow.','https://www.youtube.com/watch?v=nYAyhRAV87A','youtube',273,11,'[]',0,'bacc1103-0000-4000-8000-000000000003','The Net Ninja — Node.js Crash Course (YouTube)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3111-0000-4000-8000-000000000011','bacc0001-0001-0000-4000-8000-000000000001','bacc2111-0000-4000-8000-000000000011','Wrap Up, Deployment & Your Next Step — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc411100-0000-4000-8000-000000000110','bacc3111-0000-4000-8000-000000000011','Why should a delete action use a POST/DELETE request instead of a GET link?','["GET is faster", "GET requests can be triggered accidentally and should be safe/idempotent", "DELETE cannot be used in HTML forms", "POST encrypts the request"]','GET requests can be triggered accidentally and should be safe/idempotent',1,0,'Safe methods like GET should not change data; mutations belong in POST/DELETE handlers.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc411101-0000-4000-8000-000000000111','bacc3111-0000-4000-8000-000000000011','Which file should contain secrets such as database passwords?','["README.md", ".env (never committed)", "index.html", "package-lock.json"]','.env (never committed)',1,1,'Secrets belong in environment variables loaded from a gitignored .env file.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc411102-0000-4000-8000-000000000112','bacc3111-0000-4000-8000-000000000011','What should your capstone README include?','["Only a title", "Setup steps, environment variables, screenshots and live URL", "The database password", "A list of excuses"]','Setup steps, environment variables, screenshots and live URL',1,2,'A good README lets another developer run and evaluate the project.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-682966-0000-4000-8000-000000682966', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2111-0000-4000-8000-000000000011', 'Download Git', 'https://git-scm.com/downloads', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-564849-0000-4000-8000-000000564849', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2111-0000-4000-8000-000000000011', 'Create a GitHub account', 'https://github.com/signup', 'Account setup');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-572692-0000-4000-8000-000000572692', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2111-0000-4000-8000-000000000011', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-2559-0000-4000-8000-000000002559', 'bacc0001-0001-0000-4000-8000-000000000001', 'bacc2111-0000-4000-8000-000000000011', 'The Net Ninja Node.js Crash Course code', 'https://github.com/iamshaunjp/node-crash-course', 'Starter code');
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1200-0000-4000-8000-000000000000','bacc0001-0002-0000-4000-8000-000000000002','REST API Design',0);
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1201-0000-4000-8000-000000000001','bacc0001-0002-0000-4000-8000-000000000002','Routes, Requests & Middleware',1);
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1202-0000-4000-8000-000000000002','bacc0001-0002-0000-4000-8000-000000000002','Models, MongoDB & Error Handling',2);
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2200-0000-4000-8000-000000000000','bacc0001-0002-0000-4000-8000-000000000002','What Is a REST API?','WHAT THIS LESSON COVERS
Resources, representations, statelessness, HTTP verbs, URI design and the difference between REST and plain RPC.

WHY IT MATTERS
REST is the default contract for web and mobile clients. A predictable API is easier to test, cache, document and secure.

WATCH FOR
Resource nouns vs action verbs; why `/books/42` is better than `/getBook?id=42`; stateless requests; JSON as a representation; idempotency.

TOOLS YOU NEED
Postman, Swagger Editor, the Net Ninja REST starter code.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
List five resources in a bookstore and write the REST paths and methods for listing, reading, creating, updating and deleting each one.

CHECKPOINT
You can explain why REST paths use nouns and how HTTP methods express intent.','https://www.youtube.com/watch?v=BRdcRFvuqsE','youtube',480,0,'[]',0,'bacc1200-0000-4000-8000-000000000000','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3200-0000-4000-8000-000000000000','bacc0001-0002-0000-4000-8000-000000000002','bacc2200-0000-4000-8000-000000000000','What Is a REST API? — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420000-0000-4000-8000-000000000000','bacc3200-0000-4000-8000-000000000000','Which path is the most RESTful way to read one book?','["/getBook?id=42", "/books/42", "/books/read/42", "/book?id=42"]','/books/42',1,0,'The path identifies the resource; GET expresses the read action.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420001-0000-4000-8000-000000000001','bacc3200-0000-4000-8000-000000000000','What does stateless mean in REST?','["The server stores no session data between requests", "The client cannot send headers", "The API cannot use a database", "Every request must be GET"]','The server stores no session data between requests',1,1,'Each request carries the information needed to process it; the server does not rely on stored session context.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420002-0000-4000-8000-000000000002','bacc3200-0000-4000-8000-000000000000','Which HTTP method is normally used to replace a resource?','["GET", "POST", "PUT", "HEAD"]','PUT',1,2,'PUT replaces the target resource with the supplied representation.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-889689-0000-4000-8000-000000889689', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2200-0000-4000-8000-000000000000', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-187690-0000-4000-8000-000000187690', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2200-0000-4000-8000-000000000000', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-249889-0000-4000-8000-000000249889', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2200-0000-4000-8000-000000000000', 'OpenAPI specification guide', 'https://swagger.io/specification/', 'Documentation');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2201-0000-4000-8000-000000000001','bacc0001-0002-0000-4000-8000-000000000002','Setting Up a Node REST Project','WHAT THIS LESSON COVERS
Project setup, npm init, folder structure, installing Express and nodemon, and connecting the app entry point.

WHY IT MATTERS
A repeatable setup saves hours on every new service. You will use this structure for the rest of the course and in take-home interviews.

WATCH FOR
package.json scripts; separating app.js from server.js; environment variables; `.gitignore`; installing exact dependencies.

TOOLS YOU NEED
Node.js, npm, VS Code, Git, the Net Ninja REST starter repository.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a `books-api` project with `src/app.js`, `src/server.js`, `.env.example`, `.gitignore` and dev/start scripts.

CHECKPOINT
You can start the project with `npm run dev` and explain what each folder is for.','https://www.youtube.com/watch?v=A5fiWcVcADw','youtube',600,1,'[]',0,'bacc1200-0000-4000-8000-000000000000','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3201-0000-4000-8000-000000000001','bacc0001-0002-0000-4000-8000-000000000002','bacc2201-0000-4000-8000-000000000001','Setting Up a Node REST Project — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420100-0000-4000-8000-000000000010','bacc3201-0000-4000-8000-000000000001','Why separate app.js from server.js?','["To make the app easier to test without opening a port", "To double the server speed", "Because Express requires it", "To avoid using npm"]','To make the app easier to test without opening a port',1,0,'Exporting the app separately lets tests import it without binding a port.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420101-0000-4000-8000-000000000011','bacc3201-0000-4000-8000-000000000001','Which npm script is commonly used for auto-restart during development?','["start", "dev with nodemon", "build", "deploy"]','dev with nodemon',1,1,'nodemon restarts the process when files change.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420102-0000-4000-8000-000000000012','bacc3201-0000-4000-8000-000000000001','What should `.env.example` contain?','["Real secrets", "Variable names with safe placeholder values", "The database dump", "node_modules"]','Variable names with safe placeholder values',1,2,'It documents required variables without exposing real credentials.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-729839-0000-4000-8000-000000729839', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2201-0000-4000-8000-000000000001', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-470711-0000-4000-8000-000000470711', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2201-0000-4000-8000-000000000001', 'Download Visual Studio Code', 'https://code.visualstudio.com/Download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-381179-0000-4000-8000-000000381179', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2201-0000-4000-8000-000000000001', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-734903-0000-4000-8000-000000734903', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2201-0000-4000-8000-000000000001', 'Download Git', 'https://git-scm.com/downloads', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2202-0000-4000-8000-000000000002','bacc0001-0002-0000-4000-8000-000000000002','HTTP Methods, Status Codes & Idempotency','WHAT THIS LESSON COVERS
GET, POST, PUT, PATCH, DELETE, safe vs idempotent methods, and the status codes a well-behaved API should return.

WHY IT MATTERS
Clients, proxies and retry logic depend on method semantics. Returning 200 for everything is a common junior mistake that causes data corruption.

WATCH FOR
GET is safe; PUT and DELETE are idempotent; POST is not; 400 vs 401 vs 403 vs 404 vs 409 vs 422 vs 500; 204 for no content.

TOOLS YOU NEED
Postman, Hoppscotch, the REST starter code.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a table of six endpoints and the exact success and failure status codes each should return. Test each one in Postman.

CHECKPOINT
You can justify every status code in your table and explain idempotency with a retry example.','https://www.youtube.com/watch?v=Fizxr21bjWU','youtube',480,2,'[]',0,'bacc1200-0000-4000-8000-000000000000','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3202-0000-4000-8000-000000000002','bacc0001-0002-0000-4000-8000-000000000002','bacc2202-0000-4000-8000-000000000002','HTTP Methods, Status Codes & Idempotency — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420200-0000-4000-8000-000000000020','bacc3202-0000-4000-8000-000000000002','Which method is not idempotent?','["GET", "PUT", "DELETE", "POST"]','POST',1,0,'Repeating a POST can create duplicate resources, so it is not idempotent.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420201-0000-4000-8000-000000000021','bacc3202-0000-4000-8000-000000000002','Which status code means the request is understood but semantically invalid?','["422 Unprocessable Entity", "301 Moved Permanently", "204 No Content", "502 Bad Gateway"]','422 Unprocessable Entity',1,1,'422 is commonly used for validation failures on a syntactically valid request.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420202-0000-4000-8000-000000000022','bacc3202-0000-4000-8000-000000000002','What should a successful DELETE return if there is no response body?','["200 with HTML", "204 No Content", "500", "302 Found"]','204 No Content',1,2,'204 confirms success without a body.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-690952-0000-4000-8000-000000690952', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2202-0000-4000-8000-000000000002', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-170893-0000-4000-8000-000000170893', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2202-0000-4000-8000-000000000002', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-897249-0000-4000-8000-000000897249', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2202-0000-4000-8000-000000000002', 'OWASP API Security Top 10', 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/', 'Reference');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2203-0000-4000-8000-000000000003','bacc0001-0002-0000-4000-8000-000000000002','Creating the Express Application','WHAT THIS LESSON COVERS
Creating an Express app, JSON body parsing, route mounting, environment port configuration and a health-check endpoint.

WHY IT MATTERS
This is the skeleton every API needs. A health endpoint also becomes important when you deploy behind a load balancer.

WATCH FOR
`express.json()`; `app.use()`; `process.env.PORT`; separating routes; returning JSON; health checks.

TOOLS YOU NEED
Express, Node.js, Postman.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Add `GET /health` returning `{ "status": "ok" }` and `GET /api/v1/books` returning an empty array.

CHECKPOINT
You can start the API, hit `/health`, and see JSON in Postman.','https://www.youtube.com/watch?v=7uXKyRFTlWA','youtube',600,3,'[]',0,'bacc1200-0000-4000-8000-000000000000','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3203-0000-4000-8000-000000000003','bacc0001-0002-0000-4000-8000-000000000002','bacc2203-0000-4000-8000-000000000003','Creating the Express Application — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420300-0000-4000-8000-000000000030','bacc3203-0000-4000-8000-000000000003','Which middleware parses JSON request bodies?','["express.static()", "express.json()", "express.urlencoded()", "express.Router()"]','express.json()',1,0,'express.json() populates req.body for JSON payloads.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420301-0000-4000-8000-000000000031','bacc3203-0000-4000-8000-000000000003','Why read the port from `process.env.PORT`?','["To hard-code it", "So the hosting platform can assign a port", "To disable HTTP", "To improve CSS"]','So the hosting platform can assign a port',1,1,'Platforms inject a port at runtime; hard-coding breaks deployment.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420302-0000-4000-8000-000000000032','bacc3203-0000-4000-8000-000000000003','What is a health-check endpoint for?','["Serving the homepage", "Letting load balancers and monitors verify the service is alive", "Storing passwords", "Rendering EJS"]','Letting load balancers and monitors verify the service is alive',1,2,'Health checks are used by infrastructure to route traffic and restart unhealthy instances.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-12899-0000-4000-8000-000000012899', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2203-0000-4000-8000-000000000003', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-186385-0000-4000-8000-000000186385', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2203-0000-4000-8000-000000000003', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-466098-0000-4000-8000-000000466098', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2203-0000-4000-8000-000000000003', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2204-0000-4000-8000-000000000004','bacc0001-0002-0000-4000-8000-000000000002','Handling Requests & Sending JSON Responses','WHAT THIS LESSON COVERS
Reading params, query strings and bodies; shaping JSON responses; setting status codes; handling missing resources.

WHY IT MATTERS
The response shape is your API contract. Consistent envelopes and correct status codes reduce client bugs.

WATCH FOR
`req.params`, `req.query`, `req.body`; `res.status().json()`; returning arrays vs objects; 404 for missing ids; avoiding accidental password fields.

TOOLS YOU NEED
Express, Postman, browser DevTools.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Implement `GET /api/v1/books/:id` that returns 404 when the book does not exist and 200 with JSON when it does.

CHECKPOINT
You can show a 200 and a 404 response for the same endpoint.','https://www.youtube.com/watch?v=Bc2QE-kHbu0','youtube',600,4,'[]',0,'bacc1201-0000-4000-8000-000000000001','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3204-0000-4000-8000-000000000004','bacc0001-0002-0000-4000-8000-000000000002','bacc2204-0000-4000-8000-000000000004','Handling Requests & Sending JSON Responses — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420400-0000-4000-8000-000000000040','bacc3204-0000-4000-8000-000000000004','Which object holds query-string values such as `?page=2`?','["req.params", "req.query", "req.body", "req.headers"]','req.query',1,0,'Query parameters are parsed into req.query.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420401-0000-4000-8000-000000000041','bacc3204-0000-4000-8000-000000000004','Which response sends JSON with a status code?','["res.send()", "res.json()", "res.render()", "res.end()"]','res.json()',1,1,'res.json() serialises the value and sets the JSON content type.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420402-0000-4000-8000-000000000042','bacc3204-0000-4000-8000-000000000004','What should you do before sending a user object?','["Include the password hash", "Remove sensitive fields", "Convert it to HTML", "Add the JWT secret"]','Remove sensitive fields',1,2,'Never leak password hashes, tokens or internal fields.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-814884-0000-4000-8000-000000814884', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2204-0000-4000-8000-000000000004', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-456900-0000-4000-8000-000000456900', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2204-0000-4000-8000-000000000004', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-524250-0000-4000-8000-000000524250', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2204-0000-4000-8000-000000000004', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2205-0000-4000-8000-000000000005','bacc0001-0002-0000-4000-8000-000000000002','Designing Routes & Resource URLs','WHAT THIS LESSON COVERS
Route grouping, plural resource names, nested routes, versioning, and avoiding route collisions.

WHY IT MATTERS
Good URL design makes an API self-documenting and keeps future changes backward compatible.

WATCH FOR
`/api/v1/books`; nesting limits; route order; `express.Router()`; versioning strategy; naming consistency.

TOOLS YOU NEED
Express, Swagger Editor, Postman.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Write the route table for a library API with books, authors and loans. Group them under `/api/v1` and note which routes are nested.

CHECKPOINT
Your route table has no verbs in paths and no duplicate or ambiguous routes.','https://www.youtube.com/watch?v=BNikS1X5NVk','youtube',720,5,'[]',0,'bacc1201-0000-4000-8000-000000000001','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3205-0000-4000-8000-000000000005','bacc0001-0002-0000-4000-8000-000000000002','bacc2205-0000-4000-8000-000000000005','Designing Routes & Resource URLs — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420500-0000-4000-8000-000000000050','bacc3205-0000-4000-8000-000000000005','Which URL is better for a collection?','["/api/v1/getBooks", "/api/v1/books", "/api/v1/book-list", "/books/getAll"]','/api/v1/books',1,0,'Plural nouns identify collections without embedding actions.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420501-0000-4000-8000-000000000051','bacc3205-0000-4000-8000-000000000005','Why version an API?','["To make URLs longer", "To allow breaking changes without breaking existing clients", "To improve database speed", "To avoid using HTTP"]','To allow breaking changes without breaking existing clients',1,1,'Versioning lets old and new contracts coexist during migrations.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420502-0000-4000-8000-000000000052','bacc3205-0000-4000-8000-000000000005','What is a nested route example?','["/books/42/reviews", "/getReviews", "/reviews?book=42", "/bookReviews"]','/books/42/reviews',1,2,'Nested routes express a relationship between resources.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-152248-0000-4000-8000-000000152248', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2205-0000-4000-8000-000000000005', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-376051-0000-4000-8000-000000376051', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2205-0000-4000-8000-000000000005', 'OpenAPI specification guide', 'https://swagger.io/specification/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-415184-0000-4000-8000-000000415184', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2205-0000-4000-8000-000000000005', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2206-0000-4000-8000-000000000006','bacc0001-0002-0000-4000-8000-000000000002','Testing APIs with Postman','WHAT THIS LESSON COVERS
Creating collections, environments, saving requests, sending JSON bodies, inspecting responses and writing basic tests.

WHY IT MATTERS
Manual testing in a browser cannot send POST/PUT/DELETE bodies. Postman collections also become living API documentation.

WATCH FOR
Collections vs folders; environment variables; raw JSON body; headers; status code assertions; saving example responses.

TOOLS YOU NEED
Postman or Hoppscotch, the running API.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a Postman collection with one request per CRUD endpoint and an environment variable for the base URL. Add a test that asserts 200.

CHECKPOINT
You can run the full CRUD collection against your local API.','https://www.youtube.com/watch?v=3Nvx0mNXPc4','youtube',360,6,'[]',0,'bacc1201-0000-4000-8000-000000000001','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3206-0000-4000-8000-000000000006','bacc0001-0002-0000-4000-8000-000000000002','bacc2206-0000-4000-8000-000000000006','Testing APIs with Postman — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420600-0000-4000-8000-000000000060','bacc3206-0000-4000-8000-000000000006','What is a Postman environment used for?','["Storing reusable variables such as baseUrl and tokens", "Compiling JavaScript", "Hosting the API", "Creating a database"]','Storing reusable variables such as baseUrl and tokens',1,0,'Environments keep values like URLs and tokens out of every request.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420601-0000-4000-8000-000000000061','bacc3206-0000-4000-8000-000000000006','Which body type should you use to send JSON?','["form-data", "raw → JSON", "binary", "GraphQL"]','raw → JSON',1,1,'Raw JSON with the application/json header sends a JSON body.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420602-0000-4000-8000-000000000062','bacc3206-0000-4000-8000-000000000006','What does a Postman test script do?','["Styles the request", "Asserts response behaviour such as status codes", "Deploys the API", "Creates a Git branch"]','Asserts response behaviour such as status codes',1,2,'Test scripts run assertions against the response.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-221083-0000-4000-8000-000000221083', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2206-0000-4000-8000-000000000006', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-290592-0000-4000-8000-000000290592', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2206-0000-4000-8000-000000000006', 'Open Hoppscotch in the browser', 'https://hoppscotch.io/', 'Browser tool');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-116603-0000-4000-8000-000000116603', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2206-0000-4000-8000-000000000006', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2207-0000-4000-8000-000000000007','bacc0001-0002-0000-4000-8000-000000000002','POST Requests, Validation & Middleware','WHAT THIS LESSON COVERS
Accepting JSON bodies, validating required fields, returning 400/422, using middleware for validation, and creating resources.

WHY IT MATTERS
Never trust client input. Validation at the boundary is the cheapest security and data-integrity control you have.

WATCH FOR
`express.json()`; checking types and lengths; trimming strings; returning field-level errors; 201 Created; middleware reuse.

TOOLS YOU NEED
Express, Postman, OWASP API Security Top 10.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Add `POST /api/v1/books` with validation for title, author and year. Return field-level errors and a 201 on success.

CHECKPOINT
Your endpoint rejects invalid bodies and creates valid ones.','https://www.youtube.com/watch?v=bWiW7tLtlJM','youtube',840,7,'[]',0,'bacc1201-0000-4000-8000-000000000001','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3207-0000-4000-8000-000000000007','bacc0001-0002-0000-4000-8000-000000000002','bacc2207-0000-4000-8000-000000000007','POST Requests, Validation & Middleware — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420700-0000-4000-8000-000000000070','bacc3207-0000-4000-8000-000000000007','Which status code is appropriate for a validation error?','["201", "400 or 422", "301", "204"]','400 or 422',1,0,'400/422 tell the client the request data is invalid.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420701-0000-4000-8000-000000000071','bacc3207-0000-4000-8000-000000000007','Why validate on the server even if the form validates in the browser?','["Browsers are always secure", "Clients can bypass browser validation", "It makes CSS faster", "It is required by Express"]','Clients can bypass browser validation',1,1,'Attackers and scripts can send any payload directly to the API.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420702-0000-4000-8000-000000000072','bacc3207-0000-4000-8000-000000000007','What should a create endpoint return on success?','["200 with no body", "201 with the created resource", "404", "500"]','201 with the created resource',1,2,'201 Created plus the new representation is the conventional response.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-69596-0000-4000-8000-000000069596', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2207-0000-4000-8000-000000000007', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-713045-0000-4000-8000-000000713045', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2207-0000-4000-8000-000000000007', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-722417-0000-4000-8000-000000722417', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2207-0000-4000-8000-000000000007', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2208-0000-4000-8000-000000000008','bacc0001-0002-0000-4000-8000-000000000002','Mongoose Models, Schemas & Validation','WHAT THIS LESSON COVERS
Defining schemas, required fields, types, defaults, timestamps, indexes and model methods.

WHY IT MATTERS
The schema is the contract for your data. Good schemas prevent invalid documents and make queries predictable.

WATCH FOR
`new mongoose.Schema()`; required and enum; `timestamps: true`; indexes; `unique` is not a validator; model compilation.

TOOLS YOU NEED
Mongoose, MongoDB Atlas, VS Code.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a Book schema with title, author, year, ISBN and timestamps. Add an index on title and test duplicate/invalid data.

CHECKPOINT
Your schema rejects invalid documents and your index exists in Atlas.','https://www.youtube.com/watch?v=aoB0IkQ_1jE','youtube',720,8,'[]',0,'bacc1202-0000-4000-8000-000000000002','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3208-0000-4000-8000-000000000008','bacc0001-0002-0000-4000-8000-000000000002','bacc2208-0000-4000-8000-000000000008','Mongoose Models, Schemas & Validation — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420800-0000-4000-8000-000000000080','bacc3208-0000-4000-8000-000000000008','What does `timestamps: true` add?','["createdAt and updatedAt fields", "A password field", "A CSS file", "A route"]','createdAt and updatedAt fields',1,0,'Mongoose automatically manages createdAt and updatedAt.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420801-0000-4000-8000-000000000081','bacc3208-0000-4000-8000-000000000008','Does `unique: true` validate before saving?','["Yes, always", "No, it relies on a database unique index", "Only in production", "Only for numbers"]','No, it relies on a database unique index',1,1,'Unique is enforced by the index; handle duplicate-key errors explicitly.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420802-0000-4000-8000-000000000082','bacc3208-0000-4000-8000-000000000008','Which Mongoose type stores a true/false value?','["String", "Boolean", "ObjectId", "Array"]','Boolean',1,2,'Boolean maps to true/false values.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-838852-0000-4000-8000-000000838852', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2208-0000-4000-8000-000000000008', 'Mongoose documentation', 'https://mongoosejs.com/docs/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-612627-0000-4000-8000-000000612627', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2208-0000-4000-8000-000000000008', 'Create a free MongoDB Atlas cluster', 'https://www.mongodb.com/cloud/atlas/register', 'Cloud database');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-843241-0000-4000-8000-000000843241', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2208-0000-4000-8000-000000000008', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2209-0000-4000-8000-000000000009','bacc0001-0002-0000-4000-8000-000000000002','Saving Data & Querying MongoDB','WHAT THIS LESSON COVERS
Connecting once, creating documents, querying with filters, selecting fields, sorting and handling async errors.

WHY IT MATTERS
Most API latency is database work. Efficient queries and correct error handling keep the service responsive.

WATCH FOR
`mongoose.connect()`; connection reuse; `await Model.create()`; `.find().sort().select()`; try/catch around awaits; not leaking stack traces.

TOOLS YOU NEED
MongoDB Atlas, Mongoose, Postman, MongoDB Compass (optional).

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Seed 10 books and implement `GET /api/v1/books?author=...&sort=year` with a limit. Return only title, author and year.

CHECKPOINT
You can explain the query you ran and show the returned JSON.','https://www.youtube.com/watch?v=cOt8LfcA9wY','youtube',720,9,'[]',0,'bacc1202-0000-4000-8000-000000000002','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3209-0000-4000-8000-000000000009','bacc0001-0002-0000-4000-8000-000000000002','bacc2209-0000-4000-8000-000000000009','Saving Data & Querying MongoDB — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420900-0000-4000-8000-000000000090','bacc3209-0000-4000-8000-000000000009','Where should `mongoose.connect()` normally be called?','["Inside every request handler", "Once during application startup", "In the browser", "In package.json"]','Once during application startup',1,0,'Reuse one connection pool; connecting per request wastes resources.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420901-0000-4000-8000-000000000091','bacc3209-0000-4000-8000-000000000009','Which method limits returned fields?','[".select()", ".limit()", ".sort()", ".populate()"]','.select()',1,1,'.select() chooses which fields are returned.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc420902-0000-4000-8000-000000000092','bacc3209-0000-4000-8000-000000000009','What should an API do with a database error?','["Return the raw stack trace", "Log it and return a safe 500 response", "Ignore it", "Restart the database"]','Log it and return a safe 500 response',1,2,'Log internal details server-side but return a safe error to clients.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-83335-0000-4000-8000-000000083335', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2209-0000-4000-8000-000000000009', 'Create a free MongoDB Atlas cluster', 'https://www.mongodb.com/cloud/atlas/register', 'Cloud database');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-93293-0000-4000-8000-000000093293', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2209-0000-4000-8000-000000000009', 'Mongoose documentation', 'https://mongoosejs.com/docs/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-562745-0000-4000-8000-000000562745', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2209-0000-4000-8000-000000000009', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2210-0000-4000-8000-000000000010','bacc0001-0002-0000-4000-8000-000000000002','Error Handling & Consistent Error Responses','WHAT THIS LESSON COVERS
Central error middleware, async error forwarding, error envelopes, logging and avoiding information leaks.

WHY IT MATTERS
Clients need predictable errors. Central handling prevents copy-pasted try/catch blocks and accidental secret leakage.

WATCH FOR
Four-argument error middleware; `next(err)`; async wrapper; `err.status`; error codes; production vs development messages.

TOOLS YOU NEED
Express, Postman, OWASP API Security Top 10.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Add a central error handler and an async wrapper. Make a route throw a 404 and a validation error, then verify the JSON shape.

CHECKPOINT
Every failure returns the same JSON envelope with an appropriate status code.','https://www.youtube.com/watch?v=w1V2SdzdQBs','youtube',480,10,'[]',0,'bacc1202-0000-4000-8000-000000000002','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3210-0000-4000-8000-000000000010','bacc0001-0002-0000-4000-8000-000000000002','bacc2210-0000-4000-8000-000000000010','Error Handling & Consistent Error Responses — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc421000-0000-4000-8000-000000000100','bacc3210-0000-4000-8000-000000000010','How many arguments does Express error middleware take?','["Two", "Three", "Four", "Five"]','Four',1,0,'The signature is (err, req, res, next); the fourth argument identifies it as error middleware.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc421001-0000-4000-8000-000000000101','bacc3210-0000-4000-8000-000000000010','How do you forward an async error to Express?','["throw in the browser", "Call next(err) or use an async wrapper", "Call res.send(err)", "Restart the server"]','Call next(err) or use an async wrapper',1,1,'Rejected promises are not caught automatically in older Express versions, so forward them.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc421002-0000-4000-8000-000000000102','bacc3210-0000-4000-8000-000000000010','Why hide stack traces in production?','["They make JSON invalid", "They can expose internal paths and secrets", "They slow down CSS", "They are illegal"]','They can expose internal paths and secrets',1,2,'Stack traces are useful to attackers and should only be logged server-side.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-196729-0000-4000-8000-000000196729', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2210-0000-4000-8000-000000000010', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-589082-0000-4000-8000-000000589082', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2210-0000-4000-8000-000000000010', 'OWASP API Security Top 10', 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/', 'Reference');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-311593-0000-4000-8000-000000311593', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2210-0000-4000-8000-000000000010', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2211-0000-4000-8000-000000000011','bacc0001-0002-0000-4000-8000-000000000002','PUT, PATCH, DELETE & Safe Updates','WHAT THIS LESSON COVERS
Updating and deleting resources, validating ids, handling not-found cases, and choosing PUT vs PATCH semantics.

WHY IT MATTERS
Updates are where race conditions and accidental data loss happen. Correct semantics make retries and partial updates safe.

WATCH FOR
`findByIdAndUpdate`; `runValidators: true`; PUT replaces, PATCH modifies; 404 for missing ids; 204 for delete; soft delete considerations.

TOOLS YOU NEED
Express, Mongoose, Postman.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Implement PUT, PATCH and DELETE for books. Add tests for a valid id, an invalid id and a missing id.

CHECKPOINT
Your update endpoint validates input and your delete endpoint returns 204.','https://www.youtube.com/watch?v=sEkRmVfc8XE','youtube',600,11,'[]',0,'bacc1202-0000-4000-8000-000000000002','The Net Ninja — REST API Tutorials (Node, Express & Mongo)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3211-0000-4000-8000-000000000011','bacc0001-0002-0000-4000-8000-000000000002','bacc2211-0000-4000-8000-000000000011','PUT, PATCH, DELETE & Safe Updates — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc421100-0000-4000-8000-000000000110','bacc3211-0000-4000-8000-000000000011','What is the main difference between PUT and PATCH?','["PUT replaces the resource; PATCH applies a partial update", "PUT is faster", "PATCH cannot use JSON", "They are identical"]','PUT replaces the resource; PATCH applies a partial update',1,0,'PUT sends a full representation; PATCH sends only changes.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc421101-0000-4000-8000-000000000111','bacc3211-0000-4000-8000-000000000011','Which option makes Mongoose run schema validators on update?','["runValidators: true", "validate: false", "new: false", "strict: false"]','runValidators: true',1,1,'By default update validators are off; enable them explicitly.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc421102-0000-4000-8000-000000000112','bacc3211-0000-4000-8000-000000000011','What should DELETE return when the resource no longer exists?','["201", "404", "500", "302"]','404',1,2,'If the target does not exist, 404 is appropriate.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-420993-0000-4000-8000-000000420993', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2211-0000-4000-8000-000000000011', 'Express documentation', 'https://expressjs.com/', 'Documentation');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-559593-0000-4000-8000-000000559593', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2211-0000-4000-8000-000000000011', 'Create a free MongoDB Atlas cluster', 'https://www.mongodb.com/cloud/atlas/register', 'Cloud database');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-363202-0000-4000-8000-000000363202', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2211-0000-4000-8000-000000000011', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-64786-0000-4000-8000-000000064786', 'bacc0001-0002-0000-4000-8000-000000000002', 'bacc2211-0000-4000-8000-000000000011', 'The Net Ninja REST API code', 'https://github.com/iamshaunjp/rest-api-playlist', 'Starter code');
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1300-0000-4000-8000-000000000000','bacc0001-0003-0000-4000-8000-000000000003','Protocols, TLS & Runtime',0);
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1301-0000-4000-8000-000000000001','bacc0001-0003-0000-4000-8000-000000000003','Traffic, Proxies & High Availability',1);
INSERT INTO modules (id, course_id, title, order_index) VALUES ('bacc1302-0000-4000-8000-000000000002','bacc0001-0003-0000-4000-8000-000000000003','Data Consistency, Queues & Realtime',2);
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2300-0000-4000-8000-000000000000','bacc0001-0003-0000-4000-8000-000000000003','Async, Threads & Processes: The Runtime Model','WHAT THIS LESSON COVERS
Synchronous execution, threads, async I/O, multiprocessing, shared memory and the trade-offs that shape backend capacity planning.

WHY IT MATTERS
You cannot tune a backend you do not understand. Node''s single-threaded event loop is excellent for I/O and dangerous for CPU-heavy work.

WATCH FOR
Event loop vs thread pool; why async is not the same as parallel; CPU-bound vs I/O-bound work; worker threads; when to move work to a queue or separate service.

TOOLS YOU NEED
Node.js, Docker, a load-testing tool, a process monitor such as `top` or Activity Monitor.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Write a CPU-heavy endpoint and an I/O-heavy endpoint. Measure both with k6 and explain why one blocks the event loop.

CHECKPOINT
You can classify a workload as CPU-bound or I/O-bound and choose an execution strategy.','https://www.youtube.com/watch?v=0vFgKr5bjWI','youtube',1200,0,'[]',0,'bacc1300-0000-4000-8000-000000000000','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3300-0000-4000-8000-000000000000','bacc0001-0003-0000-4000-8000-000000000003','bacc2300-0000-4000-8000-000000000000','Async, Threads & Processes: The Runtime Model — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430000-0000-4000-8000-000000000000','bacc3300-0000-4000-8000-000000000000','Which workload is the best fit for Node''s async I/O model?','["Video encoding", "Database and network calls", "Image resizing in the main thread", "Large matrix multiplication"]','Database and network calls',1,0,'Async I/O shines when the process waits on external resources.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430001-0000-4000-8000-000000000001','bacc3300-0000-4000-8000-000000000000','What does a worker thread allow Node to do?','["Run CPU work without blocking the main event loop", "Replace MongoDB", "Compile CSS", "Create a load balancer"]','Run CPU work without blocking the main event loop',1,1,'Worker threads run JavaScript in parallel threads for CPU-heavy tasks.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430002-0000-4000-8000-000000000002','bacc3300-0000-4000-8000-000000000000','Why is multiprocessing different from multithreading?','["Processes have separate memory; threads share memory", "Processes cannot use the network", "Threads are always slower", "There is no difference"]','Processes have separate memory; threads share memory',1,2,'Separate processes isolate memory and crashes; threads share address space.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-162716-0000-4000-8000-000000162716', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2300-0000-4000-8000-000000000000', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-732464-0000-4000-8000-000000732464', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2300-0000-4000-8000-000000000000', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-115656-0000-4000-8000-000000115656', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2300-0000-4000-8000-000000000000', 'Download Wireshark', 'https://www.wireshark.org/download.html', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2301-0000-4000-8000-000000000001','bacc0001-0003-0000-4000-8000-000000000003','Stateless vs Stateful Protocols & Backends','WHAT THIS LESSON COVERS
Stateful and stateless protocols, connection state, sticky sessions, horizontal scaling and protocol choice (TCP, UDP, HTTP, QUIC).

WHY IT MATTERS
Stateless services scale horizontally; stateful ones need affinity or shared storage. Choosing the wrong model creates painful production failures.

WATCH FOR
Connection state vs application state; sticky sessions; shared session stores; TCP vs UDP; HTTP/1.1 keep-alive; QUIC streams.

TOOLS YOU NEED
Wireshark, NGINX, Docker.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Diagram a stateless API tier and a stateful WebSocket tier. Mark where sessions, sticky routing and shared storage belong.

CHECKPOINT
You can explain why a WebSocket service needs different scaling rules from a REST API.','https://www.youtube.com/watch?v=3E7HF26XNfU','youtube',1500,1,'[]',0,'bacc1300-0000-4000-8000-000000000000','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3301-0000-4000-8000-000000000001','bacc0001-0003-0000-4000-8000-000000000003','bacc2301-0000-4000-8000-000000000001','Stateless vs Stateful Protocols & Backends — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430100-0000-4000-8000-000000000010','bacc3301-0000-4000-8000-000000000001','What is a stateless backend?','["One that stores no per-client session state between requests", "One without a database", "One that cannot scale", "One that only uses UDP"]','One that stores no per-client session state between requests',1,0,'Each request carries its own context, so any instance can serve it.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430101-0000-4000-8000-000000000011','bacc3301-0000-4000-8000-000000000001','Why do stateful WebSocket servers need sticky sessions or shared state?','["Because the connection lives on a specific server instance", "Because WebSockets use JSON only", "Because HTTP cannot scale", "Because TCP is stateless"]','Because the connection lives on a specific server instance',1,1,'The live connection is tied to the process that accepted it.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430102-0000-4000-8000-000000000012','bacc3301-0000-4000-8000-000000000001','Which protocol is connectionless?','["TCP", "UDP", "HTTP/1.1 over TCP", "WebSocket"]','UDP',1,2,'UDP does not establish a connection before sending datagrams.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-3857-0000-4000-8000-000000003857', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2301-0000-4000-8000-000000000001', 'Download Wireshark', 'https://www.wireshark.org/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-750514-0000-4000-8000-000000750514', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2301-0000-4000-8000-000000000001', 'Download NGINX', 'https://nginx.org/en/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-222744-0000-4000-8000-000000222744', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2301-0000-4000-8000-000000000001', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2302-0000-4000-8000-000000000002','bacc0001-0003-0000-4000-8000-000000000003','The TCP 3-Way Handshake & Connection Cost','WHAT THIS LESSON COVERS
SYN, SYN-ACK, ACK, connection establishment, latency, keep-alive, connection pools and the cost of opening too many connections.

WHY IT MATTERS
Every new TCP connection costs a round trip. Connection reuse and pooling are foundational backend performance techniques.

WATCH FOR
The three packets; sequence numbers; why handshakes hurt high-latency users; keep-alive; pool sizing; TIME_WAIT and port exhaustion.

TOOLS YOU NEED
Wireshark, Node.js, NGINX, a database client.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Capture a local HTTP request in Wireshark and identify SYN, SYN-ACK and ACK. Then enable keep-alive and compare connection counts.

CHECKPOINT
You can explain why a connection pool is faster than connecting per request.','https://www.youtube.com/watch?v=bW_BILl7n0Y','youtube',900,2,'[]',0,'bacc1300-0000-4000-8000-000000000000','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3302-0000-4000-8000-000000000002','bacc0001-0003-0000-4000-8000-000000000003','bacc2302-0000-4000-8000-000000000002','The TCP 3-Way Handshake & Connection Cost — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430200-0000-4000-8000-000000000020','bacc3302-0000-4000-8000-000000000002','What are the three steps of the TCP handshake?','["SYN, SYN-ACK, ACK", "GET, POST, PUT", "DNS, TLS, HTTP", "OPEN, READ, CLOSE"]','SYN, SYN-ACK, ACK',1,0,'The client sends SYN, the server replies SYN-ACK, and the client sends ACK.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430201-0000-4000-8000-000000000021','bacc3302-0000-4000-8000-000000000002','Why is connection pooling useful?','["It avoids repeating the handshake for every request", "It encrypts passwords", "It replaces DNS", "It makes UDP reliable"]','It avoids repeating the handshake for every request',1,1,'Reusing established connections saves round trips and resources.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430202-0000-4000-8000-000000000022','bacc3302-0000-4000-8000-000000000002','What does keep-alive do?','["Keeps a TCP connection open for multiple requests", "Keeps the server awake forever", "Prevents all timeouts", "Compresses JSON"]','Keeps a TCP connection open for multiple requests',1,2,'Persistent connections reduce handshake overhead.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-615348-0000-4000-8000-000000615348', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2302-0000-4000-8000-000000000002', 'Download Wireshark', 'https://www.wireshark.org/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-324249-0000-4000-8000-000000324249', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2302-0000-4000-8000-000000000002', 'Download NGINX', 'https://nginx.org/en/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-456119-0000-4000-8000-000000456119', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2302-0000-4000-8000-000000000002', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2303-0000-4000-8000-000000000003','bacc0001-0003-0000-4000-8000-000000000003','TLS, HTTPS & the Handshake','WHAT THIS LESSON COVERS
Symmetric vs asymmetric cryptography, certificates, the TLS handshake, HTTPS termination, HSTS and certificate rotation.

WHY IT MATTERS
HTTPS is non-negotiable for auth and payments. Understanding termination points helps you design secure proxies and load balancers.

WATCH FOR
Certificate chain; public/private keys; session keys; SNI; TLS termination at the proxy; HSTS; certificate expiry and rotation.

TOOLS YOU NEED
Wireshark, NGINX, OpenSSL, OWASP TLS guidance.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Terminate TLS with NGINX in Docker, inspect the certificate with `openssl s_client`, and enable HSTS in the config.

CHECKPOINT
You can explain where TLS terminates and why the backend may still see HTTP internally.','https://www.youtube.com/watch?v=64geP_LAZ5U','youtube',1800,3,'[]',0,'bacc1300-0000-4000-8000-000000000000','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3303-0000-4000-8000-000000000003','bacc0001-0003-0000-4000-8000-000000000003','bacc2303-0000-4000-8000-000000000003','TLS, HTTPS & the Handshake — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430300-0000-4000-8000-000000000030','bacc3303-0000-4000-8000-000000000003','What does TLS provide?','["Confidentiality, integrity and authentication", "Database indexing", "Load balancing", "CSS minification"]','Confidentiality, integrity and authentication',1,0,'TLS encrypts traffic and authenticates the server with certificates.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430301-0000-4000-8000-000000000031','bacc3303-0000-4000-8000-000000000003','Where is TLS commonly terminated?','["At the load balancer or reverse proxy", "Inside the database", "In the browser cache", "In package.json"]','At the load balancer or reverse proxy',1,1,'Proxies often terminate TLS and forward HTTP internally.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430302-0000-4000-8000-000000000032','bacc3303-0000-4000-8000-000000000003','What does HSTS tell the browser?','["Always use HTTPS for this domain", "Disable cookies", "Use HTTP/3 only", "Cache JSON forever"]','Always use HTTPS for this domain',1,2,'HSTS forces HTTPS for future requests to the domain.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-104736-0000-4000-8000-000000104736', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2303-0000-4000-8000-000000000003', 'Download Wireshark', 'https://www.wireshark.org/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-655201-0000-4000-8000-000000655201', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2303-0000-4000-8000-000000000003', 'Download NGINX', 'https://nginx.org/en/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-397981-0000-4000-8000-000000397981', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2303-0000-4000-8000-000000000003', 'OWASP API Security Top 10', 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/', 'Reference');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2304-0000-4000-8000-000000000004','bacc0001-0003-0000-4000-8000-000000000003','Layer 4 vs Layer 7 Load Balancing','WHAT THIS LESSON COVERS
L4 TCP/ UDP load balancing, L7 HTTP-aware routing, health checks, algorithms and the trade-offs of each layer.

WHY IT MATTERS
Load balancing is how a service survives traffic and failures. L7 enables path routing and header awareness; L4 is simpler and faster.

WATCH FOR
L4 sees IP/port; L7 sees HTTP paths and headers; round robin vs least connections; health checks; TLS termination; sticky sessions.

TOOLS YOU NEED
HAProxy, NGINX, Docker.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Run two Node services behind HAProxy. Test round-robin, then add a health check and kill one backend to observe failover.

CHECKPOINT
You can explain when you would choose L4 and when L7.','https://www.youtube.com/watch?v=aKMLgFVxZYk','youtube',2400,4,'[]',0,'bacc1301-0000-4000-8000-000000000001','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3304-0000-4000-8000-000000000004','bacc0001-0003-0000-4000-8000-000000000003','bacc2304-0000-4000-8000-000000000004','Layer 4 vs Layer 7 Load Balancing — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430400-0000-4000-8000-000000000040','bacc3304-0000-4000-8000-000000000004','What can an L7 load balancer inspect that an L4 balancer cannot?','["HTTP paths and headers", "IP addresses", "TCP ports", "Packet size"]','HTTP paths and headers',1,0,'L7 understands application protocols such as HTTP.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430401-0000-4000-8000-000000000041','bacc3304-0000-4000-8000-000000000004','Which algorithm sends each new request to the next server in order?','["Round robin", "Least connections", "Random", "Consistent hashing"]','Round robin',1,1,'Round robin rotates through the backend list.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430402-0000-4000-8000-000000000042','bacc3304-0000-4000-8000-000000000004','What is a health check for?','["Removing unhealthy backends from rotation", "Encrypting traffic", "Compressing images", "Creating database indexes"]','Removing unhealthy backends from rotation',1,2,'Health checks detect failing instances so traffic can be routed away.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-361179-0000-4000-8000-000000361179', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2304-0000-4000-8000-000000000004', 'Download HAProxy', 'https://www.haproxy.org/download/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-77782-0000-4000-8000-000000077782', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2304-0000-4000-8000-000000000004', 'Download NGINX', 'https://nginx.org/en/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-771391-0000-4000-8000-000000771391', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2304-0000-4000-8000-000000000004', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2305-0000-4000-8000-000000000005','bacc0001-0003-0000-4000-8000-000000000003','Envoy Proxy Architecture','WHAT THIS LESSON COVERS
Envoy listeners, clusters, routes, filters, connection pools, downstream/upstream concepts and L7 proxying.

WHY IT MATTERS
Envoy powers many service meshes and API gateways. Its terminology appears in Kubernetes, Istio and cloud networking roles.

WATCH FOR
Downstream vs upstream; listener → filter chain → route → cluster; connection pools; threading model; observability.

TOOLS YOU NEED
Docker, Envoy, NGINX for comparison.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Run Envoy in Docker and proxy two Node services. Add a route rule that sends `/api` to one cluster and `/` to another.

CHECKPOINT
You can explain the request path through Envoy in your own words.','https://www.youtube.com/watch?v=40gKzHQWgP0','youtube',2400,5,'[]',0,'bacc1301-0000-4000-8000-000000000001','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3305-0000-4000-8000-000000000005','bacc0001-0003-0000-4000-8000-000000000003','bacc2305-0000-4000-8000-000000000005','Envoy Proxy Architecture — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430500-0000-4000-8000-000000000050','bacc3305-0000-4000-8000-000000000005','In Envoy, what is an upstream?','["The backend service receiving proxied traffic", "The browser", "The DNS server", "The database schema"]','The backend service receiving proxied traffic',1,0,'Upstreams are the services Envoy forwards requests to.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430501-0000-4000-8000-000000000051','bacc3305-0000-4000-8000-000000000005','What is a listener in Envoy?','["A network address and port that accepts connections", "A database table", "A JavaScript module", "A log file"]','A network address and port that accepts connections',1,1,'Listeners define where Envoy accepts downstream connections.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430502-0000-4000-8000-000000000052','bacc3305-0000-4000-8000-000000000005','What does a cluster group in Envoy?','["A set of equivalent upstream hosts", "A group of CSS files", "A user role", "A database index"]','A set of equivalent upstream hosts',1,2,'Clusters group upstream endpoints that can serve the same traffic.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-700705-0000-4000-8000-000000700705', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2305-0000-4000-8000-000000000005', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-141647-0000-4000-8000-000000141647', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2305-0000-4000-8000-000000000005', 'Download NGINX', 'https://nginx.org/en/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-696608-0000-4000-8000-000000696608', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2305-0000-4000-8000-000000000005', 'Download HAProxy', 'https://www.haproxy.org/download/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2306-0000-4000-8000-000000000006','bacc0001-0003-0000-4000-8000-000000000003','Virtual IPs, High Availability & Failover','WHAT THIS LESSON COVERS
Virtual IP addresses, active-passive failover, floating IPs, health checks and why high availability is more than running two servers.

WHY IT MATTERS
Downtime costs money and trust. Virtual IPs let traffic move to a healthy node without changing DNS.

WATCH FOR
VIP ownership; failover; keepalived/VRRP concepts; split brain; health checks; DNS TTL vs instant failover.

TOOLS YOU NEED
NGINX, HAProxy, Docker, a Linux VM or local virtual network.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Diagram an active-passive pair with a floating IP. List the health checks and failure scenarios that must be handled.

CHECKPOINT
You can explain how a VIP improves recovery time compared with DNS changes.','https://www.youtube.com/watch?v=bXQ0HvsWI60','youtube',1200,6,'[]',0,'bacc1301-0000-4000-8000-000000000001','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3306-0000-4000-8000-000000000006','bacc0001-0003-0000-4000-8000-000000000003','bacc2306-0000-4000-8000-000000000006','Virtual IPs, High Availability & Failover — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430600-0000-4000-8000-000000000060','bacc3306-0000-4000-8000-000000000006','What is a virtual IP address?','["An IP that can move between machines for failover", "A fake domain name", "A database key", "A TLS certificate"]','An IP that can move between machines for failover',1,0,'A VIP is owned by one node at a time and can be reassigned.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430601-0000-4000-8000-000000000061','bacc3306-0000-4000-8000-000000000006','Why is DNS alone a poor failover mechanism?','["Caching and TTL delays can keep clients on the failed IP", "DNS cannot store IPs", "DNS only works on weekends", "DNS is encrypted"]','Caching and TTL delays can keep clients on the failed IP',1,1,'Resolvers and clients cache DNS, so failover is not instant.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430602-0000-4000-8000-000000000062','bacc3306-0000-4000-8000-000000000006','What is split brain?','["Two nodes both believe they are primary", "A broken CPU", "A database index", "A load-balancing algorithm"]','Two nodes both believe they are primary',1,2,'Split brain can cause conflicting writes and data corruption.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-411926-0000-4000-8000-000000411926', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2306-0000-4000-8000-000000000006', 'Download NGINX', 'https://nginx.org/en/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-789783-0000-4000-8000-000000789783', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2306-0000-4000-8000-000000000006', 'Download HAProxy', 'https://www.haproxy.org/download/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-804330-0000-4000-8000-000000804330', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2306-0000-4000-8000-000000000006', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2307-0000-4000-8000-000000000007','bacc0001-0003-0000-4000-8000-000000000003','HTTP/3, QUIC & Modern Transport','WHAT THIS LESSON COVERS
QUIC over UDP, HTTP/3 streams, head-of-line blocking, 0-RTT, connection migration and when HTTP/3 helps.

WHY IT MATTERS
HTTP/3 is increasingly common at CDNs and large platforms. Understanding transport trade-offs helps you diagnose latency.

WATCH FOR
TCP head-of-line blocking; QUIC streams; TLS 1.3 integration; 0-RTT risks; UDP blocking by networks; CDN adoption.

TOOLS YOU NEED
Wireshark, NGINX with HTTP/3 support, curl with HTTP/3.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Compare HTTP/1.1, HTTP/2 and HTTP/3 waterfall timings for the same site using browser DevTools and explain the differences.

CHECKPOINT
You can explain why QUIC reduces head-of-line blocking and what trade-off it introduces.','https://www.youtube.com/watch?v=19Et2M3amA4','youtube',1200,7,'[]',0,'bacc1301-0000-4000-8000-000000000001','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3307-0000-4000-8000-000000000007','bacc0001-0003-0000-4000-8000-000000000003','bacc2307-0000-4000-8000-000000000007','HTTP/3, QUIC & Modern Transport — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430700-0000-4000-8000-000000000070','bacc3307-0000-4000-8000-000000000007','What transport does QUIC use?','["UDP", "TCP", "ICMP", "SCTP"]','UDP',1,0,'QUIC runs over UDP and implements reliability in user space.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430701-0000-4000-8000-000000000071','bacc3307-0000-4000-8000-000000000007','What problem does HTTP/3 primarily address?','["TCP head-of-line blocking", "Database indexing", "CSS specificity", "Password hashing"]','TCP head-of-line blocking',1,1,'Independent QUIC streams avoid one lost packet blocking all streams.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430702-0000-4000-8000-000000000072','bacc3307-0000-4000-8000-000000000007','What is a risk of 0-RTT?','["Replay attacks if requests are not idempotent", "Slower DNS", "Larger images", "No encryption"]','Replay attacks if requests are not idempotent',1,2,'Early data can be replayed, so it should be limited to safe requests.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-1485-0000-4000-8000-000000001485', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2307-0000-4000-8000-000000000007', 'Download Wireshark', 'https://www.wireshark.org/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-253309-0000-4000-8000-000000253309', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2307-0000-4000-8000-000000000007', 'Download NGINX', 'https://nginx.org/en/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-881822-0000-4000-8000-000000881822', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2307-0000-4000-8000-000000000007', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2308-0000-4000-8000-000000000008','bacc0001-0003-0000-4000-8000-000000000003','DevTools Waterfall & Backend Performance Diagnosis','WHAT THIS LESSON COVERS
Reading the network waterfall, DNS/TLS/TTFB breakdown, HTTP/1.1 connection limits, domain sharding and backend latency signals.

WHY IT MATTERS
The browser waterfall is the fastest way to tell whether a slow page is a frontend, network or backend problem.

WATCH FOR
Queueing, DNS, initial connection, TLS, TTFB, content download; HTTP/1.1 six-connection limit; HTTP/2 multiplexing; server timing.

TOOLS YOU NEED
Chrome DevTools, Postman, k6.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Record a waterfall for your API and identify TTFB. Add server-timing headers and compare before/after.

CHECKPOINT
You can point to the exact phase where latency is introduced.','https://www.youtube.com/watch?v=6TEwVDNA7bI','youtube',1500,8,'[]',0,'bacc1302-0000-4000-8000-000000000002','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3308-0000-4000-8000-000000000008','bacc0001-0003-0000-4000-8000-000000000003','bacc2308-0000-4000-8000-000000000008','DevTools Waterfall & Backend Performance Diagnosis — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430800-0000-4000-8000-000000000080','bacc3308-0000-4000-8000-000000000008','What does TTFB measure?','["Time to first byte from the server", "Time to first CSS rule", "Total database size", "TLS certificate age"]','Time to first byte from the server',1,0,'TTFB is the time from request start to the first response byte.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430801-0000-4000-8000-000000000081','bacc3308-0000-4000-8000-000000000008','Why can many small resources be slow on HTTP/1.1?','["The browser limits parallel connections per host", "HTTP/1.1 has no headers", "CSS cannot be cached", "DNS is disabled"]','The browser limits parallel connections per host',1,1,'Browsers cap concurrent connections, so requests queue.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430802-0000-4000-8000-000000000082','bacc3308-0000-4000-8000-000000000008','Which tool shows the request waterfall?','["Browser DevTools Network panel", "MongoDB Compass", "package.json", "Git log"]','Browser DevTools Network panel',1,2,'The Network panel visualises each request phase.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-623965-0000-4000-8000-000000623965', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2308-0000-4000-8000-000000000008', 'Download Postman', 'https://www.postman.com/downloads/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-229315-0000-4000-8000-000000229315', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2308-0000-4000-8000-000000000008', 'Download Wireshark', 'https://www.wireshark.org/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-319199-0000-4000-8000-000000319199', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2308-0000-4000-8000-000000000008', 'Install k6 load-testing tool', 'https://grafana.com/docs/k6/latest/set-up/install-k6/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2309-0000-4000-8000-000000000009','bacc0001-0003-0000-4000-8000-000000000003','COUNT, Indexes & Query Cost','WHAT THIS LESSON COVERS
Why COUNT can be expensive, index-only scans, heap lookups, query plans and alternatives for approximate counts.

WHY IT MATTERS
A dashboard that calls COUNT(*) on every page load can overload a database. Understanding query cost prevents production incidents.

WATCH FOR
Sequential scan vs index scan vs index-only scan; COUNT(column) vs COUNT(*); EXPLAIN ANALYZE; approximate counts; caching.

TOOLS YOU NEED
pgAdmin or DBeaver, PostgreSQL in Docker, EXPLAIN ANALYZE.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a table with 100k rows, compare `COUNT(*)` and `COUNT(column)` plans, then cache an approximate count in Redis.

CHECKPOINT
You can read an EXPLAIN plan and explain why an index-only scan is cheaper.','https://www.youtube.com/watch?v=8xKS7QQKgzk','youtube',900,9,'[]',0,'bacc1302-0000-4000-8000-000000000002','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3309-0000-4000-8000-000000000009','bacc0001-0003-0000-4000-8000-000000000003','bacc2309-0000-4000-8000-000000000009','COUNT, Indexes & Query Cost — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430900-0000-4000-8000-000000000090','bacc3309-0000-4000-8000-000000000009','Why can COUNT(*) still be expensive on a large table?','["The database may scan many index entries", "COUNT is not SQL", "It always writes rows", "It disables indexes"]','The database may scan many index entries',1,0,'Counting still requires reading index or table data unless a cached count exists.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430901-0000-4000-8000-000000000091','bacc3309-0000-4000-8000-000000000009','What is an index-only scan?','["A scan that answers the query from the index without heap lookups", "A scan that skips the index", "A scan that only reads one row", "A scan that writes to disk"]','A scan that answers the query from the index without heap lookups',1,1,'If all needed columns are in the index, the database can avoid the table.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc430902-0000-4000-8000-000000000092','bacc3309-0000-4000-8000-000000000009','What should a dashboard do instead of COUNT(*) on every request?','["Cache or precompute an approximate count", "Run COUNT in the browser", "Delete the table", "Disable indexes"]','Cache or precompute an approximate count',1,2,'Caching or maintaining counters keeps dashboard queries cheap.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-499756-0000-4000-8000-000000499756', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2309-0000-4000-8000-000000000009', 'Download pgAdmin', 'https://www.pgadmin.org/download/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-630060-0000-4000-8000-000000630060', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2309-0000-4000-8000-000000000009', 'Download DBeaver', 'https://dbeaver.io/download/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-326698-0000-4000-8000-000000326698', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2309-0000-4000-8000-000000000009', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2310-0000-4000-8000-000000000010','bacc0001-0003-0000-4000-8000-000000000003','Double Booking, Race Conditions & Row Locks','WHAT THIS LESSON COVERS
Concurrent transactions, read-modify-write races, row-level locks, unique constraints, idempotency and booking-system design.

WHY IT MATTERS
Race conditions silently corrupt data under load. They are hard to reproduce and expensive to fix after launch.

WATCH FOR
Two requests reading the same row; last-write-wins; `SELECT ... FOR UPDATE`; transactions; unique constraints; idempotency keys.

TOOLS YOU NEED
PostgreSQL, pgAdmin/DBeaver, Docker, k6 for concurrency.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Build a seat-booking endpoint, fire 50 concurrent requests at one seat with k6, then fix it with a transaction and row lock.

CHECKPOINT
Only one concurrent request can book the same seat, and the others receive a clear conflict response.','https://www.youtube.com/watch?v=_95dCYv2Xv4','youtube',900,10,'[]',0,'bacc1302-0000-4000-8000-000000000002','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3310-0000-4000-8000-000000000010','bacc0001-0003-0000-4000-8000-000000000003','bacc2310-0000-4000-8000-000000000010','Double Booking, Race Conditions & Row Locks — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431000-0000-4000-8000-000000000100','bacc3310-0000-4000-8000-000000000010','What causes a double booking?','["Two transactions read the same state before either writes", "Using HTTPS", "Too many indexes", "A missing CSS file"]','Two transactions read the same state before either writes',1,0,'A read-modify-write race lets both requests believe the seat is free.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431001-0000-4000-8000-000000000101','bacc3310-0000-4000-8000-000000000010','Which SQL clause can lock a row for update?','["SELECT ... FOR UPDATE", "SELECT ... LIMIT 1", "INSERT IGNORE", "ORDER BY"]','SELECT ... FOR UPDATE',1,1,'FOR UPDATE locks the selected row until the transaction ends.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431002-0000-4000-8000-000000000102','bacc3310-0000-4000-8000-000000000010','What is an idempotency key for?','["Making retries safe by recognising repeated requests", "Encrypting passwords", "Compressing JSON", "Creating indexes"]','Making retries safe by recognising repeated requests',1,2,'The server stores the key so a retried request does not repeat the side effect.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-47235-0000-4000-8000-000000047235', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2310-0000-4000-8000-000000000010', 'Download pgAdmin', 'https://www.pgadmin.org/download/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-532924-0000-4000-8000-000000532924', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2310-0000-4000-8000-000000000010', 'Download DBeaver', 'https://dbeaver.io/download/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-518385-0000-4000-8000-000000518385', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2310-0000-4000-8000-000000000010', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2311-0000-4000-8000-000000000011','bacc0001-0003-0000-4000-8000-000000000003','RabbitMQ, Queues & Asynchronous Work','WHAT THIS LESSON COVERS
Why message queues exist, AMQP concepts, publishers, consumers, queues, acknowledgements, retries and dead-letter queues.

WHY IT MATTERS
Queues decouple slow work from request latency and make systems resilient to spikes and partial failures.

WATCH FOR
Publisher → exchange → queue → consumer; ack/nack; prefetch; durable queues; retries; dead-letter queues; at-least-once delivery.

TOOLS YOU NEED
RabbitMQ, Docker, Node.js amqplib.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Create a queue for order emails. Publish 20 jobs, consume them with a worker, and send failed jobs to a dead-letter queue after three attempts.

CHECKPOINT
Your API responds immediately while the worker processes jobs in the background.','https://www.youtube.com/watch?v=Cie5v59mrTg','youtube',1500,11,'[]',0,'bacc1302-0000-4000-8000-000000000002','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3311-0000-4000-8000-000000000011','bacc0001-0003-0000-4000-8000-000000000003','bacc2311-0000-4000-8000-000000000011','RabbitMQ, Queues & Asynchronous Work — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431100-0000-4000-8000-000000000110','bacc3311-0000-4000-8000-000000000011','What is the main purpose of a message queue?','["Decouple producers and consumers and absorb load spikes", "Replace all databases", "Compile JavaScript", "Serve CSS"]','Decouple producers and consumers and absorb load spikes',1,0,'Queues buffer work and let services process it asynchronously.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431101-0000-4000-8000-000000000111','bacc3311-0000-4000-8000-000000000011','What does an acknowledgement tell RabbitMQ?','["The consumer successfully processed the message", "The message was encrypted", "The queue is empty", "The publisher crashed"]','The consumer successfully processed the message',1,1,'Ack removes the message from the queue after successful processing.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431102-0000-4000-8000-000000000112','bacc3311-0000-4000-8000-000000000011','What is a dead-letter queue?','["A queue for messages that repeatedly fail processing", "A queue that is never consumed", "A database backup", "A load balancer"]','A queue for messages that repeatedly fail processing',1,2,'DLQs isolate poison messages for inspection and recovery.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-550702-0000-4000-8000-000000550702', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2311-0000-4000-8000-000000000011', 'Download RabbitMQ', 'https://www.rabbitmq.com/download.html', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-365512-0000-4000-8000-000000365512', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2311-0000-4000-8000-000000000011', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-532257-0000-4000-8000-000000532257', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2311-0000-4000-8000-000000000011', 'Download Redis', 'https://redis.io/downloads/', 'Tool download');
INSERT INTO lessons (id,course_id,title,description,video_url,video_provider,duration,order_index,resources,is_free,module_id,reference_source)
VALUES ('bacc2312-0000-4000-8000-000000000012','bacc0001-0003-0000-4000-8000-000000000003','WebSockets & Server-Authoritative State','WHAT THIS LESSON COVERS
WebSocket upgrade, persistent connections, broadcasting state, server-authoritative game design, reconnection and scaling realtime services.

WHY IT MATTERS
Chat, live classes and collaborative tools need push updates. WebSockets are the standard tool, but they change how you scale and deploy.

WATCH FOR
HTTP upgrade; `ws` events; server-authoritative state; broadcast vs targeted messages; heartbeat/ping; Redis pub/sub for multiple instances; reconnect backoff.

TOOLS YOU NEED
Node.js, `ws`, Docker, Redis.

HOW TO USE THE TOOLS
1. Install the tool from the download link in the Resources tab.
2. Open the folder for this course in VS Code.
3. Follow the video once without typing, then replay it and build alongside the instructor.
4. Save your work in Git after each working step.

PRACTICE TASK
Build a two-client room where the server owns the state and broadcasts updates. Kill one client and verify reconnect works.

CHECKPOINT
Two browser tabs stay in sync through the server, and the server remains the source of truth.','https://www.youtube.com/watch?v=cXxEiWudIUY','youtube',5400,12,'[]',0,'bacc1302-0000-4000-8000-000000000002','Hussein Nasser — Backend Engineering (Advanced / Intermediate)');
INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ('bacc3312-0000-4000-8000-000000000012','bacc0001-0003-0000-4000-8000-000000000003','bacc2312-0000-4000-8000-000000000012','WebSockets & Server-Authoritative State — Knowledge Check','Three questions on the key ideas from this lesson. You can retry up to three times; aim for 70% or higher.',10,70,3,1);
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431200-0000-4000-8000-000000000120','bacc3312-0000-4000-8000-000000000012','How does a WebSocket connection begin?','["With an HTTP upgrade request", "With a UDP packet", "With a DNS query", "With a database transaction"]','With an HTTP upgrade request',1,0,'The client asks the server to upgrade the HTTP connection to WebSocket.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431201-0000-4000-8000-000000000121','bacc3312-0000-4000-8000-000000000012','Why is server-authoritative state useful?','["It prevents clients from inventing their own truth", "It makes CSS faster", "It removes the need for authentication", "It disables TCP"]','It prevents clients from inventing their own truth',1,1,'The server validates and broadcasts state, reducing cheating and conflicts.');
INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) VALUES ('bacc431202-0000-4000-8000-000000000122','bacc3312-0000-4000-8000-000000000012','Why do multiple WebSocket instances often need Redis pub/sub?','["To broadcast messages across instances", "To store CSS", "To compile TypeScript", "To replace TLS"]','To broadcast messages across instances',1,2,'Pub/sub lets each instance forward events to clients connected elsewhere.');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-423867-0000-4000-8000-000000423867', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2312-0000-4000-8000-000000000012', 'Download Node.js LTS', 'https://nodejs.org/en/download', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-338894-0000-4000-8000-000000338894', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2312-0000-4000-8000-000000000012', 'Download Docker Desktop', 'https://www.docker.com/products/docker-desktop/', 'Tool download');
INSERT INTO resources (id, course_id, lesson_id, title, file_url, file_type) VALUES ('bacc7001-377322-0000-4000-8000-000000377322', 'bacc0001-0003-0000-4000-8000-000000000003', 'bacc2312-0000-4000-8000-000000000012', 'Download Redis', 'https://redis.io/downloads/', 'Tool download');
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc51000-0000-4000-8000-000000000000','bacc2103-0000-4000-8000-000000000003','Route a request by method and path','Implement the routing decision for a tiny HTTP server.','Read two lines from stdin: the HTTP method and the path. Print `200 OK` for GET `/` or GET `/about`; print `404 Not Found` for every other combination.','const fs = require(''fs'');
const [method, path] = fs.readFileSync(0, ''utf8'').trim().split(''\n'');
// TODO: decide the status line
console.log('''');
','', 'javascript','easy','200 OK','[{"input": "GET\n/\n", "expected": "200 OK"}, {"input": "GET\n/about\n", "expected": "200 OK"}, {"input": "POST\n/\n", "expected": "404 Not Found"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc51001-0000-4000-8000-000000000001','bacc2105-0000-4000-8000-000000000005','Match an Express route','Translate a request into the Express handler that should run.','Read method and path. Print `listCourses` for GET `/courses`, `getCourse` for GET `/courses/42`, `createCourse` for POST `/courses`, and `notFound` for anything else.','const fs = require(''fs'');
const [method, path] = fs.readFileSync(0, ''utf8'').trim().split(''\n'');
// TODO: match routes
console.log('''');
','', 'javascript','easy','listCourses','[{"input": "GET\n/courses\n", "expected": "listCourses"}, {"input": "GET\n/courses/42\n", "expected": "getCourse"}, {"input": "POST\n/courses\n", "expected": "createCourse"}, {"input": "GET\n/unknown\n", "expected": "notFound"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc51002-0000-4000-8000-000000000002','bacc2107-0000-4000-8000-000000000007','Run middleware in order','Model the order of an Express middleware chain.','Read three middleware names, one per line. Print them joined by ` -> ` in the order they run.','const fs = require(''fs'');
const names = fs.readFileSync(0, ''utf8'').trim().split(''\n'');
// TODO: join with '' -> ''
console.log('''');
','', 'javascript','easy','logger -> auth -> handler','[{"input": "logger\nauth\nhandler\n", "expected": "logger -> auth -> handler"}, {"input": "cors\njson\nroute\n", "expected": "cors -> json -> route"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc51003-0000-4000-8000-000000000003','bacc2109-0000-4000-8000-000000000009','Extract route parameters','Read dynamic segments from a URL path.','Read a path such as `/users/42/posts/7`. Print `user=42 post=7`. If the path does not match that shape, print `invalid`.','const fs = require(''fs'');
const path = fs.readFileSync(0, ''utf8'').trim();
// TODO: parse /users/:userId/posts/:postId
console.log('''');
','', 'javascript','easy','user=42 post=7','[{"input": "/users/42/posts/7\n", "expected": "user=42 post=7"}, {"input": "/users/9/posts/3\n", "expected": "user=9 post=3"}, {"input": "/courses/1\n", "expected": "invalid"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc51004-0000-4000-8000-000000000004','bacc2110-0000-4000-8000-000000000010','Build a controller response','Return a predictable controller result.','Read a numeric course id. Print `course:<id>` if the id is positive, otherwise print `not-found`.','const fs = require(''fs'');
const id = Number(fs.readFileSync(0, ''utf8'').trim());
// TODO: return the controller response
console.log('''');
','', 'javascript','easy','course:42','[{"input": "42\n", "expected": "course:42"}, {"input": "0\n", "expected": "not-found"}, {"input": "-3\n", "expected": "not-found"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc52005-0000-4000-8000-000000000005','bacc2207-0000-4000-8000-000000000007','Validate a create-book payload','Implement server-side validation before saving.','Read one JSON line with `title`, `author` and `year`. Print `valid` if title and author are non-empty strings and year is an integer from 1500 to 2100; otherwise print `invalid`.','const fs = require(''fs'');
const body = JSON.parse(fs.readFileSync(0, ''utf8''));
// TODO: validate
console.log('''');
','', 'javascript','medium','valid','[{"input": "{\"title\":\"Clean Code\",\"author\":\"Robert Martin\",\"year\":2008}\n", "expected": "valid"}, {"input": "{\"title\":\"\",\"author\":\"Ada\",\"year\":2020}\n", "expected": "invalid"}, {"input": "{\"title\":\"X\",\"author\":\"Y\",\"year\":\"2020\"}\n", "expected": "invalid"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc52006-0000-4000-8000-000000000006','bacc2205-0000-4000-8000-000000000005','Calculate pagination offsets','Translate page and limit into database skip/limit values.','Read two integers: page and limit. Print `offset=<n> limit=<n>` where offset is (page - 1) * limit. Treat page and limit as at least 1.','const fs = require(''fs'');
const [page, limit] = fs.readFileSync(0, ''utf8'').trim().split(/\s+/).map(Number);
// TODO: calculate
console.log('''');
','', 'javascript','medium','offset=0 limit=10','[{"input": "1 10\n", "expected": "offset=0 limit=10"}, {"input": "3 20\n", "expected": "offset=40 limit=20"}, {"input": "0 0\n", "expected": "offset=0 limit=1"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc52007-0000-4000-8000-000000000007','bacc2207-0000-4000-8000-000000000007','Parse a URL-encoded body','Turn a form body into a predictable object string.','Read one line such as `name=Ada&email=ada%40example.com`. Decode it and print `name=Ada|email=ada@example.com`.','const fs = require(''fs'');
const raw = fs.readFileSync(0, ''utf8'').trim();
// TODO: parse and decode
console.log('''');
','', 'javascript','medium','name=Ada|email=ada@example.com','[{"input": "name=Ada&email=ada%40example.com\n", "expected": "name=Ada|email=ada@example.com"}, {"input": "title=Clean+Code&author=Robert\n", "expected": "title=Clean Code|author=Robert"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc52008-0000-4000-8000-000000000008','bacc2210-0000-4000-8000-000000000010','Format an API error','Return a consistent error envelope.','Read an HTTP status code. Print compact JSON with `error` and `status`. Use `Not Found` for 404, `Bad Request` for 400, `Unauthorized` for 401, and `Server Error` for 500.','const fs = require(''fs'');
const status = Number(fs.readFileSync(0, ''utf8'').trim());
// TODO: build the error object
console.log(JSON.stringify({}));
','', 'javascript','medium','{"error":"Not Found","status":404}','[{"input": "404\n", "expected": "{\"error\":\"Not Found\",\"status\":404}"}, {"input": "400\n", "expected": "{\"error\":\"Bad Request\",\"status\":400}"}, {"input": "500\n", "expected": "{\"error\":\"Server Error\",\"status\":500}"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc52009-0000-4000-8000-000000000009','bacc2211-0000-4000-8000-000000000011','Merge a PATCH update','Apply a partial update without dropping existing fields.','Read two JSON lines: the existing book and the patch. Print the merged object as compact JSON with keys in the order `title`, `author`, `year`.','const fs = require(''fs'');
const [existing, patch] = fs.readFileSync(0, ''utf8'').trim().split(''\n'').map(JSON.parse);
// TODO: merge and order keys
console.log(JSON.stringify({}));
','', 'javascript','medium','{"title":"New","author":"A","year":2000}','[{"input": "{\"title\":\"Old\",\"author\":\"A\",\"year\":2000}\n{\"title\":\"New\"}\n", "expected": "{\"title\":\"New\",\"author\":\"A\",\"year\":2000}"}, {"input": "{\"title\":\"X\",\"author\":\"Y\",\"year\":1999}\n{\"year\":2024}\n", "expected": "{\"title\":\"X\",\"author\":\"Y\",\"year\":2024}"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc52010-0000-4000-8000-000000000010','bacc2211-0000-4000-8000-000000000011','Authorize a delete request','Protect a destructive route.','Read three lines: role, ownerId and userId. Print `allowed` if role is `admin` or ownerId equals userId; otherwise print `forbidden`.','const fs = require(''fs'');
const [role, ownerId, userId] = fs.readFileSync(0, ''utf8'').trim().split(''\n'');
// TODO: authorize
console.log('''');
','', 'javascript','medium','allowed','[{"input": "student\n42\n42\n", "expected": "allowed"}, {"input": "student\n42\n7\n", "expected": "forbidden"}, {"input": "admin\n42\n7\n", "expected": "allowed"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc53011-0000-4000-8000-000000000011','bacc2308-0000-4000-8000-000000000008','Implement a token-bucket decision','Model a simple rate limiter.','Read capacity, refillPerSecond, elapsedSeconds, currentTokens and cost. Refill tokens up to capacity, then print `allowed <remaining>` if enough tokens exist, else `denied <remaining>`.','const fs = require(''fs'');
const [capacity, refill, elapsed, tokens, cost] = fs.readFileSync(0, ''utf8'').trim().split(/\s+/).map(Number);
// TODO: refill and decide
console.log('''');
','', 'javascript','hard','allowed 5','[{"input": "10 2 3 4 5\n", "expected": "allowed 5"}, {"input": "10 2 3 4 20\n", "expected": "denied 10"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc53012-0000-4000-8000-000000000012','bacc2305-0000-4000-8000-000000000005','Choose a backend with consistent hashing','Route a key to one of N nodes.','Read a key and nodeCount. Compute the sum of character codes of the key modulo nodeCount and print `node:<index>`.','const fs = require(''fs'');
const [key, n] = fs.readFileSync(0, ''utf8'').trim().split(''\n'');
// TODO: hash and choose
console.log('''');
','', 'javascript','hard','node:0','[{"input": "order-42\n3\n", "expected": "node:0"}, {"input": "user-7\n4\n", "expected": "node:3"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc53013-0000-4000-8000-000000000013','bacc2310-0000-4000-8000-000000000010','Recognise an idempotent replay','Prevent duplicate side effects on retry.','Read a JSON array of seen idempotency keys, then a new key. Print `replay` if the key is already present, otherwise `new`.','const fs = require(''fs'');
const lines = fs.readFileSync(0, ''utf8'').trim().split(''\n'');
const seen = JSON.parse(lines[0]);
const key = lines[1];
// TODO: decide
console.log('''');
','', 'javascript','hard','replay','[{"input": "[\"a\",\"b\"]\na\n", "expected": "replay"}, {"input": "[\"a\",\"b\"]\nc\n", "expected": "new"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc53014-0000-4000-8000-000000000014','bacc2311-0000-4000-8000-000000000011','Calculate exponential backoff','Retry without hammering a failing service.','Read attempt and baseDelayMs. Print the delay as `base * 2^(attempt-1)` capped at 30000 milliseconds.','const fs = require(''fs'');
const [attempt, base] = fs.readFileSync(0, ''utf8'').trim().split(/\s+/).map(Number);
// TODO: calculate backoff
console.log('''');
','', 'javascript','hard','500','[{"input": "1 500\n", "expected": "500"}, {"input": "4 500\n", "expected": "4000"}, {"input": "10 500\n", "expected": "30000"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc53015-0000-4000-8000-000000000015','bacc2307-0000-4000-8000-000000000007','Build a cache key','Create stable cache keys for API responses.','Read method, path and userId. Print `METHOD:path:user=<userId>`. Normalise the method to uppercase.','const fs = require(''fs'');
const [method, path, userId] = fs.readFileSync(0, ''utf8'').trim().split(''\n'');
// TODO: build key
console.log('''');
','', 'javascript','hard','GET:/api/orders:user=42','[{"input": "get\n/api/orders\n42\n", "expected": "GET:/api/orders:user=42"}, {"input": "GET\n/api/books?page=2\n7\n", "expected": "GET:/api/books?page=2:user=7"}]',5,'code','', '', '[]',10);
INSERT INTO coding_challenges (id,lesson_id,title,description,instructions,starter_code,test_code,language,difficulty,expected_output,test_cases,timeout_seconds,type,submission_type,allowed_file_types,rubric,max_file_size)
VALUES ('bacc53016-0000-4000-8000-000000000016','bacc2311-0000-4000-8000-000000000011','Route a failed message','Decide between retry and dead-letter.','Read attempts and maxAttempts. Print `retry` if attempts is less than maxAttempts, otherwise print `dead-letter`.','const fs = require(''fs'');
const [attempts, max] = fs.readFileSync(0, ''utf8'').trim().split(/\s+/).map(Number);
// TODO: decide
console.log('''');
','', 'javascript','hard','retry','[{"input": "1 3\n", "expected": "retry"}, {"input": "3 3\n", "expected": "dead-letter"}]',5,'code','', '', '[]',10);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6103-0000-4000-8000-000000000003','bacc0001-0001-0000-4000-8000-000000000001','bacc2103-0000-4000-8000-000000000003','Build and deploy a personal Node.js server','Create a Node.js server with at least four routes: `/` (HTML), `/about` (text), `/api/health` (JSON) and a custom 404. Add a logger that prints method, path and response time. Push the code to GitHub and deploy it to Render or Railway. Submit the live URL and repository URL. Include a README with setup steps and a screenshot of the running app. Tools: Node.js, VS Code, Git, GitHub, Postman. Use the Node.js download and Git download links in Resources. How to use: install Node LTS, run `npm init -y`, create `server.js`, start with `node server.js`, test each route in Postman, then follow your host''s Node deployment guide.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6108-0000-4000-8000-000000000008','bacc0001-0001-0000-4000-8000-000000000001','bacc2108-0000-4000-8000-000000000008','Build a Task Manager with Express, EJS and MongoDB','Build a task manager where users can list, create and delete tasks. Use Express, EJS and MongoDB Atlas with Mongoose. Each task needs a title, optional notes and a createdAt timestamp. Add server-side validation, a custom 404 page and a clean folder structure with routes, controllers and models. Submit a repository link, a live link if deployed, and a short write-up explaining your schema and one bug you fixed. Tools: Node.js, Express, EJS, MongoDB Atlas, Mongoose, Postman, Git. Use the MongoDB Atlas and Express documentation links in Resources.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6111-0000-4000-8000-000000000011','bacc0001-0001-0000-4000-8000-000000000001','bacc2111-0000-4000-8000-000000000011','Capstone: deploy a production-ready Notes API','Build and deploy a Notes API with Node.js, Express and MongoDB. It must support create, read, update and delete, return correct status codes, validate input and hide database credentials in environment variables. Add a README with API examples and a Postman collection. Submit the live API URL, repository URL, README and a 2-minute screen recording walking through the endpoints. This is the portfolio piece you should show to employers.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6202-0000-4000-8000-000000000002','bacc0001-0002-0000-4000-8000-000000000002','bacc2202-0000-4000-8000-000000000002','Write the OpenAPI contract for a Bookstore API','Design a complete OpenAPI 3.1 contract for a Bookstore API with books, authors and loans. Include request/response schemas, validation rules, error envelopes, pagination parameters and authentication headers. Validate the document in Swagger Editor and export the YAML. Submit the YAML file and a screenshot of the rendered documentation. Tools: Swagger Editor, OpenAPI specification, Postman.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6208-0000-4000-8000-000000000008','bacc0001-0002-0000-4000-8000-000000000002','bacc2208-0000-4000-8000-000000000008','Build a production-style Books REST API','Implement the Bookstore API with Node.js, Express, MongoDB and Mongoose. Include models with validation, routes/controllers, a central error handler, filtering, sorting, pagination and a Postman collection with tests for success and failure cases. Seed at least 20 books. Submit the repository, Postman collection and a README documenting every endpoint. Tools: Node.js, Express, MongoDB Atlas, Mongoose, Postman, Git.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6211-0000-4000-8000-000000000011','bacc0001-0002-0000-4000-8000-000000000002','bacc2211-0000-4000-8000-000000000011','Add authentication-ready update and delete flows','Extend your Books API with PUT, PATCH and DELETE. Add ownership checks so only the user who created a book can update or delete it (use a temporary `ownerId` field until the auth module is added). Return 403 for forbidden actions, 404 for missing books and 204 for successful deletes. Add Postman tests for each case. Submit the repository and a test report showing all requests passing.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6306-0000-4000-8000-000000000006','bacc0001-0003-0000-4000-8000-000000000003','bacc2306-0000-4000-8000-000000000006','Load-test and document a backend bottleneck','Choose one API you built and load-test it with k6 at 10, 50 and 100 virtual users. Record p95 latency, error rate and throughput. Identify the bottleneck using logs, database query plans or CPU profiling. Write a short engineering report with graphs, the root cause, the fix you tried and the before/after numbers. Submit the k6 script, report and repository. Tools: k6, Node.js, PostgreSQL/MongoDB, DevTools.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6309-0000-4000-8000-000000000009','bacc0001-0003-0000-4000-8000-000000000003','bacc2309-0000-4000-8000-000000000009','Add Redis caching and a token-bucket rate limiter','Add Redis to an existing API. Cache a read-heavy endpoint with a sensible TTL and invalidation strategy, then add a token-bucket rate limiter per user/IP. Include tests proving cache hits, invalidation and 429 responses. Document the design and trade-offs in your README. Submit the repository, test output and a short architecture diagram. Tools: Redis, Docker, Node.js, k6.',100);
INSERT INTO assignments (id,course_id,lesson_id,title,description,max_score) VALUES ('bacc6311-0000-4000-8000-000000000011','bacc0001-0003-0000-4000-8000-000000000003','bacc2311-0000-4000-8000-000000000011','Build a resilient order service','Design an order service with idempotency keys, a database transaction that prevents double booking, and a RabbitMQ queue for confirmation emails. Failed email jobs must retry with exponential backoff and land in a dead-letter queue after three attempts. Include a load test that fires concurrent requests for the same seat and proves only one succeeds. Submit the repository, architecture diagram, queue configuration and test report. Tools: PostgreSQL, RabbitMQ, Docker, k6, Node.js.',100);
INSERT INTO learning_paths (id,title,description,icon,color,level,slug,bundle_price,bundle_discount_percent,enrollment_mode,bundle_enabled,is_published)
VALUES ('bacc8001-0001-0000-4000-8000-000000000001','Backend Engineering Mastery','A three-stage backend track: Node.js foundations, production REST APIs and databases, then advanced system design with load balancing, queues and realtime. Built for beginners who want a complete path and for working developers who want to fill the gaps.','Server','#6366f1','beginner','backend-engineering-mastery',425000,20,'mixed',1,1);
INSERT INTO learning_path_courses (id,path_id,course_id,order_index) VALUES ('bacc9000-0000-4000-8000-000000000000','bacc8001-0001-0000-4000-8000-000000000001','bacc0001-0001-0000-4000-8000-000000000001',0);
INSERT INTO learning_path_courses (id,path_id,course_id,order_index) VALUES ('bacc9001-0000-4000-8000-000000000001','bacc8001-0001-0000-4000-8000-000000000001','bacc0001-0002-0000-4000-8000-000000000002',1);
INSERT INTO learning_path_courses (id,path_id,course_id,order_index) VALUES ('bacc9002-0000-4000-8000-000000000002','bacc8001-0001-0000-4000-8000-000000000001','bacc0001-0003-0000-4000-8000-000000000003',2);
DELETE FROM learning_path_courses WHERE path_id='b2bfbc3d-716c-4dc3-92ff-b8dedd9f4ebb' AND course_id='9bbc38f0-3d27-48ac-9f64-5cacc01f8409';
UPDATE learning_path_courses SET order_index = order_index + 3 WHERE path_id='b2bfbc3d-716c-4dc3-92ff-b8dedd9f4ebb' AND order_index >= 1;
INSERT INTO learning_path_courses (id,path_id,course_id,order_index) VALUES ('bacc9100-0000-4000-8000-000000000100','b2bfbc3d-716c-4dc3-92ff-b8dedd9f4ebb','bacc0001-0001-0000-4000-8000-000000000001',1);
INSERT INTO learning_path_courses (id,path_id,course_id,order_index) VALUES ('bacc9101-0000-4000-8000-000000000101','b2bfbc3d-716c-4dc3-92ff-b8dedd9f4ebb','bacc0001-0002-0000-4000-8000-000000000002',2);
INSERT INTO learning_path_courses (id,path_id,course_id,order_index) VALUES ('bacc9102-0000-4000-8000-000000000102','b2bfbc3d-716c-4dc3-92ff-b8dedd9f4ebb','bacc0001-0003-0000-4000-8000-000000000003',3);
UPDATE learning_paths SET bundle_discount_percent=20, bundle_enabled=1, is_published=1 WHERE id='b2bfbc3d-716c-4dc3-92ff-b8dedd9f4ebb';