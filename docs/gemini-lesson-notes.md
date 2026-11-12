# Gemini lesson notes

## What it does
Gemini watches a public YouTube video and produces original study notes:
- timestamped outline
- key concepts in its own words
- commands/code shown
- common mistakes
- 5-question quiz with answers
- practice task

It does **not** produce a verbatim transcript. Gemini blocks full verbatim recitation of copyrighted videos with `Request blocked due to copyright/recitation content`. That is expected and correct. The platform stores study notes, not republished transcripts.

## Model
- Primary: `gemini-3.1-flash-lite`
- Fallbacks: `gemini-3.5-flash-lite`, `gemini-flash-lite-latest`
- API: `POST https://generativelanguage.googleapis.com/v1beta/interactions`

## Storage
`lesson_ai_notes`:
- `lesson_id` primary key
- `model`
- `status` (`ready` or `error`)
- `notes` markdown
- `tokens`
- `error`
- `generated_at`

## Student UI
`GET /api/v1/lessons/:id/ai-notes` returns the notes. The lesson Resources tab renders them as **Gemini study notes**.

## How to run
1. Export lessons to JSON:
   `wrangler d1 execute careercode-academy --remote --json --command "SELECT ..."`
2. Set `GEMINI_API_KEY`.
3. Run `python3 scripts/gemini/generate-lesson-notes.py 0 37`.
4. Apply the generated SQL with `wrangler d1 execute ... --file=...`.

Process one lesson at a time; the script sleeps between requests and falls back across models.

## Backend pass status
- 35 of 37 backend lessons generated successfully and stored in `lesson_ai_notes`.
- 2 skipped:
  - `Double Booking, Race Conditions & Row Locks` — Gemini returned `403 Forbidden`.
  - `WebSockets & Server-Authoritative State` — repeated `503 Service Unavailable` (very long video).
- The lesson UI shows Gemini notes when available; otherwise it falls back to the existing written notes.
