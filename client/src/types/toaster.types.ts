export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  onClose?: () => void;
}

export interface ToastProps extends ToastOptions {
  id: string;
  message: string;
}
