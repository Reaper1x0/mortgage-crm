import { useEffect, useMemo, useState } from "react";
import Button from "../Reusable/Button";
import { TemplateService } from "../../service/templateService";
import { SubmissionFieldStatusService } from "../../service/submissionFieldsStatusService";
import { BACKEND_URL } from "../../constants/env.constants";
import { addToast } from "../../redux/slices/toasterSlice";
import { useDispatch } from "react-redux";

type TemplateCatalogItem = {
  _id: string;
  name: string;
  pageCount: number;
  createdAt?: string;
  placements?: Array<{ fieldKey: string }>; // from .select("placements.fieldKey")
};

type SubmissionField = {
  key: string;
  value?: { raw: any; normalized?: any };
};

export default function Step4GenerateDocument({
  submissionId,
  onBack,
}: {
  submissionId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const dispatch = useDispatch()

  const [submissionFields, setSubmissionFields] = useState<SubmissionField[]>([]);

  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load templates + submission fields status (so we use reviewed values)
  useEffect(() => {
    if (!submissionId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tplRes, status] = await Promise.all([
          TemplateService.listTemplates(),
          SubmissionFieldStatusService.getSubmissionFieldStatus(submissionId),
        ]);

        setTemplates(tplRes.templates || []);
        setSubmissionFields(status?.submission_fields || []);

        // auto-select first template (optional)
        const firstId = tplRes.templates?.[0]?._id;
        if (firstId) setSelectedId(firstId);
      } catch (e: any) {
        setError(e?.message || "Failed to load templates");
      } finally {
        setLoading(false);
      }
    })();
  }, [submissionId]);

  const selected = useMemo(
    () => templates.find((t) => t._id === selectedId) || null,
    [templates, selectedId]
  );

  // Build values object from submission fields (prefer normalized)
  const valuesByKey = useMemo(() => {
    const out: Record<string, any> = {};
    for (const f of submissionFields || []) {
      const v = f?.value?.normalized ?? f?.value?.raw;
      if (v !== undefined && v !== null && v !== "") out[String(f.key)] = v;
    }
    return out;
  }, [submissionFields]);

  const templateKeys = useMemo(() => {
    const keys = new Set<string>();
    (selected?.placements || []).forEach((p) => p?.fieldKey && keys.add(String(p.fieldKey)));
    return Array.from(keys);
  }, [selected]);

  const coverage = useMemo(() => {
    const total = templateKeys.length;
    const filled = templateKeys.filter((k) => valuesByKey[k] !== undefined && valuesByKey[k] !== null && valuesByKey[k] !== "").length;
    return {
      total,
      filled,
      missing: Math.max(0, total - filled),
    };
  }, [templateKeys, valuesByKey]);

  async function generate() {
    if (!selectedId) return;
    setGenerating(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      // only send values used by this template (clean + faster)
      const slimValues: Record<string, any> = {};
      for (const k of templateKeys) {
        if (valuesByKey[k] !== undefined) slimValues[k] = valuesByKey[k];
      }

      const res = await TemplateService.render(selectedId, slimValues);
      const url = res?.result?.outputUrl;
      if (!url) throw new Error("Render did not return outputUrl");

      const full = `${BACKEND_URL}${url}`;
      setGeneratedUrl(full);
      window.open(full, "_blank");
    } catch (e: any) {
      console.log(e.response.data.reason)
      dispatch(addToast({message: (e.response.data.reason || "Failed to generate document"), type: "error"}));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Step 4: Generate Document</h2>
          <p className="mt-1 text-sm text-card-text">
            Select a template to generate a filled PDF using the reviewed field values.
          </p>
        </div>

        <button
          onClick={onBack}
          className="rounded-md border border-card-border bg-card px-3 py-1.5 text-xs text-card-text hover:bg-card-hover"
        >
          Back to Review
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-border bg-danger/10 px-3 py-2 text-xs text-danger-text">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Template List */}
        <div className="lg:col-span-7 rounded-2xl border border-card-border bg-background p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-base font-semibold text-text">Templates</div>
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl border border-card-border bg-card animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="mt-4 rounded-xl border border-card-border bg-card p-3 text-sm text-card-text">
              No templates found.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {templates.map((t) => {
                const isActive = t._id === selectedId;

                // lightweight coverage for each template
                const keys = Array.from(new Set((t.placements || []).map((p) => String(p.fieldKey))));
                const filled = keys.filter((k) => valuesByKey[k] !== undefined && valuesByKey[k] !== null && valuesByKey[k] !== "").length;
                const missing = Math.max(0, keys.length - filled);

                return (
                  <button
                    key={t._id}
                    onClick={() => setSelectedId(t._id)}
                    className={[
                      "w-full rounded-2xl border p-3 text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-card-border bg-card hover:bg-card-hover",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text truncate">{t.name}</div>
                        <div className="mt-1 text-xs text-card-text">
                          {t.pageCount} page(s) • {keys.length} field(s)
                        </div>
                      </div>

                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          missing === 0
                            ? "bg-success text-success-text border-success-border"
                            : "bg-warning text-warning-text border-warning-border",
                        ].join(" ")}
                      >
                        {missing === 0 ? "Ready" : `Missing ${missing}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Summary + Generate */}
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-2xl border border-card-border bg-background p-4">
            <div className="text-base font-semibold text-text">Selection</div>

            {!selected ? (
              <div className="mt-3 text-sm text-card-text">Select a template to continue.</div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-sm text-text">
                  <span className="text-card-text">Template: </span>
                  <span className="font-semibold">{selected.name}</span>
                </div>

                <div className="rounded-xl border border-card-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-card-text">Field coverage</div>
                    <div className="text-xs text-card-text">
                      {coverage.filled}/{coverage.total}
                    </div>
                  </div>

                  <div className="mt-2 h-2 w-full rounded-full bg-card-hover overflow-hidden border border-card-border">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: coverage.total === 0 ? "0%" : `${Math.round((coverage.filled / coverage.total) * 100)}%`,
                      }}
                    />
                  </div>

                  {coverage.missing > 0 && (
                    <div className="mt-2 text-xs text-card-text">
                      Missing fields will render as blank.
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  onClick={generate}
                  isLoading={generating}
                  disabled={!selectedId || generating}
                >
                  Generate Filled PDF
                </Button>

                {generatedUrl && (
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-card-border bg-card px-3 py-2 text-xs text-text hover:bg-card-hover"
                  >
                    Open last generated PDF
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
