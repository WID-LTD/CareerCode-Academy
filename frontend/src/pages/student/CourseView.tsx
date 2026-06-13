import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import toast from 'react-hot-toast';
import {
  PlayCircle, CheckCircle, Lock, ChevronLeft, ChevronRight,
  FileText, Download, Maximize, BookOpen, Clock, Award
} from 'lucide-react';

export default function CourseView() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({});
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [courseRes, enrollmentRes] = await Promise.all([
        api.get(`/courses/slug/${slug}`),
        api.get('/enrollments'),
      ]);

      const courseData = courseRes.data.data;
      setCourse(courseData);

      const enrollmentData = enrollmentRes.data.data || [];
      const myEnrollment = enrollmentData.find((e: any) => e.course_id === courseData.id);
      setEnrollment(myEnrollment);

      if (myEnrollment) {
        const progressRes = await api.get(`/progress?courseId=${courseData.id}`);
        const progressMap: Record<string, boolean> = {};
        (progressRes.data.data?.progress || []).forEach((p: any) => {
          if (p.completed) progressMap[p.lesson_id] = true;
        });
        setLessonProgress(progressMap);
      }

      setAccessChecked(true);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error('Please login to access course content');
      }
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const allLessons = course?.lessons || [];
  const currentLesson = allLessons[currentLessonIndex];
  const totalLessons = allLessons.length;
  const completedCount = Object.values(lessonProgress).filter(Boolean).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const hasAccess = !!enrollment;
  const isCompleted = enrollment?.status === 'completed' || enrollment?.completed;

  const markCompleted = async () => {
    if (!currentLesson || !course) return;
    try {
      await api.post('/progress', {
        lessonId: currentLesson.id,
        completed: !lessonProgress[currentLesson.id],
      });
      setLessonProgress(prev => ({
        ...prev,
        [currentLesson.id]: !prev[currentLesson.id],
      }));
      toast.success('Progress updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update progress');
    }
  };

  const goToLesson = (index: number) => {
    if (index >= 0 && index < totalLessons) {
      setCurrentLessonIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Course Not Found</h2>
          <Link to="/student/courses" className="text-blue-400 hover:underline">Back to My Courses</Link>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <GlassCard className="max-w-md text-center p-8">
          <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Required</h2>
          <p className="text-gray-400 mb-6">You need to enroll in this course to access the content.</p>
          <Link to={`/courses/${slug}`}>
            <Button>View Course Details</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col lg:flex-row">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-[#0d0d2b] border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/student/courses" className="text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-white font-semibold text-sm truncate max-w-md">{course.title}</h1>
              <p className="text-gray-500 text-xs">{currentLesson?.title || 'Select a lesson'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500/20 text-blue-400">
              {progressPercent}% complete
            </Badge>
          </div>
        </div>

        {/* Video / Content Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative">
          {currentLesson?.video_url ? (
            <video
              className="w-full h-full max-h-[60vh] object-contain"
              src={currentLesson.video_url}
              controls
              poster={course.thumbnail}
            />
          ) : (
            <div className="text-center p-12">
              <PlayCircle className="w-20 h-20 text-blue-400/50 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">{currentLesson?.title || 'Select a lesson to begin'}</p>
              {currentLesson?.description && (
                <p className="text-gray-600 text-sm mt-2 max-w-lg mx-auto">{currentLesson.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Lesson Navigation */}
        <div className="bg-[#0d0d2b] border-t border-white/5 px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToLesson(currentLessonIndex - 1)}
            disabled={currentLessonIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant={lessonProgress[currentLesson?.id] ? "secondary" : "primary"}
              onClick={markCompleted}
              disabled={!currentLesson}
              className={lessonProgress[currentLesson?.id] ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {lessonProgress[currentLesson?.id] ? (
                <><CheckCircle className="w-4 h-4 mr-1" /> Completed</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-1" /> Mark Complete</>
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => goToLesson(currentLessonIndex + 1)}
            disabled={currentLessonIndex >= totalLessons - 1}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Sidebar - Lesson List */}
      <div className="w-full lg:w-80 bg-[#0d0d2b] border-l border-white/5 overflow-y-auto max-h-screen">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-sm">Course Content</h3>
            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
              {completedCount}/{totalLessons}
            </Badge>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isCompleted && (
            <div className="mt-2 flex items-center gap-1 text-emerald-400 text-xs">
              <Award className="w-3 h-3" /> Certificate earned
            </div>
          )}
        </div>

        <div className="divide-y divide-white/5">
          {allLessons.map((lesson: any, i: number) => {
            const isCurrent = i === currentLessonIndex;
            const isCompleted = lessonProgress[lesson.id];
            return (
              <button
                key={lesson.id || i}
                onClick={() => goToLesson(i)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  isCurrent ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-white/5'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : lesson.isFree ? (
                  <PlayCircle className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                    {lesson.title}
                  </p>
                  {lesson.duration && (
                    <span className="text-xs text-gray-600">{lesson.duration}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
