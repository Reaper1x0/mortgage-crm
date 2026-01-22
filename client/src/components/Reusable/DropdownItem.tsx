import React from "react";

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ children, onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-text text-left px-4 py-2 text-sm hover:bg-card-hover ${className}`}
    >
      {children}
    </button>
  );
};

export default DropdownItem;
