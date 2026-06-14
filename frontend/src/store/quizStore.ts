import { create } from 'zustand';
import api from '@/lib/axios';

export interface Quiz {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  time_limit: number;
  passing_score: number;
  max_attempts: number;
  published: boolean;
  questionCount?: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: { questionId: string; answer: string }[];
  score: number;
  passed: boolean;
  attempted_at: string;
  user_name?: string;
  quiz_title?: string;
  course_title?: string;
}

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: (Quiz & { questions: QuizQuestion[] }) | null;
  attempts: QuizAttempt[];
  instructorCourses: { id: string; title: string }[];
  isLoading: boolean;
  submitting: boolean;
  error: string | null;

  fetchQuizzesByCourse: (courseId: string) => Promise<void>;
  fetchQuiz: (quizId: string) => Promise<void>;
  createQuiz: (data: Partial<Quiz> & { course_id: string }) => Promise<Quiz | null>;
  updateQuiz: (id: string, data: Partial<Quiz>) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  addQuestion: (quizId: string, data: Partial<QuizQuestion>) => Promise<void>;
  updateQuestion: (questionId: string, data: Partial<QuizQuestion>) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  submitAttempt: (quizId: string, answers: { questionId: string; answer: string }[]) => Promise<any>;
  fetchAttempts: (quizId: string) => Promise<void>;
  fetchMyAttempts: () => Promise<void>;
  fetchInstructorCourses: () => Promise<void>;
  clearCurrentQuiz: () => void;
  clearError: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  attempts: [],
  instructorCourses: [],
  isLoading: false,
  submitting: false,
  error: null,

  fetchQuizzesByCourse: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/quizzes/course/${courseId}`);
      set({ quizzes: data.data, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || 'Failed to load quizzes' });
    }
  },

  fetchQuiz: async (quizId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/quizzes/${quizId}`);
      set({ currentQuiz: data.data, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || 'Failed to load quiz' });
    }
  },

  createQuiz: async (quizData) => {
    set({ error: null });
    try {
      const { data } = await api.post('/quizzes', quizData);
      const q = data.data;
      set((s) => ({ quizzes: [...s.quizzes, q] }));
      return q;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create quiz' });
      return null;
    }
  },

  updateQuiz: async (id, quizData) => {
    set({ error: null });
    try {
      const { data } = await api.put(`/quizzes/${id}`, quizData);
      set((s) => ({
        quizzes: s.quizzes.map((q) => (q.id === id ? { ...q, ...data.data } : q)),
        currentQuiz: s.currentQuiz?.id === id ? { ...s.currentQuiz, ...data.data } : s.currentQuiz,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update quiz' });
    }
  },

  deleteQuiz: async (id) => {
    set({ error: null });
    try {
      await api.delete(`/quizzes/${id}`);
      set((s) => ({ quizzes: s.quizzes.filter((q) => q.id !== id), currentQuiz: s.currentQuiz?.id === id ? null : s.currentQuiz }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete quiz' });
    }
  },

  addQuestion: async (quizId, questionData) => {
    set({ error: null });
    try {
      const { data } = await api.post(`/quizzes/${quizId}/questions`, questionData);
      const q = data.data;
      set((s) => ({
        currentQuiz: s.currentQuiz?.id === quizId
          ? { ...s.currentQuiz, questions: [...(s.currentQuiz.questions || []), q] }
          : s.currentQuiz,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to add question' });
    }
  },

  updateQuestion: async (questionId, questionData) => {
    set({ error: null });
    try {
      const { data } = await api.put(`/quizzes/questions/${questionId}`, questionData);
      set((s) => ({
        currentQuiz: s.currentQuiz
          ? { ...s.currentQuiz, questions: s.currentQuiz.questions.map((q) => (q.id === questionId ? { ...q, ...data.data } : q)) }
          : s.currentQuiz,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update question' });
    }
  },

  deleteQuestion: async (questionId) => {
    set({ error: null });
    try {
      await api.delete(`/quizzes/questions/${questionId}`);
      set((s) => ({
        currentQuiz: s.currentQuiz
          ? { ...s.currentQuiz, questions: s.currentQuiz.questions.filter((q) => q.id !== questionId) }
          : s.currentQuiz,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete question' });
    }
  },

  submitAttempt: async (quizId, answers) => {
    set({ submitting: true, error: null });
    try {
      const { data } = await api.post(`/quizzes/${quizId}/submit`, { answers });
      set({ submitting: false });
      return data.data;
    } catch (err: any) {
      set({ submitting: false, error: err.response?.data?.message || 'Failed to submit' });
      return null;
    }
  },

  fetchAttempts: async (quizId) => {
    try {
      const { data } = await api.get(`/quizzes/${quizId}/attempts`);
      set({ attempts: data.data });
    } catch { /* ignore */ }
  },

  fetchMyAttempts: async () => {
    try {
      const { data } = await api.get('/quizzes/attempts/my');
      set({ attempts: data.data });
    } catch { /* ignore */ }
  },

  fetchInstructorCourses: async () => {
    try {
      const { data } = await api.get('/courses/instructor');
      set({ instructorCourses: data.data.map((c: any) => ({ id: c.id, title: c.title })) });
    } catch { /* ignore */ }
  },

  clearCurrentQuiz: () => set({ currentQuiz: null }),
  clearError: () => set({ error: null }),
}));
