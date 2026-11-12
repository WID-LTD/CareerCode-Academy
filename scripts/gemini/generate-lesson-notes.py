#!/usr/bin/env python3
"""Generate detailed lesson content from public YouTube videos with Gemini.

This is a supervised, resumable batch runner:
- skips lessons already marked ready in /tmp/ready-ids.json
- retries 429/500/503 with exponential backoff
- skips 400/403/404 videos that Gemini cannot access
- writes SQL after every success so progress is never lost
- accepts START/END indexes and a custom lessons JSON file

Usage:
  GEMINI_API_KEY=... LESSONS_JSON=/tmp/lessons.json NOTES_SQL=/tmp/notes.sql \
    python3 scripts/gemini/generate-lesson-notes.py 0 100
"""
import json
import os
import time
import urllib.error
import urllib.request

KEY = os.environ['GEMINI_API_KEY']
INPUT = os.environ.get('LESSONS_JSON', '/tmp/backend-lessons.json')
OUTPUT = os.environ.get('NOTES_SQL', '/tmp/gemini-notes.sql')
SKIP_FILE = os.environ.get('SKIP_IDS_FILE', '/tmp/ready-ids.json')
lessons = json.load(open(INPUT))[0]['results']
start = int(os.environ.get('START_INDEX', 0))
end = int(os.environ.get('END_INDEX', len(lessons)))

skip = set()
if os.path.exists(SKIP_FILE):
    try:
        skip = {r['lesson_id'] for r in json.load(open(SKIP_FILE))[0]['results']}
    except Exception:
        skip = set()

MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
PROMPT = """Watch this video and write a complete, original lesson for a CareerCode Academy learner. Do not reproduce the transcript verbatim.

Use this exact markdown structure:
# Lesson title
## Learning objectives (3-5 measurable outcomes)
## Prerequisites
## Timestamped outline ([MM:SS] + topic)
## Detailed explanation (the concepts in your own words, with examples)
## Commands, code or configuration shown
## Common mistakes and troubleshooting
## Practice task (step by step)
## Checkpoint (how the learner proves they understood it)
## Quiz (5 questions with answers and short explanations)
## Key terms / glossary
## GiGo knowledge summary (8-12 concise facts a study assistant can use)

Be specific, beginner-friendly and technically accurate. If the video is inaccessible, output exactly VIDEO_NOT_ACCESSIBLE."""


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def request(model, video_url, timeout=240):
    payload = {
        'model': model,
        'input': [
            {'type': 'text', 'text': PROMPT},
            {'type': 'video', 'uri': video_url},
        ],
    }
    req = urllib.request.Request(
        'https://generativelanguage.googleapis.com/v1beta/interactions',
        data=json.dumps(payload).encode(),
        headers={'x-goog-api-key': KEY, 'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def extract_text(data):
    text = ''
    for step in data.get('steps', []):
        if step.get('type') == 'model_output':
            text += ''.join(part.get('text', '') for part in step.get('content', []))
    return text.strip()


def main():
    sql = []
    if os.path.exists(OUTPUT):
        # Keep prior successes when resuming into the same output file.
        sql = [line for line in open(OUTPUT).read().splitlines() if line.strip()]
    processed = 0
    consecutive_failures = 0
    for index, lesson in enumerate(lessons[start:end], start):
        if lesson['id'] in skip:
            print(f"[{index + 1}/{len(lessons)}] SKIP already ready: {lesson['title']}", flush=True)
            continue
        print(f"[{index + 1}/{len(lessons)}] {lesson['course_slug']} :: {lesson['title']}", flush=True)
        result = None
        used_model = None
        tokens = 0
        last_error = None

        for model in MODELS:
            for attempt in range(2):
                try:
                    data = request(model, lesson['video_url'])
                    if data.get('error'):
                        message = data['error'].get('message', '')
                        code = data['error'].get('code', '')
                        last_error = f"{code}: {message}"
                        print(f"  {model} error {last_error[:120]}", flush=True)
                        if code in (400, 403, 404, 'recitation'):
                            break
                        time.sleep(15 if attempt == 0 else 45)
                        continue
                    text = extract_text(data)
                    if text and 'VIDEO_NOT_ACCESSIBLE' not in text:
                        result = text
                        used_model = model
                        tokens = int(data.get('usage', {}).get('total_tokens', 0) or 0)
                        break
                    last_error = 'empty or inaccessible'
                except urllib.error.HTTPError as error:
                    last_error = f'HTTP {error.code}'
                    print(f"  {model} {last_error}", flush=True)
                    if error.code in (400, 403, 404):
                        break
                    time.sleep(20 if attempt == 0 else 60)
                except Exception as error:
                    last_error = str(error)
                    print(f"  {model} {last_error[:120]}", flush=True)
                    time.sleep(10 if attempt == 0 else 30)
            if result:
                break

        if not result:
            sql.append(
                f"INSERT INTO lesson_ai_notes (lesson_id,course_id,model,status,notes,tokens,error) "
                f"VALUES ({quote(lesson['id'])},{quote(lesson['course_id'])},NULL,'error',NULL,0,{quote(last_error or 'failed')}) "
                f"ON CONFLICT(lesson_id) DO UPDATE SET status='error',error=excluded.error;"
            )
            open(OUTPUT, 'w').write('\n'.join(sql))
            consecutive_failures += 1
            print(f"  FAILED: {last_error} (consecutive={consecutive_failures})", flush=True)
            # Provider outage / rate limit: cool down instead of burning quota.
            time.sleep(300 if consecutive_failures < 3 else 900)
            continue

        sql.append(
            f"INSERT INTO lesson_ai_notes (lesson_id,course_id,model,status,notes,tokens,error,generated_at) "
            f"VALUES ({quote(lesson['id'])},{quote(lesson['course_id'])},{quote(used_model)},'ready',{quote(result)},{tokens},NULL,datetime('now')) "
            f"ON CONFLICT(lesson_id) DO UPDATE SET model=excluded.model,status='ready',notes=excluded.notes,tokens=excluded.tokens,error=NULL,generated_at=datetime('now');"
        )
        open(OUTPUT, 'w').write('\n'.join(sql))
        processed += 1
        consecutive_failures = 0
        print(f"  ok {used_model} chars={len(result)} tokens={tokens}", flush=True)
        time.sleep(4)

    print(f"done processed={processed} total_sql={len(sql)}", flush=True)


if __name__ == '__main__':
    main()
