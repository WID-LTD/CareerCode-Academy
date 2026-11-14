import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, BookOpen, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { formatCurrency } from '@/lib/utils';
import { optimizeImageUrl } from '@/lib/cloudinary';
import toast from 'react-hot-toast';
import SEO from '@/components/seo/SEO';

export default function Wishlist() {
  const { wishlistItems, isLoading, fetchWishlist, removeFromWishlist } = useWishlistStore();

  useEffect(() => { fetchWishlist(); }, []);

  const remove = async (courseId: string) => {
    try {
      await removeFromWishlist(courseId);
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Could not remove that course');
    }
  };

  if (isLoading && wishlistItems.length === 0) return <PageSkeleton />;

  return (
    <div>
      <SEO title="Wishlist" description="Courses you saved to purchase later." />
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">My Wishlist</h1>
        <p className="text-gray-500 text-sm">Saved courses. Start a trial or purchase any course individually.</p>
      </div>

      {wishlistItems.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-8 h-8" />}
          title="Your wishlist is empty"
          description="Save courses you want to revisit, then purchase them here."
          action={{ label: 'Browse courses', onClick: () => (window.location.href = '/courses') }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {wishlistItems.map((course: any) => (
            <GlassCard key={course.id} className="p-0 overflow-hidden flex flex-col" hover>
              <Link to={`/courses/${course.slug}`} className="block">
                <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {course.thumbnail ? (
                    <img src={optimizeImageUrl(course.thumbnail, 480, 270)} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center"><BookOpen className="w-10 h-10 text-gray-400" /></div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge variant="success" size="sm">Free trial</Badge>
                    <Badge variant="warning" size="sm">7 days</Badge>
                  </div>
                </div>
              </Link>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="default" size="sm">{course.category}</Badge>
                  <span className="ml-auto text-sm font-bold">{formatCurrency(Number(course.price))}</span>
                </div>
                <Link to={`/courses/${course.slug}`} className="font-semibold text-sm hover:text-primary-500 line-clamp-2">{course.title}</Link>
                <p className="text-xs text-gray-500 mt-1 mb-3">{course.instructor_name || 'CareerCode Faculty'}</p>
                <div className="mt-auto space-y-1.5">
                  <Link to={`/courses/${course.slug}`} className="block">
                    <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600">
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> Start 7-day free trial
                    </Button>
                  </Link>
                  <div className="flex gap-1.5">
                    <Link to={`/checkout?courseId=${course.course_id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">Buy now <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => remove(course.course_id)} aria-label="Remove from wishlist">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
