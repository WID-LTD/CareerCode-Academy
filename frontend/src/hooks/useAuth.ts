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
    } catch {
      toast.error('Invalid email or password');
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
      toast.success('Account created successfully!');
      if (role === 'instructor') navigate('/instructor/dashboard');
      else navigate('/student/dashboard');
    } catch {
      toast.error('Registration failed. Please try again.');
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
