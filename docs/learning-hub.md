# Learning Hub

## Student features
- **Project workspace** at `/student/projects/:projectId/workspace`
  - kanban board: Backlog / In Progress / Review / Done
  - tickets with priority and estimates
  - daily standups
  - retrospective
  - oral defense upload (video file or URL)
  - sandbox launch button
- **Career Hub** at `/student/hub`
  - skill badges with evidence requests and public verification
  - real client projects and applications
  - peer review queue
  - spaced review queue
- **Sandbox** links per course (StackBlitz, GitHub Codespaces, Figma).

## Instructor features
- **Hub Reviews** at `/instructor/hub-review`
  - review oral defenses with score/feedback
  - award or reject skill badges
- Existing Submissions page still handles assignments/challenges/projects.

## Public
- Badge verification at `/badges/:code`.

## API
Mounted at `/api/v1/hub`:
- project workspace, tickets, standups, retrospectives
- oral defenses and reviews
- badges and public verification
- client projects and applications
- peer reviews
- learning events
- spaced reviews
- sandbox lookup

## Data
Tables: `project_tickets`, `project_standups`, `project_retrospectives`, `oral_defenses`, `skill_badges`, `user_badges`, `client_projects`, `client_project_applications`, `peer_reviews`, `learning_events`, `spaced_reviews`, `sandbox_environments`.

## AI-assisted engineering
Added an **AI-Assisted Engineering** module to the advanced backend course:
- AI for project planning
- AI for code review and refactoring
- AI-assisted testing and debugging
- AI security, secrets and disclosure
