import { create } from "zustand";

export interface ToastMessage {
  id: string;
  message: string;
  severity: "info" | "warning" | "success" | "error";
}

interface NotificationState {
  toasts: ToastMessage[];
  addToast: (message: string, severity: ToastMessage["severity"]) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  addToast: (message, severity) =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, severity }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
