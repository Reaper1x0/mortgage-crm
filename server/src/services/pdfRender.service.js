const fs = require("fs");
const { PDFDocument, StandardFonts } = require("pdf-lib");

function toDisplayString(value, type) {
  if (value === null || value === undefined) return "";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "date") {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  if (type === "object" || type === "array") return JSON.stringify(value);
  return String(value);
}

function wrapText(font, text, fontSize, maxWidth) {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(test, fontSize);
    if (w <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          const t = chunk + ch;
          if (font.widthOfTextAtSize(t, fontSize) <= maxWidth) chunk = t;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function xByAlign(font, text, fontSize, xLeft, boxWidth, align) {
  if (align === "center") {
    const tW = font.widthOfTextAtSize(text, fontSize);
    return xLeft + Math.max(0, (boxWidth - tW) / 2);
  }
  if (align === "right") {
    const tW = font.widthOfTextAtSize(text, fontSize);
    return xLeft + Math.max(0, boxWidth - tW);
  }
  return xLeft;
}

async function renderPdfToFile({
  templatePdfPath,
  outputPdfPath,
  placements,
  masterFieldsByKey,
  valuesByKey,
}) {
  const bytes = fs.readFileSync(templatePdfPath);
  const pdfDoc = await PDFDocument.load(bytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const p of placements) {
    const page = pages[p.pageIndex];
    if (!page) throw new Error(`Invalid pageIndex ${p.pageIndex} for placement ${p.placementId}`);

    const field = masterFieldsByKey[p.fieldKey];
    if (!field) throw new Error(`MasterField not found for key: ${p.fieldKey}`);

    const rawValue = valuesByKey?.[p.fieldKey];
    if (field.required && (rawValue === undefined || rawValue === null || rawValue === "")) {
      throw new Error(`Missing required field: ${p.fieldKey}`);
    }

    const text = toDisplayString(rawValue, field.type);
    const fontSize = p?.style?.fontSize ?? 12;
    const align = p?.style?.align ?? "left";
    const multiline = !!p?.style?.multiline;
    const lineHeight = p?.style?.lineHeight ?? Math.round(fontSize * 1.2);

    // ✅ Use CropBox if present (react-pdf uses visible viewport)
    const crop = page.getCropBox ? page.getCropBox() : null;
    const media = page.getMediaBox ? page.getMediaBox() : null;

    const box = crop || media || { x: 0, y: 0, width: page.getSize().width, height: page.getSize().height };

    const viewX = box.x ?? 0;
    const viewY = box.y ?? 0;
    const viewW = box.width;
    const viewH = box.height;

    // normalized -> PDF points within visible viewport (CropBox)
    const x = viewX + p.rect.x * viewW;
    const boxW = p.rect.w * viewW;

    const yTop = p.rect.y * viewH;
    const boxH = p.rect.h * viewH;

    // UI origin top-left; PDF origin bottom-left
    const yBottom = viewY + (viewH - yTop - boxH);

    const padding = 2;
    const maxWidth = Math.max(1, boxW - padding * 2);

    const textHeight = font.heightAtSize(fontSize);

    if (!multiline) {
      const drawX = xByAlign(font, text, fontSize, x + padding, maxWidth, align);

      // ✅ center vertically inside box (more “form-like”)
      const drawY = yBottom + Math.max(padding, (boxH - textHeight) / 2);

      page.drawText(text, { x: drawX, y: drawY, size: fontSize, font });
    } else {
      const lines = wrapText(font, text, fontSize, maxWidth);

      // start near top, but inside box
      let cursorY = yBottom + boxH - textHeight - padding;

      for (const line of lines) {
        if (cursorY < yBottom + padding) break;
        const drawX = xByAlign(font, line, fontSize, x + padding, maxWidth, align);
        page.drawText(line, { x: drawX, y: cursorY, size: fontSize, font });
        cursorY -= lineHeight;
      }
    }
  }

  const out = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, out);
}

module.exports = { renderPdfToFile };
