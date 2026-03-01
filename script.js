const { jsPDF } = window.jspdf;

const FIXED = {
  title: "TAX INVOICE",
  company: "NAVKAR CREATION",
  address: "549, UPPER GROUND, ASHOKA TOWER RING ROAD, SURAT-395002",
  gstin: "24AGTPK1703F1ZM",
  mobile: "M: 9033816277, 9974060799",
  footerLeft: "SUBJECT TO SURAT JURISDICTION",
  footerRight: "For : NAVKAR CREATION"
};

const els = {
  form: document.getElementById("invoice-form"),
  itemsContainer: document.getElementById("itemsContainer"),
  addItemBtn: document.getElementById("addItemBtn"),
  totalsView: document.getElementById("totalsView"),
  previewBtn: document.getElementById("previewBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  resetBtn: document.getElementById("resetBtn"),
  pdfPreview: document.getElementById("pdfPreview"),
  previewHint: document.getElementById("previewHint"),
  pdfFileName: document.getElementById("pdfFileName"),
  invoiceNo: document.getElementById("invoiceNo"),
  invoiceDate: document.getElementById("invoiceDate"),
  transportName: document.getElementById("transportName"),
  partyName: document.getElementById("partyName"),
  partyAddress: document.getElementById("partyAddress"),
  partyGst: document.getElementById("partyGst"),
  less: document.getElementById("less"),
  cgst: document.getElementById("cgst"),
  sgst: document.getElementById("sgst"),
  igst: document.getElementById("igst")
};

let activePreviewUrl = null;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y.slice(-2)}`;
}

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v) {
  return toNum(v).toFixed(2);
}

function roundByHalf(v) {
  return Math.round(toNum(v));
}

function upper(v) {
  return String(v || "").toUpperCase();
}

function safeFileName(name) {
  const clean = (name || "invoice").trim().replace(/[\\/:*?"<>|]+/g, "_");
  return clean || "invoice";
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

function createItemRow(item = {}) {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <label class="item-field">
      <span>Item Name</span>
      <input type="text" class="item-name" placeholder="e.g. JAL - PARI" value="${item.name || ""}" required />
    </label>
    <label class="item-field">
      <span>Quantity</span>
      <input type="number" class="item-qty" placeholder="Qty" min="0" step="0.01" value="${item.qty ?? 1}" />
    </label>
    <label class="item-field">
      <span>Rate / Piece</span>
      <input type="number" class="item-rate" placeholder="Rate" min="0" step="0.01" value="${item.rate ?? 0}" />
    </label>
    <div class="item-field amount-field">
      <span>Amount</span>
      <div class="amount-view">0.00</div>
    </div>
    <button type="button" class="remove-item">Remove</button>
  `;

  row.querySelector(".remove-item").addEventListener("click", () => {
    row.remove();
    recalculate();
  });

  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", recalculate));
  els.itemsContainer.appendChild(row);
}

function getItems() {
  return [...els.itemsContainer.querySelectorAll(".item-row")].map((row) => {
    const qty = toNum(row.querySelector(".item-qty").value);
    const rate = toNum(row.querySelector(".item-rate").value);
    const amount = qty * rate;
    row.querySelector(".amount-view").textContent = money(amount);

    return {
      name: row.querySelector(".item-name").value.trim(),
      hsn: "5407",
      qty,
      rate,
      amount
    };
  });
}

function getState() {
  const items = getItems();
  const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const lessRate = toNum(els.less.value);
  const lessAmt = roundByHalf(subtotal * (lessRate / 100));
  const taxableValue = subtotal - lessAmt;
  const cgstAmt = roundByHalf(taxableValue * (toNum(els.cgst.value) / 100));
  const sgstAmt = roundByHalf(taxableValue * (toNum(els.sgst.value) / 100));
  const igstAmt = roundByHalf(taxableValue * (toNum(els.igst.value) / 100));
  const grandTotalRaw = taxableValue + cgstAmt + sgstAmt + igstAmt;
  const grandTotal = roundByHalf(grandTotalRaw);

  return {
    fileName: safeFileName(els.pdfFileName.value),
    invoiceNo: els.invoiceNo.value.trim(),
    invoiceDate: formatDate(els.invoiceDate.value),
    transportName: els.transportName.value.trim(),
    partyName: els.partyName.value.trim(),
    partyAddress: els.partyAddress.value.trim(),
    partyGst: els.partyGst.value.trim(),
    items,
    subtotal,
    lessRate,
    lessAmt,
    taxableValue,
    cgstRate: toNum(els.cgst.value),
    sgstRate: toNum(els.sgst.value),
    igstRate: toNum(els.igst.value),
    cgstAmt,
    sgstAmt,
    igstAmt,
    grandTotalRaw,
    grandTotal,
    totalQty: items.reduce((s, i) => s + i.qty, 0)
  };
}

