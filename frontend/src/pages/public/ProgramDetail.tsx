import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { optimizeImageUrl } from '@/lib/cloudinary';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLine, SkeletonBlock } from '@/components/ui/Skeleton';
import { BookOpen, Clock, Users, Star, ArrowRight, Target, CheckCircle, ChevronRight, Play } from 'lucide-react';
import SEO from '@/components/seo/SEO';
import { formatCurrency } from '@/lib/utils';
import { VideoPlayer } from '@/components/video/VideoPlayer';

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hours`;
};

export default function ProgramDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [program, setProgram] = useState<any>(null);
  const [programVideo, setProgramVideo] = useState<any>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/schools/programs/${slug}`);
        setProgram(data.data);
        if (data.data?.id) {
          const videoRes = await api.get(`/showcase-videos/program/${data.data.id}`);
          setProgramVideo(videoRes.data?.data?.[0] || null);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Program not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-12">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <SkeletonLine className="w-64 h-6" />
          <SkeletonLine className="w-96 h-10" />
          <SkeletonLine className="w-2/3 h-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <EmptyState icon={<BookOpen className="w-8 h-8" />} title="Program not found" description={error || 'This program does not exist.'} action={{ label: 'Browse Schools', onClick: () => window.location.href = '/schools' }} />
      </div>
    );
  }

  const courses = program.courses || [];
  const outcomes = program.career_outcomes || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title={program.name} description={program.description || ''} />

      <div className="relative bg-gradient-to-b from-blue-900/40 dark:to-gray-950 to-white">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <Breadcrumb items={[
            { label: 'Schools', href: '/schools' },
            { label: program.school_name || 'School', href: `/schools/${program.school_slug}` },
            { label: program.name },
          ]} className="mb-6" />

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{program.name}</h1>
              <p className="text-lg text-gray-400 max-w-3xl">{program.description}</p>

              <div className="flex flex-wrap items-center gap-4">
                {program.duration && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-400">
                    <Clock className="w-4 h-4" /> {program.duration}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <BookOpen className="w-4 h-4" /> {courses.length} courses
                </div>
                <Badge variant="primary" size="md">
                  <Link to={`/schools/${program.school_slug}`} className="flex items-center gap-1">
                    {program.school_name} <ChevronRight className="w-3 h-3" />
                  </Link>
                </Badge>
                {programVideo && (
                  <Button size="sm" variant="outline" onClick={() => setVideoOpen(true)} className="flex items-center gap-2">
                    <Play className="w-4 h-4" /> Watch Overview
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              {programVideo?.thumbnail_url && (
                <div className="cursor-pointer" onClick={() => setVideoOpen(true)}>
                  <div className="relative aspect-video rounded-xl overflow-hidden group">
                    <img src={programVideo.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-primary-500/90 flex items-center justify-center">
                        <Play className="w-7 h-7 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {programVideo && (
                <VideoPlayer
                  videoUrl={programVideo.video_url}
                  provider={programVideo.provider}
                  thumbnailUrl={programVideo.thumbnail_url}
                  title={programVideo.title}
                  videoId={programVideo.id}
                  isOpen={videoOpen}
                  onClose={() => setVideoOpen(false)}
                />
              )}
              <GlassCard className="p-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-500" /> Career Outcomes
                </h3>
                {outcomes.length === 0 ? (
                  <p className="text-sm text-gray-500">Career outcomes are added as cohorts complete.</p>
                ) : (
                  <div className="space-y-2">
                    {outcomes.map((outcome: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        {outcome}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-white mb-6">Program Courses</h2>

        {courses.length === 0 ? (
          <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No courses yet" description="Courses for this program are being added." />
        ) : (
          <div className="space-y-4">
            {courses.map((course: any, i: number) => {
              const isFree = Number(course.price) === 0;
              return (
                <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/courses/${course.slug}`}>
                    <GlassCard hover={false} className="p-4 group">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-white font-medium group-hover:text-primary-500 transition-colors truncate">{course.title}</h3>
                              <p className="text-sm text-gray-400 line-clamp-1 mt-0.5">{course.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-white font-semibold">{isFree ? 'Free' : formatCurrency(course.price)}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(course.duration)}</div>
                            <div className="flex items-center gap-1"><Users className="w-3 h-3" />{course.student_count ?? 0}</div>
                            <div className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" />{course.avg_rating ?? '0.0'}</div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors shrink-0 mt-1" />
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
