import React, { useState, ReactNode } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import Card from "./Card";

interface AccordionItemProps {
  header: ReactNode;
  children: ReactNode; // body/content
  defaultOpen?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  header,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <Card className="w-full flex justify-between items-center p-4 rounded-lg">
        <div>{header}</div>
        <span className="cursor-pointer" onClick={() => setIsOpen((prev) => !prev)}>
          {isOpen ? (
            <FaChevronUp className="text-text" />
          ) : (
            <FaChevronDown className="text-text" />
          )}
        </span>
      </Card>

      {isOpen && <div>{children}</div>}
    </div>
  );
};

export default AccordionItem;