function recalculate() {
  const s = getState();
  els.totalsView.innerHTML = `
    <div class="total-line"><span>Subtotal</span><span>${money(s.subtotal)}</span></div>
    <div class="total-line"><span>Less (-)</span><span>${money(s.lessAmt)}</span></div>
    <div class="total-line"><span>Total</span><span>${money(s.taxableValue)}</span></div>
    <div class="total-line"><span>CGST ${s.cgstRate}%</span><span>${money(s.cgstAmt)}</span></div>
    <div class="total-line"><span>SGST ${s.sgstRate}%</span><span>${money(s.sgstAmt)}</span></div>
    <div class="total-line"><span>IGST ${s.igstRate}%</span><span>${money(s.igstAmt)}</span></div>
    <div class="total-line grand"><span>Grand Total</span><span>${money(s.grandTotal)}</span></div>
  `;
}

function buildPdf(state) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 10;
  const right = 200;
  let y = 10;

  doc.setLineWidth(0.3);
  doc.rect(left, y, 190, 275);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(FIXED.title, 105, y + 7, { align: "center" });
  doc.line(left, y + 9, right, y + 9);

  doc.setFontSize(11.5);
  doc.text(FIXED.company, 105, y + 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(FIXED.address, 105, y + 20, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN NO: ${FIXED.gstin}`, 105, y + 25, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(FIXED.mobile, 105, y + 30, { align: "center" });
  doc.line(left, y + 33, right, y + 33);

  const detailsTop = y + 33;
  const detailsMinBottom = detailsTop + 27;
  const leftTextStartX = left + 18;
  const leftColMaxWidth = 99;
  const partyNameY = detailsTop + 5;
  const addressStartY = partyNameY + 5;

  doc.setFont("helvetica", "bold");
  doc.text("M/s:", left + 2, partyNameY);
  doc.setFontSize(11);
  doc.text(upper(state.partyName) || "-", leftTextStartX, partyNameY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(upper(state.partyAddress) || "-", leftColMaxWidth);
  doc.text(addressLines, leftTextStartX, addressStartY);
  let leftNextY = addressStartY + ((addressLines.length - 1) * 4.5) + 4.5;
  if (state.partyGst) {
    doc.text(`GST: ${upper(state.partyGst)}`, leftTextStartX, leftNextY);
    leftNextY += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.text(`TRANSPORT : ${upper(state.transportName) || "-"}`, left + 2, leftNextY);

  const detailsBottom = Math.max(detailsMinBottom, leftNextY + 4);
  const detailsHeight = detailsBottom - detailsTop;

  doc.rect(130, detailsTop, 30, detailsHeight);
  doc.rect(160, detailsTop, 40, detailsHeight);
  doc.text("INVOICE", 145, detailsTop + 5, { align: "center" });
  doc.text("NO.", 145, detailsTop + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(upper(state.invoiceNo) || "-", 145, detailsTop + 19, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text("DATED", 180, detailsTop + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(state.invoiceDate || "-", 180, detailsTop + 19, { align: "center" });

  const taxRows = [];
  taxRows.push({ label: "LESS (-)", amount: state.lessAmt });
  taxRows.push({ label: "TOTAL", amount: state.taxableValue, bold: true });
  taxRows.push({ label: `CGST ${state.cgstRate}%`, amount: state.cgstAmt });
  taxRows.push({ label: `SGST ${state.sgstRate}%`, amount: state.sgstAmt });
  taxRows.push({ label: `IGST ${state.igstRate}%`, amount: state.igstAmt });

  const tableTop = detailsBottom;
  const footerTop = y + 265;
  const footerBottom = y + 275;
  const minSignHeight = 20;
  const summaryBottom = footerTop - minSignHeight;
  const summaryHeight = 9 + (taxRows.length * 7) + 10;
  const maxTableBottom = summaryBottom - summaryHeight;
  const minParticularsHeight = 24 + (state.items.length * 7);
  const targetParticularsHeight = 120;
  const particularsHeight = Math.max(minParticularsHeight, targetParticularsHeight);
  const tableBottom = Math.min(tableTop + particularsHeight, maxTableBottom);
  const summaryTop = tableBottom;

  doc.line(left, tableTop, right, tableTop);
  doc.line(left, tableBottom, right, tableBottom);

  const cols = [
    { x: left, w: 65, h: "PARTICULARS" },
    { x: 75, w: 20, h: "HSN" },
    { x: 95, w: 20, h: "QTY" },
    { x: 115, w: 15, h: "UNITS" },
    { x: 130, w: 30, h: "RATE" },
    { x: 160, w: 40, h: "AMOUNT" }
  ];

  cols.forEach((c, i) => {
    if (i > 0) doc.line(c.x, tableTop, c.x, tableBottom);
    doc.setFont("helvetica", "bold");
    doc.text(c.h, c.x + c.w / 2, tableTop + 5, { align: "center" });
  });
  doc.line(left, tableTop + 7, right, tableTop + 7);

  let rowY = tableTop + 14;
  doc.setFont("helvetica", "normal");
  state.items.forEach((item) => {
    if (rowY > tableBottom - 4) return;
    const symbolCenterX = left + 4.3;
    const symbolCenterY = rowY - 1.3;
    const itemLabel = upper(item.name) || "-";
    doc.circle(symbolCenterX, symbolCenterY, 2.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("K", symbolCenterX, symbolCenterY + 0.9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(itemLabel, left + 10.3, rowY);
    doc.text(upper(item.hsn) || "-", 85, rowY, { align: "center" });
    doc.text(String(item.qty || 0), 105, rowY, { align: "center" });
    doc.text("PCS", 122.5, rowY, { align: "center" });
    doc.text(money(item.rate), 145, rowY, { align: "center" });
    doc.text(money(item.amount), 180, rowY, { align: "center" });
    rowY += 7;
  });
  doc.line(left, summaryTop, right, summaryTop);

  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 42.5, summaryTop + 6, { align: "center" });
  doc.text(String(state.totalQty), 105, summaryTop + 6, { align: "center" });
  doc.text(money(state.subtotal), 198, summaryTop + 6, { align: "right" });
  doc.line(left, summaryTop + 9, right, summaryTop + 9);
  [75, 95, 115, 130, 160].forEach((x) => doc.line(x, summaryTop, x, summaryTop + 9));

  taxRows.forEach((row, idx) => {
    const lineY = summaryTop + 9 + ((idx + 1) * 7);
    const textY = summaryTop + 13 + (idx * 7);
    const displayAmount = money(row.amount);
    doc.line(130, lineY, right, lineY);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.text(row.label, 132, textY);
    doc.text(displayAmount, 198, textY, { align: "right" });
  });

  doc.setFont("helvetica", "bold");
  const grandTop = summaryTop + 9 + (taxRows.length * 7);
  doc.rect(130, grandTop, 70, 10);
  doc.text("G. TOTAL", 132, grandTop + 6);
  doc.text(money(state.grandTotal), 198, grandTop + 6, { align: "right" });
  const signTop = grandTop + 10;
  const signBottom = footerTop;
  doc.line(130, summaryTop, 130, signTop);

  doc.line(left, signTop, right, signTop);
  doc.line(left, signBottom, right, signBottom);
  doc.line(130, signTop, 130, signBottom);
  doc.setFont("helvetica", "bold");
  doc.text("SIGN", 70, signBottom - 3, { align: "center" });
  doc.text("STAMP", 165, signBottom - 3, { align: "center" });

  doc.line(left, footerTop, right, footerTop);
  doc.line(130, footerTop, 130, footerBottom);
  doc.setFont("helvetica", "bold");
  doc.text(FIXED.footerLeft, 70, footerTop + 6, { align: "center" });
  doc.text(FIXED.footerRight, 165, footerTop + 6, { align: "center" });

  return doc;
}

function previewPdf() {
  const doc = buildPdf(getState());
  const blob = doc.output("blob");

  if (activePreviewUrl) {
    URL.revokeObjectURL(activePreviewUrl);
  }
  activePreviewUrl = URL.createObjectURL(blob);

  if (isMobileDevice()) {
    els.pdfPreview.src = "about:blank";
    if (els.previewHint) {
      els.previewHint.textContent = "Phone preview opens in a new tab for better compatibility.";
    }
    window.open(activePreviewUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if (els.previewHint) {
    els.previewHint.textContent = "";
  }
  els.pdfPreview.src = activePreviewUrl;
}

function downloadPdf() {
  const s = getState();
  const doc = buildPdf(s);
  doc.save(`${s.fileName}.pdf`);
}

function resetForm() {
  els.pdfFileName.value = "";
  els.invoiceNo.value = "";
  els.invoiceDate.value = "";
  els.transportName.value = "";
  els.partyName.value = "";
  els.partyAddress.value = "";
  els.partyGst.value = "";
  els.less.value = "";
  els.cgst.value = "2.5";
  els.sgst.value = "2.5";
  els.igst.value = "0";
  els.itemsContainer.innerHTML = "";
  recalculate();
  previewPdf();
}

function init() {
  els.addItemBtn.addEventListener("click", () => {
    createItemRow();
    recalculate();
  });

  [els.less, els.cgst, els.sgst, els.igst, els.pdfFileName, els.invoiceNo, els.invoiceDate, els.transportName, els.partyName, els.partyAddress, els.partyGst]
    .forEach((el) => el.addEventListener("input", recalculate));

  els.previewBtn.addEventListener("click", previewPdf);
  els.downloadBtn.addEventListener("click", downloadPdf);
  els.resetBtn.addEventListener("click", resetForm);

  recalculate();
  previewPdf();
}

init();
