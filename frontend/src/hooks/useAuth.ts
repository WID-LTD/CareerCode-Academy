import { useAuthStore } from '@/store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
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
      else {
        const from = (location.state as any)?.from || '/student/dashboard';
        navigate(from);
      }
    } catch (err: any) {
      if (!err.response) {
        toast.error('Cannot reach server — please check your connection and try again.');
      } else if (err.response.status === 503) {
        toast.error('Service temporarily unavailable — server is starting up. Please try again.');
      } else if (err.response.status === 500) {
        toast.error('Server error — please try again later.');
      } else if (err.response.status === 401) {
        const msg = err.response.data?.message || '';
        if (msg.includes('verify your email')) {
          navigate(`/auth/verify-pending?email=${encodeURIComponent(email)}`);
          toast.error('Please verify your email address.');
        } else {
          toast.error('Invalid email or password.');
        }
      } else {
        toast.error(err.response.data?.message || 'An unexpected error occurred.');
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
      if (!err.response) {
        toast.error('Cannot reach server — please check your connection and try again.');
      } else if (err.response.status === 503) {
        toast.error('Service temporarily unavailable — server is starting up. Please try again.');
      } else if (err.response.status === 500) {
        toast.error('Server error — please try again later.');
      } else {
        toast.error(err.response.data?.message || 'Registration failed. Please try again.');
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
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    fetchUser,
  };
}
