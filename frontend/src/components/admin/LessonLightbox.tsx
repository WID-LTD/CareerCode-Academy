import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Upload, Trash2, Video, Link as LinkIcon, FileText, Code, HelpCircle, Target, Megaphone, BarChart3, Download, Youtube, Loader2, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

type Tab = 'topic' | 'quiz' | 'resources' | 'practice' | 'projects' | 'announcements' | 'progress' | 'video';

const TABS: {key: Tab, label: string, icon: any}[] = [
  {key:'topic', label:'Topic', icon: FileText},
  {key:'quiz', label:'Quiz', icon: HelpCircle},
  {key:'resources', label:'Resources', icon: Download},
  {key:'practice', label:'Practice', icon: Code},
  {key:'projects', label:'Projects', icon: Target},
  {key:'announcements', label:'Announcements', icon: Megaphone},
  {key:'progress', label:'Progress', icon: BarChart3},
  {key:'video', label:'Video', icon: Video},
];

function isYoutubeUrl(url: string){ return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/.test(url); }
function getYoutubeId(url: string){ const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/); return m?m[1]:null; }

export default function LessonLightbox({ lesson, courseId, onClose, onSaved }: { lesson: any, courseId: string, onClose: ()=>void, onSaved: ()=>void }) {
  const [activeTab, setActiveTab] = useState<Tab>('topic');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ title: lesson.title||'', description: lesson.description||'', duration: lesson.duration||15, is_free: lesson.is_free||false });
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stagedVideo, setStagedVideo] = useState<string | null>(lesson.video_url || null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReplace, setConfirmReplace] = useState<null | {type: 'video', newUrl: string, isFile?: boolean}>(null);

  useEffect(()=>{ loadAll(); }, [lesson.id]);

  const loadAll = async () => {
    try { const {data}=await api.get(`/quizzes/lesson/${lesson.id}`); setQuiz(data.data); if(data.data) {
      const qd=await api.get(`/quizzes/${data.data.id}`); setQuestions(qd.data.data?.questions||qd.data.questions||[]);
    }} catch { setQuiz(null); setQuestions([]); }
    try { const {data}=await api.get(`/resources/lesson/${lesson.id}`); setResources(data.data||[]); } catch { setResources([]); }
    try { const {data}=await api.get(`/challenges/lesson/${lesson.id}`); setChallenges(data.data||[]); } catch { setChallenges([]); }
    try { const {data}=await api.get(`/courses/${courseId}/announcements`); setAnnouncements(data.data||[]); } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // update lesson
      const payload: any = { title: form.title, description: form.description, duration: Number(form.duration), is_free: form.is_free };
      // handle video
      if (stagedFile) {
        const fd=new FormData(); fd.append('video', stagedFile);
        const {data}=await api.post(`/videos/upload/${lesson.id}`, fd);
        payload.video_url = data.data?.video_url || data.video_url;
      } else if (stagedVideo !== lesson.video_url) {
        payload.video_url = stagedVideo;
        if (!stagedVideo) await api.delete(`/videos/${lesson.id}`).catch(()=>{});
      }
      await api.put(`/lessons/${lesson.id}`, payload);
      // save quiz questions if edited
      for(const q of questions){
        if(q._dirty){
          if(q.id?.startsWith('temp-')) {
            await api.post(`/quizzes/${quiz.id}/questions`, { question: q.question, options: q.options, correct_answer: q.correct_answer, points: q.points||1, order_index: q.order_index });
          } else {
            await api.put(`/quizzes/questions/${q.id}`, { question: q.question, options: q.options, correct_answer: q.correct_answer, points: q.points });
          }
        }
      }
      toast.success('Lesson saved');
      onSaved();
    } catch(e:any){ toast.error(e?.response?.data?.message||'Save failed'); }
    finally{ setSaving(false); }
  };

  const handleClose = () => {
    // discard staged file preview
    if(stagedFile) URL.revokeObjectURL(stagedVideo||'');
    onClose();
  };

  const onDropVideo = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file=e.dataTransfer.files?.[0];
    if(file) handleVideoFile(file);
  };
  const handleVideoFile = (file: File) => {
    if(!file.type.startsWith('video/')){ toast.error('Only video files allowed'); return; }
    if(file.size>100*1024*1024){ toast.error('Max 100MB'); return; }
    if(stagedVideo && stagedVideo!==lesson.video_url){ /* already staged */ }
    if(stagedVideo || lesson.video_url){
      setConfirmReplace({type:'video', newUrl: URL.createObjectURL(file), isFile:true});
      (setConfirmReplace as any)._file=file;
      return;
    }
    setStagedFile(file);
    setStagedVideo(URL.createObjectURL(file));
  };

  const handleYoutubePaste = async () => {
    if(!youtubeInput.trim() || !isYoutubeUrl(youtubeInput)){ toast.error('Enter valid YouTube URL'); return; }
    if(stagedVideo || lesson.video_url){
      setConfirmReplace({type:'video', newUrl: youtubeInput});
      return;
    }
    setYoutubeLoading(true);
    setTimeout(()=>{
      setStagedVideo(youtubeInput);
      setYoutubeLoading(false);
      setShowYoutubeInput(false);
      setYoutubeInput('');
      toast.success('YouTube video loaded');
    }, 800);
  };

  const confirmReplaceAction = () => {
    if(!confirmReplace) return;
    if(confirmReplace.isFile){
      const file=(confirmReplace as any)._file as File;
      setStagedFile(file);
      setStagedVideo(confirmReplace.newUrl);
    } else {
      setStagedFile(null);
      setStagedVideo(confirmReplace.newUrl);
      setYoutubeLoading(false); setShowYoutubeInput(false); setYoutubeInput('');
    }
    setConfirmReplace(null);
  };

  const removeVideo = () => {
    if(stagedFile) URL.revokeObjectURL(stagedVideo||'');
    setStagedFile(null);
    setStagedVideo(null);
  };

  const addQuestion = () => {
    const newQ={ id: `temp-${Date.now()}`, question:'', options:['','','',''], correct_answer:'', points:1, order_index: questions.length, _dirty:true };
    setQuestions([...questions, newQ]);
  };
  const updateQuestion = (idx:number, field:string, value:any) => {
    const copy=[...questions]; (copy[idx] as any)[field]=value; (copy[idx] as any)._dirty=true; setQuestions(copy);
  };
  const deleteQuestion = async (idx:number) => {
    const q=questions[idx];
    if(!q.id.startsWith('temp-')){
      try{ await api.delete(`/quizzes/questions/${q.id}`); }catch{}
    }
    setQuestions(questions.filter((_,i)=>i!==idx));
  };
  const ensureQuiz = async () => {
    if(quiz) return quiz;
    const {data}=await api.post('/quizzes', { course_id: courseId, lesson_id: lesson.id, title: `${lesson.title} - Quiz`, description: `Quiz for ${lesson.title}`, time_limit:10, passing_score:70, max_attempts:3 });
    setQuiz(data.data);
    return data.data;
  };

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
        <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="min-w-0">
              <h2 className="font-bold truncate">{lesson.title}</h2>
              <p className="text-xs text-gray-400 truncate">{lesson.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Save className="w-4 h-4 mr-1"/>} Save</Button>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Tabs sidebar */}
            <div className="w-40 sm:w-48 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-2 space-y-1 hidden sm:block">
              {TABS.map(t=> (
                <button key={t.key} onClick={()=>setActiveTab(t.key)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${activeTab===t.key ? 'bg-primary-500/10 text-primary-600 border border-primary-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
            {/* Mobile tabs */}
            <div className="sm:hidden flex overflow-x-auto p-2 gap-1 border-b border-gray-200 dark:border-gray-800">
              {TABS.map(t=> <button key={t.key} onClick={()=>setActiveTab(t.key)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${activeTab===t.key?'bg-primary-500 text-white':'bg-gray-100 dark:bg-gray-800'}`}>{t.label}</button>)}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab==='topic' && (
                <div className="space-y-4">
                  <Input label="Topic Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
                  <div className="space-y-1.5"><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} rows={4} className="w-full rounded-xl border px-4 py-2.5 text-sm" /></div>
                  <div className="grid grid-cols-2 gap-4"><Input label="Duration (min)" type="number" value={form.duration} onChange={e=>setForm({...form, duration:e.target.value})} /><label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={form.is_free} onChange={e=>setForm({...form, is_free:e.target.checked})} /> Free preview</label></div>
                </div>
              )}

              {activeTab==='video' && (
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2"><Video className="w-4 h-4" /> Course Video (max 1)</h3>
                  {!stagedVideo ? (
                    <div onDragOver={e=>{e.preventDefault(); setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={onDropVideo} onClick={()=>fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${dragOver?'border-primary-500 bg-primary-50 dark:bg-primary-900/10':'border-gray-300 dark:border-gray-700 hover:border-primary-500/50'}`}>
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Drag & drop video here or click to upload</p>
                      <p className="text-xs text-gray-400 mt-1">MP4, MOV up to 100MB — or use YouTube</p>
                      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) handleVideoFile(f);}} />
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border bg-black">
                      {isYoutubeUrl(stagedVideo) ? (
                        <iframe src={`https://www.youtube.com/embed/${getYoutubeId(stagedVideo)}`} className="w-full aspect-video" allowFullScreen />
                      ) : (
                        <video src={stagedVideo} controls className="w-full aspect-video bg-black" poster={lesson.video_thumbnail || ''} />
                      )}
                      <button onClick={removeVideo} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{isYoutubeUrl(stagedVideo)?'YouTube':'S3 Storage'}</div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={()=>setShowYoutubeInput(!showYoutubeInput)}><Youtube className="w-4 h-4 mr-1 text-red-500" /> YouTube</Button>
                    <Button variant="outline" onClick={()=>fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> Upload</Button>
                    {stagedVideo && <Button variant="ghost" onClick={removeVideo}><Trash2 className="w-4 h-4 mr-1" /> Remove</Button>}
                  </div>
                  {showYoutubeInput && (
                    <div className="flex gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border">
                      <Input placeholder="Paste YouTube URL https://youtube.com/watch?v=..." value={youtubeInput} onChange={e=>setYoutubeInput(e.target.value)} className="flex-1" />
                      <Button onClick={handleYoutubePaste} disabled={youtubeLoading || !youtubeInput.trim()}>{youtubeLoading? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />} Load</Button>
                    </div>
                  )}
                  {confirmReplace && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 flex items-center justify-between">
                      <span className="text-sm text-amber-800 dark:text-amber-300">Replace existing video? Requires confirmation.</span>
                      <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={()=>setConfirmReplace(null)}>Cancel</Button><Button size="sm" onClick={confirmReplaceAction}>Replace</Button></div>
                    </div>
                  )}
                </div>
              )}

              {activeTab==='quiz' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><h3 className="font-medium flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Quiz (easy, 5 per lesson)</h3><Button size="sm" onClick={async()=>{ await ensureQuiz(); addQuestion();}}>Add Question</Button></div>
                  {!quiz && <p className="text-sm text-gray-400">No quiz yet — click Add Question to create one (will auto-create quiz on save).</p>}
                  {questions.map((q, idx)=>(
                    <div key={q.id} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Q{idx+1}</span>
                        <div className="flex gap-1">
                          <Badge variant="default">easy</Badge>
                          <Button size="sm" variant="ghost" onClick={()=>deleteQuestion(idx)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <Input placeholder="Question" value={q.question} onChange={e=>updateQuestion(idx,'question',e.target.value)} />
                      <div className="grid gap-2">
                        {(q.options||[]).map((opt:string, oi:number)=>(
                          <div key={oi} className="flex gap-2">
                            <input type="radio" name={`correct-${q.id}`} checked={q.correct_answer===opt} onChange={()=>updateQuestion(idx,'correct_answer',opt)} className="mt-2" />
                            <Input placeholder={`Option ${String.fromCharCode(65+oi)}`} value={opt} onChange={e=>{ const copy=[...q.options]; copy[oi]=e.target.value; updateQuestion(idx,'options',copy); if(q.correct_answer===opt) updateQuestion(idx,'correct_answer',e.target.value); }} className="flex-1" />
                            <Button size="sm" variant="ghost" onClick={()=>{ const copy=[...q.options]; copy.splice(oi,1); updateQuestion(idx,'options',copy); }} disabled={(q.options||[]).length<=2}><X className="w-3 h-3" /></Button>
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" onClick={()=>updateQuestion(idx,'options', [...(q.options||[]), ''])} disabled={(q.options||[]).length>=4}><Plus className="w-3 h-3 mr-1" /> Add Option</Button>
                      </div>
                      <Input placeholder="Correct answer must match one option exactly" value={q.correct_answer} onChange={e=>updateQuestion(idx,'correct_answer',e.target.value)} />
                    </div>
                  ))}
                </div>
              )}

              {activeTab==='resources' && (
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Resources</h3>
                  <div onDragOver={e=>e.preventDefault()} onDrop={async e=>{e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(!f) return; const fd=new FormData(); fd.append('file',f); fd.append('courseId',courseId); fd.append('lessonId',lesson.id); fd.append('title',f.name); await api.post('/resources',fd); const {data}=await api.get(`/resources/lesson/${lesson.id}`); setResources(data.data||[]); toast.success('Uploaded');}} className="border-2 border-dashed rounded-xl p-6 text-center border-gray-300 dark:border-gray-700">
                    <p className="text-sm text-gray-500">Drag & drop files/docs here or click to browse</p>
                    <input type="file" className="hidden" id="res-upload" onChange={async e=>{const f=e.target.files?.[0]; if(!f) return; const fd=new FormData(); fd.append('file',f); fd.append('courseId',courseId); fd.append('lessonId',lesson.id); fd.append('title',f.name); await api.post('/resources',fd); const {data}=await api.get(`/resources/lesson/${lesson.id}`); setResources(data.data||[]);}} />
                    <label htmlFor="res-upload" className="inline-flex mt-2 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm cursor-pointer">Browse</label>
                  </div>
                  {resources.length===0? <p className="text-sm text-gray-400 text-center py-4">No resources yet</p> : resources.map((r:any)=>(
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2 min-w-0"><FileText className="w-4 h-4 text-blue-500" /><span className="text-sm truncate">{r.title}</span><a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View</a></div>
                      <Button size="sm" variant="ghost" onClick={async()=>{ await api.delete(`/resources/${r.id}`); setResources(resources.filter(x=>x.id!==r.id));}}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab==='practice' && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2"><Code className="w-4 h-4" /> Practice (Challenges)</h3>
                  {challenges.length===0? <p className="text-sm text-gray-400">No challenges for this lesson.</p> : challenges.map((c:any)=>(
                    <div key={c.id} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800/50">
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-2">{c.instructions}</p>
                      <Badge className="mt-1">{c.difficulty}</Badge>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">Edit challenges via full CourseEditor or admin challenge manager.</p>
                </div>
              )}

              {activeTab==='projects' && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2"><Target className="w-4 h-4" /> Projects</h3>
                  <p className="text-sm text-gray-400">Projects are course-level assignments. Manage via Assignments tab in course.</p>
                </div>
              )}
              {activeTab==='announcements' && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2"><Megaphone className="w-4 h-4" /> Announcements</h3>
                  {announcements.length===0? <p className="text-sm text-gray-400">No announcements</p> : announcements.map((a:any)=>(
                    <div key={a.id} className="p-3 rounded-xl border"><p className="font-medium text-sm">{a.title}</p><p className="text-xs text-gray-400">{a.content}</p></div>
                  ))}
                </div>
              )}
              {activeTab==='progress' && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Progress</h3>
                  <p className="text-sm text-gray-400">Progress is auto-tracked via lesson completion and quiz attempts. No manual edit.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
