/* ── template.js – Professional Excel template download (ExcelJS) ── */
'use strict';

const Template = (() => {

  /* ── Palette (matches export.js exactly) ── */
  const C = {
    navyBg:  'FF0284C7', navyFg:  'FFFFFFFF',
    tealBg:  'FF0EA5E9', tealFg:  'FFFFFFFF',
    goldBg:  'FFE0F2FE', goldFg:  'FF0369A1',
    alt1:    'FFF0F9FF', alt2:    'FFFFFFFF',
    border:  'FFBAE6FD',
    reqBg:   'FFFFF1F2', reqFg:   'FFB91C1C',   // required – soft red
    optBg:   'FFF0FDF4', optFg:   'FF166534',   // optional – soft green
    secBg:   'FFEFF6FF', secFg:   'FF1E40AF',   // section header – indigo
    inputBg: 'FFFFFDE7',                         // editable cell – light yellow
    warnBg:  'FFFFF3CD',
    textMain:'FF0F172A', textMid: 'FF334155',
    mutedFg: 'FF64748B',
  };
  const FONT    = 'Calibri';
  const NUM_INR = '"₹"#,##0.00';

  const thinBorder = () => ({
    top:    { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    left:   { style: 'thin', color: { argb: C.border } },
    right:  { style: 'thin', color: { argb: C.border } },
  });

  const medBorder = (argb) => ({
    top: { style: 'medium', color: { argb } }, bottom: { style: 'medium', color: { argb } },
    left: { style: 'medium', color: { argb } }, right: { style: 'medium', color: { argb } },
  });

  /* ── Field definitions – [label, defaultValue, notes, required(bool), type] ── */
  const SECTION_LEASE = [
    ['Lease Name / Asset Description',        '',         'e.g. Office Premises – Mumbai',                          true,  'text'],
    ['Lease Start Date',                       '',         'DD-MM-YYYY  e.g. 01-04-2024',                            true,  'date'],
    ['Lease End Date',                         '',         'DD-MM-YYYY  e.g. 31-03-2029',                            true,  'date'],
    ['Lease Term (months)',                    '',         'Auto-calculated from dates, or enter manually',           false, 'number'],
  ];
  const SECTION_PAYMENT = [
    ['Lease Payment Amount (₹)',              '',         'Base periodic payment; overridden by Payment Schedule if filled', true,  'amount'],
    ['Payment Frequency',                      'monthly',  'monthly | quarterly | halfyearly | yearly',               true,  'freq'],
    ['Payment Timing',                         'end',      'end = last day of period  |  beginning = first day',     true,  'timing'],
    ['Incremental Borrowing Rate (% p.a.)',    '',         'e.g. 10.5 (IBR per Ind AS 116 Para 26)',                  true,  'number'],
  ];
  const SECTION_OPTIONAL = [
    ['Initial Direct Costs (₹)',              '0',        'Legal fees, brokerage etc. (Para 24(a)) — enter 0 if none', false, 'amount'],
    ['Lease Incentives Received (₹)',          '0',        'Deducted from ROU asset (Para 24(b)) — enter 0 if none',  false, 'amount'],
    ['Restoration / Dismantling Costs (₹)',    '0',        'Estimated cost to restore asset (Para 24(d))',            false, 'amount'],
    ['Residual Value Guarantee (₹)',           '0',        'Amount guaranteed by lessee — added to last payment PV',  false, 'amount'],
    ['Financial Year Start (Month)',           '4',        '4 = April (Indian FY)  |  1 = January (Calendar Year)',  false, 'fystart'],
    ['Opening Lease Liability (₹)',            '',         'For Ind AS 116 transition or mid-term adoption only',    false, 'amount'],
  ];

  /**
   * Generate period rows from lease context.
   */
  const buildPeriodRows = (ctx) => {
    if (!ctx || !ctx.leaseStart || !ctx.leaseEnd) return [];
    const sd = Utils.parseDate(ctx.leaseStart);
    const ed = Utils.parseDate(ctx.leaseEnd);
    if (!sd || !ed || ed <= sd) return [];
    const termMonths = Utils.monthsBetween(sd, ed);
    const freq   = ctx.frequency || 'monthly';
    const timing = ctx.timing    || 'end';
    const pmt    = ctx.payment   || 0;
    const dates  = Calculator.generatePaymentDates(sd, freq, timing, termMonths);
    return dates.map((pd, i) => ({
      period:  i + 1,
      date:    Utils.toDateStr(pd.date),
      payment: pmt
    }));
  };

  /* ── Helper: style a cell ── */
  const sc = (cell, { bg, fg, bold = false, size = 10, italic = false, wrap = false, hAlign = 'left', vAlign = 'middle', numFmt, border = true } = {}) => {
    cell.font = { name: FONT, bold, size, italic, color: { argb: fg || C.textMain } };
    if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText: wrap };
    if (border) cell.border = thinBorder();
    if (numFmt) cell.numFmt = numFmt;
  };

  /* ── Helper: merge and style a section header row ── */
  const addSection = (ws, label, nCols, rowNum) => {
    const r = ws.addRow([label]);
    r.height = 20;
    ws.mergeCells(r.number, 1, r.number, nCols);
    sc(r.getCell(1), { bg: C.secBg, fg: C.secFg, bold: true, size: 9 });
    return r;
  };

  const downloadExcel = async (ctx) => {
    if (typeof ExcelJS === 'undefined') {
      alert('ExcelJS not loaded. Check your internet connection.'); return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'CA Jimi R Modi – Ind AS 116 Lease Accounting Tool';
    wb.created  = new Date();
    wb.modified = new Date();

    const safeName = (ctx && ctx.leaseName)
      ? ctx.leaseName.replace(/[^a-zA-Z0-9_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : 'Lease';

    /* ══════════════════════════════════════════════════════
       SHEET 1 — LEASE INPUTS
    ══════════════════════════════════════════════════════ */
    const ws1 = wb.addWorksheet('Lease Inputs', { tabColor: { argb: 'FF0EA5E9' } });
    ws1.columns = [
      { width: 42 },   // A – Field Name
      { width: 30 },   // B – Value (editable)
      { width: 12 },   // C – Required?
      { width: 62 },   // D – Notes / Instructions
    ];

    // ── Row 1: Tool Title ──
    const titleRow = ws1.addRow(['IND AS 116 – LEASE ACCOUNTING INPUT TEMPLATE', '', '', '']);
    titleRow.height = 32;
    ws1.mergeCells(1, 1, 1, 4);
    sc(titleRow.getCell(1), { bg: C.navyBg, fg: C.navyFg, bold: true, size: 14, border: false });

    // ── Row 2: Subtitle / Author ──
    const subRow = ws1.addRow([`CA JIMI R MODI  ·  Practicing Chartered Accountant  ·  Generated: ${Utils.toDateStr(new Date())}`, '', '', '']);
    subRow.height = 18;
    ws1.mergeCells(2, 1, 2, 4);
    sc(subRow.getCell(1), { bg: C.tealBg, fg: C.tealFg, size: 9, italic: true, border: false });

    // ── Row 3: Instruction banner ──
    const instrRow = ws1.addRow(['📝  Fill only the VALUE column (Column B). Do NOT edit Field names. Dates must be in DD-MM-YYYY format.', '', '', '']);
    instrRow.height = 22;
    ws1.mergeCells(3, 1, 3, 4);
    sc(instrRow.getCell(1), { bg: C.warnBg, fg: 'FF92400E', bold: true, size: 9, border: false });

    // ── Row 4: Blank spacer ──
    ws1.addRow([]);

    // ── Row 5: Column headers ──
    const colHdr = ws1.addRow(['FIELD NAME', 'VALUE  ← Enter here', 'REQUIRED?', 'NOTES & INSTRUCTIONS']);
    colHdr.height = 22;
    colHdr.eachCell((cell, col) => {
      sc(cell, { bg: C.navyBg, fg: C.navyFg, bold: true, size: 10, hAlign: col === 2 ? 'center' : 'left' });
    });

    ws1.views = [{ state: 'frozen', ySplit: 5 }];

    // ── Helper: add one input row ──
    let rowIdx = 0;
    const addInputRow = (ws, field, value, notes, required, type) => {
      const r = ws.addRow([field, value, required ? '✔ Yes' : 'Optional', notes]);
      r.height = 22;
      rowIdx++;

      // Col A – Field name
      sc(r.getCell(1), {
        bg: rowIdx % 2 === 0 ? C.alt1 : C.alt2,
        fg: C.textMid, size: 10,
      });

      // Col B – Value (editable, highlighted)
      sc(r.getCell(2), {
        bg: C.inputBg, fg: C.navyBg, bold: true, size: 10,
      });
      // Apply number format for amount fields
      if (type === 'amount' && value !== '') r.getCell(2).numFmt = NUM_INR;

      // Col C – Required badge
      sc(r.getCell(3), {
        bg: required ? C.reqBg : C.optBg,
        fg: required ? C.reqFg : C.optFg,
        bold: true, size: 9, hAlign: 'center',
      });

      // Col D – Notes
      sc(r.getCell(4), {
        bg: rowIdx % 2 === 0 ? C.alt1 : C.alt2,
        fg: C.mutedFg, size: 9, italic: true, wrap: true,
      });

      return r;
    };

    // Section: Lease Details
    addSection(ws1, '  📋  SECTION 1 — LEASE DETAILS', 4);
    SECTION_LEASE.forEach(([f, v, n, req, type]) => addInputRow(ws1, f, v, n, req, type));

    ws1.addRow([]);
    rowIdx++;

    // Section: Payment Parameters
    addSection(ws1, '  💰  SECTION 2 — PAYMENT PARAMETERS', 4);
    SECTION_PAYMENT.forEach(([f, v, n, req, type]) => addInputRow(ws1, f, v, n, req, type));

    ws1.addRow([]);
    rowIdx++;

    // Section: Optional Adjustments
    addSection(ws1, '  ⚙️  SECTION 3 — OPTIONAL ADJUSTMENTS (enter 0 if not applicable)', 4);
    SECTION_OPTIONAL.forEach(([f, v, n, req, type]) => addInputRow(ws1, f, v, n, req, type));

    // ── Data Validations ──
    // Find the row numbers of the dropdown fields
    // Payment Frequency is row 6+4+1 = row 11 (title5 + spacer4 + section1 + 4 lease rows + spacer + section2 = 5+1+1+4+1+1 = 13)
    // Let's do it by scanning: just apply to all rows — ExcelJS validation by address
    // Row layout: 1=title, 2=sub, 3=instr, 4=blank, 5=colhdr, 6=sec1, 7-10=lease, 11=blank, 12=sec2, 13-16=payment, 17=blank, 18=sec3, 19-24=optional
    const freqRow    = 13; // Payment Frequency
    const timingRow  = 14; // Payment Timing
    const fyStartRow = 23; // FY Start

    ws1.getCell(`B${freqRow}`).dataValidation = {
      type: 'list', allowBlank: false, showErrorMessage: true,
      formulae: ['"monthly,quarterly,halfyearly,yearly"'],
      errorTitle: 'Invalid Entry', error: 'Choose from: monthly | quarterly | halfyearly | yearly',
    };
    ws1.getCell(`B${timingRow}`).dataValidation = {
      type: 'list', allowBlank: false, showErrorMessage: true,
      formulae: ['"end,beginning"'],
      errorTitle: 'Invalid Entry', error: 'Choose: end (last day of period) or beginning (first day)',
    };
    ws1.getCell(`B${fyStartRow}`).dataValidation = {
      type: 'list', allowBlank: false, showErrorMessage: true,
      formulae: ['"4,1,7,10"'],
      errorTitle: 'Invalid Entry', error: 'Enter 4 (April-Indian FY), 1 (Jan), 7 (Jul) or 10 (Oct)',
    };

    // ── Footer row ──
    const footerRow = ws1.addRow(['© CA Jimi R Modi — Ind AS 116 Lease Accounting Tool. For professional use only.', '', '', '']);
    ws1.mergeCells(footerRow.number, 1, footerRow.number, 4);
    sc(footerRow.getCell(1), { bg: C.navyBg, fg: C.navyFg, size: 8, italic: true, hAlign: 'center', border: false });

    /* ══════════════════════════════════════════════════════
       SHEET 2 — PAYMENT SCHEDULE
    ══════════════════════════════════════════════════════ */
    const ws2 = wb.addWorksheet('Payment Schedule', { tabColor: { argb: 'FF0284C7' } });
    ws2.columns = [
      { width: 10 },   // Period #
      { width: 28 },   // Payment Date
      { width: 26 },   // Payment Amount (editable)
      { width: 46 },   // Notes
    ];

    // Banner
    const s2Banner = ws2.addRow(['📅  PAYMENT SCHEDULE  |  Edit PAYMENT AMOUNT only. Dates are pre-filled — do NOT change them.  |  Leave amount blank to use base amount from Sheet 1.', '', '', '']);
    s2Banner.height = 28;
    ws2.mergeCells(1, 1, 1, 4);
    sc(s2Banner.getCell(1), { bg: C.tealBg, fg: C.tealFg, bold: true, size: 9, wrap: true, border: false });

    // Column headers
    const s2Hdr = ws2.addRow(['PERIOD #', 'PAYMENT DATE (DD-MM-YYYY)', 'PAYMENT AMOUNT (₹)  ← Edit here', 'NOTES']);
    s2Hdr.height = 22;
    s2Hdr.eachCell(cell => sc(cell, { bg: C.navyBg, fg: C.navyFg, bold: true, size: 10, hAlign: 'center' }));

    ws2.views = [{ state: 'frozen', ySplit: 2 }];
    ws2.autoFilter = { from: 'A2', to: 'D2' };

    const periodRows = buildPeriodRows(ctx);
    const hasPeriods = periodRows.length > 0;
    const rowsToAdd  = hasPeriods
      ? periodRows
      : Array.from({ length: 60 }, (_, i) => ({ period: i + 1, date: '', payment: '' }));

    const S2_DATA_START = 3;
    rowsToAdd.forEach((r, idx) => {
      const row = ws2.addRow([r.period, '', r.payment || '', '']);
      row.height = 18;
      const bg = idx % 2 === 0 ? C.alt1 : C.alt2;

      // Period #
      sc(row.getCell(1), { bg, fg: C.mutedFg, size: 10, hAlign: 'center' });

      // Date cell – text, read-only feel
      sc(row.getCell(2), { bg, fg: C.textMain, size: 10, hAlign: 'center' });
      if (r.date) {
        row.getCell(2).value = r.date;
        row.getCell(2).numFmt = '@';
      }

      // Payment cell – editable (highlighted)
      sc(row.getCell(3), { bg: C.inputBg, fg: C.navyBg, bold: true, size: 10, hAlign: 'right' });
      if (r.payment) row.getCell(3).numFmt = NUM_INR;

      // Notes
      sc(row.getCell(4), { bg, fg: C.mutedFg, size: 9, italic: true });
    });

    // Total row
    const s2LastData = S2_DATA_START + rowsToAdd.length - 1;
    const s2Total = ws2.addRow(['', 'TOTAL', { formula: `=SUM(C${S2_DATA_START}:C${s2LastData})` }, '']);
    s2Total.height = 22;
    sc(s2Total.getCell(1), { bg: C.goldBg, fg: C.goldFg, bold: true, hAlign: 'center' });
    sc(s2Total.getCell(2), { bg: C.goldBg, fg: C.goldFg, bold: true, hAlign: 'center' });
    sc(s2Total.getCell(3), { bg: C.goldBg, fg: C.goldFg, bold: true, hAlign: 'right', numFmt: NUM_INR });
    sc(s2Total.getCell(4), { bg: C.goldBg, fg: C.goldFg });

    /* ══════════════════════════════════════════════════════
       SHEET 3 — HOW TO USE (Instructions)
    ══════════════════════════════════════════════════════ */
    const ws3 = wb.addWorksheet('How To Use', { tabColor: { argb: 'FF7C3AED' } });
    ws3.columns = [{ width: 105 }];

    const addI = (text, style = 'body') => {
      const r = ws3.addRow([text]);
      if (style === 'title') {
        r.height = 30;
        sc(r.getCell(1), { bg: C.navyBg, fg: C.navyFg, bold: true, size: 13, border: false });
      } else if (style === 'section') {
        r.height = 22;
        sc(r.getCell(1), { bg: C.tealBg, fg: C.tealFg, bold: true, size: 10, border: false });
      } else if (style === 'sub') {
        r.height = 20;
        sc(r.getCell(1), { bg: C.secBg, fg: C.secFg, bold: true, size: 10, border: false });
      } else if (style === 'body') {
        r.height = 18;
        sc(r.getCell(1), { bg: C.alt1, fg: C.textMain, size: 10, wrap: true, border: false });
      } else if (style === 'tip') {
        r.height = 18;
        sc(r.getCell(1), { bg: C.optBg, fg: C.optFg, size: 9, italic: true, wrap: true, border: false });
      } else if (style === 'warn') {
        r.height = 20;
        sc(r.getCell(1), { bg: C.reqBg, fg: C.reqFg, bold: true, size: 9, wrap: true, border: false });
      } else {
        r.height = 12; // blank
        sc(r.getCell(1), { bg: C.alt2, border: false });
      }
    };

    addI('IND AS 116 – LEASE ACCOUNTING TOOL  |  Upload Guide & Instructions', 'title');
    addI('Developed by CA Jimi R Modi, Practicing Chartered Accountant', 'body');
    addI('', 'blank');

    addI('📋  SHEET 1 — LEASE INPUTS', 'section');
    addI('Step 1 — Fill the VALUE column (Column B). Never edit Column A (Field names).', 'sub');
    addI('  • Required fields (marked ✔ Yes in Column C) must be filled — computation will not proceed without them.', 'body');
    addI('  • Optional fields default to 0 — leave blank or enter 0 if not applicable.', 'body');
    addI('  • Dates must be entered as DD-MM-YYYY  (e.g. 01-04-2024).', 'body');
    addI('  • Payment Frequency: select from dropdown → monthly | quarterly | halfyearly | yearly', 'body');
    addI('  • Payment Timing: select from dropdown → end (ordinary annuity) | beginning (annuity due)', 'body');
    addI('  • IBR / Incremental Borrowing Rate: enter as a percentage (e.g. 10.5 for 10.5% p.a.)', 'body');
    addI('  💡 Tip: All dropdown cells show a list — click the cell and use the arrow to select.', 'tip');
    addI('', 'blank');

    addI('📅  SHEET 2 — PAYMENT SCHEDULE (Variable / Escalated Payments)', 'section');
    addI('Step 2 — Use this sheet ONLY for variable or escalated payment schedules.', 'sub');
    addI('  • If all payments are the same amount, leave this sheet blank — use only Sheet 1.', 'body');
    addI('  • Payment Dates are pre-filled based on Sheet 1 inputs. Do NOT change dates.', 'body');
    addI('  • Edit only the PAYMENT AMOUNT column (Column C, highlighted in yellow).', 'body');
    addI('  • Leave any Payment Amount blank to apply the base amount from Sheet 1.', 'body');
    addI('  • The total row at the bottom auto-sums all payments.', 'body');
    addI('  ⚠ Warning: Changing dates in this sheet will cause incorrect calculation results.', 'warn');
    addI('', 'blank');

    addI('⬆️  HOW TO UPLOAD', 'section');
    addI('  1. Complete Sheet 1 (required fields), and Sheet 2 if payments vary.', 'body');
    addI('  2. Save the file as .xlsx (Excel Workbook format).', 'body');
    addI('  3. In the Ind AS 116 Tool, drag the file onto the Upload Area or click Browse File.', 'body');
    addI('  4. The tool reads Sheet 1 parameters and Sheet 2 payment schedule automatically.', 'body');
    addI('  5. Review all loaded fields in the form, then click ⚡ Compute Lease Schedules.', 'body');
    addI('', 'blank');

    addI('⚖️  IMPORTANT NOTES', 'section');
    addI('  • The tool uses the Effective Interest Method per Ind AS 116 / IAS 39.', 'body');
    addI('  • ROU Asset = PV of Lease Payments + Initial Direct Costs − Incentives + Restoration Costs.', 'body');
    addI('  • The lease liability amortisation schedule closes to exactly ₹0 at end of lease term.', 'body');
    addI('  • For Ind AS 116 transition, enter the transition date opening liability in the Opening Balance field.', 'body');
    addI('  💡 Tip: Obtain the IBR from your Finance / Treasury team — it is the rate to borrow funds for a similar asset.', 'tip');
    addI('', 'blank');

    addI('© CA Jimi R Modi — Practicing Chartered Accountant  |  Ind AS 116 Lease Accounting Tool', 'title');

    /* ── Download ── */
    const filename = `IndAS116_${safeName}_Input_Template.xlsx`;
    try {
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url    = URL.createObjectURL(blob);
      const a      = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Template download failed:', e);
      alert('Template download failed: ' + e.message + '. Downloading CSV instead.');
      downloadCSV();
    }
  };

  /** CSV fallback (Sheet 1 fields only) */
  const downloadCSV = () => {
    const ALL_FIELDS = [...SECTION_LEASE, ...SECTION_PAYMENT, ...SECTION_OPTIONAL];
    const lines = ['"FIELD","VALUE","REQUIRED","NOTES"'];
    ALL_FIELDS.forEach(([f, v, n, req]) =>
      lines.push(`"${f}","${v}","${req ? 'Yes' : 'Optional'}","${n}"`)
    );
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'IndAS116_Lease_Template.csv' });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return { downloadExcel, downloadCSV, buildPeriodRows };
})();
