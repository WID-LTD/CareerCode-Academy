#!/usr/bin/env python3
"""Generate original lesson notes from lesson metadata with Workers AI.

Use this for lessons that do not have a Gemini video transcript. It is
resumable and writes SQL after every successful lesson.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import uuid

INPUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/fallback-lessons.json'
OUTPUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/fallback-notes.sql'
DONE_FILE = OUTPUT + '.done'
TOKEN = os.environ['CLOUDFLARE_API_TOKEN']
ACCOUNT = os.environ.get('CLOUDFLARE_ACCOUNT_ID', 'ae5f7e6e4a91cf13a04d8343c445e583')
MODEL = os.environ.get('NOTES_MODEL', '@cf/meta/llama-3.1-8b-instruct')
URL = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/{MODEL}'

lessons = json.load(open(INPUT))[0]['results']
done = set()
if os.path.exists(DONE_FILE):
    done = {line.strip() for line in open(DONE_FILE) if line.strip()}


def q(value):
    return "'" + str(value).replace("'", "''") + "'"


def prompt(lesson):
    return f"""Write a complete, original lesson for a {lesson.get('level') or 'beginner'} learner on CareerCode Academy.
Do not copy any transcript. Use clear, encouraging language and practical examples.

Course: {lesson.get('course_title')}
Lesson: {lesson.get('title')}
Lesson description: {lesson.get('description') or 'No description supplied.'}

Use this exact markdown structure:
# {lesson.get('title')}
## Learning objectives (3-5 measurable outcomes)
## Before you start
## Step-by-step explanation
## Worked example
## Common mistakes and fixes
## Practice task
## Checkpoint
## Key terms

Keep it accurate, specific and beginner-friendly even when the level is advanced. Avoid inventing tools, prices or facts that are not in the description."""


def call(lesson, attempt=0):
    payload = {
        'messages': [
            {'role': 'system', 'content': 'You are a senior technical instructor. Return only the requested markdown lesson.'},
            {'role': 'user', 'content': prompt(lesson)},
        ],
        'max_tokens': 1800,
        'temperature': 0.35,
    }
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(), headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json',
    }, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            data = json.load(res)
        text = data.get('result', {}).get('choices', [{}])[0].get('message', {}).get('content', '')
        return text.strip()
    except urllib.error.HTTPError as e:
        if e.code in (429, 500, 502, 503, 504) and attempt < 5:
            time.sleep(2 ** attempt)
            return call(lesson, attempt + 1)
        raise
    except Exception:
        if attempt < 4:
            time.sleep(2 ** attempt)
            return call(lesson, attempt + 1)
        raise


out = open(OUTPUT, 'a')
done_out = open(DONE_FILE, 'a')
ok = 0
failed = []
for idx, lesson in enumerate(lessons, 1):
    if lesson['lesson_id'] in done:
        continue
    try:
        notes = call(lesson)
        if not notes or len(notes) < 200:
            raise ValueError('notes too short')
        out.write(
            "INSERT OR REPLACE INTO lesson_ai_notes (lesson_id,course_id,model,status,notes,tokens,generated_at) "
            f"VALUES ({q(lesson['lesson_id'])},{q(lesson['course_id'])},{q(MODEL)},'ready',{q(notes[:12000])},0,datetime('now'));\n"
        )
        out.flush()
        done_out.write(lesson['lesson_id'] + '\n')
        done_out.flush()
        ok += 1
        print(f"[{idx}/{len(lessons)}] OK {lesson.get('title')}", flush=True)
    except Exception as e:
        failed.append((lesson.get('lesson_id'), lesson.get('title'), str(e)[:160]))
        print(f"[{idx}/{len(lessons)}] FAIL {lesson.get('title')}: {e}", flush=True)
    time.sleep(0.2)

out.close()
done_out.close()
print(f'generated={ok} failed={len(failed)}', flush=True)
for item in failed:
    print('FAILED', item, flush=True)
