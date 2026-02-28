const { jsPDF } = window.jspdf;

const FIXED = {
  title: "TAX INVOICE",
  company: "NAVKAR CREATION",
  address: "549, UPPER GROUND, ASHOKA TOWER RING ROAD, SURAT-395002",
  gstin: "24AGTPK1703F1ZM",
  mobile: "M: 903816277, 9974060799",
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
  pdfPreview: document.getElementById("pdfPreview"),
  previewHint: document.getElementById("previewHint"),
  pdfFileName: document.getElementById("pdfFileName"),
  invoiceNo: document.getElementById("invoiceNo"),
  invoiceDate: document.getElementById("invoiceDate"),
  transportName: document.getElementById("transportName"),
  partyName: document.getElementById("partyName"),
  partyAddress: document.getElementById("partyAddress"),
  partyGst: document.getElementById("partyGst"),
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
      <input type="text" class="item-name" placeholder="e.g. K JAL - PARI" value="${item.name || ""}" required />
    </label>
    <label class="item-field">
      <span>HSN Code</span>
      <input type="text" class="item-hsn" placeholder="e.g. 5407" value="${item.hsn || ""}" />
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
      hsn: row.querySelector(".item-hsn").value.trim(),
      qty,
      rate,
      amount
    };
  });
}

function getState() {
  const items = getItems();
  const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const cgstAmt = subtotal * (toNum(els.cgst.value) / 100);
  const sgstAmt = subtotal * (toNum(els.sgst.value) / 100);
  const igstAmt = subtotal * (toNum(els.igst.value) / 100);
  const grandTotal = subtotal + cgstAmt + sgstAmt + igstAmt;

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
    cgstRate: toNum(els.cgst.value),
    sgstRate: toNum(els.sgst.value),
    igstRate: toNum(els.igst.value),
    cgstAmt,
    sgstAmt,
    igstAmt,
    grandTotal,
    totalQty: items.reduce((s, i) => s + i.qty, 0)
  };
}

function recalculate() {
  const s = getState();
  els.totalsView.innerHTML = `
    <div class="total-line"><span>Subtotal</span><span>${money(s.subtotal)}</span></div>
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

  doc.setFontSize(10);
  doc.text(FIXED.company, 105, y + 15, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(FIXED.address, 105, y + 20, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN NO: ${FIXED.gstin}`, 105, y + 25, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(FIXED.mobile, 105, y + 30, { align: "center" });
  doc.line(left, y + 33, right, y + 33);

  doc.setFont("helvetica", "bold");
  doc.text("M/s:", left + 2, y + 38);
  doc.text(state.partyName || "-", left + 18, y + 38);
  doc.setFont("helvetica", "normal");
  doc.text(state.partyAddress || "-", left + 18, y + 44);
  if (state.partyGst) {
    doc.text(`GST: ${state.partyGst}`, left + 18, y + 50);
  }
  doc.setFont("helvetica", "bold");
  doc.text(`TRANSPORT : ${state.transportName || "-"}`, left + 2, y + 56);

  doc.rect(130, y + 33, 35, 27);
  doc.rect(165, y + 33, 35, 27);
  doc.text("INVOICE", 147.5, y + 38, { align: "center" });
  doc.text("NO.", 147.5, y + 43, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(state.invoiceNo || "-", 147.5, y + 52, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text("DATED", 182.5, y + 38, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(state.invoiceDate || "-", 182.5, y + 52, { align: "center" });

  const tableTop = y + 60;
  const tableBottom = y + 245;

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
    if (rowY > tableBottom - 45) return;
    doc.text(item.name || "-", left + 2, rowY);
    doc.text(item.hsn || "-", 85, rowY, { align: "center" });
    doc.text(String(item.qty || 0), 105, rowY, { align: "center" });
    doc.text("PCS", 122.5, rowY, { align: "center" });
    doc.text(money(item.rate), 145, rowY, { align: "center" });
    doc.text(money(item.amount), 180, rowY, { align: "center" });
    rowY += 7;
  });

  const summaryTop = tableBottom - 30;
  doc.line(left, summaryTop, right, summaryTop);

  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 42.5, summaryTop + 6, { align: "center" });
  doc.text(String(state.totalQty), 105, summaryTop + 6, { align: "center" });
  doc.text(money(state.subtotal), 180, summaryTop + 6, { align: "center" });

  doc.line(130, summaryTop + 9, right, summaryTop + 9);
  doc.line(130, summaryTop + 16, right, summaryTop + 16);
  doc.line(130, summaryTop + 23, right, summaryTop + 23);

  doc.setFont("helvetica", "normal");
  doc.text(`CGST ${state.cgstRate}%`, 132, summaryTop + 13);
  doc.text(money(state.cgstAmt), 198, summaryTop + 13, { align: "right" });
  doc.text(`SGST ${state.sgstRate}%`, 132, summaryTop + 20);
  doc.text(money(state.sgstAmt), 198, summaryTop + 20, { align: "right" });
  doc.text(`IGST ${state.igstRate}%`, 132, summaryTop + 27);
  doc.text(money(state.igstAmt), 198, summaryTop + 27, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.rect(130, summaryTop + 30, 70, 10);
  doc.text("G. TOTAL", 132, summaryTop + 36);
  doc.text(money(state.grandTotal), 198, summaryTop + 36, { align: "right" });

  doc.line(left, y + 265, right, y + 265);
  doc.line(130, y + 265, 130, y + 275);
  doc.text(FIXED.footerLeft, 70, y + 271, { align: "center" });
  doc.text(FIXED.footerRight, 165, y + 271, { align: "center" });

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

function init() {
  els.invoiceDate.value = todayISO();

  createItemRow({ name: "K JAL - PARI", hsn: "5407", qty: 20, rate: 675 });
  createItemRow({ name: "K DOOR PARI", hsn: "5407", qty: 10, rate: 675 });

  els.addItemBtn.addEventListener("click", () => {
    createItemRow();
    recalculate();
  });

  [els.cgst, els.sgst, els.igst, els.pdfFileName, els.invoiceNo, els.invoiceDate, els.transportName, els.partyName, els.partyAddress, els.partyGst]
    .forEach((el) => el.addEventListener("input", recalculate));

  els.previewBtn.addEventListener("click", previewPdf);
  els.downloadBtn.addEventListener("click", downloadPdf);

  recalculate();
  previewPdf();
}

init();
