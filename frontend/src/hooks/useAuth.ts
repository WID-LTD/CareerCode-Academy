import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useAuth() {
  const navigate = useNavigate();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    updateProfile,
    fetchUser,
  } = useAuthStore();

  const login = async (email: string, password: string) => {
    try {
      await storeLogin(email, password);
      toast.success('Welcome back!');
      const role = useAuthStore.getState().user?.role;
      if (role === 'admin' || role === 'super_admin') navigate('/admin/dashboard');
      else if (role === 'instructor') navigate('/instructor/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      const message = err?.response?.data?.message || '';
      if (message.includes('unavailable')) {
        toast.error('Service unavailable — database connection issue');
      } else if (message.includes('verify your email')) {
        navigate(`/auth/verify-pending?email=${encodeURIComponent(email)}`);
        toast.error('Please verify your email address.');
      } else {
        toast.error('Invalid email or password');
      }
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string
  ) => {
    try {
      await storeRegister(name, email, password, role);
      const state = useAuthStore.getState();
      const userEmail = state.user?.email || email;
      toast.success('Account created! Please verify your email.');
      navigate(`/auth/verify-pending?email=${encodeURIComponent(userEmail)}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || '';
      if (message.includes('unavailable')) {
        toast.error('Service unavailable — database connection issue');
      }
      throw err;
    }
  };

  const logout = () => {
    storeLogout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    fetchUser,
  };
}
