import { FaRedoAlt } from "react-icons/fa";
import { Loader } from "../../assets/Loader";
import React from "react";
import Button from "./Button";

interface StateHandlerProps {
  loading?: boolean;
  error?: string | null;
  noData?: boolean;
  noDataMessage?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}

const StateHandler: React.FC<StateHandlerProps> = ({
  loading,
  error,
  noData,
  noDataMessage = "No data available",
  onRetry,
  children,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader className="text-text" size={35} />
        <p className="text-text font-medium">Loading, please wait...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <p className="text-sm text-error max-w-md">{error}</p>
        {onRetry && (
          <Button onClick={onRetry}>
            <div className="flex gap-2 items-center">
              <FaRedoAlt />
              <span>Retry</span>
            </div>
          </Button>
        )}
      </div>
    );
  }

  if (noData) {
    return (
      <div className="flex items-center justify-center h-64 text-text text-lg font-medium">
        {noDataMessage}
      </div>
    );
  }

  return <>{children}</>;
};

export default React.memo(StateHandler);