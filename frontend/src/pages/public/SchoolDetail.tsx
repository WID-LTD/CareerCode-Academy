import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLine, SkeletonBlock } from '@/components/ui/Skeleton';
import {
  Code2, Database, Palette, Briefcase, GraduationCap, BookOpen,
  ArrowRight, Clock, Users, Play, Award, Shield, TrendingUp, Star,
  CheckCircle, DollarSign, ExternalLink, Cloud, Sparkles
} from 'lucide-react';
import SEO from '@/components/seo/SEO';
import { VideoPlayer } from '@/components/video/VideoPlayer';

const iconMap: Record<string, any> = {
  Code2, Database, Palette, Briefcase, GraduationCap, BookOpen, Shield, Cloud,
};

const programLevels: Record<string, string> = {
  'frontend-development': 'Beginner Friendly',
  'backend-development': 'Intermediate',
  'full-stack-development': 'Advanced',
  'mobile-app-development': 'Intermediate',
  'devops-engineering': 'Advanced',
  'cybersecurity': 'Intermediate',
  'cloud-computing': 'Advanced',
};

const programValueProps: Record<string, string> = {
  'frontend-development': 'Build modern web applications and launch your frontend development career.',
  'backend-development': 'Design scalable server-side systems and become a backend engineering expert.',
  'full-stack-development': 'Master both frontend and backend to become a complete software engineer.',
  'mobile-app-development': 'Create native and cross-platform mobile apps for iOS and Android.',
  'devops-engineering': 'Streamline software delivery with modern DevOps practices and tools.',
  'cybersecurity': 'Protect organizations from cyber threats and build a career in security.',
  'cloud-computing': 'Architect and deploy cloud-native solutions on major cloud platforms.',
};

const programSkills: Record<string, string[]> = {
  'frontend-development': ['React', 'TypeScript', 'Tailwind CSS', 'APIs'],
  'backend-development': ['Node.js', 'Express', 'PostgreSQL', 'REST APIs'],
  'full-stack-development': ['React', 'Node.js', 'Databases', 'Deployment'],
  'mobile-app-development': ['React Native', 'Flutter', 'Mobile UI', 'APIs'],
  'devops-engineering': ['Docker', 'Kubernetes', 'CI/CD', 'AWS'],
  'cybersecurity': ['Network Security', 'Penetration Testing', 'Threat Analysis', 'Incident Response'],
  'cloud-computing': ['AWS', 'Azure', 'GCP', 'Serverless'],
};

