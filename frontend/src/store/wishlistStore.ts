import { create } from 'zustand';
import { api } from '../lib/axios';

interface WishlistItem {
  id: string;
  course_id: string;
  title: string;
  thumbnail: string;
  price: number;
  slug: string;
  level: string;
  category: string;
  instructor_name: string;
}

interface WishlistStore {
  wishlistItems: WishlistItem[];
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (courseId: string) => Promise<void>;
  removeFromWishlist: (courseId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistStore>((set) => ({
  wishlistItems: [],
  isLoading: false,

  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/wishlists');
      set({ wishlistItems: data.data || [] });
    } catch {
      // ignore
    } finally {
      set({ isLoading: false });
    }
  },

  addToWishlist: async (courseId: string) => {
    try {
      await api.post('/wishlists', { courseId });
      const { data } = await api.get('/wishlists');
      set({ wishlistItems: data.data || [] });
    } catch (error: any) {
      throw error;
    }
  },

  removeFromWishlist: async (courseId: string) => {
    try {
      await api.delete(`/wishlists/${courseId}`);
      set((state) => ({
        wishlistItems: state.wishlistItems.filter((w) => w.course_id !== courseId),
      }));
    } catch (error: any) {
      throw error;
    }
  },
}));
