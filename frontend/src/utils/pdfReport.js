import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = {
  primary: [37, 56, 124],
  primarySoft: [54, 83, 199],
  teal: [15, 118, 110],
  mint: [20, 184, 166],
  text: [31, 41, 55],
  muted: [100, 116, 139],
  border: [226, 232, 240],
  panel: [248, 250, 252],
  panelAlt: [239, 246, 255],
  white: [255, 255, 255],
};

function safeText(value, fallback = "--") {
  const text = `${value ?? ""}`.trim();
  return text || fallback;
}

function formatPdfDateTimeValue(value) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function addHeader(doc, title, subtitle, metaLines = []) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 96, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, 40, 58, { maxWidth: pageWidth - 220 });

  if (metaLines.length > 0) {
    const metaX = pageWidth - 40;
    const metaY = 30;

    doc.setFillColor(255, 255, 255, 255);
    doc.roundedRect(pageWidth - 185, 22, 145, 48, 12, 12, "S");

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    metaLines.forEach((line, index) => {
      doc.text(line, metaX, metaY + index * 14, { align: "right" });
    });
  }
}

function addSummaryCards(doc, cards, startY) {
  if (!cards.length) return startY;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const gap = 12;
  const cardCount = Math.min(4, cards.length);
  const cardWidth = (pageWidth - margin * 2 - gap * (cardCount - 1)) / cardCount;
  const cardHeight = 66;
  const rows = Math.ceil(cards.length / cardCount);
  let currentY = startY;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cardCount; col += 1) {
      const index = row * cardCount + col;
      const card = cards[index];

      if (!card) continue;

      const x = margin + col * (cardWidth + gap);
      const y = currentY;

      doc.setFillColor(...COLORS.white);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(x, y, cardWidth, cardHeight, 12, 12, "FD");

      doc.setTextColor(...COLORS.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(safeText(card.label), x + 12, y + 20);

      doc.setTextColor(...COLORS.text);
      doc.setFontSize(18);
      doc.text(safeText(card.value, "0"), x + 12, y + 41);

      if (card.note) {
        doc.setTextColor(...COLORS.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(safeText(card.note), x + 12, y + 56, {
          maxWidth: cardWidth - 24,
        });
      }
    }

    currentY += cardHeight + 12;
  }

  return currentY - 2;
}

function addInfoSection(doc, title, items, startY) {
  if (!items.length) return startY;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = startY;

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 14;

  doc.setFillColor(...COLORS.panel);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, y, contentWidth, 54 + (items.length > 4 ? 18 : 0), 12, 12, "FD");

  let leftY = y + 20;
  let rightY = y + 20;
  const halfWidth = (contentWidth - 24) / 2;

  items.forEach((item, index) => {
    const isRightColumn = index % 2 === 1;
    const x = margin + 12 + (isRightColumn ? halfWidth + 12 : 0);
    const currentY = isRightColumn ? rightY : leftY;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${safeText(item.label)}:`, x, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    const value = safeText(item.value);
    const wrapped = doc.splitTextToSize(value, halfWidth - 20);
    doc.text(wrapped, x + 78, currentY);

    if (isRightColumn) {
      rightY += 18;
    } else {
      leftY += 18;
    }
  });

  const usedRows = Math.ceil(items.length / 2);
  return y + 22 + usedRows * 18;
}

function addFooter(doc) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.6);
    doc.line(40, pageHeight - 28, pageWidth - 40, pageHeight - 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Vigilancia Pro", 40, pageHeight - 16);
    doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - 40, pageHeight - 16, {
      align: "right",
    });
  }
}

export function downloadStructuredReportPdf({
  filename,
  title,
  subtitle,
  metaLines = [],
  summaryCards = [],
  infoSections = [],
  tableColumns = [],
  rows = [],
  emptyMessage = "No hay datos para mostrar.",
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  addHeader(doc, title, subtitle, metaLines);

  let currentY = 120;

  if (summaryCards.length > 0) {
    currentY = addSummaryCards(doc, summaryCards, currentY);
    currentY += 10;
  }

  infoSections.forEach((section) => {
    currentY = addInfoSection(doc, section.title, section.items, currentY);
    currentY += 10;
  });

  if (rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.muted);
    doc.text(emptyMessage, 40, currentY + 18);
    addFooter(doc);
    doc.save(filename);
    return;
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 40, right: 40 },
    theme: "grid",
    head: [tableColumns.map((column) => column.header)],
    body: rows.map((row) => tableColumns.map((column) => column.getValue(row))),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 5,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.5,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.primarySoft,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: COLORS.panel,
    },
    columnStyles: tableColumns.reduce((styles, column, index) => {
      if (column.width) {
        styles[index] = { cellWidth: column.width };
      }
      return styles;
    }, {}),
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const content = `${hookData.cell.raw ?? ""}`;
        if (content === "Adentro") {
          hookData.cell.styles.textColor = COLORS.teal;
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  addFooter(doc);
  doc.save(filename);
}

export function formatPdfDateTime(value) {
  return formatPdfDateTimeValue(value);
}
