// components/ui/Accordion.tsx
import React, { useState, ReactNode } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

interface AccordionItem {
  id: string | number;
  header: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpenIds?: (string | number)[];
}

const Accordion: React.FC<AccordionProps> = ({ items, defaultOpenIds = [] }) => {
  const [openIds, setOpenIds] = useState<(string | number)[]>(defaultOpenIds);

  const toggle = (id: string | number) => {
    setOpenIds(prev =>
      prev.includes(id) ? prev.filter(openId => openId !== id) : [...prev, id]
    );
  };

  return (
    <div className="overflow-hidden bg-background rounded-xl">
      {items.map(({ id, header, content }, index) => (
        <div key={id} className={`${index !== 0 ? "border-t border-border" : ""}`}>
          <button
            className="w-full flex justify-between items-center px-6 py-4 text-left font-semibold text-text bg-card transition"
            onClick={() => toggle(id)}
          >
            <div className="font-bold">{header}</div>
            {openIds.includes(id) ? (
              <FaChevronUp className="text-text" />
            ) : (
              <FaChevronDown className="text-text" />
            )}
          </button>

          {openIds.includes(id) && (
            <div>
              {content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Accordion;
