import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCourseStore } from '../../store/courseStore';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { useWishlistStore } from '../../store/wishlistStore';
import {
  Clock, Users, Star, Share2, Heart, BookOpen, Award,
  CheckCircle, ChevronDown, ChevronUp, PlayCircle, FileText,
  BarChart, User, Globe, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const levelColors: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function CourseDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentCourse, isLoading, fetchCourseBySlug, enrollCourse, initializePayment } = useCourseStore();
  const { user } = useAuthStore();
  const { wishlistItems, addToWishlist, removeFromWishlist, fetchWishlist } = useWishlistStore();
  const [curriculumOpen, setCurriculumOpen] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCourseBySlug(slug);
      fetchWishlist();
    }
  }, [slug]);

  const course = currentCourse;
  const isInWishlist = course ? wishlistItems.some(w => w.course_id === course.id) : false;
  const isFree = course ? Number(course.price) === 0 : false;

  const handleEnroll = async () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }
    if (!course) return;
    setIsEnrolling(true);
    try {
      if (isFree) {
        await enrollCourse(course.id);
        toast.success('Enrolled successfully!');
        navigate('/student/dashboard');
      } else {
        const result = await initializePayment(course.id, 'paystack');
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Course Not Found</h2>
          <Link to="/courses" className="text-blue-400 hover:underline">Browse Courses</Link>
        </div>
      </div>
    );
  }

  const lessons = course.lessons || [];
  const reviews = course.reviews || [];
  const avgRating = course.averageRating ? Number(course.averageRating).toFixed(1) : '0.0';
  const enrollmentCount = course.enrollmentCount || 0;
  const learningOutcomes = course.learningOutcomes || [
    'Build real-world projects and portfolio',
    'Learn from industry experts with practical experience',
    'Get hands-on with coding exercises and quizzes',
    'Earn a certificate upon completion',
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header / Hero */}
      <div className="relative bg-gradient-to-b from-blue-900/40 to-[#0a0a1a] pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge className={levelColors[course.level] || ''}>
                  {course.level}
                </Badge>
                <Badge variant="outline" className="text-blue-400 border-blue-500/30">
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

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
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

              {/* Instructor */}
              <div className="flex items-center gap-3 pt-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {course.instructor_name?.[0] || 'I'}
                </div>
                <div>
                  <p className="text-white font-medium">{course.instructor_name || 'Instructor'}</p>
                  <p className="text-gray-500 text-sm">Course Instructor</p>
                </div>
              </div>
            </div>

            {/* Right: Course Card */}
            <div className="lg:col-span-1">
              <GlassCard className="overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-16 h-16 text-blue-400/50" />
                  )}
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-3xl font-bold text-white">
                    {isFree ? (
                      <span className="text-emerald-400">Free</span>
                    ) : (
                      <>₦{Number(course.price).toLocaleString()}</>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {course.duration || 'Self-paced'}</span>
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

                  <Button
                    className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                  >
                    {isEnrolling ? (
                      <Loader size="sm" className="mr-2" />
                    ) : null}
                    {isFree ? 'Enroll Free' : 'Enroll Now'}
                  </Button>

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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Learning Outcomes */}
            <GlassCard>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                What you'll learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {learningOutcomes.map((outcome: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-gray-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-sm">{outcome}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Course Curriculum */}
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
                    <p className="text-gray-500 text-sm py-4">Curriculum coming soon.</p>
                  ) : (
                    lessons.map((lesson: any, i: number) => (
                      <div
                        key={lesson.id || i}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {lesson.isFree ? (
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
                          {lesson.isFree && (
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

            {/* Reviews */}
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
                          {review.user_name?.[0] || 'U'}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* This Course Includes */}
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
    </div>
  );
}
