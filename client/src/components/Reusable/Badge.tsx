import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Badge: React.FC<BadgeProps> = ({ children, className = "", onClick }) => {
  return (
    <span
      onClick={onClick}
      className={`flex items-center px-3 py-1 rounded-full text-xs ${onClick ? "cursor-pointer hover:underline" : ""} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
