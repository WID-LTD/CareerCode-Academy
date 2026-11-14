import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCourseStore } from '../../store/courseStore';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { SkeletonLine, SkeletonBlock, SkeletonCircle } from '../../components/ui/Skeleton';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { useWishlistStore } from '../../store/wishlistStore';
import {
  Clock, Users, Star, Share2, Heart, BookOpen, Award,
  CheckCircle, ChevronDown, ChevronUp, PlayCircle, FileText,
  BarChart, Globe, Shield, ArrowLeft, Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { optimizeImageUrl } from '@/lib/cloudinary';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/axios';
import SEO from '@/components/seo/SEO';
import { VideoPlayer } from '@/components/video/VideoPlayer';

const levelColors: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function CourseDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentCourse, isLoading, error, fetchCourseBySlug, enrollCourse, initializePayment, courses, fetchCourses } = useCourseStore();
  const { user } = useAuthStore();
  const { wishlistItems, addToWishlist, removeFromWishlist, fetchWishlist } = useWishlistStore();
  const [curriculumOpen, setCurriculumOpen] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);

  const [courseVideo, setCourseVideo] = useState<any>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const course = currentCourse;
  const isInWishlist = course ? wishlistItems.some(w => w.course_id === course.id) : false;
  const isFree = course ? Number(course.price) === 0 : false;

  useEffect(() => {
    if (slug) {
      fetchCourseBySlug(slug);
      fetchWishlist();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [slug]);

  useEffect(() => {
    if (course?.category) {
      fetchCourses({ category: course.category, limit: 5 });
    }
  }, [course?.category]);

  useEffect(() => {
    const checkUserEnrollment = async () => {
      if (user && course) {
        setCheckingEnrollment(true);
        try {
          const { data } = await api.get('/enrollments');
          const enrollments = data.data || [];
          const enrolled = enrollments.some((item: any) => {
            const c = item.course || item;
            return (c.id === course.id || c.course_id === course.id);
          });
          setIsEnrolled(enrolled);
        } catch (error) {
        } finally {
          setCheckingEnrollment(false);
        }
      } else {
        setIsEnrolled(false);
      }
    };
    checkUserEnrollment();
  }, [user, course]);

  useEffect(() => {
    if (course?.id) {
      api.get(`/showcase-videos/course/${course.id}`).then(({ data }) => {
        setCourseVideo(data?.data?.[0] || null);
      }).catch(() => {});
    }
  }, [course?.id]);

  const handleEnroll = async () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }
    if (!course) return;

    if (isEnrolled) {
      navigate(`/student/courses/${course.slug}`);
      return;
    }

    setIsEnrolling(true);
    try {
      if (isFree) {
        await enrollCourse(course.id);
        toast.success('Enrolled successfully!');
        navigate(`/student/courses/${course.slug}`);
      } else {
        const result: any = await initializePayment(course.id, 'paystack');
        if (result?.authorizationUrl) {
          window.location.href = result.authorizationUrl;
        } else {
          navigate(`/checkout?courseId=${course.id}`);
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Enrollment failed');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleStartTrial = async () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }
    if (!course) return;
    if (isEnrolled) {
      navigate(`/student/courses/${course.slug}`);
      return;
    }
    setIsStartingTrial(true);
    try {
      const { data } = await api.post(`/enrollments/${course.id}/trial`);
      window.dispatchEvent(new Event('trial:updated'));
      toast.success(data?.data?.alreadyActive ? 'Your free trial is already active' : 'Free trial started — every course is unlocked');
      navigate(`/student/courses/${course.slug}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Could not start the free trial');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }
    if (!course) return;
    try {
      if (isInWishlist) {
        await removeFromWishlist(course.id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(course.id);
        toast.success('Added to wishlist');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update wishlist');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  if (error && !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course Not Found</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => fetchCourseBySlug(slug!)}>Retry</Button>
            <Link to="/courses"><Button>Browse Courses</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-12">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <SkeletonLine className="w-32 h-6" />
              <SkeletonLine className="w-3/4 h-10" />
              <SkeletonLine className="w-full h-6" />
              <SkeletonLine className="w-2/3 h-6" />
              <div className="flex gap-6">
                <SkeletonLine className="w-24 h-4" />
                <SkeletonLine className="w-24 h-4" />
                <SkeletonLine className="w-24 h-4" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonCircle size={48} />
                <div className="space-y-2">
                  <SkeletonLine className="w-32 h-4" />
                  <SkeletonLine className="w-20 h-3" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <GlassCard hover={false} className="overflow-hidden">
                <SkeletonBlock className="aspect-video rounded-none" />
                <div className="p-6 space-y-4">
                  <SkeletonLine className="w-24 h-8" />
                  <div className="space-y-2">
                    <SkeletonLine className="w-full h-4" />
                    <SkeletonLine className="w-full h-4" />
                    <SkeletonLine className="w-full h-4" />
                    <SkeletonLine className="w-full h-4" />
                  </div>
                  <SkeletonBlock className="h-14" />
                  <SkeletonBlock className="h-10" />
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const lessons = course.lessons || [];
  const reviews = course.reviews || [];
  const avgRating = course.averageRating ? Number(course.averageRating).toFixed(1) : '0.0';
  const enrollmentCount = course.enrollmentCount || 0;
  const learningOutcomes = course.learningOutcomes || [];
  const relatedCourses = courses.filter(c => c.id !== course.id).slice(0, 4);
  const programName = (course as any).program_name;
  const programSlug = (course as any).program_slug;
  const schoolName = (course as any).school_name;
  const schoolSlug = (course as any).school_slug;

  const priceDisplay = isFree ? 'Free' : course.promotion
    ? formatCurrency(Number(course.effective_price ?? Number(course.price) * (1 - Number(course.promotion.discount_percent) / 100)))
    : formatCurrency(course.price);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title={course?.title || 'Course Details'} description={course?.description?.slice(0, 160)} />
      
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumb items={[
          { label: 'Courses', href: '/courses' },
          ...(schoolName && schoolSlug ? [{ label: schoolName, href: `/schools/${schoolSlug}` as const }] : []),
          ...(programName && programSlug ? [{ label: programName, href: `/schools/programs/${programSlug}` as const }] : []),
          { label: course.title },
        ]} />
      </div>

      {/* Header / Hero */}
      <div className="relative bg-gradient-to-b from-blue-900/40 dark:to-gray-950 to-white pt-8 pb-12">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge className={levelColors[course.level] || ''}>
                  {course.level}
                </Badge>
                <Badge variant="primary" className="border border-blue-500/30">
                  {course.category}
                </Badge>
                {isFree && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Free
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                {course.title}
              </h1>

              <p className="text-gray-400 text-lg leading-relaxed">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-medium">{avgRating}</span>
                  <span>({reviews.length} reviews)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{enrollmentCount} enrolled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration || 'Self-paced'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>{lessons.length} lessons</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {course.instructor_name?.[0] || 'I'}
                </div>
                <div>
                  <p className="text-white font-medium">{course.instructor_name || 'Instructor'}</p>
                  <p className="text-gray-500 text-sm">Course Instructor</p>
                </div>
              </div>

              {(programName || schoolName) && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {programName && programSlug && (
                    <Link to={`/schools/programs/${programSlug}`}>
                      <Badge variant="primary" className="border border-primary-500/30 hover:bg-primary-500/20 transition-colors cursor-pointer">
                        {programName}
                      </Badge>
                    </Link>
                  )}
                  {schoolName && schoolSlug && (
                    <Link to={`/schools/${schoolSlug}`}>
                      <Badge variant="default" className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                        {schoolName}
                      </Badge>
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <GlassCard className="overflow-hidden lg:sticky lg:top-24">
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center relative group cursor-pointer" onClick={() => courseVideo && setVideoOpen(true)}>
                  {course.thumbnail ? (
                    <>
                      <img src={optimizeImageUrl(course.thumbnail, 640, 360)} alt={course.title} className="w-full h-full object-cover" />
                      {courseVideo && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-primary-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                            <Play className="w-7 h-7 text-white ml-1" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <BookOpen className="w-16 h-16 text-blue-400/50" />
                  )}
                </div>
                {courseVideo && (
                  <VideoPlayer
                    videoUrl={courseVideo.video_url}
                    provider={courseVideo.provider}
                    thumbnailUrl={courseVideo.thumbnail_url}
                    title={courseVideo.title}
                    videoId={courseVideo.id}
                    isOpen={videoOpen}
                    onClose={() => setVideoOpen(false)}
                  />
                )}
                <div className="p-6 space-y-4">
                  <div className="text-3xl font-bold text-white">
                    {isFree ? (
                      <span className="text-emerald-400">Free</span>
                    ) : course.promotion ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-emerald-400">{formatCurrency(Number(course.effective_price ?? Number(course.price) * (1 - Number(course.promotion.discount_percent) / 100)))}</span>
                        <span className="text-xl line-through text-gray-500">{formatCurrency(course.price)}</span>
                        <span className="text-sm bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">-{course.promotion.discount_percent}% off</span>
                      </div>
                    ) : (
                      <>{formatCurrency(course.price)}</>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                    <span className="px-2 py-1 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">Paystack</span>
                    <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-300 border border-orange-500/20">Flutterwave</span>
                    <span className="px-2 py-1 rounded-md bg-gray-500/10 text-gray-300 border border-gray-500/20">Secure checkout</span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {course.duration ? `${course.duration} hours` : 'Self-paced'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart className="w-4 h-4" />
                      <span>Level: {course.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Language: English</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>Certificate: Yes</span>
                    </div>
                  </div>

                  {!isEnrolled && !isFree && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                      <p className="text-sm font-semibold text-emerald-300">Enroll now and enjoy 7 days free</p>
                      <p className="text-xs text-emerald-200/70 mt-0.5">One trial unlocks every published course.</p>
                    </div>
                  )}

                  <Button
                    className="w-full py-4 sm:py-6 text-base sm:text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    onClick={!isEnrolled && !isFree ? handleStartTrial : handleEnroll}
                    disabled={isEnrolling || isStartingTrial || checkingEnrollment}
                  >
                    {isEnrolling || isStartingTrial || checkingEnrollment ? (
                      <Loader size="sm" className="mr-2" />
                    ) : null}
                    {isEnrolled ? 'Go to Course' : isFree ? 'Enroll Free' : 'Start 7-day free trial'}
                  </Button>

                  {!isEnrolled && !isFree && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleEnroll}
                      disabled={isEnrolling || isStartingTrial || checkingEnrollment}
                    >
                      Buy this course only — {priceDisplay}
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={`flex-1 ${isInWishlist ? 'border-red-500/50 text-red-400' : ''}`}
                      onClick={handleToggleWishlist}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isInWishlist ? 'fill-red-400' : ''}`} />
                      {isInWishlist ? 'Saved' : 'Wishlist'}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 lg:pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <GlassCard>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                What you'll learn
              </h2>
              {learningOutcomes.length === 0 ? (
                <p className="text-gray-500 text-sm">Learning outcomes will be added soon.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {learningOutcomes.map((outcome: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-gray-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm">{outcome}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setCurriculumOpen(!curriculumOpen)}
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  Course Curriculum
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({lessons.length} lessons)
                  </span>
                </h2>
                {curriculumOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {curriculumOpen && (
                <div className="mt-4 space-y-1">
                  {lessons.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">The curriculum for this course is being finalised.</p>
                  ) : (
                    lessons.map((lesson: any, i: number) => (
                      <div
                        key={lesson.id || i}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {lesson.is_free ? (
                          <PlayCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">
                            {i + 1}. {lesson.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {lesson.duration && (
                            <span className="text-xs text-gray-500">{lesson.duration}</span>
                          )}
                          {lesson.is_free && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0">
                              Free
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                Student Reviews
              </h2>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="border-b border-white/5 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {(review.user_name || 'U')?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{review.user_name || 'Student'}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-400 text-sm ml-10">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Related Courses */}
            {relatedCourses.length > 0 && (
              <GlassCard>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  {programName ? `More from ${programName}` : 'Related Courses'}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {relatedCourses.map((rc) => (
                    <Link key={rc.id} to={`/courses/${rc.slug}`}>
                      <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center shrink-0 overflow-hidden">
                          {rc.thumbnail ? (
                            <img src={optimizeImageUrl(rc.thumbnail, 80, 80)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white group-hover:text-primary-500 transition-colors truncate">{rc.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{rc.student_count ?? 0} students</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-yellow-500" />
                              {rc.avg_rating ?? '0.0'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {Number(rc.price) === 0 ? 'Free' : formatCurrency(rc.price)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          <div className="space-y-4">
            <GlassCard>
              <h3 className="text-white font-semibold mb-3">This course includes:</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-blue-400" />
                  <span>{lessons.length} on-demand video lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Downloadable resources</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Full lifetime access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Community discussion forum</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between gap-3 max-w-screen-4xl mx-auto">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{priceDisplay}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span>{avgRating} ({reviews.length})</span>
              <span>·</span>
              <span>{enrollmentCount} enrolled</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              onClick={!isEnrolled && !isFree ? handleStartTrial : handleEnroll}
              disabled={isEnrolling || isStartingTrial || checkingEnrollment}
            >
              {isEnrolling || isStartingTrial || checkingEnrollment ? (
                <Loader size="sm" className="mr-1" />
              ) : null}
              {isEnrolled ? 'Go to Course' : isFree ? 'Enroll Free' : 'Start free trial'}
            </Button>
            {!isEnrolled && !isFree && (
              <Button variant="outline" onClick={handleEnroll} disabled={isEnrolling || isStartingTrial || checkingEnrollment}>
                Buy — {priceDisplay}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
