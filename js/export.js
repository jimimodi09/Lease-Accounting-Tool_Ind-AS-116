/* ── export.js – Excel (multi-sheet, styled + formulas via ExcelJS) and PDF export ── */
'use strict';

const Export = (() => {

  /* ═══════════════════════════════════════════════════════════
     PALETTE & HELPERS
  ═══════════════════════════════════════════════════════════ */
  const C = {
    navyFg: 'FFFFFFFF', navyBg: 'FF0284C7', tealBg: 'FF0EA5E9', tealFg: 'FFFFFFFF',
    goldBg: 'FFE0F2FE', goldFg: 'FF0369A1', alt1: 'FFF0F9FF', alt2: 'FFFFFFFF',
    border: 'FFBAE6FD', paramBg: 'FFF0F9FF', paramFg: 'FF0369A1',
    textMain: 'FF0F172A', textMid: 'FF334155',
  };
  const FONT = 'Calibri';
  const NUM_INR = '"₹"#,##0.00';
  const NUM_PCT = '0.000000';

  const thinBorder = () => ({
    top: { style: 'thin', color: { argb: C.border } }, bottom: { style: 'thin', color: { argb: C.border } },
    left: { style: 'thin', color: { argb: C.border } }, right: { style: 'thin', color: { argb: C.border } },
  });
  const medBorder = (c) => ({
    top: { style: 'medium', color: { argb: c } }, bottom: { style: 'medium', color: { argb: c } },
    left: { style: 'medium', color: { argb: c } }, right: { style: 'medium', color: { argb: c } },
  });

  const styleHeader = (row, bg = C.navyBg, fg = C.navyFg) => {
    row.height = 22;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: FONT, bold: true, size: 10, color: { argb: fg } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder();
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };
  const styleData = (row, idx) => {
    row.height = 18;
    const bg = idx % 2 === 0 ? C.alt1 : C.alt2;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: FONT, size: 10, color: { argb: C.textMain } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder();
      cell.alignment = { vertical: 'middle' };
    });
  };
  const styleTotal = (row) => {
    row.height = 20;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: FONT, bold: true, size: 10, color: { argb: C.goldFg } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.goldBg } };
      cell.border = medBorder(C.goldBg);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };
  const styleParam = (row) => {
    row.height = 18;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: FONT, size: 9, italic: true, color: { argb: C.paramFg } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.paramBg } };
      cell.alignment = { vertical: 'middle' };
    });
  };
  const addTitle = (ws, text, nCols, bg = C.navyBg) => {
    const r = ws.addRow([text]);
    r.height = 26;
    const c = r.getCell(1);
    c.font = { name: FONT, bold: true, size: 13, color: { argb: C.navyFg } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    c.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.mergeCells(r.number, 1, r.number, nCols);
    return r;
  };
  const addSub = (ws, text, nCols) => {
    const r = ws.addRow([text]);
    r.height = 17;
    const c = r.getCell(1);
    c.font = { name: FONT, size: 9, color: { argb: C.navyFg } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealBg } };
    c.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.mergeCells(r.number, 1, r.number, nCols);
    return r;
  };
  const right = (row, cols) => cols.forEach(c => {
    row.getCell(c).alignment = { ...row.getCell(c).alignment, horizontal: 'right' };
  });
  const f = (formula) => ({ formula });   // shorthand for formula cell

  /* ═══════════════════════════════════════════════════════════
     EXCEL EXPORT
  ═══════════════════════════════════════════════════════════ */
  const toExcel = async (state) => {
    if (typeof ExcelJS === 'undefined') { alert('ExcelJS not loaded.'); return; }
    const { inputs, pvResult, amortRows, rouRows, fySummary, fyJournals, leaseName } = state;
    const name = leaseName || 'Lease';

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Ind AS 116 Lease Accounting Tool';
    wb.created = wb.modified = new Date();

    /* ── 1. SUMMARY ──────────────────────────────────────── */
    const ws1 = wb.addWorksheet('Summary', { tabColor: { argb: 'FF1ABC9C' } });
    ws1.columns = [{ width: 40 }, { width: 26 }, { width: 20 }];
    addTitle(ws1, 'Ind AS 116 – Lease Accounting Working Paper', 3);
    addSub(ws1, `Lease: ${name}   |   Generated: ${new Date().toLocaleDateString('en-IN')} by CA JIMI R MODI`, 3);
    ws1.addRow([]);

    const sumSec = (title) => {
      const r = ws1.addRow([title]);
      r.height = 20;
      const c = r.getCell(1);
      c.font = { name: FONT, bold: true, size: 10, color: { argb: C.navyFg } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealBg } };
      ws1.mergeCells(r.number, 1, r.number, 3);
    };
    const sumRow = (label, value, isMoney = false) => {
      const r = ws1.addRow([label, value]);
      r.height = 18;
      r.getCell(1).font = { name: FONT, size: 10, color: { argb: C.textMid } };
      r.getCell(2).font = { name: FONT, bold: true, size: 10, color: { argb: C.textMain } };
      if (isMoney) r.getCell(2).numFmt = NUM_INR;
      [1, 2].forEach(c => { r.getCell(c).border = thinBorder(); r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.alt1 } }; });
    };

    sumSec('LEASE DETAILS');
    sumRow('Lease Description', name);
    sumRow('Lease Start Date', inputs.leaseStart ? Utils.fmtDate(inputs.startDate) : '');
    sumRow('Lease End Date', inputs.leaseEnd ? Utils.fmtDate(inputs.endDate) : '');
    sumRow('Lease Term (months)', inputs.leaseTerm);
    sumRow('Payment Amount', inputs.paymentAmount, true);
    sumRow('Frequency', Utils.freqLabel[inputs.frequency]);
    sumRow('IBR / ROI', inputs.roi + '% p.a.');
    sumRow('Payment Timing', inputs.paymentTiming);

    ws1.addRow([]);
    sumSec('INITIAL RECOGNITION (Ind AS 116 Para 22-25)');
    sumRow('Initial Lease Liability (PV)', pvResult.totalPV, true);
    sumRow('Initial Direct Costs', inputs.initialDirectCosts || 0, true);
    sumRow('Less: Lease Incentives', inputs.leaseIncentives || 0, true);
    sumRow('Add: Restoration Costs', inputs.restorationCosts || 0, true);
    sumRow('ROU Asset (at cost)', inputs.rouInitial, true);

    ws1.addRow([]);
    sumSec('TOTALS OVER LEASE TERM');
    sumRow('Total Lease Payments', inputs.totalPayments, true);
    sumRow("Total Interest Expense → see 'Amortisation Schedule'!E column", inputs.totalInterest, true);
    sumRow("Total Depreciation → see 'ROU Depreciation'!C column", inputs.totalDep, true);

    ws1.views = [{ state: 'frozen', ySplit: 2 }];

    /* ── 2. PV CALCULATION (with formulas) ───────────────── */
    const ws2 = wb.addWorksheet('PV Calculation', { tabColor: { argb: 'FF2E86C1' } });
    ws2.columns = [{ width: 6 }, { width: 20 }, { width: 16 }, { width: 24 }, { width: 18 }, { width: 22 }];

    addTitle(ws2, 'Present Value of Lease Payments', 6);
    addSub(ws2, `Lease: ${name}   |   IBR: ${inputs.roi}% p.a.   |   Frequency: ${Utils.freqLabel[inputs.frequency]}`, 6);

    // Param row — periodic rate (for formula reference)
    const pvParamRow = ws2.addRow([
      'Annual IBR (%)', inputs.roi / 100,
      'Frequency (periods/yr)', 12 / Utils.freqMonths[inputs.frequency],
      'Periodic Rate (= B3/D3)', { formula: '=B3/D3' }
    ]);
    styleParam(pvParamRow);
    pvParamRow.getCell(2).numFmt = '0.00%';
    pvParamRow.getCell(6).numFmt = '0.00000%';
    right(pvParamRow, [2, 4, 6]);
    pvParamRow.height = 18;
    const RATE2_CELL = 'F3';   // periodic rate cell for PV sheet

    const pvHdr = ws2.addRow(['#', 'Payment Date', 'Period (months)', 'Lease Payment (₹)', 'Discount Factor', 'Present Value (₹)']);
    styleHeader(pvHdr);
    const PV_DATA_START = 5;
    ws2.views = [{ state: 'frozen', ySplit: 4 }];

    pvResult.schedule.forEach((r, idx) => {
      const rn  = PV_DATA_START + idx;
      // n = period index: end-of-period = idx+1, beginning = idx
      const n   = inputs.paymentTiming === 'beginning' ? idx : idx + 1;
      const row = ws2.addRow([
        r.index,
        Utils.fmtDate(r.date),
        r.period,
        r.payment,
        f(`=1/(1+$${RATE2_CELL})^${n}`),  // Discount Factor formula
        f(`=D${rn}*E${rn}`)               // PV formula
      ]);
      styleData(row, idx);
      row.getCell(4).numFmt = NUM_INR;
      row.getCell(5).numFmt = NUM_PCT;
      row.getCell(6).numFmt = NUM_INR;
      right(row, [3, 4, 5, 6]);
    });

    const pvLastRow = PV_DATA_START + pvResult.schedule.length - 1;
    const pvTot = ws2.addRow([
      '', 'TOTAL', '',
      f(`=SUM(D${PV_DATA_START}:D${pvLastRow})`),
      '',
      f(`=SUM(F${PV_DATA_START}:F${pvLastRow})`)
    ]);
    styleTotal(pvTot);
    pvTot.getCell(4).numFmt = NUM_INR;
    pvTot.getCell(6).numFmt = NUM_INR;
    right(pvTot, [4, 6]);

    /* ── 3. AMORTISATION SCHEDULE (with formulas) ────────── */
    const ws3 = wb.addWorksheet('Amortisation Schedule', { tabColor: { argb: 'FF8E44AD' } });
    ws3.columns = [{ width: 6 }, { width: 16 }, { width: 12 }, { width: 8 }, { width: 10 }, { width: 20 }, { width: 20 }, { width: 18 }, { width: 20 }];

    addTitle(ws3, 'Lease Liability – Amortisation Schedule', 9);
    addSub(ws3, `Effective Interest Method (Ind AS 116 Para 36)   |   Lease: ${name}`, 9);

    const amParamRow = ws3.addRow([
      'Annual IBR (%)', inputs.roi / 100,
      'Timing', inputs.paymentTiming
    ]);
    styleParam(amParamRow);
    amParamRow.getCell(2).numFmt = '0.00%';
    amParamRow.height = 18;

    const amHdr = ws3.addRow(['#', 'Date', 'FY', 'Months', 'Rate', 'Opening Balance (₹)', 'Interest (₹)', 'Payment (₹)', 'Closing Balance (₹)']);
    styleHeader(amHdr);
    const AM_DATA_START = 5;
    ws3.views = [{ state: 'frozen', ySplit: 4 }];

    amortRows.forEach((r, idx) => {
      const rn = AM_DATA_START + idx;
      const openBalCell = idx === 0
        ? r.openBal                          // first row: hardcoded initial PV
        : f(`=I${rn - 1}`);                  // subsequent: previous closing balance (I is col 9)

      // Interest formula: OpenBal(F) * Rate(E) * (Months(D)/12)
      // IF beginning: (Open(F) - Pmt(H)) * Rate(E) * (Months(D)/12)
      const isBeg = inputs.paymentTiming === 'beginning';
      const intFormula = isBeg
        ? f(`=ROUND(MAX(0,F${rn}-H${rn})*E${rn}*(D${rn}/12), 2)`)
        : f(`=ROUND(F${rn}*E${rn}*(D${rn}/12), 2)`);

      // Closing balance: max(0, Open(F) + Int(G) - Pmt(H))
      const isLast = idx === amortRows.length - 1;
      const closeFormula = isLast ? 0 : f(`=MAX(0,F${rn}+G${rn}-H${rn})`);

      const row = ws3.addRow([
        r.index, Utils.fmtDate(r.date), r.fy,
        r.months, r.ratePct / 100, // E col is rate
        openBalCell, intFormula, r.payment, closeFormula
      ]);

      styleData(row, idx);
      row.getCell(5).numFmt = '0.00%'; // Rate
      [6, 7, 8, 9].forEach(c => { row.getCell(c).numFmt = NUM_INR; });
      right(row, [4, 5, 6, 7, 8, 9]);
    });

    const amLastRow = AM_DATA_START + amortRows.length - 1;
    const amTot = ws3.addRow([
      '', 'TOTAL', '', '', '', '',
      f(`=SUM(G${AM_DATA_START}:G${amLastRow})`),
      f(`=SUM(H${AM_DATA_START}:H${amLastRow})`),
      ''
    ]);
    styleTotal(amTot);
    amTot.getCell(7).numFmt = NUM_INR;
    amTot.getCell(8).numFmt = NUM_INR;
    right(amTot, [7, 8]);

    /* ── 4. ROU DEPRECIATION (with formulas) ─────────────── */
    const ws4 = wb.addWorksheet('ROU Depreciation', { tabColor: { argb: 'FFE67E22' } });
    ws4.columns = [{ width: 18 }, { width: 26 }, { width: 22 }, { width: 26 }];

    addTitle(ws4, 'Right-of-Use Asset – Depreciation Schedule', 4);
    addSub(ws4, `Straight-line over lease term (Ind AS 116 Para 31)   |   Lease: ${name}`, 4);

    const rouHdr = ws4.addRow(['Financial Year', 'Opening Book Value (₹)', 'Depreciation (₹)', 'Closing Book Value (₹)']);
    styleHeader(rouHdr);
    const ROU_DATA_START = 4;
    ws4.views = [{ state: 'frozen', ySplit: 3 }];

    rouRows.forEach((r, idx) => {
      const rn = ROU_DATA_START + idx;
      const openBV = idx === 0 ? r.openBV : f(`=D${rn - 1}`);   // chain from prev closeBV
      const closeBV = idx === rouRows.length - 1 ? 0 : f(`=B${rn}-C${rn}`);

      const row = ws4.addRow([r.fy, openBV, r.dep, closeBV]);
      styleData(row, idx);
      [2, 3, 4].forEach(c => { row.getCell(c).numFmt = NUM_INR; });
      right(row, [2, 3, 4]);
    });

    const rouLast = ROU_DATA_START + rouRows.length - 1;
    const rouTot = ws4.addRow(['TOTAL', '', f(`=SUM(C${ROU_DATA_START}:C${rouLast})`), '']);
    styleTotal(rouTot);
    rouTot.getCell(3).numFmt = NUM_INR;
    right(rouTot, [3]);

    /* ── 5. FY SUMMARY (with SUMIF / VLOOKUP formulas) ───── */
    const ws5 = wb.addWorksheet('FY Summary', { tabColor: { argb: 'FF27AE60' } });
    ws5.columns = [{ width: 14 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 18 }, { width: 20 }, { width: 18 }, { width: 20 }];

    addTitle(ws5, 'Financial Year-wise Summary', 9);
    addSub(ws5, `Balance Sheet & P&L classification per Ind AS 116   |   Lease: ${name}`, 9);

    const fyHdr = ws5.addRow(['FY', 'Opening Liability', 'Interest', 'Payments', 'Closing Liability', 'Current Portion', 'Non-Current Portion', 'Depreciation', 'ROU Book Value']);
    styleHeader(fyHdr);
    const FY_DATA_START = 4;
    ws5.views = [{ state: 'frozen', ySplit: 3 }];

    // SUMIF references to Amortisation Schedule (col C=FY, E=Interest, F=Payment)
    // VLOOKUP references to ROU Depreciation (col A=FY, C=Dep, D=CloseBV)
    fySummary.forEach((r, idx) => {
      const rn = FY_DATA_START + idx;
      const fyLabel = r.fy;    // e.g. "FY 2025-26"
      const row = ws5.addRow([
        fyLabel,
        r.openBal,   // opening liability kept as value (first match per FY is complex)
        f(`=IFERROR(SUMIF('Amortisation Schedule'!C:C,A${rn},'Amortisation Schedule'!G:G),0)`),
        f(`=IFERROR(SUMIF('Amortisation Schedule'!C:C,A${rn},'Amortisation Schedule'!H:H),0)`),
        r.closeBal,  // closing liability as value
        r.currentLiab,
        r.nonCurrentLiab,
        f(`=IFERROR(VLOOKUP(A${rn},'ROU Depreciation'!A:C,3,0),0)`),
        f(`=IFERROR(VLOOKUP(A${rn},'ROU Depreciation'!A:D,4,0),0)`)
      ]);
      styleData(row, idx);
      [2, 3, 4, 5, 6, 7, 8, 9].forEach(c => { row.getCell(c).numFmt = NUM_INR; });
      right(row, [2, 3, 4, 5, 6, 7, 8, 9]);
    });

    const fyLast = FY_DATA_START + fySummary.length - 1;
    const fyTot = ws5.addRow([
      'TOTAL', '',
      f(`=SUM(C${FY_DATA_START}:C${fyLast})`), f(`=SUM(D${FY_DATA_START}:D${fyLast})`),
      '', '', '',
      f(`=SUM(H${FY_DATA_START}:H${fyLast})`), ''
    ]);
    styleTotal(fyTot);
    [3, 4, 8].forEach(c => { fyTot.getCell(c).numFmt = NUM_INR; });
    right(fyTot, [3, 4, 8]);

    /* ── 6. JOURNAL ENTRIES ──────────────────────────────── */
    const ws6 = wb.addWorksheet('Journal Entries', { tabColor: { argb: 'FFC0392B' } });
    ws6.columns = [{ width: 12 }, { width: 32 }, { width: 36 }, { width: 22 }, { width: 22 }, { width: 50 }];

    addTitle(ws6, 'Journal Entries – Ind AS 116', 6);
    addSub(ws6, `Lease: ${name}`, 6);

    const jeHdr = ws6.addRow(['FY', 'Entry Type', 'Account', 'Dr (₹)', 'Cr (₹)', 'Narration']);
    styleHeader(jeHdr);
    ws6.views = [{ state: 'frozen', ySplit: 3 }];

    let jeIdx = 0;
    fyJournals.forEach(({ fy, entries }) => {
      entries.forEach(entry => {
        entry.lines.forEach(line => {
          const row = ws6.addRow([fy, entry.label, line.account, line.dr || '', line.cr || '', entry.narration]);
          styleData(row, jeIdx);
          if (line.dr) row.getCell(4).numFmt = NUM_INR;
          if (line.cr) row.getCell(5).numFmt = NUM_INR;
          right(row, [4, 5]);
          jeIdx++;
        });
      });
    });

    /* ── 7. MATURITY ANALYSIS ────────────────────────────── */
    const ws7 = wb.addWorksheet('Maturity Analysis', { tabColor: { argb: 'FF2C3E50' } });
    ws7.columns = [{ width: 30 }, { width: 28 }];

    addTitle(ws7, 'Maturity Analysis – Undiscounted Payments (Para 58(b))', 2);
    addSub(ws7, `Lease: ${name}`, 2);

    const matHdr = ws7.addRow(['Maturity Band', 'Undiscounted Payments (₹)']);
    styleHeader(matHdr);
    ws7.views = [{ state: 'frozen', ySplit: 3 }];

    const bands = [
      { label: 'Less than 1 year', min: 0, max: 12, amount: 0 },
      { label: '1 – 2 years', min: 12, max: 24, amount: 0 },
      { label: '2 – 3 years', min: 24, max: 36, amount: 0 },
      { label: '3 – 5 years', min: 36, max: 60, amount: 0 },
      { label: 'More than 5 years', min: 60, max: Infinity, amount: 0 },
    ];
    const today = new Date();
    amortRows.forEach(row => {
      const mo = Utils.monthsBetween(today, row.date);
      bands.forEach(b => { if (mo >= b.min && mo < b.max) b.amount += row.payment; });
    });

    const MAT_DATA_START = 4;
    let matCount = 0;
    bands.filter(b => b.amount > 0).forEach((b, idx) => {
      const row = ws7.addRow([b.label, Utils.round2(b.amount)]);
      styleData(row, idx); row.getCell(2).numFmt = NUM_INR; right(row, [2]);
      matCount++;
    });
    const matTot = ws7.addRow(['TOTAL', f(`=SUM(B${MAT_DATA_START}:B${MAT_DATA_START + matCount - 1})`)]);
    styleTotal(matTot); matTot.getCell(2).numFmt = NUM_INR; right(matTot, [2]);

    /* ── DOWNLOAD ──────────────────────────────────────────── */
    const safeName = (name || 'Lease').replace(/[^a-zA-Z0-9_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const fname = `IndAS116_${safeName}_Working_Paper.xlsx`;
    try {
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: fname });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Excel export failed:', e);
      alert('Excel export error: ' + e.message);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     PDF EXPORT (unchanged)
  ═══════════════════════════════════════════════════════════ */
  const toPDF = (state) => {
    if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') { alert('jsPDF not loaded.'); return; }
    const jsPDF = window.jspdf ? window.jspdf.jsPDF : jspdf.jsPDF;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { inputs, pvResult, amortRows, rouRows, fySummary, fyJournals, leaseName } = state;
    const PAGE_W = doc.internal.pageSize.getWidth();
    const DARK = [20, 23, 38], ACCENT = [79, 142, 247], WHITE = [232, 234, 240];

    const addPage = (title) => { doc.addPage(); _pdfHeader(doc, title, leaseName, PAGE_W, DARK, ACCENT, WHITE); return 30; };

    doc.setFillColor(240, 249, 255); doc.rect(0, 0, PAGE_W, doc.internal.pageSize.getHeight(), 'F'); // Sky 50 background
    doc.setTextColor(2, 132, 199); doc.setFontSize(22); doc.setFont('helvetica', 'bold'); // Sky 600
    doc.text('Ind AS 116 – Lease Accounting', PAGE_W / 2, 50, { align: 'center' });
    doc.setFontSize(14); doc.setTextColor(3, 105, 161); // Sky 700
    doc.text(leaseName || 'Working Paper', PAGE_W / 2, 62, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Generated: ' + new Date().toLocaleDateString('en-IN') + ' by CA JIMI R MODI', PAGE_W / 2, 72, { align: 'center' });

    doc.setFillColor(255, 255, 255); doc.roundedRect(20, 85, PAGE_W - 40, 90, 4, 4, 'F'); // White card
    doc.setTextColor(15, 23, 42); doc.setFontSize(9);
    const sl = [['Lease Start', Utils.fmtDate(inputs.startDate)], ['Lease End', Utils.fmtDate(inputs.endDate)],
      ['Term', inputs.leaseTerm + ' months'], ['IBR / ROI', inputs.roi + '% p.a.'],
      ['Frequency', Utils.freqLabel[inputs.frequency]], ['Initial Liability', '₹' + Utils.fmtNum(pvResult.totalPV)],
      ['ROU Asset', '₹' + Utils.fmtNum(inputs.rouInitial)], ['Total Interest', '₹' + Utils.fmtNum(inputs.totalInterest)],
      ['Total Payments', '₹' + Utils.fmtNum(inputs.totalPayments)]];
    sl.forEach(([k, v], i) => {
      const col = i % 3, row = Math.floor(i / 3), x = 28 + col * ((PAGE_W - 56) / 3);
      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text(k, x, 97 + row * 18);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(v, x, 104 + row * 18);
    });

    let y = addPage('Present Value Calculation');
    doc.autoTable({ startY: y, theme: 'grid', head: [['#', 'Date', 'Period', 'Payment (₹)', 'Discount Factor', 'PV (₹)']], body: pvResult.schedule.map(r => [r.index, Utils.fmtDate(r.date), r.period, Utils.fmtNum(r.payment), r.discountFactor.toFixed(6), Utils.fmtNum(r.pv)]), foot: [['', '', 'Total', Utils.fmtNum(pvResult.schedule.reduce((s, r) => s + r.payment, 0)), '', Utils.fmtNum(pvResult.totalPV)]], ..._pdfTableStyle(DARK, ACCENT) });
    y = addPage('Lease Liability Amortisation');
    doc.autoTable({
      startY: y,
      theme: 'grid',
      head: [
        ['#', 'Date', 'FY', 'Months', 'Rate', 'Opening (₹)', 'Interest (₹)', 'Payment (₹)', 'Closing (₹)']
      ],
      body: amortRows.map(r => [
        r.index,
        Utils.fmtDate(r.date),
        r.fy,
        r.months,
        r.ratePct + '%', Utils.fmtNum(r.openBal), Utils.fmtNum(r.interest), Utils.fmtNum(r.payment), Utils.fmtNum(r.closeBal)]), ..._pdfTableStyle(DARK, ACCENT) });
    y = addPage('ROU Asset – Depreciation');
    doc.autoTable({ startY: y, theme: 'grid', head: [['FY', 'Opening BV (₹)', 'Depreciation (₹)', 'Closing BV (₹)']], body: rouRows.map(r => [r.fy, Utils.fmtNum(r.openBV), Utils.fmtNum(r.dep), Utils.fmtNum(r.closeBV)]), ..._pdfTableStyle(DARK, ACCENT) });
    y = addPage('Financial Year Summary');
    doc.autoTable({ startY: y, theme: 'grid', head: [['FY', 'Open Liab', 'Interest', 'Payments', 'Close Liab', 'Current', 'Non-Current', 'Dep', 'ROU BV']], body: fySummary.map(r => [r.fy, Utils.fmtNum(r.openBal), Utils.fmtNum(r.interest), Utils.fmtNum(r.payments), Utils.fmtNum(r.closeBal), Utils.fmtNum(r.currentLiab), Utils.fmtNum(r.nonCurrentLiab), Utils.fmtNum(r.dep), Utils.fmtNum(r.rouCloseBV)]), ..._pdfTableStyle(DARK, ACCENT) });
    y = addPage('Journal Entries');
    const jb = []; fyJournals.forEach(({ fy, entries }) => entries.forEach(entry => entry.lines.forEach(line => jb.push([fy, entry.label, line.account, line.dr ? Utils.fmtNum(line.dr) : '', line.cr ? Utils.fmtNum(line.cr) : '']))));
    doc.autoTable({ startY: y, theme: 'grid', head: [['FY', 'Entry', 'Account', 'Dr (₹)', 'Cr (₹)']], body: jb, ..._pdfTableStyle(DARK, ACCENT) });
    const safeName = (leaseName || 'Lease').replace(/[^a-zA-Z0-9_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const fname = `IndAS116_${safeName}_Report.pdf`;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fname });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const _pdfHeader = (doc, title, lease, pw, dark, accent, white) => {
    doc.setFillColor(...dark); doc.rect(0, 0, pw, 22, 'F');
    doc.setTextColor(...accent); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Ind AS 116 – ' + title, 10, 14);
    doc.setTextColor(150, 160, 190); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(lease || '', pw - 10, 14, { align: 'right' });
  };
  const _pdfTableStyle = (dark, accent) => ({
    styles: { fontSize: 7, cellPadding: 2, textColor: [15, 23, 42], fillColor: [255, 255, 255], lineColor: [186, 230, 253] },
    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 249, 255] },
  });

  return { toExcel, toPDF };
})();
