# To-Do

A shared task layer for students, instructors and admins.

- Table: `todos` (title, notes, due date, priority, category, status, course /
  lesson / path links, source, `auto_key`, sort order).
- Routes: `/api/v1/todos` CRUD, `PATCH /:id/toggle`, `POST /bulk`,
  `POST /generate/path/:slug`, `POST /generate/assignments`.
- UI: `/{role}/todos` and a dashboard widget.
- Auto-tasks: learning-path enrolment creates one task per course; assignments
  can be synced; GiGo study plans can be added to To-Do.
- Reminders: the 15-minute cron notifies users about tasks due today/overdue;
  the 07:00 digest summarises the day.
