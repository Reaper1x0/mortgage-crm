import React from "react";
import StatusBadge from "../Reusable/StatusBadge";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";
import { FiAlertCircle, FiAlertTriangle, FiCopy } from "react-icons/fi";
import { showSuccessToast } from "../../utils/errorHandler";
import type { ValidationFailure } from "../../service/dashboardService";

interface ValidationFailureDetailProps {
  failure: ValidationFailure | null;
  loading?: boolean;
}

const ValidationFailureDetail: React.FC<ValidationFailureDetailProps> = ({
  failure,
  loading = false,
}) => {
  const handleCopyRule = async () => {
    if (!failure) return;
    try {
      await navigator.clipboard.writeText(failure.rule);
      showSuccessToast("Rule copied to clipboard");
    } catch (err) {
      // Silent fail if clipboard not available
    }
  };

  const handleCopyMessage = async () => {
    if (!failure || failure.sampleMessages.length === 0) return;
    try {
      await navigator.clipboard.writeText(failure.sampleMessages[0]);
      showSuccessToast("Message copied to clipboard");
    } catch (err) {
      // Silent fail if clipboard not available
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-card-border rounded w-3/4" />
        <div className="h-20 bg-card-border rounded" />
        <div className="h-4 bg-card-border rounded w-1/2" />
        <div className="h-10 bg-card-border rounded" />
      </div>
    );
  }

  if (!failure) {
    return (
      <div className="text-center text-text-secondary py-8">
        Select a rule to view details
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Full Rule Text */}
      <div>
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
          Rule
        </div>
        <div className="p-3 rounded-lg border border-card-border bg-card text-sm text-text break-words">
          {failure.rule}
        </div>
        <Button
          variant="secondary"
          onClick={handleCopyRule}
          className="mt-2 text-xs"
        >
          <FiCopy className="h-3 w-3" />
          Copy Rule
        </Button>
      </div>

      {/* Sample Message */}
      {failure.sampleMessages.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Sample Message
          </div>
          <Callout tone="warning" className="mb-2">
            <div className="text-sm text-text break-words">
              {failure.sampleMessages[0]}
            </div>
          </Callout>
          <Button
            variant="secondary"
            onClick={handleCopyMessage}
            className="text-xs"
          >
            <FiCopy className="h-3 w-3" />
            Copy Message
          </Button>
        </div>
      )}

      {/* Severity Summary */}
      <div>
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
          Severity Breakdown
        </div>
        <div className="flex flex-wrap gap-2">
          {failure.severityCounts.error > 0 && (
            <StatusBadge tone="danger">
              <FiAlertCircle className="h-3 w-3 mr-1" />
              {failure.severityCounts.error} Error
              {failure.severityCounts.error !== 1 ? "s" : ""}
            </StatusBadge>
          )}
          {failure.severityCounts.warning > 0 && (
            <StatusBadge tone="warning">
              <FiAlertTriangle className="h-3 w-3 mr-1" />
              {failure.severityCounts.warning} Warning
              {failure.severityCounts.warning !== 1 ? "s" : ""}
            </StatusBadge>
          )}
        </div>
      </div>

      {/* Affected Fields */}
      {failure.affectedFieldsCount > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Affected Fields ({failure.affectedFieldsCount})
          </div>
          <div className="flex flex-wrap gap-2">
            {failure.affectedFields.slice(0, 6).map((field, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md bg-card-hover border border-card-border text-xs text-text"
              >
                {field}
              </span>
            ))}
            {failure.affectedFieldsCount > 6 && (
              <span className="px-2 py-1 rounded-md bg-card-hover border border-card-border text-xs text-text-secondary">
                +{failure.affectedFieldsCount - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="pt-2 border-t border-card-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-text-secondary">Count</div>
            <div className="text-lg font-semibold text-text">{failure.count}</div>
          </div>
          <div>
            <div className="text-text-secondary">Percentage</div>
            <div className="text-lg font-semibold text-text">
              {failure.percentage}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationFailureDetail;

