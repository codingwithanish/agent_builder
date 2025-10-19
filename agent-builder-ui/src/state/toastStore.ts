import { create } from 'zustand';
import type { ToastProps } from '@/components/common/Toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastProps[];
  addToast: (toast: ToastData) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toastData: ToastData) => {
    const id = Date.now().toString();
    const toast: ToastProps = {
      id,
      ...toastData,
      onRemove: get().removeToast,
    };

    set(state => ({
      toasts: [...state.toasts, toast]
    }));
  },

  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },

  showSuccess: (title: string, message?: string) => {
    get().addToast({ type: 'success', title, message });
  },

  showError: (title: string, message?: string) => {
    get().addToast({ type: 'error', title, message, duration: 7000 });
  },

  showWarning: (title: string, message?: string) => {
    get().addToast({ type: 'warning', title, message, duration: 6000 });
  },

  showInfo: (title: string, message?: string) => {
    get().addToast({ type: 'info', title, message });
  },
}));