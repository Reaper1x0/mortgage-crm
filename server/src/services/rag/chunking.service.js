const llmConfig = require("../../config/llm.config");

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

function getRagConfig() {
  return llmConfig.rag || {};
}

function splitByParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitLongText(text, chunkSize, overlap) {
  const paragraphs = splitByParagraphs(text);
  const chunks = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (!current) {
      if (paragraph.length <= chunkSize) {
        current = paragraph;
      } else {
        let start = 0;
        while (start < paragraph.length) {
          const end = Math.min(start + chunkSize, paragraph.length);
          chunks.push(paragraph.slice(start, end).trim());
          if (end >= paragraph.length) break;
          start = Math.max(0, end - overlap);
        }
      }
      continue;
    }

    const candidate = `${current}\n\n${paragraph}`;
    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      flush();
      if (paragraph.length <= chunkSize) {
        current = paragraph;
      } else {
        let start = 0;
        while (start < paragraph.length) {
          const end = Math.min(start + chunkSize, paragraph.length);
          chunks.push(paragraph.slice(start, end).trim());
          if (end >= paragraph.length) break;
          start = Math.max(0, end - overlap);
        }
      }
    }
  }

  flush();
  return chunks;
}

function parseMarkdownSections(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const sections = [];
  let currentHeadingPath = [];
  let currentLines = [];

  const pushSection = () => {
    const content = currentLines.join("\n").trim();
    if (content) {
      sections.push({
        headingPath: currentHeadingPath.join(" > "),
        content,
      });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const match = line.match(HEADING_RE);
    if (match) {
      pushSection();
      const level = match[1].length;
      const title = match[2].trim();
      currentHeadingPath = currentHeadingPath.slice(0, level - 1);
      currentHeadingPath[level - 1] = title;
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  pushSection();
  return sections.length ? sections : [{ headingPath: "", content: String(markdown || "").trim() }];
}

function chunkMarkdown(markdown, options = {}) {
  const { chunkSize, chunkOverlap } = { ...getRagConfig(), ...options };
  const sections = parseMarkdownSections(markdown);
  const results = [];
  let globalOffset = 0;

  for (const section of sections) {
    const pieces =
      section.content.length <= chunkSize
        ? [section.content]
        : splitLongText(section.content, chunkSize, chunkOverlap);

    for (const piece of pieces) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      const startChar = globalOffset;
      const endChar = startChar + trimmed.length;
      results.push({
        content: trimmed,
        metadata: {
          headingPath: section.headingPath,
          startChar,
          endChar,
        },
      });
      globalOffset = endChar + 1;
    }
  }

  return results;
}

module.exports = {
  chunkMarkdown,
};
