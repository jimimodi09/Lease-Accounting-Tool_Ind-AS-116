/* ── template.js – Professional Excel template download (ExcelJS) ── */
'use strict';

const Template = (() => {

  /* ── Field definitions for Lease Inputs sheet ── */
  const INPUT_ROWS = [
    ['Lease Name / Asset Description',         '',         'e.g. Office Premises – Mumbai'],
    ['Lease Start Date',                        '',         'DD-MM-YYYY  e.g. 01-04-2024'],
    ['Lease End Date',                          '',         'DD-MM-YYYY  e.g. 31-03-2029'],
    ['Lease Term (months)',                     '',         'Auto-calculated or enter manually'],
    ['Lease Payment Amount (₹)',                '',         'Base periodic payment (overridden by Payment Schedule sheet if filled)'],
    ['Payment Frequency',                       'monthly',  'monthly | quarterly | halfyearly | yearly'],
    ['Payment Timing',                          'end',      'end | beginning'],
    ['Incremental Borrowing Rate (% p.a.)',      '',         'e.g. 10.5'],
    ['Initial Direct Costs (₹)',                '0',        'Optional – legal fees, brokerage etc.'],
    ['Lease Incentives Received (₹)',            '0',        'Optional – deducted from ROU asset'],
    ['Restoration / Dismantling Costs (₹)',      '0',        'Optional – added to ROU asset (Para 24(d))'],
    ['Residual Value Guarantee (₹)',             '0',        'Optional – added to last payment for PV calculation'],
    ['Financial Year Start (Month)',             '4',        '4 = April (Indian FY)  |  1 = January (Calendar Year)'],
    ['Opening Lease Liability (₹)',              '',         'Optional – for Ind AS 116 transition or mid-term adoption'],
  ];

  /* ── Palette (matching export.js) ── */
  const C = {
    navyBg:   'FF1E2A3A',
    navyFg:   'FFFFFFFF',
    tealBg:   'FF1ABC9C',
    tealFg:   'FFFFFFFF',
    inputBg:  'FFFFFDE7',   // light yellow – fill here
    notesFg:  'FF718096',   // muted grey for notes
    border:   'FFCFD8E3',
    hdrBg:    'FFECF0F1',   // column header (field names) light grey
    hdrFg:    'FF1E2A3A',
    altRow1:  'FFF7F9FC',
    altRow2:  'FFFFFFFF',
    warnBg:   'FFFFF3CD',   // light amber for instruction highlights
  };
  const FONT = 'Calibri';

  const thinBorder = () => ({
    top:    { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    left:   { style: 'thin', color: { argb: C.border } },
    right:  { style: 'thin', color: { argb: C.border } },
  });

  /**
   * Generate period rows from lease context.
   * Returns [{period, date:'DD-MM-YYYY', payment}]
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

  const downloadExcel = async (ctx) => {
    if (typeof ExcelJS === 'undefined') {
      alert('ExcelJS not loaded. Check your internet connection.'); return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'Ind AS 116 Lease Accounting Tool';
    wb.created  = new Date();
    wb.modified = new Date();

    const safeName = (ctx && ctx.leaseName)
      ? ctx.leaseName.replace(/[^a-zA-Z0-9_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : 'Lease';

    /* ══════════════════════════════════════
       SHEET 1 — LEASE INPUTS
    ══════════════════════════════════════ */
    const ws1 = wb.addWorksheet('Lease Inputs', { tabColor: { argb: 'FF1ABC9C' } });
    ws1.columns = [{ width: 44 }, { width: 36 }, { width: 65 }];

    // Title row
    const titleRow = ws1.addRow(['IND AS 116 – LEASE ACCOUNTING INPUT TEMPLATE']);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.font      = { name: FONT, bold: true, size: 14, color: { argb: C.navyFg } };
    titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyBg } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws1.mergeCells(1, 1, 1, 3);

    // Subtitle row
    const subRow = ws1.addRow([`Generated: ${Utils.toDateStr(new Date())}   |   Fill the VALUE column only. Do NOT modify the FIELD column.`]);
    subRow.height = 18;
    const subCell = subRow.getCell(1);
    subCell.font      = { name: FONT, size: 9, italic: true, color: { argb: C.navyFg } };
    subCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealBg } };
    subCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws1.mergeCells(2, 1, 2, 3);

    // Blank spacer
    ws1.addRow([]);

    // Column header row
    const colHdr = ws1.addRow(['FIELD', 'VALUE', 'NOTES / INSTRUCTIONS']);
    colHdr.height = 20;
    colHdr.eachCell((cell, col) => {
      cell.font      = { name: FONT, bold: true, size: 10, color: { argb: C.hdrFg } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.hdrBg } };
      cell.border    = thinBorder();
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center' };
    });

    // Data rows
    INPUT_ROWS.forEach(([field, value, notes], idx) => {
      const row = ws1.addRow([field, value, notes]);
      row.height = 20;

      // FIELD cell – muted style
      const fieldCell = row.getCell(1);
      fieldCell.font      = { name: FONT, size: 10, color: { argb: 'FF2D3748' } };
      fieldCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? C.altRow1 : C.altRow2 } };
      fieldCell.border    = thinBorder();
      fieldCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // VALUE cell – highlighted to signal "enter here"
      const valCell = row.getCell(2);
      valCell.font      = { name: FONT, bold: true, size: 10, color: { argb: C.navyBg } };
      valCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.inputBg } };
      valCell.border    = thinBorder();
      valCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // NOTES cell – italic grey
      const notesCell = row.getCell(3);
      notesCell.font      = { name: FONT, size: 9, italic: true, color: { argb: C.notesFg } };
      notesCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? C.altRow1 : C.altRow2 } };
      notesCell.border    = thinBorder();
      notesCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });

    // Freeze top 4 rows
    ws1.views = [{ state: 'frozen', ySplit: 4 }];

    /* ══════════════════════════════════════
       SHEET 2 — PAYMENT SCHEDULE
    ══════════════════════════════════════ */
    const ws2 = wb.addWorksheet('Payment Schedule', { tabColor: { argb: 'FF2E86C1' } });
    ws2.columns = [{ width: 12 }, { width: 30 }, { width: 26 }, { width: 46 }];

    // Instruction banner
    const instrRow = ws2.addRow(['INSTRUCTIONS: Edit the PAYMENT AMOUNT column for variable/escalated payments. Leave amount blank to use base amount from Lease Inputs. Do NOT change the date column.']);
    instrRow.height = 32;
    const instrCell = instrRow.getCell(1);
    instrCell.font      = { name: FONT, size: 9, italic: true, color: { argb: C.navyBg } };
    instrCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.warnBg } };
    instrCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    ws2.mergeCells(1, 1, 1, 4);

    // Column headers
    const schHdr = ws2.addRow(['PERIOD #', 'PAYMENT DATE (DD-MM-YYYY)', 'PAYMENT AMOUNT (₹)', 'NOTES']);
    schHdr.height = 20;
    schHdr.eachCell(cell => {
      cell.font      = { name: FONT, bold: true, size: 10, color: { argb: C.navyFg } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navyBg } };
      cell.border    = thinBorder();
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const periodRows = buildPeriodRows(ctx);
    const hasPeriods = periodRows.length > 0;
    const rowsToAdd  = hasPeriods ? periodRows : Array.from({ length: 60 }, (_, i) => ({ period: i + 1, date: '', payment: '' }));

    rowsToAdd.forEach((r, idx) => {
      const row = ws2.addRow([r.period, r.date, r.payment, '']);
      row.height = 18;
      const bg = idx % 2 === 0 ? C.altRow1 : C.altRow2;

      row.getCell(1).font      = { name: FONT, size: 10, color: { argb: 'FF4A5568' } };
      row.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      row.getCell(1).border    = thinBorder();
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Date cell – text type, light bg
      row.getCell(2).font      = { name: FONT, size: 10, color: { argb: 'FF2D3748' } };
      row.getCell(2).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      row.getCell(2).border    = thinBorder();
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      // Force as text so DD-MM-YYYY stays intact
      if (r.date) {
        row.getCell(2).value = { text: r.date };
        row.getCell(2).numFmt = '@';
      }

      // Payment cell – highlighted
      const pmtCell = row.getCell(3);
      pmtCell.font      = { name: FONT, bold: true, size: 10, color: { argb: C.navyBg } };
      pmtCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.inputBg } };
      pmtCell.border    = thinBorder();
      pmtCell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (r.payment) pmtCell.numFmt = '"₹"#,##0.00';

      row.getCell(4).font      = { name: FONT, size: 9, italic: true, color: { argb: C.notesFg } };
      row.getCell(4).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      row.getCell(4).border    = thinBorder();
    });

    ws2.views = [{ state: 'frozen', ySplit: 2 }];

    /* ══════════════════════════════════════
       SHEET 3 — INSTRUCTIONS
    ══════════════════════════════════════ */
    const ws3 = wb.addWorksheet('Instructions', { tabColor: { argb: 'FF8E44AD' } });
    ws3.columns = [{ width: 110 }];

    const addInstrTitle = (text) => {
      const r = ws3.addRow([text]);
      r.height = 24;
      const c = r.getCell(1);
      c.font   = { name: FONT, bold: true, size: 11, color: { argb: C.navyFg } };
      c.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tealBg } };
      c.alignment = { vertical: 'middle', horizontal: 'left' };
    };

    const addInstrLine = (text, isHeading = false) => {
      const r = ws3.addRow([text]);
      r.height = 18;
      const c = r.getCell(1);
      if (isHeading) {
        c.font   = { name: FONT, bold: true, size: 10, color: { argb: C.navyBg } };
        c.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.hdrBg } };
      } else {
        c.font   = { name: FONT, size: 10, color: { argb: 'FF2D3748' } };
        c.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow1 } };
      }
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    };

    addInstrTitle('IND AS 116 – LEASE ACCOUNTING TOOL: UPLOAD GUIDE');
    ws3.addRow([]);

    addInstrLine('SHEET 1 — LEASE INPUTS', true);
    addInstrLine('  • Fill only the VALUE column. Do NOT change the FIELD column text.');
    addInstrLine('  • All dates must be in DD-MM-YYYY format  (e.g. 01-04-2024).');
    addInstrLine('  • Payment Frequency: type exactly one of  monthly | quarterly | halfyearly | yearly');
    addInstrLine('  • Payment Timing: type exactly one of  end | beginning');
    addInstrLine('  • Numeric fields (amounts, rates, months): enter numbers only, no ₹ or % symbols.');
    addInstrLine('  • Optional fields may be left blank or set to 0.');
    ws3.addRow([]);

    addInstrLine('SHEET 2 — PAYMENT SCHEDULE (for Variable / Escalated Payments)', true);
    addInstrLine('  • Use this sheet ONLY when lease payments differ from period to period.');
    addInstrLine('  • Payment dates are pre-filled. DO NOT change them — only edit Payment Amount.');
    addInstrLine('  • Leave Payment Amount blank for any period to use the base amount from Sheet 1.');
    addInstrLine('  • Alternatively, use the Escalation Clause feature in the tool to auto-generate this.');
    ws3.addRow([]);

    addInstrLine('HOW TO UPLOAD', true);
    addInstrLine('  1. Complete Sheets 1 and 2 as required.');
    addInstrLine('  2. Save the file as .xlsx.');
    addInstrLine('  3. In the tool, drag-and-drop the file onto the upload area, or click Browse File.');
    addInstrLine('  4. The tool reads Sheet 1 for parameters and Sheet 2 for the payment schedule.');
    addInstrLine('  5. Review the loaded values in the form, then click Compute.');
    ws3.addRow([]);

    addInstrLine('IMPORTANT NOTES', true);
    addInstrLine('  • IBR / Incremental Borrowing Rate: obtain from your finance / treasury team.');
    addInstrLine('  • Ind AS 116 requires the effective interest method for lease liability amortisation.');
    addInstrLine('  • ROU Asset = PV of Lease Payments + Initial Direct Costs – Incentives + Restoration.');

    /* ── Download ── */
    const filename = `IndAS116_${safeName}_Template.xlsx`;
    try {
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Template download failed:', e);
      alert('Template download failed: ' + e.message + '. Downloading CSV instead.');
      downloadCSV();
    }
  };

  /** CSV fallback (Sheet 1 only) */
  const downloadCSV = () => {
    const lines = ['"FIELD","VALUE","NOTES"'];
    INPUT_ROWS.forEach(([f, v, n]) => lines.push(`"${f}","${v}","${n}"`));
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'IndAS116_Lease_Template.csv' });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return { downloadExcel, downloadCSV, buildPeriodRows };
})();
