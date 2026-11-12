# Course rollout: projects, GitHub verification, live labs and pricing

## What was added to every published course
- A portfolio project with:
  - a brief and acceptance criteria
  - required tools
  - step-by-step procedure
  - a GiGo coaching prompt
  - expected GitHub languages and minimum commits
- GitHub verification:
  - public repository check
  - commit history check
  - README check
  - expected-language check
  - repository description and recent-activity checks
  - score out of 100, with actionable failures
- A weekly live lab series added to `calendar_events`:
  - 4 sessions per course
  - Mondays at 18:00 WAT (17:00 UTC)
  - visible only to enrolled students (`visibility = 'course'`)
  - instructor and course linked
- Updated Naira pricing based on category, level and lesson count.

## Backend courses
The three backend courses received 3 projects each:
- Beginner: CLI File Organizer, Dynamic Recipe Blog, Task Manager API + Dashboard
- Intermediate: Bookstore API Contract, Books API with Validation, Production-Ready Books API
- Advanced: Protocol & Performance Lab, Load-Balanced Node Service, Resilient Order Service

## GitHub verification API
- `GET /api/v1/course-projects?courseId=...`
- `GET /api/v1/course-projects/:id`
- `POST /api/v1/course-projects/:id/submit`
- `POST /api/v1/course-projects/:id/verify`
- `GET /api/v1/course-projects/github/status`

The verifier uses the public GitHub API. An optional `GITHUB_TOKEN` worker secret raises rate limits. The browser cannot inspect a learner's local machine, so the UI also returns the commands they should run locally (`git --version`, `gh auth status`, `git remote -v`).

## Pricing matrix
Prices are derived from Nigerian market bands and scaled by lesson count, then capped by category.

| Category | Beginner | Intermediate | Advanced |
| --- | ---: | ---: | ---: |
| Backend Development | ₦95,000 | ₦165,000 | ₦245,000 |
| Web Development | ₦75,000 | ₦125,000 | ₦185,000 |
| Data Science | ₦85,000 | ₦140,000 | ₦220,000 |
| AI | — | — | ₦240,000 |
| Cloud Computing | — | — | ₦220,000 |
| DevOps | — | ₦150,000 | ₦220,000 |
| Security | — | ₦140,000 | ₦220,000 |
| Networking | ₦65,000 | ₦110,000 | ₦170,000 |
| Programming | ₦65,000 | ₦110,000 | ₦170,000 |
| Databases | — | ₦130,000 | ₦190,000 |
| Design | ₦70,000 | ₦120,000 | ₦180,000 |
| Mobile | — | ₦140,000 | ₦200,000 |
| Software Engineering | ₦65,000 | ₦120,000 | ₦190,000 |
| Computer Science | ₦80,000 | ₦110,000 | ₦170,000 |

Market anchors:
- Classes.ng backend listing: ₦200k–₦500k, average ~₦333k.
- Tekhub NG Node backend: ₦155k.
- Mindgrid Academy: backend/cloud live cohorts ₦400k; self-paced from ₦50k.
- Univelcity: backend from ₦300k.
- Tech Faculty NG data analytics: ₦100k.
- Cybersecurity training in Nigeria: commonly ₦100k–₦700k.
- UI/UX training in Nigeria: commonly ₦150k–₦800k.

## Course packs
Every published course now has a downloadable ZIP in R2 containing:
- a course README
- written notes for every lesson
- every project brief with requirements, tools and procedure

The file is attached as a course-level resource and appears in the lesson Resources tab. Transcripts are not included yet; that remains a content task.
