import { useEffect, useMemo, useState } from "react";
import Button from "../Reusable/Button";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import Modal from "../Reusable/Modal";
import ActionBar from "../Reusable/ActionBar";
import Callout from "../Reusable/Callout";
import { TemplateService } from "../../service/templateService";
import { SubmissionFieldStatusService } from "../../service/submissionFieldsStatusService";
import { SubmissionService } from "../../service/submissionService";
import { SubmissionDocumentsService } from "../../service/submissionDocumentService";
import { useDispatch } from "react-redux";
import { FiTrash2 } from "react-icons/fi";
import { addToast } from "../../redux/slices/toasterSlice";
import { resolveFileUrl } from "../../utils/fileUrl";
import { Loader } from "../../assets/Loader";
import type { GeneratedDocument } from "../../types/extraction.types";
import ClientDocumentCard from "./ClientDocumentCard";
import {
  getGeneratedFileName,
  getGeneratedFileRef,
  sortGeneratedDocumentsNewestFirst,
} from "./clientDocumentUtils";
import { isResolvableUser } from "../Reusable/UserActionAvatar";

type TemplateCatalogItem = {
  _id: string;
  name: string;
  pageCount: number;
  createdAt?: string;
  placements?: Array<{ fieldKey: string }>;
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

  const dispatch = useDispatch();

  const [submissionFields, setSubmissionFields] = useState<SubmissionField[]>([]);

  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForId, setDeleteForId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sortedGenerated = useMemo(
    () => sortGeneratedDocumentsNewestFirst(generatedDocuments),
    [generatedDocuments]
  );

  useEffect(() => {
    if (!submissionId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tplRes, status, generatedRes] = await Promise.all([
          TemplateService.listTemplates(),
          SubmissionFieldStatusService.getSubmissionFieldStatus(submissionId),
          SubmissionService.listGeneratedDocuments(submissionId),
        ]);

        setTemplates(tplRes.templates || []);
        setSubmissionFields(status?.submission_fields || []);
        setGeneratedDocuments(generatedRes?.generated_documents || []);

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

  async function refreshGeneratedDocuments() {
    const generatedRes = await SubmissionService.listGeneratedDocuments(submissionId);
    setGeneratedDocuments(generatedRes?.generated_documents || []);
  }

  async function generate() {
    if (!selectedId) return;
    setGenerating(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      const slimValues: Record<string, any> = {};
      for (const k of templateKeys) {
        if (valuesByKey[k] !== undefined) slimValues[k] = valuesByKey[k];
      }

      const res = await TemplateService.render(selectedId, slimValues, submissionId);
      const url = res?.result?.outputUrl || res?.result?.fileUrl;
      if (!url) throw new Error("Render did not return outputUrl");

      const full = resolveFileUrl(url);
      if (!full) throw new Error("Failed to build document URL");
      setGeneratedUrl(full);

      try {
        await refreshGeneratedDocuments();
      } catch {
        const fallbackDoc: GeneratedDocument = {
          _id: `tmp-${Date.now()}`,
          template_id: selectedId,
          template_name: selected?.name || "Generated Template",
          generated_at: new Date().toISOString(),
          file_id: {
            _id: res?.result?.fileId || `tmp-file-${Date.now()}`,
            storage_path: "",
            url: full,
            display_name: `Generated_${selected?.name || "Document"}.pdf`,
            original_name: res?.result?.outputFileName || "Generated Document",
          },
        };
        setGeneratedDocuments((prev) => [fallbackDoc, ...(prev || [])]);
      }
      dispatch(addToast({ message: "PDF generated successfully", type: "success" }));
    } catch (e: any) {
      console.error("Error generating document:", e);
      setError(e?.message || "Failed to generate PDF");
      dispatch(addToast({ message: e?.message || "Failed to generate PDF", type: "error" }));
    } finally {
      setGenerating(false);
    }
  }

  const openDeleteModal = (id: string) => {
    setDeleteForId(id);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleteLoading) return;
    setDeleteOpen(false);
    setDeleteForId(null);
  };

  const doDelete = async () => {
    if (!deleteForId) return;
    setDeleteLoading(true);
    try {
      const res = await SubmissionDocumentsService.removeGenerated(submissionId, deleteForId);
      setGeneratedDocuments(res?.generated_documents || []);
      closeDelete();
      dispatch(addToast({ message: "Generated document deleted", type: "success" }));
    } catch (e: any) {
      dispatch(addToast({ message: e?.message || "Failed to delete document", type: "error" }));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ label: "Back to review", onClick: onBack }}
        title="Step 4: Generate document"
        description="Select a template to generate a filled PDF using the reviewed field values."
      />

      {error && (
        <div className="rounded-xl border border-danger-border bg-danger-muted px-3 py-2 text-xs text-danger-text">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
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
                        ? "border-primary-border bg-primary-muted"
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
                            ? "bg-success-muted text-success border-success-border"
                            : "bg-warning-muted text-warning border-warning-border",
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

        <div className="lg:col-span-5">
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

      {sortedGenerated.length > 0 ? (
        <Surface variant="soft" className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-text">Generated documents</h2>
              <p className="mt-0.5 text-sm text-card-text">
                {sortedGenerated.length} document{sortedGenerated.length === 1 ? "" : "s"} generated for this client
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedGenerated.map((doc) => {
              const id = doc._id || getGeneratedFileRef(doc)?._id || "";
              const file = getGeneratedFileRef(doc);
              const name = getGeneratedFileName(doc, file);
              const generatedBy = doc.generated_by;
              const actorUser = isResolvableUser(generatedBy) ? generatedBy : null;
              const isDeleting = deleteLoading && deleteForId === id;

              const badges = [
                { label: "Generated", tone: "success" as const },
                ...(doc.template_name
                  ? [{ label: doc.template_name, tone: "neutral" as const }]
                  : []),
              ];

              return (
                <ClientDocumentCard
                  key={id}
                  file={file}
                  fileName={name}
                  badges={badges}
                  actor={
                    actorUser || doc.generated_at
                      ? {
                          user: actorUser ?? undefined,
                          verb: "generated by",
                          timestamp: doc.generated_at,
                        }
                      : undefined
                  }
                  disabled={isDeleting}
                  footerEndActions={[
                    {
                      key: "delete",
                      icon: FiTrash2,
                      title: "Delete generated document",
                      disabled: !id || id.startsWith("tmp-") || isDeleting,
                      isLoading: isDeleting,
                      onClick: () => openDeleteModal(id),
                    },
                  ]}
                />
              );
            })}
          </div>
        </Surface>
      ) : null}

      <Modal isOpen={generating} onClose={() => {}} showCloseButton={false}>
        <div className="flex flex-col items-center px-2 py-8 text-center sm:px-4">
          <Loader className="h-10 w-10 text-primary" />
          <h2 className="mt-5 text-lg font-semibold text-text">Generating PDF</h2>
          <p className="mt-2 max-w-sm text-sm text-card-text">
            {selected
              ? `Filling “${selected.name}” with reviewed field values.`
              : "Filling the selected template with reviewed field values."}
          </p>
          <p className="mt-3 text-xs text-card-text">This may take a minute. Please keep this window open.</p>
        </div>
      </Modal>

      <Modal isOpen={deleteOpen} onClose={closeDelete}>
        <div className="space-y-4">
          <PageHeader
            variant="section"
            title="Delete generated document?"
            description="This will remove the generated PDF permanently."
          />
          <Callout tone="danger" title="Warning">
            This action can&apos;t be undone.
          </Callout>
          <ActionBar
            right={
              <>
                <Button variant="secondary" type="button" disabled={deleteLoading} onClick={closeDelete}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  disabled={deleteLoading}
                  isLoading={deleteLoading}
                  onClick={doDelete}
                >
                  Confirm delete
                </Button>
              </>
            }
          />
        </div>
      </Modal>
    </div>
  );
}
