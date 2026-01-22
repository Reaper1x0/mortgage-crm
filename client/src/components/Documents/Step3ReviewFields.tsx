import React, { useEffect, useState } from "react";
import { SubmissionFieldStatusService } from "../../service/submissionFieldsStatusService";
import MasterFieldsPanel from "./MasterFieldsPanel";

import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import ActionBar from "../Reusable/ActionBar";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";

export type Step3Props = {
  submissionId: string;
  onBack: () => void;
  onSubmissionUpdated?: (submission: any) => void;
};

const Step3ReviewFields: React.FC<Step3Props> = ({
  submissionId,
  onBack,
  onSubmissionUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [masterFields, setMasterFields] = useState<any[]>([]);
  const [submissionFields, setSubmissionFields] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!submissionId) return;
      try {
        setLoading(true);
        const resp = await SubmissionFieldStatusService.getSubmissionFieldStatus(
          submissionId
        );
        setMasterFields(resp?.master_fields || []);
        setSubmissionFields(resp?.submission_fields || []);
        setEligibility(resp?.eligibility || null);
        if (onSubmissionUpdated) onSubmissionUpdated(resp?.submission);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [submissionId]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Step 3: Review & Complete Fields"
        description="Complete required fields to pass eligibility, then optionally review the rest."
        right={
          <Button variant="secondary" type="button" onClick={onBack}>
            Back to Documents
          </Button>
        }
      />

      {loading ? (
        <Surface variant="soft" className="p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-64 rounded-full bg-card-hover" />
            <div className="h-3 w-full rounded-full bg-card-hover" />
            <div className="h-3 w-5/6 rounded-full bg-card-hover" />

            <div className="mt-2 grid gap-3 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl border border-card-border bg-card"
                />
              ))}
            </div>

            <div className="mt-2 h-10 rounded-2xl border border-card-border bg-card" />

            <div className="mt-2 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl border border-card-border bg-card"
                />
              ))}
            </div>
          </div>
        </Surface>
      ) : eligibility ? (
        <MasterFieldsPanel
          submissionId={submissionId}
          masterFields={masterFields}
          submissionFields={submissionFields}
          eligibility={eligibility}
          onUpdated={({ submission_fields, eligibility }) => {
            setSubmissionFields(submission_fields as any);
            setEligibility(eligibility as any);
          }}
        />
      ) : (
        <Callout tone="warning" title="Could not load eligibility status">
          Please try again or go back and re-upload documents.
          <ActionBar
            className="mt-3"
            right={
              <Button variant="secondary" type="button" onClick={onBack}>
                Back
              </Button>
            }
          />
        </Callout>
      )}
    </div>
  );
};

export default Step3ReviewFields;
