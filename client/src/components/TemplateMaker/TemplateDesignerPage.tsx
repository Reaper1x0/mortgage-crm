import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { type DocumentProps } from "react-pdf";
import Button from "../../components/Reusable/Button";
import { TemplateService } from "../../service/templateService";
import { MasterFieldService } from "../../service/masterFieldService";
import { MasterField, Placement, TemplateDoc } from "../../types/template.types";
import InspectorPanel from "./InspectorPanel";
import { addToast } from "../../redux/slices/toasterSlice";
import { useDispatch } from "react-redux";
import PageHeader from "../Reusable/PageHeader";
import { useClipboard } from "./hooks/useClipboard";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { usePdfViewer } from "./hooks/usePdfViewer";
import { uuid, getNextPlacementRect, clamp01 } from "./utils/placementUtils";
import PdfViewer from "./components/PdfViewer";
import ViewControls from "./components/ViewControls";
import MasterFieldsPanel from "./components/MasterFieldsPanel";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";

export default function TemplateDesignerPage() {
  const { templateId, organizationId, workspaceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [template, setTemplate] = useState<TemplateDoc | null>(null);
  const [pdfFile, setPdfFile] = useState<DocumentProps["file"]>(null);
  const [masterFields, setMasterFields] = useState<MasterField[]>([]);
  const [masterFieldsLoading, setMasterFieldsLoading] = useState(true);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>("");
  const [pdfNumPages, setPdfNumPages] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);

  const pageWrapRef = useRef<HTMLDivElement | null>(null);
  const pdfHostRef = useRef<HTMLDivElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  // PDF viewer hook
  const { pageWidth, pagePx, syncPagePx, onPageDimensions } = usePdfViewer({
    containerRef: pdfContainerRef,
    pageWrapRef,
    onPageSizeChange: () => {
      // Trigger re-render when page size changes
    },
  });

  // Clipboard hook
  const { copy, paste, hasClipboard } = useClipboard();

  const selectedPlacement = useMemo(
    () => placements.find((p) => p.placementId === selectedPlacementId),
    [placements, selectedPlacementId],
  );

  const masterFieldLabelByKey = useMemo(
    () => new Map(masterFields.map((field) => [field.key, field.label || ""])),
    [masterFields],
  );

  // Load template and master fields
  useEffect(() => {
    if (!templateId) return;
    setMasterFieldsLoading(true);
    setPdfFile(null);
    (async () => {
      try {
        const [tplRes, mfRes] = await Promise.all([
          TemplateService.getTemplate(templateId),
          MasterFieldService.getAllFields({ limit: -1 }),
        ]);

        const tpl: TemplateDoc = tplRes.template;
        setTemplate(tpl);
        setPlacements(tpl.placements || []);
        setPdfNumPages(tpl.pageCount || 1);
        setPageIndex(0);
        setMasterFields(mfRes.items || []);

        const fileBytes = await TemplateService.getTemplateFile(templateId);
        const header = new TextDecoder("ascii")
          .decode(new Uint8Array(fileBytes).slice(0, 5))
          .trim();
        if (!header.startsWith("%PDF")) {
          throw new Error("Template file response is not a PDF");
        }
        setPdfFile({ data: new Uint8Array(fileBytes) });
      } catch (err) {
        console.error("Failed to load template PDF:", err);
        dispatch(
          addToast({
            message: "Failed to load template PDF. Please refresh and try again.",
            type: "error",
          }),
        );
      } finally {
        setMasterFieldsLoading(false);
      }
    })();
  }, [templateId, dispatch]);

  // Sync page size when PDF renders
  useEffect(() => {
    if (!pdfFile) return;
    const t = setTimeout(syncPagePx, 100);
    return () => clearTimeout(t);
  }, [pdfFile, pageIndex, pageWidth, syncPagePx]);


  // Placement management functions
  const updatePlacement = useCallback(
    (id: string, patch: Partial<Placement>) => {
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
    },
    [],
  );

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

  // Copy/Paste handlers
  const handleCopy = useCallback(
    (placement: Placement) => {
      copy(placement);
      dispatch(addToast({ message: "Field copied! Press Ctrl+V to paste.", type: "success" }));
    },
    [copy, dispatch],
  );

  const handlePaste = useCallback(() => {
    if (!hasClipboard()) {
      dispatch(addToast({ message: "No field copied. Select a field and press Ctrl+C.", type: "warning" }));
      return;
    }

    const pasted = paste(uuid, 0.02, 0.02); // Small offset for pasted items
    if (pasted) {
      pasted.pageIndex = pageIndex; // Ensure it's on the current page
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

  // Keyboard shortcuts
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
    } catch (error) {
      dispatch(addToast({ message: "Failed to save placements", type: "error" }));
    }
  }

  return (
    <>
      <MasterFieldsPanel
        masterFields={masterFields}
        onFieldSelect={addPlacement}
        loading={masterFieldsLoading}
      />

      <div className="min-w-0 flex-1 space-y-4 py-4 sm:space-y-5">
        <PageHeader
          back={{
            label: "Back to templates",
            onClick: () =>
              organizationId && workspaceId
                ? navigate(`/${organizationId}/workspaces/${workspaceId}/template-maker`)
                : navigate("/onboarding"),
          }}
          title={
            <span className="break-words">Manage &ldquo;{template?.name || "-"}&rdquo; template</span>
          }
          actions={
            <div className="flex items-center gap-2">
              <KeyboardShortcutsHelp />
              <Button variant="secondary" onClick={savePlacements}>
                Save Placements
              </Button>
            </div>
          }
        />

        <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start">
          <div
            ref={pdfContainerRef}
            className="min-w-0 flex-1 overflow-hidden rounded-lg border border-card-border bg-card p-2 sm:p-3 md:p-4"
          >
            <ViewControls
              pageIndex={pageIndex}
              pdfNumPages={pdfNumPages}
              onPrevPage={() => setPageIndex((p) => Math.max(0, p - 1))}
              onNextPage={() => setPageIndex((p) => Math.min(pdfNumPages - 1, p + 1))}
            />

            <PdfViewer
              pdfFile={pdfFile}
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

          <details className="rounded-lg border border-card-border bg-card lg:hidden">
            <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-text">
              Inspector
            </summary>
            <div className="p-4 pt-0">
              <InspectorPanel
                selected={selectedPlacement}
                onChange={(patch) =>
                  selectedPlacement && updatePlacement(selectedPlacement.placementId, patch)
                }
                onDelete={() =>
                  selectedPlacement && deletePlacement(selectedPlacement.placementId)
                }
              />
            </div>
          </details>

          <aside
            className="sticky top-14 hidden w-full min-w-0 shrink-0 self-start py-4 lg:flex lg:w-64 lg:flex-col xl:w-72"
            style={{ maxHeight: "calc(100vh - 56px)" }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <InspectorPanel
                selected={selectedPlacement}
                onChange={(patch) =>
                  selectedPlacement && updatePlacement(selectedPlacement.placementId, patch)
                }
                onDelete={() =>
                  selectedPlacement && deletePlacement(selectedPlacement.placementId)
                }
              />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
