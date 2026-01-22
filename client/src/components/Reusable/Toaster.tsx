import React, { ReactNode, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { removeToast } from "../../redux/slices/toasterSlice";
import {
  HiCheckCircle,
  HiXCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXMark,
} from "react-icons/hi2";
import { ToastType } from "../../types/toaster.types";
import { Loader } from "../../assets/Loader";

const iconMap: Record<ToastType, ReactNode> = {
  success: <HiCheckCircle className="h-5 w-5 text-success" />,
  error: <HiXCircle className="h-5 w-5 text-danger" />,
  warning: <HiExclamationTriangle className="h-5 w-5 text-warning" />,
  info: <HiInformationCircle className="h-5 w-5 text-primary" />,
  loading: <Loader />,
};

function toneClasses(type: ToastType) {
  switch (type) {
    case "success":
      return { badge: "bg-success", accent: "border-l-success" };
    case "error":
      return { badge: "bg-danger", accent: "border-l-danger" };
    case "warning":
      return { badge: "bg-warning", accent: "border-l-warning" };
    case "info":
    case "loading":
      return { badge: "bg-info", accent: "border-l-info" };
    default:
      return { badge: "bg-primary", accent: "border-l-primary" };
  }
}

const ToasterContainer: React.FC = () => {
  const dispatch = useDispatch();
  const toasts = useSelector((state: RootState) => state.toaster.toasts);

  // Auto-remove after duration
  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(
        () => dispatch(removeToast(toast.id)),
        toast.duration ?? 3000
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  const handleRemove = (id: string) => dispatch(removeToast(id));

  return (
    <div
      className="fixed top-5 right-5 z-50 flex flex-col gap-3"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => {
        const type = (toast.type ?? "info") as ToastType;
        const tone = toneClasses(type);

        return (
          <div
            key={toast.id}
            className={[
              "flex items-start gap-3",
              "w-[340px] max-w-[90vw]",
              "rounded-xl bg-card shadow-lg",
              "border border-card-border border-l-4",
              tone.accent,
              "px-4 py-3",
              "transition-all duration-200 ease-out",
              "animate-slide-in",
            ].join(" ")}
          >
            {/* Solid icon badge */}
            <div
            >
              {type === "loading" ? (
                <div>{iconMap[type]}</div>
              ) : (
                iconMap[type]
              )}
            </div>

            {/* Message */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text break-words whitespace-pre-line">
                {toast.message}
              </p>
            </div>

            {/* Minimal close */}
            <button
              onClick={() => handleRemove(toast.id)}
              className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-text/60 hover:text-text hover:bg-card-hover transition-colors"
              aria-label="Close"
              title="Close"
              type="button"
            >
              <HiXMark className="h-5 w-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToasterContainer;
