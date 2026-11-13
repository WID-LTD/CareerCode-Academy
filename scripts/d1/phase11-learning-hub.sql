CREATE TABLE IF NOT EXISTS project_tickets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  estimate_hours REAL,
  due_at TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_project_tickets_project ON project_tickets(project_id, user_id, status);

CREATE TABLE IF NOT EXISTS project_standups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  standup_date TEXT NOT NULL DEFAULT (date('now')),
  yesterday TEXT,
  today TEXT,
  blockers TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS project_retrospectives (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  went_well TEXT,
  improve TEXT,
  actions TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS oral_defenses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  score INTEGER,
  feedback TEXT,
  reviewer_id TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS skill_badges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT DEFAULT 'beginner',
  rubric TEXT DEFAULT '[]',
  icon TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_code TEXT UNIQUE,
  awarded_at TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, status);

CREATE TABLE IF NOT EXISTS client_projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  client_name TEXT,
  sector TEXT,
  skills TEXT DEFAULT '[]',
  scope TEXT,
  status TEXT DEFAULT 'open',
  budget TEXT,
  deadline TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS client_project_applications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  client_project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  pitch TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS peer_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  project_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  status TEXT DEFAULT 'assigned',
  score INTEGER,
  feedback TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  course_id TEXT,
  lesson_id TEXT,
  project_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id, event_type, created_at);

CREATE TABLE IF NOT EXISTS spaced_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL,
  course_id TEXT,
  lesson_id TEXT NOT NULL,
  due_at TEXT NOT NULL,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  last_result TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_spaced_reviews_due ON spaced_reviews(user_id, due_at);

