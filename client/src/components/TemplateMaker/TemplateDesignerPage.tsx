import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { type DocumentProps } from "react-pdf";
import { FiArrowLeft } from "react-icons/fi";
import Button from "../../components/Reusable/Button";
import { TemplateService } from "../../service/templateService";
import { MasterFieldService } from "../../service/masterFieldService";
import { MasterField, Placement, TemplateDoc } from "../../types/template.types";
import InspectorPanel from "./InspectorPanel";
import { addToast } from "../../redux/slices/toasterSlice";
import { useDispatch } from "react-redux";
import { extractErrorMessage } from "../../utils/errorHandler";
import { useClipboard } from "./hooks/useClipboard";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { usePdfViewer } from "./hooks/usePdfViewer";
import { uuid, getNextPlacementRect, clamp01 } from "./utils/placementUtils";
import PdfViewer from "./components/PdfViewer";
import ViewControls from "./components/ViewControls";
import MasterFieldsPanel from "./components/MasterFieldsPanel";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import { cn } from "../../utils/cn";

export default function TemplateDesignerPage() {
  const { templateId, organizationId, workspaceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [template, setTemplate] = useState<TemplateDoc | null>(null);
  const [pdfFile, setPdfFile] = useState<DocumentProps["file"]>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [masterFields, setMasterFields] = useState<MasterField[]>([]);
  const [masterFieldsLoading, setMasterFieldsLoading] = useState(true);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>("");
  const [pdfNumPages, setPdfNumPages] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);

  const pageWrapRef = useRef<HTMLDivElement | null>(null);
  const pdfHostRef = useRef<HTMLDivElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  const { pageWidth, pagePx, syncPagePx, onPageDimensions } = usePdfViewer({
    containerRef: pdfContainerRef,
    pageWrapRef,
    onPageSizeChange: () => {},
  });

  const { copy, paste, hasClipboard } = useClipboard();

  const selectedPlacement = useMemo(
    () => placements.find((p) => p.placementId === selectedPlacementId),
    [placements, selectedPlacementId],
  );

  const masterFieldLabelByKey = useMemo(
    () => new Map(masterFields.map((field) => [field.key, field.label || ""])),
    [masterFields],
  );

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    setMasterFieldsLoading(true);
    setPdfFile(null);
    setPdfError(null);
    (async () => {
      try {
        const [tplRes, mfRes] = await Promise.all([
          TemplateService.getTemplate(templateId),
          MasterFieldService.getAllFields({ limit: -1 }),
        ]);

        if (cancelled) return;

        const tpl: TemplateDoc = tplRes.template;
        setTemplate(tpl);
        setPlacements(tpl.placements || []);
        setPdfNumPages(tpl.pageCount || 1);
        setPageIndex(0);
        setMasterFields(mfRes.items || []);

        const fileBytes = await TemplateService.getTemplateFile(templateId);
        if (cancelled) return;

        const header = new TextDecoder("ascii")
          .decode(new Uint8Array(fileBytes).slice(0, 5))
          .trim();
        if (!header.startsWith("%PDF")) {
          throw new Error("Template file response is not a PDF");
        }
        setPdfFile({ data: new Uint8Array(fileBytes) });
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load template PDF:", err);
        const message = extractErrorMessage(err);
        setPdfError(message);
        dispatch(
          addToast({
            message,
            type: "error",
          }),
        );
      } finally {
        if (!cancelled) setMasterFieldsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [templateId, dispatch]);

  useEffect(() => {
    if (!pdfFile) return;
    const t = setTimeout(syncPagePx, 100);
    return () => clearTimeout(t);
  }, [pdfFile, pageIndex, pageWidth, syncPagePx]);

  const updatePlacement = useCallback((id: string, patch: Partial<Placement>) => {
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.placementId !== id) return p;
        return {
          ...p,
          ...patch,
          style: patch.style ? { ...(p.style || {}), ...(patch.style || {}) } : p.style,
        };
      }),
    );
  }, []);

  const updatePlacementRect = useCallback(
    (id: string, rect: Placement["rect"]) => {
      updatePlacement(id, {
        rect: { x: clamp01(rect.x), y: clamp01(rect.y), w: clamp01(rect.w), h: clamp01(rect.h) },
      });
    },
    [updatePlacement],
  );

  const deletePlacement = useCallback(
    (id: string) => {
      setPlacements((prev) => prev.filter((p) => p.placementId !== id));
      if (selectedPlacementId === id) setSelectedPlacementId("");
    },
    [selectedPlacementId],
  );

  const addPlacement = useCallback(
    (fieldKey: string) => {
      const rect = getNextPlacementRect(placements, pageIndex, pagePx, pdfHostRef, pageWrapRef);
      const p: Placement = {
        placementId: uuid(),
        fieldKey,
        pageIndex,
        rect,
        style: { fontSize: 12, align: "left", multiline: false, lineHeight: 14 },
        label: masterFieldLabelByKey.get(fieldKey) || "",
      };

      setPlacements((prev) => [...prev, p]);
      setSelectedPlacementId(p.placementId);
    },
    [placements, pageIndex, pagePx, masterFieldLabelByKey],
  );

  const handleCopy = useCallback(
    (placement: Placement) => {
      copy(placement);
      dispatch(addToast({ message: "Field copied! Press Ctrl+V to paste.", type: "success" }));
    },
    [copy, dispatch],
  );

  const handlePaste = useCallback(() => {
    if (!hasClipboard()) {
      dispatch(
        addToast({
          message: "No field copied. Select a field and press Ctrl+C.",
          type: "warning",
        }),
      );
      return;
    }

    const pasted = paste(uuid, 0.02, 0.02);
    if (pasted) {
      pasted.pageIndex = pageIndex;
      setPlacements((prev) => [...prev, pasted]);
      setSelectedPlacementId(pasted.placementId);
      dispatch(addToast({ message: "Field pasted!", type: "success" }));
    }
  }, [paste, hasClipboard, pageIndex, dispatch]);

  const handleDelete = useCallback(() => {
    if (selectedPlacement) {
      deletePlacement(selectedPlacement.placementId);
      dispatch(addToast({ message: "Field removed", type: "info" }));
    }
  }, [selectedPlacement, deletePlacement, dispatch]);

  const handleDeselect = useCallback(() => {
    setSelectedPlacementId("");
  }, []);

  useKeyboardShortcuts({
    selectedPlacement,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDelete: handleDelete,
    onDeselect: handleDeselect,
    enabled: true,
  });

  async function savePlacements() {
    if (!templateId) return;
    try {
      const res = await TemplateService.savePlacements(templateId, placements);
      setPlacements(res.template.placements || []);
      dispatch(addToast({ message: "Placements saved successfully!!!", type: "success" }));
    } catch {
      dispatch(addToast({ message: "Failed to save placements", type: "error" }));
    }
  }

  const goBack = () => {
    if (organizationId && workspaceId) {
      navigate(`/${organizationId}/workspaces/${workspaceId}/template-maker`);
    } else {
      navigate("/onboarding");
    }
  };

  const inspector = (
    <InspectorPanel
      selected={selectedPlacement}
      onChange={(patch) =>
        selectedPlacement && updatePlacement(selectedPlacement.placementId, patch)
      }
      onDelete={() => selectedPlacement && deletePlacement(selectedPlacement.placementId)}
      embedded
    />
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full min-w-0 overflow-hidden bg-background">
      <MasterFieldsPanel
        masterFields={masterFields}
        onFieldSelect={addPlacement}
        loading={masterFieldsLoading}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-card-border bg-card px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-card-text transition-colors hover:bg-card-hover hover:text-text"
          >
            <FiArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Templates
          </button>

          <div className="hidden h-4 w-px bg-card-border sm:block" />

          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-text sm:text-base">
            {template?.name || "Template"}
          </h1>

          <div className="flex items-center gap-2">
            <KeyboardShortcutsHelp />
            <Button variant="primary" onClick={savePlacements}>
              Save
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-card-border bg-card/60 px-3 py-2 sm:px-4">
              <ViewControls
                pageIndex={pageIndex}
                pdfNumPages={pdfNumPages}
                onPrevPage={() => setPageIndex((p) => Math.max(0, p - 1))}
                onNextPage={() => setPageIndex((p) => Math.min(pdfNumPages - 1, p + 1))}
              />
              <span className="hidden text-xs text-card-text md:inline">
                {placements.length} placement{placements.length === 1 ? "" : "s"}
              </span>
            </div>

            <div
              ref={pdfContainerRef}
              className="min-h-0 flex-1 overflow-auto bg-background p-3 sm:p-4 md:p-6"
            >
              <PdfViewer
                pdfFile={pdfFile}
                emptyMessage={
                  pdfError ? pdfError : "Upload or load a template to start."
                }
                isError={Boolean(pdfError)}
                pageIndex={pageIndex}
                pageWidth={pageWidth}
                pagePx={pagePx}
                placements={placements}
                selectedPlacementId={selectedPlacementId}
                onSelectPlacement={setSelectedPlacementId}
                onUpdatePlacementRect={updatePlacementRect}
                onPageLoad={setPdfNumPages}
                onRenderSuccess={syncPagePx}
                onPageDimensions={onPageDimensions}
                pdfHostRef={pdfHostRef}
                pageWrapRef={pageWrapRef}
              />
            </div>
          </section>

          <aside
            className={cn(
              "hidden min-h-0 w-72 shrink-0 flex-col overflow-hidden",
              "border-l border-card-border bg-card lg:flex xl:w-80",
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{inspector}</div>
          </aside>
        </div>

        <details className="shrink-0 border-t border-card-border bg-card lg:hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-text">
            Inspector
            {selectedPlacement ? (
              <span className="ml-2 font-normal text-card-text">· selected</span>
            ) : null}
          </summary>
          <div className="border-t border-card-border p-3">{inspector}</div>
        </details>
      </div>
    </div>
  );
}
