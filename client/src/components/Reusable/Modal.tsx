import React, { ReactNode, MouseEvent } from "react";
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
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return ReactDOM.createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/60 backdrop-blur-md",
        "p-4"
      )}
      onClick={handleOverlayClick}
    >
      <HoverBorderGradient
        containerClassName="w-full max-w-lg"
        roundedClassName="rounded-2xl"
        className={cn(
          "relative bg-background/90 text-text",
          "border border-card-border",
          "shadow-2xl shadow-black/40",
          "p-6",
          "overflow-hidden",
          className
        )}
      >
        <Spotlight intensity={0.22} className="opacity-80" />

        <div className="absolute top-3 right-3 z-20">
          <IconButton icon={AiOutlineClose} onClick={onClose} />
        </div>

        <div className="relative z-10">{children}</div>
      </HoverBorderGradient>
    </div>,
    document.body
  );
};

export default Modal;
