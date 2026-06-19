const { createCanvas } = require("@napi-rs/canvas");
const { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } = require("./thumbnail.constants");

function truncate(value, max = 48) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function wrapLines(ctx, text, maxWidth, maxLines = 8) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function renderTextPreviewImage({ title, body, badgeLabel, badgeColor = "#2563EB" }) {
  const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(0, 0, THUMBNAIL_WIDTH, 64);

  if (badgeLabel) {
    ctx.fillStyle = badgeColor;
    ctx.fillRect(20, 18, 52, 28);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
    ctx.fillText(String(badgeLabel).slice(0, 6), 28, 37);
  }

  ctx.fillStyle = "#0F172A";
  ctx.font = "600 15px Segoe UI, Arial, sans-serif";
  ctx.fillText(truncate(title, 42), 84, 38);

  ctx.fillStyle = "#334155";
  ctx.font = "13px Segoe UI, Arial, sans-serif";
  const lines = wrapLines(ctx, body, THUMBNAIL_WIDTH - 48, 9);
  let y = 92;
  for (const line of lines) {
    ctx.fillText(line, 24, y);
    y += 22;
    if (y > THUMBNAIL_HEIGHT - 24) break;
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  renderTextPreviewImage,
};
