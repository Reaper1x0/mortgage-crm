import React, { useState, useEffect } from "react";
import Card from "../Reusable/Card";
import ValidationFailureList from "./ValidationFailureList";
import ValidationFailureDetail from "./ValidationFailureDetail";
import { FiInfo } from "react-icons/fi";
import type { ValidationFailuresData } from "../../service/dashboardService";

interface ValidationFailuresCardProps {
  data: ValidationFailuresData | null;
  loading: boolean;
}

const ValidationFailuresCard: React.FC<ValidationFailuresCardProps> = ({
  data,
  loading,
}) => {
  const failures = data?.topValidationFailures || [];
  const totalFailures = data?.totalFailures || 0;
  const uniqueRules = data?.uniqueRules || 0;

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection if out of bounds
  useEffect(() => {
    if (failures.length > 0 && selectedIndex >= failures.length) {
      setSelectedIndex(0);
    }
  }, [failures.length, selectedIndex]);

  // Special case: only 1 rule - show detail directly
  const showOnlyDetail = failures.length === 1 && !loading;

  if (loading) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text">
                Top Validation Failures
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ValidationFailureList
              failures={[]}
              selectedIndex={0}
              onSelect={() => {}}
              loading={true}
            />
            <ValidationFailureDetail failure={null} loading={true} />
          </div>
        </div>
      </Card>
    );
  }

  if (failures.length === 0) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text">
                Top Validation Failures
              </h3>
            </div>
          </div>
          <div className="h-64 flex flex-col items-center justify-center">
            <FiInfo className="h-12 w-12 text-text-secondary mb-2" />
            <div className="text-text-secondary">No validation failures</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text">
              Top Validation Failures
            </h3>
            <div className="text-sm text-text-secondary mt-1">
              {totalFailures} total failures across {uniqueRules} unique rules
            </div>
          </div>
        </div>

        {showOnlyDetail ? (
          <div>
            <div className="text-sm text-text-secondary mb-4">
              Only 1 failing rule
            </div>
            <ValidationFailureDetail failure={failures[0]} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Ranked List */}
            <div>
              <div className="text-sm font-semibold text-text mb-3">
                Failures by Rule
              </div>
              <ValidationFailureList
                failures={failures.slice(0, 10)}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                loading={false}
              />
            </div>

            {/* Right: Detail Panel */}
            <div>
              <div className="text-sm font-semibold text-text mb-3">
                Rule Details
              </div>
              <ValidationFailureDetail
                failure={failures[selectedIndex] || null}
                loading={false}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ValidationFailuresCard;








