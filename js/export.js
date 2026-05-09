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
    const discState = { inputs, pvResult, fySummary, rouInitial: inputs.rouInitial, totalInterest: inputs.totalInterest, totalDep: inputs.totalDep, totalPayments: inputs.totalPayments, amortRows };
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

    // Param row — period rate = IBR / periodsPerYear  (matches JS periodicRate() exactly)
    const periodsPerYear = 12 / Utils.freqMonths[inputs.frequency];
    const periodRateVal  = inputs.roi / 100 / periodsPerYear;
    const pvParamRow = ws2.addRow([
      'Annual IBR (%)', inputs.roi / 100,
      `Period Rate (IBR ÷ ${periodsPerYear} periods/yr)`, periodRateVal,
      '', ''
    ]);
    styleParam(pvParamRow);
    pvParamRow.getCell(2).numFmt = '0.00%';
    pvParamRow.getCell(4).numFmt = '0.000000%';
    right(pvParamRow, [2, 4]);
    pvParamRow.height = 18;
    // D3 = period rate cell (same column used in DF formula and amort sheet)
    const RATE2_CELL = 'D3';

    const pvHdr = ws2.addRow(['#', 'Payment Date', 'Period (months)', 'Lease Payment (₹)', 'Discount Factor', 'Present Value (₹)']);
    styleHeader(pvHdr);
    const PV_DATA_START = 5;
    ws2.views = [{ state: 'frozen', ySplit: 4 }];

    pvResult.schedule.forEach((r, idx) => {
      const rn  = PV_DATA_START + idx;
      // Period number: 1, 2, 3 … (end-of-period) or 0, 1, 2 … (beginning-of-period)
      // DF = 1 / (1 + period_rate)^n  — identical to Excel =PV() convention
      const n = inputs.paymentTiming === 'beginning' ? idx : idx + 1;
      const row = ws2.addRow([
        r.index,
        Utils.fmtDate(r.date),
        n,                                          // Period # as exponent
        r.payment,
        f(`=1/(1+$${RATE2_CELL})^${n}`),           // DF = 1/(1+period_rate)^n
        f(`=D${rn}*E${rn}`)                        // PV = Payment × DF
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

    // Period rate = IBR / periods_per_year (stored in D3 for formula reference)
    const amPeriodsPerYear = 12 / Utils.freqMonths[inputs.frequency];
    const amPeriodRate     = inputs.roi / 100 / amPeriodsPerYear;
    const amParamRow = ws3.addRow([
      'Annual IBR (%)', inputs.roi / 100,
      `Period Rate (IBR ÷ ${amPeriodsPerYear})`, amPeriodRate,
      'Timing', inputs.paymentTiming
    ]);
    styleParam(amParamRow);
    amParamRow.getCell(2).numFmt = '0.00%';
    amParamRow.getCell(4).numFmt = '0.000000%';
    amParamRow.height = 18;
    const AM_PERIOD_RATE = 'D3'; // period rate cell — used in interest formula

    const amHdr = ws3.addRow(['#', 'Date', 'FY', 'Months', 'Rate', 'Opening Balance (₹)', 'Interest (₹)', 'Payment (₹)', 'Closing Balance (₹)']);
    styleHeader(amHdr);
    const AM_DATA_START = 5;
    ws3.views = [{ state: 'frozen', ySplit: 4 }];

    amortRows.forEach((r, idx) => {
      const rn = AM_DATA_START + idx;
      const openBalCell = idx === 0
        ? r.openBal                          // first row: hardcoded initial PV
        : f(`=I${rn - 1}`);                  // subsequent: previous closing balance (I is col 9)

      // Interest = Opening × period_rate  (effective interest method, one multiplication)
      // $D$3 = period rate (IBR / periods_per_year)
      // For beginning-of-period: interest accrues on (Opening − Payment)
      const isBeg = inputs.paymentTiming === 'beginning';
      const intFormula = isBeg
        ? f(`=ROUND(MAX(0,F${rn}-H${rn})*$${AM_PERIOD_RATE}, 2)`)
        : f(`=ROUND(F${rn}*$${AM_PERIOD_RATE}, 2)`);

      // Closing balance: max(0, Open(F) + Int(G) - Pmt(H))
      const isLast = idx === amortRows.length - 1;
      const closeFormula = isLast ? 0 : f(`=MAX(0,F${rn}+G${rn}-H${rn})`);

      const row = ws3.addRow([
        r.index, Utils.fmtDate(r.date), r.fy,
        r.months, r.ratePct / 100,   // E = annual rate (display only)
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

    /* ── 8. DISCLOSURE NOTES (Ind AS 116 Para 52-60) ── */
    const ws8 = wb.addWorksheet('Disclosure Notes', { tabColor: { argb: 'FF6366F1' } });
    ws8.columns = [{ width: 42 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }];
    addTitle(ws8, 'Disclosure Notes – Ind AS 116 (Para 52–60)', 6);
    addSub(ws8, `Lease: ${name}   |   Generated: ${new Date().toLocaleDateString('en-IN')} by CA JIMI R MODI`, 6);
    ws8.addRow([]);

    // Helper: section heading in disclosure sheet
    const dSec = (ws, title) => {
      const r = ws.addRow([title]);
      r.height = 22;
      const c = r.getCell(1);
      c.font = { name: FONT, bold: true, size: 11, color: { argb: C.navyFg } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyBg } };
      c.alignment = { vertical: 'middle', horizontal: 'left' };
      ws.mergeCells(r.number, 1, r.number, 6);
      ws.addRow([]);
      return r;
    };
    const dText = (ws, text) => {
      const r = ws.addRow([text]);
      r.height = 40;
      const c = r.getCell(1);
      c.font = { name: FONT, size: 9, color: { argb: C.textMid } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.alt1 } };
      c.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      ws.mergeCells(r.number, 1, r.number, 6);
      ws.addRow([]);
    };
    const dTableHdr = (ws, cols) => {
      const r = ws.addRow(cols);
      styleHeader(r, C.tealBg, C.tealFg);
      r.height = 20;
      return r;
    };
    const dTableRow = (ws, vals, idx) => {
      const r = ws.addRow(vals);
      styleData(r, idx);
      vals.forEach((v, i) => {
        if (typeof v === 'number') {
          r.getCell(i + 1).numFmt = NUM_INR;
          r.getCell(i + 1).alignment = { ...r.getCell(i + 1).alignment, horizontal: 'right' };
        }
      });
      return r;
    };
    ws8.views = [{ state: 'frozen', ySplit: 2 }];

    // ── Section 1: Accounting Policy
    dSec(ws8, '1. Accounting Policy – Leases (Ind AS 116)');
    dText(ws8, `The Company assesses at contract inception whether a contract is, or contains, a lease. The Company recognises a right-of-use (ROU) asset and a corresponding lease liability with respect to all lease arrangements in which it is the lessee, except for short-term leases (defined as leases with a term of 12 months or less) and leases of low-value assets.\n\nAt the commencement date of the lease, the Company recognises lease liabilities measured at the present value of lease payments to be made over the lease term. Lease payments are discounted using the incremental borrowing rate (IBR) of ${inputs.roi}% per annum applicable at the commencement date.\n\nThe right-of-use asset is initially measured at cost, comprising the initial measurement of the lease liability, any initial direct costs incurred, and an estimate of costs to dismantle and restore the underlying asset. ROU assets are depreciated on a straight-line basis over the lease term.`);

    // ── Section 2: Amounts Recognised in Financial Statements
    dSec(ws8, '2. Amounts Recognised in Financial Statements');
    // Balance Sheet table
    const bsHdrCols = ['Item', ...fySummary.map(r => r.fy)];
    dTableHdr(ws8, bsHdrCols);
    dTableRow(ws8, ['ROU Asset (Net)', ...fySummary.map(r => Utils.round2(r.rouCloseBV))], 0);
    dTableRow(ws8, ['Lease Liability – Non-Current', ...fySummary.map(r => Utils.round2(r.nonCurrentLiab))], 1);
    dTableRow(ws8, ['Lease Liability – Current', ...fySummary.map(r => Utils.round2(r.currentLiab))], 2);
    ws8.addRow([]);
    // P&L table
    const plLabelRow = ws8.addRow(['P&L Impact:']);
    plLabelRow.getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: C.textMain } };
    ws8.mergeCells(plLabelRow.number, 1, plLabelRow.number, 6);
    dTableHdr(ws8, ['Item', ...fySummary.map(r => r.fy)]);
    dTableRow(ws8, ['Interest on Lease Liability', ...fySummary.map(r => Utils.round2(r.interest))], 0);
    dTableRow(ws8, ['Depreciation of ROU Asset', ...fySummary.map(r => Utils.round2(r.dep))], 1);
    dTableRow(ws8, ['Total P&L Impact', ...fySummary.map(r => Utils.round2(r.interest + r.dep))], 2);
    ws8.addRow([]);

    // ── Section 3: Maturity Analysis (Para 58(b))
    dSec(ws8, '3. Maturity Analysis – Undiscounted Lease Payments (Para 58(b))');
    dTableHdr(ws8, ['Maturity Band', 'Undiscounted Payments (₹)']);
    const refDate = new Date();
    const matBands = [
      { label: 'Less than 1 year',  min: 0,  max: 12,       amount: 0 },
      { label: '1 – 2 years',       min: 12, max: 24,       amount: 0 },
      { label: '2 – 3 years',       min: 24, max: 36,       amount: 0 },
      { label: '3 – 5 years',       min: 36, max: 60,       amount: 0 },
      { label: 'More than 5 years', min: 60, max: Infinity, amount: 0 },
    ];
    amortRows.forEach(row => {
      const mo = Utils.monthsBetween(refDate, row.date);
      matBands.forEach(b => { if (mo >= b.min && mo < b.max) b.amount += row.payment; });
    });
    matBands.filter(b => b.amount > 0).forEach((b, idx) => {
      dTableRow(ws8, [b.label, Utils.round2(b.amount)], idx);
    });
    ws8.addRow([]);

    // ── Section 4: Key Assumptions
    dSec(ws8, '4. Key Assumptions & Judgements (Para 52)');
    const assumptions = [
      ['Lease Asset', inputs.leaseName || 'Not specified'],
      ['Lease Commencement', Utils.fmtDate(inputs.startDate)],
      ['Lease Expiry', Utils.fmtDate(inputs.endDate)],
      ['Lease Term', inputs.leaseTerm + ' months'],
      ['Periodic Payment', Utils.fmtNum(inputs.paymentAmount) + ' (' + Utils.freqLabel[inputs.frequency] + ')'],
      ['Incremental Borrowing Rate', inputs.roi + '% per annum'],
      ['Initial Lease Liability (PV)', Utils.fmtNum(pvResult.totalPV)],
      ['ROU Asset (at cost)', Utils.fmtNum(inputs.rouInitial)],
      ['Total Cash Outflow (Para 53(a))', Utils.fmtNum(inputs.totalPayments)],
      ['Total Finance Cost', Utils.fmtNum(inputs.totalInterest)],
      ['Depreciation Method', 'Straight-line over lease term'],
    ];
    dTableHdr(ws8, ['Parameter', 'Value']);
    assumptions.forEach(([k, v], idx) => { dTableRow(ws8, [k, v], idx); });
    ws8.addRow([]);

    // ── Section 5: Additional Mandatory Disclosures (Para 53-60)
    dSec(ws8, '5. Additional Mandatory Disclosures (Para 53–60)');
    // 5(a) FY-wise expense table
    const disc5aLabelRow = ws8.addRow(['5(a) Financial Year-wise Lease Expense Summary (Para 58(a)):']);
    disc5aLabelRow.getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: C.textMain } };
    ws8.mergeCells(disc5aLabelRow.number, 1, disc5aLabelRow.number, 6);
    dTableHdr(ws8, ['Financial Year', 'Interest Expense (₹)', 'Depreciation (₹)', 'Total Cash Outflow (₹)']);
    fySummary.forEach((r, idx) => dTableRow(ws8, [r.fy, Utils.round2(r.interest), Utils.round2(r.dep), Utils.round2(r.payments)], idx));
    ws8.addRow([]);
    // 5(b)-(g) Qualitative disclosures
    const qualDisc = [
      ['5(b) Short-term Lease Expense (Para 53(b)):', 'The Company does not have any leases with a lease term of 12 months or less that are accounted for under the short-term lease exemption. Accordingly, no short-term lease expense is recognised during the period. (Nil)'],
      ['5(c) Low-value Asset Lease Expense (Para 53(c)):', 'The Company does not have any leases of low-value assets that are accounted for under the low-value exemption. (Nil)'],
      ['5(d) Variable Lease Payments Not Included in Lease Liability (Para 53(d)):', 'There are no variable lease payments that do not depend on an index or rate and that are not included in the measurement of the lease liability. (Nil)'],
      ['5(e) Income from Sub-leasing (Para 53(e)):', 'The Company has not sub-leased any right-of-use assets during the period. (Nil)'],
      ['5(f) Future Cash Outflows Not Reflected in Lease Liability (Para 59):', 'The lease does not contain extension options, termination options, or residual value guarantees beyond those already included in the measurement of the lease liability. There are no potential cash outflows to which the lessee is exposed that are not already reflected in the lease liability recognised above.'],
      ['5(g) Managing Liquidity Risk from Leases (Para 60):', 'The Company manages its liquidity risk arising from lease obligations by maintaining adequate cash reserves and committed credit facilities. The maturity profile of undiscounted lease obligations is disclosed in Section 3 above.'],
    ];
    qualDisc.forEach(([heading, body], idx) => {
      const hr = ws8.addRow([heading]);
      hr.height = 20;
      const hc = hr.getCell(1);
      hc.font = { name: FONT, bold: true, size: 9, color: { argb: C.navyFg } };
      hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealBg } };
      hc.alignment = { vertical: 'middle', horizontal: 'left' };
      ws8.mergeCells(hr.number, 1, hr.number, 6);
      dText(ws8, body);
    });

    /* ── 9. DISCLAIMER SHEET ───────────────────── */
    const wsD = wb.addWorksheet('Disclaimer', { tabColor: { argb: 'FF7B341E' } });
    wsD.columns = [{ width: 110 }];

    const dTitle = wsD.addRow(['DISCLAIMER & TERMS OF USE']);
    dTitle.height = 30;
    const dTCell = dTitle.getCell(1);
    dTCell.font  = { name: FONT, bold: true, size: 14, color: { argb: C.navyFg } };
    dTCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B341E' } };
    dTCell.alignment = { vertical: 'middle', horizontal: 'left' };

    const dSub = wsD.addRow(['Ind AS 116 Lease Accounting Tool  |  CA Jimi R Modi — Practicing Chartered Accountant']);
    dSub.height = 18;
    const dSCell = dSub.getCell(1);
    dSCell.font  = { name: FONT, size: 9, italic: true, color: { argb: C.navyFg } };
    dSCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealBg } };
    dSCell.alignment = { vertical: 'middle', horizontal: 'left' };

    wsD.addRow([]);

    const dWarnRow = wsD.addRow(['\u26A0  IMPORTANT: Please read this disclaimer carefully before using this tool. Use of this tool constitutes your acceptance of the following terms and conditions.']);
    dWarnRow.height = 28;
    const dWCell = dWarnRow.getCell(1);
    dWCell.font  = { name: FONT, bold: true, size: 10, color: { argb: 'FF92400E' } };
    dWCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
    dWCell.border = { left: { style: 'thick', color: { argb: 'FFF59E0B' } } };
    dWCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    wsD.addRow([]);

    const CLAUSES = [
      ['1. General Purpose',
       'This Lease Accounting Tool has been developed by CA Jimi R Modi, Practicing Chartered Accountant, solely for general guidance and educational reference purposes in relation to the accounting treatment of leases under Indian Accounting Standard 116 (Ind AS 116). The Tool is intended to assist users in understanding and performing preliminary lease accounting computations only.'],
      ['2. Not a Substitute for Professional Advice',
       'The outputs generated by this Tool do not constitute professional accounting, legal, financial, or tax advice. Every lease arrangement has unique facts and circumstances. Users are strongly advised to consult a qualified Chartered Accountant or appropriate professional before making any accounting decisions, financial disclosures, or regulatory filings based on the results of this Tool.'],
      ['3. Limitation of Liability',
       'CA Jimi R Modi, and any associates or contributors, shall not be held liable for any direct, indirect, incidental, consequential, or special loss or damage arising out of or in connection with the use of, or reliance upon, the information or computations generated by this Tool, including but not limited to errors, omissions, inaccuracies, or misinterpretation of Ind AS 116 provisions.'],
      ['4. User Responsibility',
       'The user assumes full and sole responsibility for verifying the accuracy of all inputs entered into the Tool and for validating all outputs against applicable standards, notifications, and circulars issued by the Ministry of Corporate Affairs (MCA) and any other relevant regulatory authority. The user is solely responsible for all decisions made based on results generated by this Tool.'],
      ['5. Accuracy & Updates',
       'While reasonable care has been taken in designing this Tool based on the provisions of Ind AS 116 as currently in force, no warranty or representation, express or implied, is made as to the completeness, accuracy, reliability, suitability, or availability of the Tool or the computations it generates. Accounting standards may be subject to amendments and the Tool may not reflect such subsequent changes.'],
      ['6. No Client-Professional Relationship',
       'Use of this Tool does not create or imply any client-professional relationship between the user and CA Jimi R Modi. The outputs of this Tool shall not be construed as an opinion, certification, or attestation by CA Jimi R Modi in any professional capacity.'],
      ['7. Intellectual Property',
       'This Tool, including its design, logic, and structure, is the intellectual property of CA Jimi R Modi. Reproduction, redistribution, or commercial use of this Tool without prior written permission is strictly prohibited.'],
    ];

    CLAUSES.forEach(([heading, body], idx) => {
      const hRow = wsD.addRow([heading]);
      hRow.height = 20;
      const hCell = hRow.getCell(1);
      hCell.font  = { name: FONT, bold: true, size: 10, color: { argb: C.navyFg } };
      hCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyBg } };
      hCell.alignment = { vertical: 'middle', horizontal: 'left' };

      const bRow = wsD.addRow([body]);
      bRow.height = 52;
      const bCell = bRow.getCell(1);
      bCell.font  = { name: FONT, size: 10, color: { argb: 'FF334155' } };
      bCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? C.alt1 : C.alt2 } };
      bCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      wsD.addRow([]);
    });

    const dFoot = wsD.addRow(['\u00A9 CA Jimi R Modi — Practicing Chartered Accountant  |  Ind AS 116 Lease Accounting Tool']);
    const dFCell = dFoot.getCell(1);
    dFCell.font  = { name: FONT, bold: true, size: 10, color: { argb: C.navyFg } };
    dFCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealBg } };
    dFCell.alignment = { vertical: 'middle', horizontal: 'center' };

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
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-IN') + ' by CA JIMI R MODI', PAGE_W / 2, 72, { align: 'center' });

    // ── Cover page lease info card (page 1) ──
    doc.setFillColor(255, 255, 255); doc.roundedRect(20, 85, PAGE_W - 40, 90, 4, 4, 'F');
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

    // ── Disclaimer – separate page 2 ──
    doc.addPage();
    doc.setFillColor(240, 249, 255); doc.rect(0, 0, PAGE_W, doc.internal.pageSize.getHeight(), 'F');
    doc.setFillColor(...DARK); doc.rect(0, 0, PAGE_W, 22, 'F');
    doc.setTextColor(...ACCENT); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('DISCLAIMER & TERMS OF USE', 10, 14);
    doc.setTextColor(150, 160, 190); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('CA Jimi R Modi — Ind AS 116 Lease Accounting Tool', PAGE_W - 10, 14, { align: 'right' });

    const WARN_TEXT = '\u26A0  IMPORTANT: Please read this disclaimer carefully before using this tool. Use of this tool constitutes your acceptance of the following terms and conditions.';
    doc.setFillColor(255, 248, 225); doc.rect(10, 26, PAGE_W - 20, 10, 'F');
    doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.8); doc.line(10, 26, 10, 36);
    doc.setTextColor(146, 64, 14); doc.setFontSize(7.5); doc.setFont('helvetica', 'bolditalic');
    doc.text(WARN_TEXT, 13, 32, { maxWidth: PAGE_W - 26 });

    const dClauses = [
      ['1. General Purpose', 'This Lease Accounting Tool has been developed by CA Jimi R Modi, Practicing Chartered Accountant, solely for general guidance and educational reference purposes in relation to the accounting treatment of leases under Indian Accounting Standard 116 (Ind AS 116). The Tool is intended to assist users in understanding and performing preliminary lease accounting computations only.'],
      ['2. Not a Substitute for Professional Advice', 'The outputs generated by this Tool do not constitute professional accounting, legal, financial, or tax advice. Every lease arrangement has unique facts and circumstances. Users are strongly advised to consult a qualified Chartered Accountant or appropriate professional before making any accounting decisions.'],
      ['3. Limitation of Liability', 'CA Jimi R Modi, and any associates or contributors, shall not be held liable for any direct, indirect, incidental, consequential, or special loss or damage arising out of or in connection with the use of, or reliance upon, the information or computations generated by this Tool.'],
      ['4. User Responsibility', 'The user assumes full and sole responsibility for verifying the accuracy of all inputs and for validating all outputs against applicable standards, notifications, and circulars issued by the Ministry of Corporate Affairs (MCA). The user is solely responsible for all decisions made based on results generated.'],
      ['5. Accuracy & Updates', 'While reasonable care has been taken in designing this Tool, no warranty or representation, express or implied, is made as to the completeness, accuracy, reliability, suitability, or availability of the Tool or its computations. Accounting standards may be subject to amendments and the Tool may not reflect such changes.'],
      ['6. No Client-Professional Relationship', 'Use of this Tool does not create or imply any client-professional relationship between the user and CA Jimi R Modi. The outputs shall not be construed as an opinion, certification, or attestation by CA Jimi R Modi in any professional capacity.'],
      ['7. Intellectual Property', 'This Tool, including its design, logic, and structure, is the intellectual property of CA Jimi R Modi. Reproduction, redistribution, or commercial use without prior written permission is strictly prohibited.'],
    ];

    let dy = 42;
    dClauses.forEach(([h, b]) => {
      doc.setFillColor(2, 132, 199); doc.rect(10, dy, PAGE_W - 20, 6, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(h, 13, dy + 4);
      dy += 7;
      doc.setFillColor(240, 249, 255); doc.rect(10, dy, PAGE_W - 20, 12, 'F');
      doc.setTextColor(51, 65, 85); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(b, 13, dy + 4, { maxWidth: PAGE_W - 26 });
      dy += 14;
    });

    // Disclaimer footer bar
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...DARK); doc.rect(0, ph - 12, PAGE_W, 12, 'F');
    doc.setTextColor(...ACCENT); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text('\u00A9 CA Jimi R Modi — Practicing Chartered Accountant  |  Ind AS 116 Lease Accounting Tool', PAGE_W / 2, ph - 4, { align: 'center' });

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
        Math.round(r.months),
        r.ratePct + '%', Utils.fmtNum(r.openBal), Utils.fmtNum(r.interest), Utils.fmtNum(r.payment), Utils.fmtNum(r.closeBal)]), ..._pdfTableStyle(DARK, ACCENT) });
    y = addPage('ROU Asset – Depreciation');
    doc.autoTable({ startY: y, theme: 'grid', head: [['FY', 'Opening BV (₹)', 'Depreciation (₹)', 'Closing BV (₹)']], body: rouRows.map(r => [r.fy, Utils.fmtNum(r.openBV), Utils.fmtNum(r.dep), Utils.fmtNum(r.closeBV)]), ..._pdfTableStyle(DARK, ACCENT) });
    y = addPage('Financial Year Summary');
    doc.autoTable({ startY: y, theme: 'grid', head: [['FY', 'Open Liab', 'Interest', 'Payments', 'Close Liab', 'Current', 'Non-Current', 'Dep', 'ROU BV']], body: fySummary.map(r => [r.fy, Utils.fmtNum(r.openBal), Utils.fmtNum(r.interest), Utils.fmtNum(r.payments), Utils.fmtNum(r.closeBal), Utils.fmtNum(r.currentLiab), Utils.fmtNum(r.nonCurrentLiab), Utils.fmtNum(r.dep), Utils.fmtNum(r.rouCloseBV)]), ..._pdfTableStyle(DARK, ACCENT) });
    y = addPage('Journal Entries');
    const jb = []; fyJournals.forEach(({ fy, entries }) => entries.forEach(entry => entry.lines.forEach(line => jb.push([fy, entry.label, line.account, line.dr ? Utils.fmtNum(line.dr) : '', line.cr ? Utils.fmtNum(line.cr) : '']))));
    doc.autoTable({ startY: y, theme: 'grid', head: [['FY', 'Entry', 'Account', 'Dr (₹)', 'Cr (₹)']], body: jb, ..._pdfTableStyle(DARK, ACCENT) });

    // ── Disclosure Notes Page ──
    doc.addPage();
    doc.setFillColor(240, 249, 255); doc.rect(0, 0, PAGE_W, doc.internal.pageSize.getHeight(), 'F');
    doc.setFillColor(...DARK); doc.rect(0, 0, PAGE_W, 22, 'F');
    doc.setTextColor(...ACCENT); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Disclosure Notes – Ind AS 116 (Para 52–60)', 10, 14);
    doc.setTextColor(150, 160, 190); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(leaseName || '', PAGE_W - 10, 14, { align: 'right' });

    let discY = 28;
    const discSec = (title) => {
      doc.setFillColor(2, 132, 199); doc.rect(10, discY, PAGE_W - 20, 7, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text(title, 13, discY + 5); discY += 9;
    };
    const discBody = (text) => {
      doc.setFillColor(240, 249, 255); doc.rect(10, discY, PAGE_W - 20, 14, 'F');
      doc.setTextColor(51, 65, 85); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(text, 13, discY + 4, { maxWidth: PAGE_W - 26 }); discY += 16;
    };

    discSec('1. Accounting Policy – Leases (Ind AS 116)');
    discBody(`The Company recognises a right-of-use (ROU) asset and a corresponding lease liability at the commencement date. Lease liabilities are measured at the present value of lease payments discounted at the IBR of ${inputs.roi}% p.a. ROU assets are depreciated on a straight-line basis over the lease term.`);

    discSec('2. Amounts Recognised in Financial Statements');
    const bsHead2 = [['Item', ...fySummary.map(r => r.fy)]];
    const bsBody2 = [
      ['ROU Asset (Net)', ...fySummary.map(r => Utils.fmtNum(r.rouCloseBV))],
      ['Lease Liability – Non-Current', ...fySummary.map(r => Utils.fmtNum(r.nonCurrentLiab))],
      ['Lease Liability – Current', ...fySummary.map(r => Utils.fmtNum(r.currentLiab))],
      ['Interest Expense', ...fySummary.map(r => Utils.fmtNum(r.interest))],
      ['Depreciation of ROU Asset', ...fySummary.map(r => Utils.fmtNum(r.dep))],
    ];
    doc.autoTable({ startY: discY, theme: 'grid', head: bsHead2, body: bsBody2, ..._pdfTableStyle(DARK, ACCENT) });
    discY = doc.lastAutoTable.finalY + 6;

    discSec('3. Maturity Analysis – Undiscounted Lease Payments (Para 58(b))');
    const refDt = new Date();
    const pdfBands = [
      { label: 'Less than 1 year',  min: 0,  max: 12,       amount: 0 },
      { label: '1 – 2 years',       min: 12, max: 24,       amount: 0 },
      { label: '2 – 3 years',       min: 24, max: 36,       amount: 0 },
      { label: '3 – 5 years',       min: 36, max: 60,       amount: 0 },
      { label: 'More than 5 years', min: 60, max: Infinity, amount: 0 },
    ];
    amortRows.forEach(row => { const mo = Utils.monthsBetween(refDt, row.date); pdfBands.forEach(b => { if (mo >= b.min && mo < b.max) b.amount += row.payment; }); });
    doc.autoTable({ startY: discY, theme: 'grid', head: [['Maturity Band', 'Undiscounted Payments (₹)']], body: pdfBands.filter(b => b.amount > 0).map(b => [b.label, Utils.fmtNum(Utils.round2(b.amount))]), ..._pdfTableStyle(DARK, ACCENT) });
    discY = doc.lastAutoTable.finalY + 6;

    discSec('4. Key Assumptions & Judgements (Para 52)');
    doc.autoTable({
      startY: discY, theme: 'grid',
      head: [['Parameter', 'Value']],
      body: [
        ['Lease Asset', inputs.leaseName || 'Not specified'],
        ['Lease Commencement', Utils.fmtDate(inputs.startDate)],
        ['Lease Expiry', Utils.fmtDate(inputs.endDate)],
        ['Lease Term', inputs.leaseTerm + ' months'],
        ['Periodic Payment', Utils.freqLabel[inputs.frequency] + ' @ ₹' + Utils.fmtNum(inputs.paymentAmount)],
        ['IBR', inputs.roi + '% per annum'],
        ['Initial Lease Liability (PV)', '₹' + Utils.fmtNum(pvResult.totalPV)],
        ['ROU Asset (at cost)', '₹' + Utils.fmtNum(inputs.rouInitial)],
        ['Total Cash Outflow (Para 53(a))', '₹' + Utils.fmtNum(inputs.totalPayments)],
        ['Total Finance Cost', '₹' + Utils.fmtNum(inputs.totalInterest)],
        ['Depreciation Method', 'Straight-line over lease term'],
      ],
      ..._pdfTableStyle(DARK, ACCENT)
    });
    discY = doc.lastAutoTable.finalY + 6;

    if (discY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      doc.setFillColor(240, 249, 255); doc.rect(0, 0, PAGE_W, doc.internal.pageSize.getHeight(), 'F');
      discY = 15;
    }
    discSec('5. Additional Mandatory Disclosures (Para 53–60)');
    discBody('5(b) Short-term Lease Expense (Para 53(b)): The Company does not have leases ≤12 months under the short-term exemption. (Nil)');
    discBody('5(c) Low-value Asset Lease Expense (Para 53(c)): The Company does not have leases of low-value assets under the low-value exemption. (Nil)');
    discBody('5(d) Variable Lease Payments Not in Lease Liability (Para 53(d)): No variable payments outside the measurement of the lease liability. (Nil)');
    discBody('5(e) Income from Sub-leasing (Para 53(e)): The Company has not sub-leased any ROU assets during the period. (Nil)');
    discBody('5(f) Future Cash Outflows Not in Lease Liability (Para 59): No extension options, termination options, or residual value guarantees beyond those included in the lease liability.');
    discBody('5(g) Liquidity Risk from Leases (Para 60): The Company manages liquidity risk from lease obligations by maintaining adequate cash reserves. The maturity profile is disclosed in Section 3 above.');
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