CREATE TABLE IF NOT EXISTS sandbox_environments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  course_id TEXT,
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  instructions TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('2aa7d5f0-e1a7-455c-a394-c3da0b771b6e','git-github','Git & GitHub','Create branches, make clean commits, open pull requests and resolve review comments.','Engineering','beginner','["Clean commit history", "Branch and PR workflow", "README and .gitignore", "Resolved review comments"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('70c3c8db-e1af-42dd-af37-03cac60e9911','rest-api','REST API Design','Design predictable resources, status codes, validation and error envelopes.','Backend','intermediate','["Resource modelling", "Correct status codes", "Validation and errors", "Postman collection"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('da4150f4-726e-4d63-a5fb-9668fdc4d57a','database-modelling','Database Modelling','Model relationships, keys, indexes and queries that hold up under real data.','Data','intermediate','["ER diagram", "Constraints and indexes", "Seed data", "Query plan evidence"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('f1fb13be-35a7-42ef-950d-97bc3390eae5','testing','Testing','Write meaningful automated tests for normal, edge and failure cases.','Engineering','intermediate','["Unit tests", "Edge cases", "Test output", "Coverage reasoning"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('32380889-0921-4fc9-b521-481c87590629','deployment','Deployment','Ship a working service with environment variables, health checks and a README.','DevOps','intermediate','["Live URL", "Environment config", "Health check", "Rollback notes"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('5131d171-11c1-4c6d-93e3-a00d45ce26e9','security-basics','Security Basics','Handle secrets, auth, input validation and least privilege.','Security','intermediate','["Secret handling", "Input validation", "Auth flow", "Threat notes"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('0a78936d-46c2-43ad-a215-14559ae9cdbd','code-review','Code Review','Review code for correctness, readability, tests and risk.','Engineering','intermediate','["Specific comments", "Risk identification", "Actionable feedback", "Follow-up"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('11055165-ef5a-48dd-9ba4-3714f0fce1b0','project-delivery','Project Delivery','Plan, estimate, ship and retrospect on a real project.','Career','intermediate','["Tickets and milestones", "Standups", "Shipped demo", "Retrospective"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO skill_badges (id,slug,title,description,category,level,rubric,icon) VALUES ('1ce1d51a-ffea-48de-9f00-1b71fe817f18','ai-assisted-engineering','AI-Assisted Engineering','Use AI to plan, test and review while explaining and verifying its output.','AI','intermediate','["AI plan", "Generated tests reviewed", "Security check", "Disclosure note"]','Award') ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,level=excluded.level,rubric=excluded.rubric;
INSERT INTO client_projects (id,title,description,client_name,sector,skills,scope,status,budget) VALUES ('fbc19b34-7d87-448e-ac31-11bed9310491','Inventory Dashboard for a Small Retailer','Build a simple stock dashboard with products, low-stock alerts and CSV import.','WID LTD Internal','Retail','["React","Node.js","PostgreSQL"]','4-6 weeks','open','None');
INSERT INTO client_projects (id,title,description,client_name,sector,skills,scope,status,budget) VALUES ('45b95a1e-13e0-4af0-aa29-2160669a6e76','Community Event Check-in System','Build a check-in page, attendee list and QR code scanner for a community meetup.','CareerCode Community','Education','["Next.js","Supabase","QR"]','3-5 weeks','open','None');
INSERT INTO client_projects (id,title,description,client_name,sector,skills,scope,status,budget) VALUES ('9dbd67ec-de98-475b-abc3-ccdc3be0e2e9','Open Source Documentation Sprint','Improve onboarding docs, setup scripts and contributor guide for an open-source project.','Open Source','Software','["Markdown","Git","GitHub"]','2-3 weeks','open','None');
INSERT INTO client_projects (id,title,description,client_name,sector,skills,scope,status,budget) VALUES ('e84d0cfb-8316-4ddb-ba51-be1b9f979724','Local Business Booking Page','Build a mobile-friendly booking page with availability and email confirmation.','WID LTD Internal','Services','["React","Node.js","Email"]','4 weeks','open','None');
INSERT INTO client_projects (id,title,description,client_name,sector,skills,scope,status,budget) VALUES ('76487638-2535-4f12-8975-66e574457592','Data Cleaning & Reporting Script','Clean a messy CSV and produce a repeatable monthly report with charts.','WID LTD Internal','Analytics','["Python","pandas","Matplotlib"]','2-4 weeks','open','None');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('25f3bd32-0ba0-4db8-9b61-6c1820a38782','79d896eb-aeb8-4086-9861-8abef8b0863f','StackBlitz Python','https://stackblitz.com/fork/python','Browser Python environment. No local install needed.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('409654b1-7408-4903-831e-b145c65dd696','e9890534-23fe-44ca-a87f-d5fd4a956c1b','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('b55e2d7d-9fc5-47ca-9dfd-0061139dde9e','a408f505-2b82-4813-9bf1-d7c3893c43a0','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('1a9ae12d-1d22-4e3e-b690-d96d5a056573','3aa805fc-4d61-44cc-915e-7cee49c50feb','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('1efbdad5-45cb-4536-bd17-9b32d011970f','b634465e-8fef-45aa-a643-68fb79f5018f','StackBlitz Python','https://stackblitz.com/fork/python','Browser Python environment. No local install needed.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('10b82197-3ce0-4e2c-976b-6bec80d55b53','0c241141-683c-4fc5-8324-881d72556f2e','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('0f5e9136-31f6-47a5-b4df-317fb288578e','9e8fde9b-8cca-4913-8c05-ab8653832a88','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('beac1fc9-8ff5-4574-aa86-ad41f26f00c6','9bbc38f0-3d27-48ac-9f64-5cacc01f8409','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('356c1400-a424-4ce4-863c-433db23ed05f','6d4efbf0-3b56-40ec-8bc8-e3f34331e33b','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('a42f6740-e157-47ac-a53f-2bd8266cb4fd','9a3fb3f1-1bae-4840-ab77-ab7cf3e8677e','StackBlitz SQLite','https://stackblitz.com/fork/sqlite','Browser SQLite environment for SQL practice.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('7ec71b24-b4da-4654-9588-8fbf0245c3e9','05740829-7d2a-4494-8922-704f77c88513','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('cae7e8c0-cce3-4782-890b-8b7ec91e68f8','741a7998-2837-435b-a5d6-596482e3e130','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('23e693a9-eec3-4123-b04e-c505a84d5c9c','63633018-7dcf-49e2-a667-b75914e8a0d4','StackBlitz React','https://stackblitz.com/fork/react','Browser React environment for mobile UI practice.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('79ad1e3e-4a61-40d6-88f4-134ce3e07b1d','67c814f1-d3dc-4fc0-8f8a-82d0117661d4','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('b2542bc0-950a-4261-bf8e-2aa4693e170f','42ef93e4-4041-49b4-b465-cfdcf220fda8','StackBlitz Python','https://stackblitz.com/fork/python','Browser Python environment. No local install needed.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('a41b93f5-8afe-4181-968e-fdcea2e6728c','33d6cba6-3046-4fdf-a8d7-d5dca783d5b1','StackBlitz Python','https://stackblitz.com/fork/python','Browser Python environment. No local install needed.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('3434573d-0a87-43e9-a546-24c5fe04cf9f','c19e32c1-2ba1-4402-9d9d-d592c6102530','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('1f8c4b9e-e778-492d-81de-591502c8d706','d531efeb-e940-4192-99e7-852f4556c2a9','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('4defccb7-1514-454f-8ba7-e4b751dc1df1','3b74d91a-ba37-49bb-9b2f-269c7bedba94','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('0e20a3d1-ac35-4a80-8d3c-78f0e84ddeda','bdb0c29a-c4ff-425c-84c1-6e3c23cc66b7','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('eea69cc9-df99-4488-a8a1-a2115e2ad8b2','1a170b93-5ea8-4004-9d0c-031144e6009c','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('1d238077-6d11-4603-89a5-b519773a28fe','e24b5ea4-afff-4c5a-9801-1726bd3224c2','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('e5e3110a-90b1-4be0-9275-5776e24a9af0','242b605b-259d-47cd-8711-233cc4911c73','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('b3094235-0e2c-4821-b84b-10441a921c9a','2064aa05-89a3-46c1-a552-ffb7fc70ff83','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('e8a922e4-282f-483c-8e7d-704d19cf98af','05344f24-1e1a-48b9-aa63-8fa5b5fc5a36','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('dd88503f-6203-4312-9675-adcf7253279e','e692570c-5012-4ac0-b053-66432686ac9e','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('b3b21076-de2b-4c4f-b24b-d779a1ed290c','7fc960d0-9dee-4550-9d2f-48ab29334128','GitHub Codespaces','https://github.com/codespaces','Create a free Codespace from a starter repository.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('6cfa3d3f-3887-4acd-bea9-52ebafec3d58','75383252-a640-4828-81ca-ac8546e43207','StackBlitz Python','https://stackblitz.com/fork/python','Browser Python environment. No local install needed.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('61d40d6b-8bd9-48ba-9495-2824c376e6bd','947b61ef-7935-4acb-863b-92a479449253','StackBlitz SQLite','https://stackblitz.com/fork/sqlite','Browser SQLite environment for SQL practice.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('a6cfd237-de50-41fb-b214-bd925ef35a46','a60507a9-84e3-4e30-af9e-1d3c8219539f','Figma','https://www.figma.com/','Use a free Figma account and create a practice file.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('01339de4-8b20-4718-a9f7-d0daa461cfe8','b386e0d2-73c4-49e3-80d3-53ecc2dcd087','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('f9b1cfac-e5ff-4890-969f-0eefe3c84dbb','f0ec868b-c92e-457a-96d7-65ef2cbbe2a7','Figma','https://www.figma.com/','Use a free Figma account and create a practice file.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('37e9e85c-ccdd-49b7-9cce-ed7b8a5a6740','bacc0001-0001-0000-4000-8000-000000000001','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('36440b1f-2746-4687-9ac6-e2196eb95998','bacc0001-0002-0000-4000-8000-000000000002','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');
INSERT INTO sandbox_environments (id,course_id,provider,url,instructions) VALUES ('b9d2bfb0-e38e-474b-8be2-20558dbe072f','bacc0001-0003-0000-4000-8000-000000000003','StackBlitz Node','https://stackblitz.com/fork/node','Browser Node.js environment. Run JavaScript without local setup.');