import React, { ReactNode, MouseEvent, useEffect } from "react";
import ReactDOM from "react-dom";
import { AiOutlineClose } from "react-icons/ai";
import IconButton from "./IconButton";
import HoverBorderGradient from "./Aceternity UI/HoverBorderGradient";
import { cn } from "../../utils/cn";
import Spotlight from "./Aceternity UI/Spotlight";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
  disableDefaultContentPadding?: boolean;
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  containerClassName,
  contentClassName,
  disableDefaultContentPadding = false,
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return ReactDOM.createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/65 backdrop-blur-md",
        "px-3 py-4 sm:px-5 sm:py-6"
      )}
      onClick={handleOverlayClick}
    >
      <HoverBorderGradient
        containerClassName={cn(
          "w-full",
          "max-h-[94vh]",
          "max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-40px)]",
          "md:max-w-2xl",
          "xl:max-w-3xl",
          containerClassName
        )}
        roundedClassName="rounded-2xl"
        className={cn(
          "relative w-full max-h-[94vh]",
          "bg-background text-text",
          "border border-card-border",
          "shadow-2xl shadow-black/40",
          "overflow-hidden",
          className
        )}
      >
        <Spotlight intensity={0.18} className="opacity-60" />

        {showCloseButton ? (
          <div className="absolute top-4 right-4 z-30">
            <IconButton icon={AiOutlineClose} onClick={onClose} />
          </div>
        ) : null}

        <div
          className={cn(
            "relative z-10 max-h-[94vh] overflow-y-auto",
            disableDefaultContentPadding ? "" : "p-5 pr-14 sm:p-6 sm:pr-14",
            contentClassName
          )}
        >
          {children}
        </div>
      </HoverBorderGradient>
    </div>,
    document.body
  );
};

export default Modal;