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


def request_generate(model, video_url, timeout=240):
    payload = {
        'contents': [{'parts': [
            {'file_data': {'mime_type': 'video/*', 'file_uri': video_url}},
            {'text': PROMPT},
        ]}],
        'generationConfig': {'maxOutputTokens': 5000, 'temperature': 0.2},
    }
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={KEY}',
        data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def extract_generate_text(data):
    candidates = data.get('candidates') or []
    if not candidates:
        return ''
    return ''.join(part.get('text', '') for part in candidates[0].get('content', {}).get('parts', [])).strip()


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
                # Endpoint 1: Interactions API.
                try:
                    data = request(model, lesson['video_url'])
                    error = data.get('error')
                    if error:
                        last_error = f"{error.get('code')}: {error.get('message', '')}"
                        print(f"  {model} interactions {last_error[:110]}", flush=True)
                    else:
                        text = extract_text(data)
                        if text and 'VIDEO_NOT_ACCESSIBLE' not in text:
                            result = text
                            used_model = model
                            tokens = int(data.get('usage', {}).get('total_tokens', 0) or 0)
                            break
                        last_error = 'interactions empty/inaccessible'
                except urllib.error.HTTPError as error:
                    last_error = f'interactions HTTP {error.code}'
                    print(f"  {model} {last_error}", flush=True)
                except Exception as error:
                    last_error = f'interactions {error}'
                    print(f"  {model} {last_error[:110]}", flush=True)

                # Endpoint 2: generateContent. It often succeeds when Interactions is 503.
                try:
                    data = request_generate(model, lesson['video_url'])
                    error = data.get('error')
                    if error:
                        last_error = f"{error.get('code')}: {error.get('message', '')}"
                        print(f"  {model} generateContent {last_error[:110]}", flush=True)
                    else:
                        text = extract_generate_text(data)
                        if text and 'VIDEO_NOT_ACCESSIBLE' not in text:
                            result = text
                            used_model = model + ':generateContent'
                            tokens = int((data.get('usageMetadata') or {}).get('totalTokenCount', 0) or 0)
                            break
                        last_error = 'generateContent empty/inaccessible'
                except urllib.error.HTTPError as error:
                    last_error = f'generateContent HTTP {error.code}'
                    print(f"  {model} {last_error}", flush=True)
                    if error.code in (400, 403, 404):
                        break
                except Exception as error:
                    last_error = f'generateContent {error}'
                    print(f"  {model} {last_error[:110]}", flush=True)

                time.sleep(15 if attempt == 0 else 45)
            if result:
                break

        if not result:
            sql.append(
                f"INSERT INTO lesson_ai_notes (lesson_id,course_id,model,status,notes,tokens,error) "
                f"VALUES ({quote(lesson['id'])},{quote(lesson['course_id'])},NULL,'error',NULL,0,{quote(last_error or 'failed')}) "
                f"ON CONFLICT(lesson_id) DO UPDATE SET status='error',error=excluded.error;"
            )
            open(OUTPUT, 'w').write('\n'.join(sql))
            permanent = any(token in str(last_error).lower() for token in ('400', '403', '404', 'inaccessible', 'recitation'))
            if permanent:
                print(f"  SKIP inaccessible: {last_error}", flush=True)
                time.sleep(2)
                continue
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
