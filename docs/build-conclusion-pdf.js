/**
 * Renders docs/CONCLUSION.md as a single-page, two-column A4 PDF at
 * docs/BEFAST-AI-conclusion.pdf.
 *
 * pdfkit is deliberately NOT a dependency of this project — the application
 * never generates PDFs, and adding it to package.json would put document
 * tooling into the app's dependency tree for no runtime benefit. Install it in
 * a scratch directory and run the script from there. Bun resolves imports
 * relative to the script's own location, so the script has to be copied next to
 * the installed package, and the docs directory is then passed as an argument:
 *
 *   mkdir /tmp/pdfgen && cd /tmp/pdfgen && bun add pdfkit
 *   cp <repo>/docs/build-conclusion-pdf.js .
 *   bun run build-conclusion-pdf.js <repo>/docs
 *
 * CONCLUSION.md is the source of record. Edit the Markdown, then re-run this to
 * regenerate the PDF. The script exits non-zero if the content no longer fits on
 * one page rather than silently spilling onto a second.
 *
 * Note: PDF base-14 fonts are WinAnsi-encoded, so the Markdown must avoid
 * characters outside that set (Greek letters, for instance, will not render).
 */
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The docs directory: argv[2] when the script has been copied elsewhere to run,
// otherwise the directory the script itself lives in.
const DOCS = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DOCS, "CONCLUSION.md");
const OUT = path.join(DOCS, "BEFAST-AI-conclusion.pdf");

// A4 in points, with a comfortable print margin.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = { top: 46, bottom: 44, left: 48, right: 48 };
const GAP = 20;
const COL_W = (PAGE_W - M.left - M.right - GAP) / 2;
const COL_X = [M.left, M.left + COL_W + GAP];
const BOTTOM = PAGE_H - M.bottom;

const BODY_SIZE = 8.5;
const BODY_LEADING = 1.34;
const H2_SIZE = 9.2;

// ---------------------------------------------------------------- parse

/** Join hard-wrapped lines, drop markdown emphasis we render structurally. */
const clean = (s) => s.replace(/\s*\n\s*/g, " ").replace(/`/g, "").trim();

function parse(md) {
  const blocks = [];
  for (const raw of md.split(/\n\s*\n/)) {
    const chunk = raw.trim();
    if (!chunk) continue;
    if (chunk.startsWith("# ")) {
      blocks.push({ kind: "title", text: clean(chunk.slice(2)) });
    } else if (chunk.startsWith("## ")) {
      blocks.push({ kind: "h2", text: clean(chunk.slice(3)) });
    } else {
      // A paragraph may open with a bold run-in label: "**Design.** text..."
      const m = chunk.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
      if (m) {
        blocks.push({
          kind: "p",
          lead: clean(m[1]),
          text: clean(m[2]),
        });
      } else {
        blocks.push({ kind: "p", text: clean(chunk.replace(/\*\*/g, "")) });
      }
    }
  }
  return blocks;
}

// ---------------------------------------------------------------- measure

const SPACE_BEFORE = { h2: 7.5, p: 4.2 };

function measure(doc, b) {
  if (b.kind === "h2") {
    doc.font("Helvetica-Bold").fontSize(H2_SIZE);
    return doc.heightOfString(b.text, { width: COL_W });
  }
  // Bold run-ins are marginally wider than roman at the same size; measuring
  // the whole string as bold when a lead is present keeps the estimate safe.
  const full = b.lead ? `${b.lead} ${b.text}` : b.text;
  doc.font(b.lead ? "Times-Bold" : "Times-Roman").fontSize(BODY_SIZE);
  return doc.heightOfString(full, {
    width: COL_W,
    lineGap: BODY_SIZE * (BODY_LEADING - 1),
    align: "left",
  });
}

// ---------------------------------------------------------------- draw

function drawTitle(doc, text, y) {
  const width = PAGE_W - M.left - M.right;
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#0d1b2a");
  doc.text(text, M.left, y, { width, align: "left" });
  let cursor = doc.y + 2;
  doc.font("Helvetica").fontSize(8).fillColor("#4a5a6a");
  doc.text(
    "Multimodal AI-assisted screening for the BE-FAST stroke warning signs — " +
      "feasibility, evaluation methodology and limitations",
    M.left,
    cursor,
    { width, align: "left" },
  );
  cursor = doc.y + 5;
  doc
    .moveTo(M.left, cursor)
    .lineTo(PAGE_W - M.right, cursor)
    .lineWidth(0.9)
    .strokeColor("#0d1b2a")
    .stroke();
  return cursor + 10;
}

function drawBlock(doc, b, x, y) {
  if (b.kind === "h2") {
    doc.font("Helvetica-Bold").fontSize(H2_SIZE).fillColor("#0b3f8f");
    doc.text(b.text, x, y, { width: COL_W });
    return;
  }
  doc.fillColor("#111827").fontSize(BODY_SIZE);
  const opts = {
    // Ragged right, not justified: pdfkit has no hyphenation, and justifying a
    // 236pt column opened wide rivers of whitespace between words.
    width: COL_W,
    align: "left",
    lineGap: BODY_SIZE * (BODY_LEADING - 1),
  };
  if (b.lead) {
    doc.font("Times-Bold").text(`${b.lead} `, x, y, { ...opts, continued: true });
    doc.font("Times-Roman").text(b.text, opts);
  } else {
    doc.font("Times-Roman").text(b.text, x, y, opts);
  }
}

// ---------------------------------------------------------------- layout

const md = fs.readFileSync(SRC, "utf8");
const blocks = parse(md);

const doc = new PDFDocument({
  size: "A4",
  margins: M,
  autoFirstPage: true,
  info: {
    Title: "BEFAST AI — Conclusion",
    Author: "BEFAST AI project",
    Subject:
      "Project conclusion: accuracy evaluation methodology, limitations and future work",
  },
});

let extraPages = 0;
doc.on("pageAdded", () => extraPages++);

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

let col = 0;
let y = M.top;
// Both columns start below the full-width title block, not at the page top —
// otherwise column two overlaps the title and its rule.
let contentTop = M.top;

for (const b of blocks) {
  if (b.kind === "title") {
    y = drawTitle(doc, b.text, y);
    contentTop = y;
    continue;
  }
  const h = measure(doc, b);
  const space = SPACE_BEFORE[b.kind] ?? 4;
  // A heading immediately followed by no room for its first lines belongs in
  // the next column, not orphaned at the foot of this one.
  const need = h + space + (b.kind === "h2" ? BODY_SIZE * 2.6 : 0);
  if (y + need > BOTTOM) {
    if (col === 1) {
      console.error(
        `OVERFLOW: content exceeds one page at block "${(b.lead ?? b.text).slice(0, 48)}..."`,
      );
      process.exitCode = 1;
      break;
    }
    col = 1;
    y = contentTop;
  }
  y += space;
  drawBlock(doc, b, COL_X[col], y);
  y = doc.y;
}

const columnFill = ((y - M.top) / (BOTTOM - M.top)) * 100;

doc.end();
stream.on("finish", () => {
  const bytes = fs.statSync(OUT).size;
  console.log(`written : ${OUT}`);
  console.log(`pages   : ${1 + extraPages}${extraPages ? "  <-- NOT one page" : ""}`);
  console.log(`bytes   : ${bytes}`);
  console.log(`last col: ${columnFill.toFixed(0)}% full (column ${col + 1} of 2)`);
});
