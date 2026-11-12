import json, os, time, urllib.request, urllib.error, sys
KEY=os.environ['GEMINI_API_KEY']
lessons=json.load(open(os.environ.get('LESSONS_JSON','/tmp/backend-lessons.json')))[0]['results']
OUTPUT=os.environ.get('NOTES_SQL','/tmp/gemini-notes.sql')
start=int(sys.argv[1]) if len(sys.argv)>1 else 0
end=int(sys.argv[2]) if len(sys.argv)>2 else len(lessons)
MODELS=['gemini-3.1-flash-lite','gemini-3.5-flash-lite','gemini-flash-lite-latest']
PROMPT="""Watch this video and write a complete, original lesson for a CareerCode Academy learner. Do not reproduce the transcript verbatim.

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
def q(v): return "'"+str(v).replace("'","''")+"'"
sql=[]
for i,l in enumerate(lessons[start:end], start):
    print(f"[{i+1}/{len(lessons)}] {l['course_slug']} :: {l['title']}", flush=True)
    payload={"model":None,"input":[{"type":"text","text":PROMPT},{"type":"video","uri":l['video_url']}]}
    result=None; used=None; err=None
    for model in MODELS:
        payload['model']=model
        req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',data=json.dumps(payload).encode(),headers={'x-goog-api-key':KEY,'Content-Type':'application/json'},method='POST')
        try:
            with urllib.request.urlopen(req,timeout=300) as r:
                d=json.load(r)
            if d.get('error'):
                err=d['error'].get('message'); print('  err',model,err[:100],flush=True); continue
            text=''
            for s in d.get('steps',[]):
                if s.get('type')=='model_output':
                    text+=''.join(c.get('text','') for c in s.get('content',[]))
            if text.strip() and 'VIDEO_NOT_ACCESSIBLE' not in text:
                result=text.strip(); used=model
                tokens=d.get('usage',{}).get('total_tokens',0)
                break
            err='empty or inaccessible'
        except Exception as e:
            err=str(e); print('  exception',model,err[:120],flush=True)
    if not result:
        sql.append(f"INSERT INTO lesson_ai_notes (lesson_id,course_id,model,status,notes,tokens,error) VALUES ({q(l['id'])},{q(l['course_id'])},NULL,'error',NULL,0,{q(err or 'failed')}) ON CONFLICT(lesson_id) DO UPDATE SET status='error',error=excluded.error;")
        continue
    sql.append(f"INSERT INTO lesson_ai_notes (lesson_id,course_id,model,status,notes,tokens,error,generated_at) VALUES ({q(l['id'])},{q(l['course_id'])},{q(used)},'ready',{q(result)},{int(tokens or 0)},NULL,datetime('now')) ON CONFLICT(lesson_id) DO UPDATE SET model=excluded.model,status='ready',notes=excluded.notes,tokens=excluded.tokens,error=NULL,generated_at=datetime('now');")
    open(OUTPUT,'w').write('\n'.join(sql))
    print('  ok',used,len(result),tokens,flush=True)
    time.sleep(2)
open(OUTPUT,'w').write('\n'.join(sql))
print('done',len(sql),flush=True)
