#!/usr/bin/env python3
"""Generate lesson quizzes from Gemini lesson notes with Workers AI.

Usage:
  CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
    python3 scripts/ai/generate-quizzes.py /tmp/quiz-lessons.json /tmp/quiz-v2.sql

The script is resumable: it records completed lesson ids in a sidecar file and
appends SQL after every lesson. Old quizzes are unpublished, not deleted, so
existing attempts and audit history are preserved.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import uuid

INPUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/quiz-lessons.json'
OUTPUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/quiz-v2.sql'
DONE_FILE = OUTPUT + '.done'
TOKEN = os.environ['CLOUDFLARE_API_TOKEN']
ACCOUNT = os.environ.get('CLOUDFLARE_ACCOUNT_ID', 'ae5f7e6e4a91cf13a04d8343c445e583')
MODEL = os.environ.get('QUIZ_MODEL', '@cf/meta/llama-3.3-70b-instruct-fp8-fast')
URL = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/{MODEL}'

lessons = json.load(open(INPUT))[0]['results']
done = set()
if os.path.exists(DONE_FILE):
    done = {line.strip() for line in open(DONE_FILE) if line.strip()}


def q(value):
    if value is None:
        return 'NULL'
    return "'" + str(value).replace("'", "''") + "'"


def difficulty(lesson):
    module_order = int(lesson.get('module_order') or 0)
    order = int(lesson.get('order_index') or 0)
    # Early lessons are recall; later lessons add application and debugging.
    return max(1, min(5, 1 + module_order + (order // 3)))


def prompt(lesson):
    level = difficulty(lesson)
    return f"""You are writing a quality quiz for a CareerCode Academy lesson.
Return ONLY valid JSON. Do not use markdown fences.

Shape:
{{"questions":[{{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}}]}}

Create exactly 5 multiple-choice questions.
Difficulty level {level} of 5 (1 = recall, 5 = synthesis/debugging).
Use a mix of recall, application and one debugging or scenario question.
Exactly 4 plausible options per question. The answer is the 0-based index.
Every explanation must say why the correct answer is right.

Course: {lesson.get('course_title')}
Lesson: {lesson.get('title')}
Lesson description: {lesson.get('description') or ''}
Lesson notes:
{lesson.get('notes') or ''}
"""


def call(lesson, attempt=0):
    payload = {
        'messages': [
            {'role': 'system', 'content': 'You write accurate, beginner-friendly multiple-choice quizzes. Return only JSON.'},
            {'role': 'user', 'content': prompt(lesson)},
        ],
        'max_tokens': 1200,
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
        if not text:
            text = data.get('result', {}).get('response', '')
        return text
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


def parse(text):
    text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text.strip(), flags=re.I)
    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        raise ValueError('no JSON object')
    raw = match.group(0)
    for candidate in (raw, re.sub(r',\s*([}\]])', r'\1', raw)):
        try:
            obj = json.loads(candidate)
            questions = obj.get('questions') or obj.get('quiz') or []
            if isinstance(questions, list) and len(questions) >= 3:
                return questions[:5]
        except Exception:
            continue
    raise ValueError('invalid quiz JSON')


def sql_for(lesson, questions):
    level = difficulty(lesson)
    quiz_id = str(uuid.uuid4())
    title = f"{lesson.get('title')} — Knowledge Check"
    description = f"Five questions on the key ideas from this lesson. Difficulty {level}/5. Aim for 70% or higher."
    lines = [
        f"UPDATE quizzes SET published = 0 WHERE lesson_id = {q(lesson['lesson_id'])};",
        f"INSERT INTO quizzes (id,course_id,lesson_id,title,description,time_limit,passing_score,max_attempts,published) VALUES ({q(quiz_id)},{q(lesson['course_id'])},{q(lesson['lesson_id'])},{q(title)},{q(description)},10,70,3,1);",
    ]
    for i, item in enumerate(questions):
        question = str(item.get('question') or '').strip()
        options = [str(o).strip() for o in (item.get('options') or []) if str(o).strip()]
        if not question or len(options) < 2:
            continue
        options = options[:4]
        answer = item.get('answer', item.get('correct', 0))
        try:
            answer_idx = int(answer)
        except Exception:
            answer_idx = 0
        if answer_idx < 0 or answer_idx >= len(options):
            answer_idx = 0
        points = max(1, min(5, level + (1 if i == len(questions) - 1 else 0)))
        explanation = str(item.get('explanation') or '').strip()
        lines.append(
            "INSERT INTO quiz_questions (id,quiz_id,question,options,correct_answer,points,order_index,explanation) "
            f"VALUES ({q(str(uuid.uuid4()))},{q(quiz_id)},{q(question)},{q(json.dumps(options, ensure_ascii=False))},{q(options[answer_idx])},{points},{i},{q(explanation)});"
        )
    return lines


out = open(OUTPUT, 'a')
done_out = open(DONE_FILE, 'a')
ok = 0
failed = []
for idx, lesson in enumerate(lessons, 1):
    lesson_id = lesson['lesson_id']
    if lesson_id in done:
        continue
    try:
        text = call(lesson)
        questions = parse(text)
        lines = sql_for(lesson, questions)
        out.write('\n'.join(lines) + '\n')
        out.flush()
        done_out.write(lesson_id + '\n')
        done_out.flush()
        ok += 1
        print(f"[{idx}/{len(lessons)}] OK {lesson.get('title')} ({len(questions)} questions)", flush=True)
    except Exception as e:
        failed.append((lesson_id, lesson.get('title'), str(e)[:160]))
        print(f"[{idx}/{len(lessons)}] FAIL {lesson.get('title')}: {e}", flush=True)
    time.sleep(0.25)

out.close()
done_out.close()
print(f"generated={ok} failed={len(failed)}", flush=True)
for item in failed:
    print('FAILED', item, flush=True)