const programPopularity: Record<string, { badge: string; color: string }> = {
  'frontend-development': { badge: 'Most Popular', color: 'text-orange-400 bg-orange-500/20 border-orange-500/30' },
  'full-stack-development': { badge: 'Recommended', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
  'devops-engineering': { badge: 'Fastest Growing', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
  'cloud-computing': { badge: 'Premium Track', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
};

const programDemand: Record<string, { label: string; color: string }> = {
  'frontend-development': { label: 'Very High Demand', color: 'text-emerald-400 bg-emerald-500/15' },
  'backend-development': { label: 'High Demand', color: 'text-blue-400 bg-blue-500/15' },
  'full-stack-development': { label: 'Very High Demand', color: 'text-emerald-400 bg-emerald-500/15' },
  'mobile-app-development': { label: 'High Demand', color: 'text-blue-400 bg-blue-500/15' },
  'devops-engineering': { label: 'Industry Critical', color: 'text-red-400 bg-red-500/15' },
  'cybersecurity': { label: 'Industry Critical', color: 'text-red-400 bg-red-500/15' },
  'cloud-computing': { label: 'Very High Demand', color: 'text-emerald-400 bg-emerald-500/15' },
};

const programRoadmaps: Record<string, string[]> = {
  'frontend-development': ['HTML/CSS', 'JavaScript', 'React', 'TypeScript', 'Portfolio'],
  'backend-development': ['Node.js', 'Express', 'Databases', 'Auth', 'Deployment'],
  'full-stack-development': ['Frontend', 'Backend', 'Database', 'DevOps', 'Project'],
  'mobile-app-development': ['Mobile UI', 'React Native', 'State Mgmt', 'APIs', 'App Store'],
  'devops-engineering': ['Linux', 'Docker', 'K8s', 'CI/CD', 'Cloud'],
  'cybersecurity': ['Networking', 'Security', 'Pen Testing', 'Response', 'Audit'],
  'cloud-computing': ['Cloud Basics', 'AWS', 'Azure', 'Serverless', 'Architecture'],
};



export default function SchoolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [school, setSchool] = useState<any>(null);
  const [schoolVideo, setSchoolVideo] = useState<any>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/schools/${slug}`);
        setSchool(data.data);
        if (data.data?.id) {
          const videoRes = await api.get(`/showcase-videos/school/${data.data.id}`);
          setSchoolVideo(videoRes.data?.data?.[0] || null);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'School not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-12">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <SkeletonLine className="w-48 h-6" />
          <SkeletonLine className="w-96 h-10" />
          <SkeletonLine className="w-2/3 h-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <EmptyState icon={<BookOpen className="w-8 h-8" />} title="School not found" description={error || 'This school does not exist.'} action={{ label: 'Browse Schools', onClick: () => window.location.href = '/schools' }} />
      </div>
    );
  }

  const Icon = iconMap[school.icon] || BookOpen;
  const programs = school.programs || [];
  const totalCourses = programs.reduce((sum: number, p: any) => sum + (p.course_count || 0), 0);
  const allOutcomes = new Set(programs.flatMap((p: any) => p.career_outcomes || []));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title={school.name} description={school.description || ''} />

      <div className="relative bg-gradient-to-b from-blue-900/40 dark:to-gray-950 to-white">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <Breadcrumb items={[
            { label: 'Schools', href: '/schools' },
            { label: school.name },
          ]} className="mb-6" />

          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${school.color || 'from-primary-500 to-accent-500'} flex items-center justify-center shrink-0`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{school.name}</h1>
              <p className="text-lg text-gray-400 max-w-3xl">{school.description}</p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4">
                <Badge variant="primary" size="md">{programs.length} Programs</Badge>
                {schoolVideo && (
                  <Button size="sm" variant="outline" onClick={() => setVideoOpen(true)} className="flex items-center gap-2">
                    <Play className="w-4 h-4" /> Watch Overview
                  </Button>
                )}
              </div>
            </div>
            {schoolVideo?.thumbnail_url && (
              <div className="hidden md:block shrink-0 cursor-pointer" onClick={() => setVideoOpen(true)}>
                <div className="relative w-40 h-24 rounded-xl overflow-hidden group">
                  <img src={schoolVideo.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {schoolVideo && (
        <VideoPlayer
          videoUrl={schoolVideo.video_url}
          provider={schoolVideo.provider}
          thumbnailUrl={schoolVideo.thumbnail_url}
          title={schoolVideo.title}
          videoId={schoolVideo.id}
          isOpen={videoOpen}
          onClose={() => setVideoOpen(false)}
        />
      )}

      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {programs.length === 0 ? (
          <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No programs yet" description="Programs for this school are being developed." />
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                Launch Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Software Development</span> Career
              </h2>
              <p className="text-lg text-gray-400 max-w-3xl mb-6">
                Choose a specialized pathway designed to take you from learning fundamentals to industry-ready professional skills.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-blue-400" /> {programs.length} Programs</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-400" /> {totalCourses} Courses</span>
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-blue-400" /> {allOutcomes.size} Career Outcomes</span>

              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                {[
                  { value: programs.length, label: 'Programs', icon: Award, color: 'text-emerald-400' },
                  { value: totalCourses, label: 'Courses', icon: BookOpen, color: 'text-yellow-400' },
                  { value: allOutcomes.size, label: 'Career outcomes', icon: CheckCircle, color: 'text-blue-400' },
                  { value: 3, label: 'Learning levels', icon: Users, color: 'text-purple-400' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/5 dark:bg-gray-800/50 border border-white/10 dark:border-gray-700/50 p-3 sm:p-4 text-center">
                    <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} />
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program: any, i: number) => {
                const slugKey = program.slug;
                const PIcon = iconMap[program.icon] || BookOpen;
                const outcomes = program.career_outcomes || [];
                const level = Object.prototype.hasOwnProperty.call(programLevels, slugKey) ? programLevels[slugKey] : null;
                const valueProp = Object.prototype.hasOwnProperty.call(programValueProps, slugKey) ? programValueProps[slugKey] : null;
                const skills = Object.prototype.hasOwnProperty.call(programSkills, slugKey) ? programSkills[slugKey] : null;
                const popularity = Object.prototype.hasOwnProperty.call(programPopularity, slugKey) ? programPopularity[slugKey] : null;
                const demand = Object.prototype.hasOwnProperty.call(programDemand, slugKey) ? programDemand[slugKey] : null;
                const roadmap = Object.prototype.hasOwnProperty.call(programRoadmaps, slugKey) ? programRoadmaps[slugKey] : null;

                return (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <Link to={`/schools/programs/${program.slug}`} className="block h-full">
                      <motion.div
                        whileHover={{ y: -6, transition: { duration: 0.3, ease: 'easeOut' } }}
                        className="relative h-full"
                      >
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-blue-500/30 via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <GlassCard hover={false} className="h-full p-0 overflow-hidden relative">
                          <div className={`absolute inset-0 bg-gradient-to-br ${school.color || 'from-primary-500/5 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                          <div className="p-5 flex flex-col h-full relative z-10">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <motion.div
                                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${school.color || 'from-primary-500/20 to-accent-500/20'} flex items-center justify-center shrink-0 transition-transform duration-300`}
                                  whileHover={{ scale: 1.1 }}
                                >
                                  <PIcon className="w-5 h-5 text-white" />
                                </motion.div>
                                <div className="min-w-0">
                                  <h3 className="text-white font-semibold group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-400 transition-all truncate">
                                    {program.name}
                                  </h3>
                                  {level && (
                                    <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                      {level}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {popularity && (
                                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${popularity.color}`}>
                                  {popularity.badge}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-400 leading-relaxed mb-3 line-clamp-2">
                              {valueProp || program.description}
                            </p>

                            {skills && skills.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {skills.map((skill: string) => (
                                    <span key={skill} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 dark:bg-gray-800/50 text-gray-300 border border-white/10 dark:border-gray-700/50">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="border-t border-white/5 dark:border-gray-800/50 pt-3 mb-3">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> Career Outcomes
                              </p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {outcomes.slice(0, 4).map((o: string, oi: number) => (
                                  <div key={oi} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 dark:bg-gray-800/30 border border-white/5 dark:border-gray-700/30 group-hover:border-blue-500/20 transition-colors">
                                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="text-[11px] text-gray-300 truncate">{o}</span>
                                  </div>
                                ))}
                                {outcomes.length > 4 && (
                                  <div className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-white/5 dark:bg-gray-800/30 border border-dashed border-white/10 dark:border-gray-700/30">
                                    <span className="text-[11px] text-gray-500">+{outcomes.length - 4} more</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500 mb-3">
                              {program.duration && (
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" /> {program.duration}</span>
                              )}
                              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-blue-400" /> {program.course_count || 0} Courses</span>
                              <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" /> Certificate</span>
                            </div>

                            {roadmap && roadmap.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Learning Roadmap</p>
                                <div className="flex flex-wrap items-center gap-1">
                                  {roadmap.map((step: string, si: number) => (
                                    <span key={si} className="flex items-center gap-1">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 dark:bg-gray-800/40 text-gray-400 border border-white/5 dark:border-gray-700/40">
                                        {step}
                                      </span>
                                      {si < roadmap.length - 1 && (
                                        <ArrowRight className="w-2.5 h-2.5 text-gray-600 shrink-0" />
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {demand && (
                              <div className="mb-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${demand.color}`}>
                                  <TrendingUp className="w-3 h-3" /> {demand.label}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5 dark:border-gray-800/50">
                              <div className="flex-1">
                                <span className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200 shadow-lg shadow-blue-500/25">
                                  View Program
                                </span>
                              </div>
                              <div className="shrink-0">
                                <span className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                  Career Path <ExternalLink className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
