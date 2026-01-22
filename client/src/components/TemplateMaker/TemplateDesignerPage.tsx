import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Document, Page, pdfjs } from "react-pdf";
import Button from "../../components/Reusable/Button";
import Input from "../../components/Reusable/Inputs/Input";
import { TemplateService } from "../../service/templateService";
import { MasterFieldService } from "../../service/masterFieldService";
import { BACKEND_URL } from "../../constants/env.constants";
import { MasterField, Placement, TemplateDoc } from "../../types/template.types";
import InspectorPanel from "./InspectorPanel";
import PlacementBox from "./PlacementBox";
import { addToast } from "../../redux/slices/toasterSlice";
import { useDispatch } from "react-redux";
import PageHeader from "../Reusable/PageHeader";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2);
}
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function TemplateDesignerPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<TemplateDoc | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string>("");

  const [masterFields, setMasterFields] = useState<MasterField[]>([]);
  const [fieldSearch, setFieldSearch] = useState("");

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>("");

  const [pdfNumPages, setPdfNumPages] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);

  const dispatch = useDispatch();

  const pageWrapRef = useRef<HTMLDivElement | null>(null);
  const [pagePx, setPagePx] = useState<{ w: number; h: number }>({ w: 800, h: 1000 });

  const selectedPlacement = useMemo(
    () => placements.find((p) => p.placementId === selectedPlacementId),
    [placements, selectedPlacementId],
  );

  const pdfHostRef = useRef<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(700);

  const syncPagePx = () => {
    const pageEl = pageWrapRef.current?.querySelector(".react-pdf__Page") as HTMLElement | null;
    if (!pageEl) return;

    const r = pageEl.getBoundingClientRect();
    if (r.width > 50 && r.height > 50) setPagePx({ w: r.width, h: r.height });
  };

  useEffect(() => {
    if (!pdfHostRef.current) return;

    const el = pdfHostRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width - 24));
      setPageWidth(w);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return masterFields;
    return masterFields.filter(
      (f) => f.key.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    );
  }, [masterFields, fieldSearch]);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      const [tplRes, mfRes] = await Promise.all([
        TemplateService.getTemplate(templateId),
        MasterFieldService.getAllFields({ limit: -1 }),
      ]);

      const tpl: TemplateDoc = tplRes.template;
      setTemplate(tpl);
      setPlacements(tpl.placements || []);
      setPdfNumPages(tpl.pageCount || 1);
      setPageIndex(0);

      const fileName = String(tpl.file.storagePath).split(/[/\\]/).pop();
      setTemplateUrl(`${BACKEND_URL}/uploads/templates/${fileName}`);

      setMasterFields(mfRes.fields || []);
    })();
  }, [templateId]);

  useEffect(() => {
    if (!templateUrl) return;

    const t = setTimeout(syncPagePx, 0);

    const pageEl = pageWrapRef.current?.querySelector(".react-pdf__Page") as HTMLElement | null;
    if (!pageEl) return () => clearTimeout(t);

    const ro = new ResizeObserver(() => syncPagePx());
    ro.observe(pageEl);

    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [templateUrl, pageIndex, pageWidth]);

  // =========================
  // Drag/Resize helpers
  // =========================
  function rectToPx(r: Placement["rect"]) {
    return {
      left: r.x * pagePx.w,
      top: r.y * pagePx.h,
      width: r.w * pagePx.w,
      height: r.h * pagePx.h,
    };
  }
  function pxToRect(left: number, top: number, width: number, height: number) {
    return { x: left / pagePx.w, y: top / pagePx.h, w: width / pagePx.w, h: height / pagePx.h };
  }

  // =========================
  // NEW: compute a spawn rect that:
  // - appears inside current viewport (visible area)
  // - offsets from last placement (down + right)
  // =========================
  function getVisibleSpawnPx() {
    const host = pdfHostRef.current;
    const pageWrap = pageWrapRef.current;
    if (!host || !pageWrap) {
      return { x: 0.1 * pagePx.w, y: 0.1 * pagePx.h };
    }

    const hostRect = host.getBoundingClientRect();
    const pageRect = pageWrap.getBoundingClientRect();

    // page top-left in host scroll content coordinates
    const pageLeftInContent = (pageRect.left - hostRect.left) + host.scrollLeft;
    const pageTopInContent = (pageRect.top - hostRect.top) + host.scrollTop;

    // visible window in host content coordinates
    const visLeftContent = host.scrollLeft;
    const visTopContent = host.scrollTop;

    // translate visible window into page-local coordinates
    const visLeftOnPage = visLeftContent - pageLeftInContent;
    const visTopOnPage = visTopContent - pageTopInContent;

    // choose a point that’s safely inside the visible region
    const pad = 24;
    const x = clamp(visLeftOnPage + pad, 0, Math.max(0, pagePx.w - pad));
    const y = clamp(visTopOnPage + pad, 0, Math.max(0, pagePx.h - pad));
    return { x, y };
  }

  function getNextPlacementRect() {
    const pagePlacements = placements.filter((p) => p.pageIndex === pageIndex);
    const baseSizePx = { w: Math.max(140, pagePx.w * 0.25), h: Math.max(42, pagePx.h * 0.04) };

    // If there’s a last placement, offset from it (down + right)
    const last = pagePlacements[pagePlacements.length - 1];
    if (last) {
      const lastPx = rectToPx(last.rect);
      const offset = 14;

      let nextLeft = lastPx.left + offset;
      let nextTop = lastPx.top + offset;

      // Keep it within the visible area if possible
      const spawn = getVisibleSpawnPx();

      // If the last box is currently off-screen, spawn inside viewport instead
      const host = pdfHostRef.current;
      if (host) {
        const vis = {
          left: spawn.x,
          top: spawn.y,
          right: spawn.x + host.clientWidth,
          bottom: spawn.y + host.clientHeight,
        };
        const lastCenterX = lastPx.left + lastPx.width / 2;
        const lastCenterY = lastPx.top + lastPx.height / 2;
        const lastOnScreen =
          lastCenterX >= vis.left &&
          lastCenterX <= vis.right &&
          lastCenterY >= vis.top &&
          lastCenterY <= vis.bottom;

        if (!lastOnScreen) {
          nextLeft = spawn.x;
          nextTop = spawn.y;
        }
      }

      // clamp inside page bounds
      nextLeft = clamp(nextLeft, 8, Math.max(8, pagePx.w - baseSizePx.w - 8));
      nextTop = clamp(nextTop, 8, Math.max(8, pagePx.h - baseSizePx.h - 8));

      const r = pxToRect(nextLeft, nextTop, baseSizePx.w, baseSizePx.h);
      return { x: clamp01(r.x), y: clamp01(r.y), w: clamp01(r.w), h: clamp01(r.h) };
    }

    // No previous placements => spawn where user is currently viewing
    const spawn = getVisibleSpawnPx();
    const left = clamp(spawn.x, 8, Math.max(8, pagePx.w - baseSizePx.w - 8));
    const top = clamp(spawn.y, 8, Math.max(8, pagePx.h - baseSizePx.h - 8));
    const r = pxToRect(left, top, baseSizePx.w, baseSizePx.h);
    return { x: clamp01(r.x), y: clamp01(r.y), w: clamp01(r.w), h: clamp01(r.h) };
  }

  // =========================
  // Existing update helpers
  // =========================
  function updatePlacement(id: string, patch: Partial<Placement>) {
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
  }

  function updatePlacementRect(id: string, rect: Placement["rect"]) {
    updatePlacement(id, {
      rect: { x: clamp01(rect.x), y: clamp01(rect.y), w: clamp01(rect.w), h: clamp01(rect.h) },
    });
  }

  function deletePlacement(id: string) {
    setPlacements((prev) => prev.filter((p) => p.placementId !== id));
    if (selectedPlacementId === id) setSelectedPlacementId("");
  }

  async function savePlacements() {
    if (!templateId) return;
    const res = await TemplateService.savePlacements(templateId, placements);
    setPlacements(res.template.placements || []);
    dispatch(addToast({ message: "Placements saved successfully!!!", type: "success" }));
  }

  // ✅ UPDATED: addPlacement uses smart rect spawn
  function addPlacement(fieldKey: string) {
    const p: Placement = {
      placementId: uuid(),
      fieldKey,
      pageIndex,
      rect: getNextPlacementRect(),
      style: { fontSize: 12, align: "left", multiline: false, lineHeight: 14 },
      label: "",
    };

    setPlacements((prev) => [...prev, p]);
    setSelectedPlacementId(p.placementId);

    // optional: ensure PDF stays focused on where the new placement is
    requestAnimationFrame(() => {
      const host = pdfHostRef.current;
      if (!host) return;
      // keep as-is; spawning already targets visible area
      host.focus?.();
    });
  }

  const pagePlacements = placements.filter((p) => p.pageIndex === pageIndex);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <PageHeader
        title={<span className="break-words">Manage "{template?.name || "-"}" Template</span>}
        left={
          <Button variant="secondary" onClick={() => navigate("/workspace/template-maker")}>
            Back
          </Button>
        }
        right={
          <Button variant="secondary" onClick={savePlacements}>
            Save Placements
          </Button>
        }
      />

      {/* ✅ Responsive layout:
          - Mobile: single column, PDF first, panels collapsible
          - Desktop: 3 columns
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        {/* Left panel (Mobile collapsible) */}
        <div className="lg:col-span-3 min-w-0">
          <details className="lg:hidden rounded-lg border border-card-border bg-card">
            <summary className="px-4 py-3 cursor-pointer select-none font-semibold text-text">
              Master Fields ({masterFields.length})
            </summary>
            <div className="p-4 pt-0">
              <Input
                label="Search"
                name="search"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
              />
              <div className="mt-3 max-h-[55vh] overflow-auto space-y-2">
                {filteredFields.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => addPlacement(f.key)}
                    className="w-full text-left rounded-md border border-card-border bg-background px-3 py-2 hover:bg-card-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-text truncate">{f.key}</div>
                      <div className="text-xs text-card-text shrink-0">{f.type}</div>
                    </div>
                    <div className="text-xs text-card-text opacity-80 line-clamp-2">
                      {f.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </details>

          <div className="hidden lg:block rounded-lg border border-card-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-text">Master Fields</div>
              <div className="text-xs text-card-text">{masterFields.length}</div>
            </div>

            <div className="mt-3">
              <Input
                label="Search"
                name="search"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
              />
            </div>

            <div className="mt-3 max-h-[70vh] overflow-auto space-y-2">
              {filteredFields.map((f) => (
                <button
                  key={f.key}
                  onClick={() => addPlacement(f.key)}
                  className="w-full text-left rounded-md border border-card-border bg-background px-3 py-2 hover:bg-card-hover"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-text truncate">{f.key}</div>
                    <div className="text-xs text-card-text shrink-0">{f.type}</div>
                  </div>
                  <div className="text-xs text-card-text opacity-80 line-clamp-2">
                    {f.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center PDF */}
        <div className="lg:col-span-6 min-w-0 rounded-lg border border-card-border bg-card p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setPageIndex((p) => Math.max(0, p - 1))}>
                Prev
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPageIndex((p) => Math.min(pdfNumPages - 1, p + 1))}
              >
                Next
              </Button>
              <div className="text-sm text-card-text">
                Page <span className="text-text">{pageIndex + 1}</span> / {pdfNumPages}
              </div>
            </div>
          </div>

          <div className="mt-3 w-full min-w-0">
            {!templateUrl ? (
              <div className="text-card-text">Upload or load a template to start.</div>
            ) : (
              <div
                ref={pdfHostRef}
                className="w-full min-w-0 overflow-auto flex justify-center rounded-md"
                // ✅ mobile-friendly viewing height
                style={{ maxHeight: "72vh" }}
              >
                <div className="relative inline-block leading-none" ref={pageWrapRef}>
                  <Document
                    file={templateUrl}
                    onLoadSuccess={(d) => setPdfNumPages(d.numPages)}
                    loading={<div className="text-card-text p-3">Loading PDF...</div>}
                  >
                    <Page
                      pageNumber={pageIndex + 1}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onRenderSuccess={syncPagePx}
                    />
                  </Document>

                  <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
                    {pagePlacements.map((p) => {
                      const px = rectToPx(p.rect);
                      const isSelected = p.placementId === selectedPlacementId;

                      return (
                        <PlacementBox
                          key={p.placementId}
                          placement={p}
                          px={px}
                          selected={isSelected}
                          onSelect={() => setSelectedPlacementId(p.placementId)}
                          onMoveResize={(nextPx) => {
                            const nextRect = pxToRect(
                              nextPx.left,
                              nextPx.top,
                              nextPx.width,
                              nextPx.height,
                            );
                            updatePlacementRect(p.placementId, nextRect);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right inspector (Mobile collapsible) */}
        <div className="lg:col-span-3 min-w-0 space-y-4">
          <details className="lg:hidden rounded-lg border border-card-border bg-card">
            <summary className="px-4 py-3 cursor-pointer select-none font-semibold text-text">
              Inspector
            </summary>
            <div className="p-4 pt-0">
              <InspectorPanel
                selected={selectedPlacement}
                onChange={(patch) =>
                  selectedPlacement && updatePlacement(selectedPlacement.placementId, patch)
                }
                onDelete={() => selectedPlacement && deletePlacement(selectedPlacement.placementId)}
              />
            </div>
          </details>

          <div className="hidden lg:block">
            <InspectorPanel
              selected={selectedPlacement}
              onChange={(patch) =>
                selectedPlacement && updatePlacement(selectedPlacement.placementId, patch)
              }
              onDelete={() => selectedPlacement && deletePlacement(selectedPlacement.placementId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
