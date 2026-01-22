import React, { useState, useRef } from "react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import IconButton from "./IconButton";

export interface TreeNode {
  key: string | number;
  value: string;
  children?: TreeNode[];
  onClick?: () => void;
}

interface TreeSliderProps {
  data: TreeNode[];
  header_title?: string;
  minWidth?: string;
}

export const TreeSlider: React.FC<TreeSliderProps> = ({
  data,
  header_title,
  minWidth = "180px",
}) => {
  const [currentNodes, setCurrentNodes] = useState<TreeNode[]>(data);
  const [history, setHistory] = useState<TreeNode[][]>([]);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Navigate to children
  const goToChildren = (node: TreeNode) => {
    if (node.children && node.children.length > 0 && !isAnimating) {
      setDirection("forward");
      setIsAnimating(true);
      setTimeout(() => {
        setHistory((prev) => [...prev, currentNodes]);
        setCurrentNodes(node.children!);
        setIsAnimating(false);
      }, 200); // duration of slide animation
    } else if (node.onClick) {
      node.onClick();
    }
  };

  // Go back
  const goBack = () => {
    if (history.length > 0 && !isAnimating) {
      setDirection("backward");
      setIsAnimating(true);
      setTimeout(() => {
        const prevNodes = history[history.length - 1];
        setHistory((prev) => prev.slice(0, -1));
        setCurrentNodes(prevNodes);
        setIsAnimating(false);
      }, 200);
    }
  };

  return (
    <div
      className="inline-block border border-card-border rounded-xl overflow-hidden select-none bg-background text-text shadow-md"
      style={{ minWidth }}
    >
      {/* Header */}
      {history.length > 0 && (
        <div className="flex items-center gap-3 py-2 px-1 border-b border-card-border">
          <IconButton icon={IoIosArrowBack} hoverable onClick={goBack} />
          {header_title && (
            <span className="font-semibold text-text">{header_title}</span>
          )}
        </div>
      )}

      {/* Current Level */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden transition-all duration-200`}
      >
        <div
          className={`flex flex-col`}
          style={{
            transform: isAnimating
              ? direction === "forward"
                ? "translateX(100%)"
                : "translateX(-100%)"
              : "translateX(0)",
            transition: "transform 0.2s ease-in-out",
          }}
        >
          {currentNodes.map((node) => (
            <div
              key={node.key}
              onClick={() => node.onClick?.()}
              className={`flex items-center justify-between gap-4 w-full py-2 px-3 hover:bg-card-hover transition-colors text-left ${
                node.onClick && "cursor-pointer"
              }`}
            >
              <span>{node.value}</span>
              {node.children && node.children.length > 0 && (
                <IconButton
                  icon={IoIosArrowForward}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToChildren(node);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
