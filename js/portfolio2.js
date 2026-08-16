/* â� Rs.â� Rs. portfolio.js  -  Portfolio Consolidation Module â� Rs.â� Rs. */
'use strict';

const Portfolio = (() => {

  /* â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.
     EXPORT JSON   -   Save entire portfolio to a .json file
  â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs. */
  const exportJSON = (portfolio) => {
    if (!portfolio || portfolio.length === 0) {
      alert('No leases in portfolio to export. Save at least one lease first.');
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      tool: 'Ind AS 116 Lease Accounting Tool',
      author: 'CA Jimi R Modi',
      version: '1.0',
      leases: portfolio
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `LeasePortfolio_${_today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.
     IMPORT JSON   -   Load portfolio from a .json file
     callback(leases) called with parsed array on success
  â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs. */
  const importJSON = (callback) => {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const leases = Array.isArray(data) ? data
                       : Array.isArray(data.leases) ? data.leases
                       : null;
          if (!leases) throw new Error('Invalid portfolio JSON format.');
          // Re-hydrate dates
          leases.forEach(l => {
            const _st = l.savedState || l.state;
            if (_st && _st.inputs) {
              if (_st.inputs.startDate) _st.inputs.startDate = new Date(_st.inputs.startDate);
              if (_st.inputs.endDate)   _st.inputs.endDate   = new Date(_st.inputs.endDate);
            }
            if (_st && _st.amortRows) {
              _st.amortRows.forEach(r => { r.date = new Date(r.date); });
            }
            if (_st && _st.pvResult && _st.pvResult.schedule) {
              _st.pvResult.schedule.forEach(r => { r.date = new Date(r.date); });
            }
          });
          callback(leases);
        } catch (err) {
          alert('Failed to import: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  };

  /* â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.
     BUILD CONSOLIDATED   -   Aggregate all leases by FY
  â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs. */
  const buildConsolidated = (portfolio) => {
    if (!portfolio || portfolio.length === 0) return null;

    // Portfolio-level totals
    let totalPV       = 0, totalROU  = 0, totalInterest = 0,
        totalPayments = 0, totalDep  = 0;

    // FY-wise aggregation map: fy => { openBal, interest, payments, closeBal, currentLiab, nonCurrentLiab, dep, rouCloseBV }
    const fyMap = {};

    portfolio.forEach(l => {
      const s = l.savedState || l.state;
      if (!s || !s.inputs) return;
      totalPV       += (s.pvResult && s.pvResult.totalPV) ? s.pvResult.totalPV : 0;
      totalROU      += s.inputs.rouInitial      || 0;
      totalInterest += s.inputs.totalInterest   || 0;
      totalPayments += s.inputs.totalPayments   || 0;
      totalDep      += s.inputs.totalDep        || 0;

      (s.fySummary || []).forEach(row => {
        if (!fyMap[row.fy]) {
          fyMap[row.fy] = { fy: row.fy, openBal: 0, interest: 0, payments: 0, closeBal: 0, currentLiab: 0, nonCurrentLiab: 0, dep: 0, rouCloseBV: 0 };
        }
        const f = fyMap[row.fy];
        f.openBal       += (row.openBal       || 0);
        f.interest       += (row.interest      || 0);
        f.payments       += (row.payments      || 0);
        f.closeBal       += (row.closeBal      || 0);
        f.currentLiab    += (row.currentLiab   || 0);
        f.nonCurrentLiab += (row.nonCurrentLiab|| 0);
        f.dep            += (row.dep           || 0);
        f.rouCloseBV     += (row.rouCloseBV    || 0);
      });
    });

    // Sort FY keys chronologically
    const fySummary = Object.values(fyMap).sort((a, b) => a.fy < b.fy ? -1 : 1)
      .map(r => ({
        fy:           r.fy,
        openBal:      Utils.round2(r.openBal),
        interest:     Utils.round2(r.interest),
        payments:     Utils.round2(r.payments),
        closeBal:     Utils.round2(r.closeBal),
        currentLiab:  Utils.round2(r.currentLiab),
        nonCurrentLiab: Utils.round2(r.nonCurrentLiab),
        dep:          Utils.round2(r.dep),
        rouCloseBV:   Utils.round2(r.rouCloseBV)
      }));

    return {
      leaseCount:   portfolio.length,
      totalPV:      Utils.round2(totalPV),
      totalROU:     Utils.round2(totalROU),
      totalInterest:Utils.round2(totalInterest),
      totalPayments:Utils.round2(totalPayments),
      totalDep:     Utils.round2(totalDep),
      fySummary
    };
  };

  /* â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.
     RENDER CONSOLIDATED VIEW   -   Populate #consolidatedView
  â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs. */
  const renderConsolidatedView = (portfolio) => {
    const container = document.getElementById('consolidatedView');
    if (!container) return;

    if (!portfolio || portfolio.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:16px 0;">Save at least one lease to the portfolio to see consolidated figures.</p>';
      return;
    }

    const c = buildConsolidated(portfolio);
    if (!c) { container.innerHTML = ''; return; }

    // KPI strip
    const kpis = [
      ['Leases in Portfolio', c.leaseCount],
      ['Portfolio Lease Liability', Utils.fmtINR(c.totalPV)],
      ['Portfolio ROU Asset',       Utils.fmtINR(c.totalROU)],
      ['Total Interest Expense',    Utils.fmtINR(c.totalInterest)],
      ['Total Cash Outflows',       Utils.fmtINR(c.totalPayments)],
      ['Total Depreciation',        Utils.fmtINR(c.totalDep)]
    ];

    const kpiHtml = kpis.map(([l, v]) =>
      `<div class="kpi-card"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`
    ).join('');

    // Consolidated FY table
    const fyRows = c.fySummary.map(r => `
      <tr>
        <td>${r.fy}</td>
        <td>${Utils.fmtNum(r.openBal)}</td>
        <td>${Utils.fmtNum(r.interest)}</td>
        <td>${Utils.fmtNum(r.payments)}</td>
        <td>${Utils.fmtNum(r.closeBal)}</td>
        <td>${Utils.fmtNum(r.currentLiab)}</td>
        <td>${Utils.fmtNum(r.nonCurrentLiab)}</td>
        <td>${Utils.fmtNum(r.dep)}</td>
        <td>${Utils.fmtNum(r.rouCloseBV)}</td>
      </tr>`).join('');

    // Per-lease breakdown
    const leaseRows = portfolio.map(l => {
      const s_X = l.savedState || l.state;
      if (!s_X || !s_X.inputs) return '';
      return `
      <tr>
        <td style="text-align:left;font-weight:500;">${l.label}</td>
        <td>${Utils.fmtDate(new Date(s_X.inputs.startDate))}</td>
        <td>${Utils.fmtDate(new Date(s_X.inputs.endDate))}</td>
        <td>${s_X.inputs.leaseTerm}m</td>
        <td>${s_X.inputs.roi}%</td>
        <td>${Utils.fmtINR((s_X.pvResult && s_X.pvResult.totalPV) || 0)}</td>
        <td>${Utils.fmtINR(s_X.inputs.rouInitial)}</td>
        <td>${Utils.fmtINR(s_X.inputs.totalInterest)}</td>
        <td>${Utils.fmtINR(s_X.inputs.totalPayments)}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="section-title" style="margin-top:0;">&#x1F4CA; Consolidated Portfolio KPIs</div>
      <div class="kpi-grid">${kpiHtml}</div>

      <div class="section-title" style="margin-top:28px;">&#x1F4C5; Consolidated FY-wise Summary (All Leases)</div>
      <div class="table-wrapper">
        <table class="data-table" id="consolidatedFYTable">
          <thead>
            <tr>
              <th>Financial Year</th>
              <th>Opening Liability</th>
              <th>Interest Accrued</th>
              <th>Payments</th>
              <th>Closing Liability</th>
              <th>Current Portion</th>
              <th>Non-Current Portion</th>
              <th>Depreciation</th>
              <th>ROU Book Value</th>
            </tr>
          </thead>
          <tbody>${fyRows}</tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td></td>
              <td><strong>${Utils.fmtNum(c.totalInterest)}</strong></td>
              <td><strong>${Utils.fmtNum(c.totalPayments)}</strong></td>
              <td></td><td></td><td></td>
              <td><strong>${Utils.fmtNum(c.totalDep)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="section-title" style="margin-top:28px;">&#x1F4CB; Individual Lease Breakdown</div>
      <div class="table-wrapper">
        <table class="data-table" id="leaseBreakdownTable">
          <thead>
            <tr>
              <th style="text-align:left;">Lease</th>
              <th>Start</th><th>End</th><th>Term</th><th>IBR</th>
              <th>Liability (PV)</th><th>ROU Asset</th>
              <th>Total Interest</th><th>Total Payments</th>
            </tr>
          </thead>
          <tbody>${leaseRows}</tbody>
        </table>
      </div>`;
  };

  /* â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.
     EXPORT CONSOLIDATED EXCEL   -   Multi-sheet ExcelJS workbook
  â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs.â� Rs. */
  const exportConsolidatedExcel = async (portfolio) => {
    if (!portfolio || portfolio.length === 0) {
      alert('No leases in portfolio. Save at least one lease first.');
      return;
    }
    if (typeof ExcelJS === 'undefined') {
      alert('ExcelJS library not loaded. Cannot export Excel.');
      return;
    }

    const c = buildConsolidated(portfolio);
    const wb = new ExcelJS.Workbook();
    wb.creator    = 'CA Jimi R Modi';
    wb.created    = new Date();
    wb.properties.date1904 = false;

    // â� Rs.â� Rs. Color palette â� Rs.â� Rs.
    const CLR = { header: '1E3A5F', subHeader: '2D6A9F', accent: '4F81BD', total: 'D6E4F0', white: 'FFFFFF', light: 'EBF5FB', border: 'B0C4DE' };
    const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.header } };
    const subFill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.subHeader } };
    const totalFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.total } };
    const lightFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.light } };
    const hFont       = { name: 'Calibri', bold: true, color: { argb: 'FF' + CLR.white }, size: 11 };
    const boldFont    = { name: 'Calibri', bold: true, size: 10 };
    const normFont    = { name: 'Calibri', size: 10 };
    const numFmt      = '#,##0.00';
    const border      = { top: { style: 'thin', color: { argb: 'FF' + CLR.border } }, left: { style: 'thin', color: { argb: 'FF' + CLR.border } }, bottom: { style: 'thin', color: { argb: 'FF' + CLR.border } }, right: { style: 'thin', color: { argb: 'FF' + CLR.border } } };

    const styleCells = (ws, rowNum, cols, fill, font, numFormat) => {
      cols.forEach(col => {
        const cell = ws.getCell(rowNum, col);
        cell.fill   = fill;
        cell.font   = font || normFont;
        cell.border = border;
        cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right', wrapText: true };
        if (numFormat) cell.numFmt = numFormat;
      });
    };

    /* â� Rs.â� Rs. SHEET 1: Portfolio Summary â� Rs.â� Rs. */
    const ws1 = wb.addWorksheet('Portfolio Summary', { views: [{ state: 'frozen', ySplit: 5 }] });
    ws1.mergeCells('A1:K1');
    const t1 = ws1.getCell('A1');
    t1.value = 'Ind AS 116  -  Consolidated Lease Portfolio Summary';
    t1.font  = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF' + CLR.white } };
    t1.fill  = headerFill;
    t1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 32;

    ws1.mergeCells('A2:K2');
    const t2 = ws1.getCell('A2');
    t2.value = `Generated: ${new Date().toLocaleString('en-IN')}  |  Prepared by: CA Jimi R Modi  |  Leases: ${portfolio.length}`;
    t2.font  = { name: 'Calibri', italic: true, size: 9, color: { argb: 'FF4A4A4A' } };
    t2.fill  = lightFill;
    t2.alignment = { horizontal: 'center' };

    // KPI block
    const kpiPairs = [
      ['Total Lease Liability (PV)', c.totalPV],
      ['Total ROU Asset',            c.totalROU],
      ['Total Interest Expense',     c.totalInterest],
      ['Total Cash Outflows',        c.totalPayments],
      ['Total Depreciation',         c.totalDep],
      ['Number of Leases',           c.leaseCount]
    ];
    ws1.getRow(3).height = 18;
    kpiPairs.forEach(([label, val], i) => {
      const col = i * 2 + 1;
      if (col + 1 > 13) return;
      ws1.mergeCells(3, col, 3, col + 1);
      ws1.mergeCells(4, col, 4, col + 1);
      const lCell = ws1.getCell(3, col);
      lCell.value = label; lCell.fill = subFill; lCell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFFFF' } }; lCell.alignment = { horizontal: 'center' };
      const vCell = ws1.getCell(4, col);
      vCell.value = val; vCell.fill = totalFill; vCell.font = { name: 'Calibri', bold: true, size: 10 }; vCell.numFmt = numFmt; vCell.alignment = { horizontal: 'right' };
    });
    ws1.getRow(4).height = 22;

    // Individual lease table headers
    const s1Headers = ['Lease Name','Start Date','End Date','Term (months)','IBR (%)','Escalation Rate','Escalation Frequency','Lease Liability (PV) Rs.','ROU Asset Rs.','Total Interest Rs.','Total Payments Rs.'];
    const s1Row = ws1.addRow(s1Headers);
    s1Row.height = 20;
    s1Row.eachCell((cell, i) => {
      cell.fill = headerFill; cell.font = hFont; cell.border = border;
      cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
    });

    // Escalation display helpers
    const getEscRate = (inp) => {
      if (!inp.hasVarPayments || !inp.escalationRate) return 'Nil';
      return inp.escalationType === 'percent'
        ? inp.escalationRate + '% p.a.'
        : '\u20B9 ' + inp.escalationRate + ' (Fixed Amt)';
    };
    const getEscFreq = (inp) => {
      if (!inp.hasVarPayments || !inp.escalationRate) return 'Nil';
      if (String(inp.escalationFreq) === 'custom') return inp.escalationCustom + ' months';
      // Always show in months
      return String(inp.escalationFreq) + ' months';
    };

    // Individual lease data rows
    portfolio.forEach((l, idx) => {
      const s = l.savedState || l.state;
      if (!s || !s.inputs) return;
      const row = ws1.addRow([
        l.label,
        Utils.fmtDate(new Date(s.inputs.startDate)),
        Utils.fmtDate(new Date(s.inputs.endDate)),
        s.inputs.leaseTerm,
        s.inputs.roi,
        getEscRate(s.inputs),
        getEscFreq(s.inputs),
        (s.pvResult && s.pvResult.totalPV) || 0,
        s.inputs.rouInitial,
        s.inputs.totalInterest,
        s.inputs.totalPayments
      ]);
      row.height = 18;
      const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      row.eachCell((cell, ci) => {
        cell.fill = fill; cell.font = normFont; cell.border = border;
        if (ci === 1)      cell.alignment = { horizontal: 'left',   vertical: 'middle' };
        else if (ci <= 7)  cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else             { cell.alignment = { horizontal: 'right',  vertical: 'middle' }; cell.numFmt = numFmt; }
      });
    });

    // Totals row (escalation cols left blank)
    const totRow = ws1.addRow(['Portfolio Total', '', '', '', '', '', '', c.totalPV, c.totalROU, c.totalInterest, c.totalPayments]);
    totRow.height = 20;
    totRow.eachCell((cell, ci) => {
      cell.fill = totalFill; cell.font = boldFont; cell.border = border;
      cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
      if (ci >= 8) cell.numFmt = numFmt;
    });

    ws1.columns = [
      { width: 32 }, { width: 14 }, { width: 14 }, { width: 14 },
      { width: 10 }, { width: 20 }, { width: 16 },
      { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }
    ];

  /* ── SHEET 2: Consolidated FY Summary ── */

    const ws2 = wb.addWorksheet('Consolidated FY Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
    ws2.mergeCells('A1:J1');
    const t3 = ws2.getCell('A1');
    t3.value = 'Ind AS 116  -  Consolidated FY-wise Lease Summary (All Leases)';
    t3.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF' + CLR.white } };
    t3.fill  = headerFill; t3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 28;

    ws2.mergeCells('A2:J2');
    const t4 = ws2.getCell('A2');
    t4.value = `Aggregated across ${portfolio.length} lease(s)  |  Generated: ${new Date().toLocaleString('en-IN')}`;
    t4.font  = { name: 'Calibri', italic: true, size: 9 }; t4.fill = lightFill; t4.alignment = { horizontal: 'center' };

    // Column order: FY | Opening | New Leases | Interest | Payments | Closing | Current | Non-Current | Dep | ROU BV
    const s2Headers = ['Financial Year','Opening Liability Rs.','New Leases Recognized Rs.','Interest Accrued Rs.','Payments Rs.','Closing Liability Rs.','Current Portion Rs.','Non-Current Portion Rs.','Depreciation Rs.','ROU Book Value Rs.'];
    const s2HRow = ws2.addRow(s2Headers);
    s2HRow.height = 20;
    s2HRow.eachCell((cell, i) => {
      cell.fill = headerFill; cell.font = hFont; cell.border = border;
      cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle', wrapText: true };
    });

    c.fySummary.forEach((r, idx) => {
      // Opening = prior year closing (or 0 for first year)
      // New Leases during year = current openBal - prior closing
      const prevClose  = idx === 0 ? 0 : c.fySummary[idx - 1].closeBal;
      const opening    = Utils.round2(prevClose);
      const newLeases  = Utils.round2(r.openBal - prevClose);

      // Column order: FY | Opening (prev closing) | New Leases during Year | Interest | Payments | Closing | Current | Non-Current | Dep | ROU BV
      const row = ws2.addRow([r.fy, opening, newLeases, r.interest, r.payments, r.closeBal, r.currentLiab, r.nonCurrentLiab, r.dep, r.rouCloseBV]);
      row.height = 18;
      const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      row.eachCell((cell, ci) => {
        cell.fill = fill; cell.font = normFont; cell.border = border;
        cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
        if (ci > 1) cell.numFmt = numFmt;
        // Highlight New Leases column (col 3) in light yellow when non-zero
        if (ci === 3 && newLeases > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8C4' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF7B5800' } };
        }
      });
    });

    // Grand total row — Opening=first year opening(0), New Leases = sum of all new leases
    const totalNewLeases = Utils.round2(c.fySummary.reduce((s, r, i) => {
      const prevClose = i === 0 ? 0 : c.fySummary[i - 1].closeBal;
      return s + (r.openBal - prevClose);
    }, 0));
    const gt = ws2.addRow([
      'Grand Total', '', totalNewLeases,
      Utils.round2(c.fySummary.reduce((s,r)=>s+r.interest,0)),
      Utils.round2(c.fySummary.reduce((s,r)=>s+r.payments,0)),
      '', '', '',
      Utils.round2(c.fySummary.reduce((s,r)=>s+r.dep,0)), ''
    ]);
    gt.height = 20;
    gt.eachCell((cell, ci) => {
      cell.fill = totalFill; cell.font = boldFont; cell.border = border;
      cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
      if (ci > 1) cell.numFmt = numFmt;
    });

    // Note row
    const noteIdx = ws2.rowCount + 1;
    ws2.mergeCells(noteIdx, 1, noteIdx, 10);
    const noteRow2 = ws2.addRow(['Note: Opening = Prior Year Closing Liability. New Leases Recognized = PV of leases commencing during the year. Formula: Opening + New Leases + Interest − Payments = Closing.']);
    noteRow2.height = 28;
    noteRow2.getCell(1).font = { name: 'Calibri', italic: true, size: 9, color: { argb: 'FF4A4A4A' } };
    noteRow2.getCell(1).fill = lightFill;
    noteRow2.getCell(1).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };

    ws2.columns = [{ width: 16 }, { width: 20 }, { width: 24 }, { width: 18 }, { width: 16 }, { width: 20 }, { width: 16 }, { width: 20 }, { width: 16 }, { width: 18 }];

    /* â� Rs.â� Rs. SHEET 3: Consolidated Journal Entries â� Rs.â� Rs. */
    const wje = wb.addWorksheet('Consolidated Journal Entries', { views: [{ state: 'frozen', ySplit: 3 }] });
    wje.mergeCells('A1:G1');
    const tje = wje.getCell('A1');
    tje.value = 'Ind AS 116  -  Consolidated Journal Entries (All Leases, All FYs)';
    tje.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF' + CLR.white } };
    tje.fill  = headerFill; tje.alignment = { horizontal: 'center', vertical: 'middle' };
    wje.getRow(1).height = 28;

    wje.mergeCells('A2:G2');
    const tje2 = wje.getCell('A2');
    tje2.value = `Aggregated across ${portfolio.length} lease(s)  |  Generated: ${new Date().toLocaleString('en-IN')}  |  Prepared by: CA Jimi R Modi`;
    tje2.font  = { name: 'Calibri', italic: true, size: 9 }; tje2.fill = lightFill; tje2.alignment = { horizontal: 'center' };

    const jeHeaders = ['Financial Year', 'Lease Name', 'Journal Entry Type', 'Account / Particulars', 'Dr (Rs.)', 'Cr (Rs.)', 'Narration'];
    const jeHRow = wje.addRow(jeHeaders);
    jeHRow.height = 20;
    jeHRow.eachCell((cell, ci) => {
      cell.fill = headerFill; cell.font = hFont; cell.border = border;
      cell.alignment = { horizontal: ci <= 3 ? 'center' : ci <= 4 ? 'left' : 'right', vertical: 'middle', wrapText: true };
    });

    // Collect all FYs in sorted order across all leases
    const allFYs = [...new Set(
      portfolio.flatMap(l => ((l.savedState || l.state)?.fyJournals || []).map(f => f.fy))
    )].sort();

    let jeRowIdx = 0;
    allFYs.forEach(fy => {
      // FY heading row
      const fyHeadRow = wje.addRow([fy, '', '', '', '', '', '']);
      fyHeadRow.height = 18;
      fyHeadRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.subHeader } };
        cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.border = border;
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      });

      portfolio.forEach(l => {
        const _ssx = l.savedState || l.state; const fyJournals = (_ssx && _ssx.fyJournals) || [];
        const fyBlock = fyJournals.find(f => f.fy === fy);
        if (!fyBlock) return;

        fyBlock.entries.forEach(entry => {
          entry.lines.forEach((line, lineIdx) => {
            const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: jeRowIdx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
            const row = wje.addRow([
              lineIdx === 0 ? fy : '',                         // FY (only on first line of entry)
              lineIdx === 0 ? l.label : '',                    // Lease name (only on first line)
              lineIdx === 0 ? entry.label : '',                // Entry type (only on first line)
              (line.cr !== null ? '    ' : '') + line.account, // indent Cr lines
              line.dr != null ? line.dr : '',
              line.cr != null ? line.cr : '',
              lineIdx === 0 ? entry.narration : ''             // narration on first line only
            ]);
            row.height = line.cr !== null ? 16 : 16;
            row.eachCell((cell, ci) => {
              cell.fill = fill; cell.font = normFont; cell.border = border;
              if (ci === 4) cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
              else if (ci >= 5 && ci <= 6) { cell.numFmt = numFmt; cell.alignment = { horizontal: 'right', vertical: 'middle' }; }
              else if (ci === 7) cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              else cell.alignment = { horizontal: 'left', vertical: 'middle' };
            });
            jeRowIdx++;
          });

          // Totals line per entry
          const drTotal = entry.lines.reduce((s, l) => s + (l.dr || 0), 0);
          const totFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.total } };
          const totRow  = wje.addRow(['', '', '', 'Total', Utils.round2(drTotal), Utils.round2(drTotal), '']);
          totRow.height = 15;
          totRow.eachCell((cell, ci) => {
            cell.fill = totFill; cell.font = boldFont; cell.border = border;
            if (ci >= 5 && ci <= 6) { cell.numFmt = numFmt; cell.alignment = { horizontal: 'right', vertical: 'middle' }; }
            else cell.alignment = { horizontal: ci === 4 ? 'left' : 'center', vertical: 'middle' };
          });
          jeRowIdx++;
        });
      });
    });

    wje.columns = [
      { width: 14 }, { width: 28 }, { width: 26 },
      { width: 38 }, { width: 16 }, { width: 16 }, { width: 40 }
    ];

    /* Per-lease Amortisation and per-lease Journal Entry sheets omitted.
       The consolidated Excel export only generates the four consolidated sheets:
       Portfolio Summary, Consolidated FY Summary, Consolidated Journal Entries, Consolidated JE.
       This avoids hitting Excel's sheet limit with large portfolios (40+ leases). */
    /* Consolidated JE by Entry Type - using fyJournals as single source of truth */
    const allFYs2 = [...new Set(portfolio.flatMap(l => ((l.savedState || l.state)?.fyJournals||[]).map(f=>f.fy)))].sort();
    const JE_TYPES2 = ['Initial Recognition','Interest Accrual','Lease Payment','Depreciation of ROU Asset'];

    const ledgerCols = [{ width: 16 }, { width: 30 }, { width: 44 }, { width: 18 }, { width: 18 }];
    const ledgerHdr  = ['Financial Year', 'Lease / Entity', 'Account / Particulars', 'Dr (Rs.)', 'Cr (Rs.)'];

    const styleDataRow2 = (row, isDr) => {
      row.eachCell((cell, ci) => {
        cell.border = border;
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: isDr ? 'FFF0F8FF' : 'FFFFFDE7' } };
        cell.font = normFont;
        cell.alignment = { horizontal: ci <= 3 ? 'left' : 'right', vertical:'middle' };
        if (ci >= 4) cell.numFmt = numFmt;
      });
    };
    const styleTotRow2 = (row) => {
      row.eachCell((cell, ci) => {
        cell.fill = totalFill; cell.font = boldFont; cell.border = border;
        cell.alignment = { horizontal: ci <= 3 ? 'left' : 'right', vertical:'middle' };
        if (ci >= 4) cell.numFmt = numFmt;
      });
    };

    /* SHEET: Consolidated JE — FY-first layout (all entry types together per year) */
    const wsByType = wb.addWorksheet('Consolidated JE', { views: [{ state: 'frozen', ySplit: 3 }] });
    wsByType.mergeCells('A1:E1');
    const jttT = wsByType.getCell('A1');
    jttT.value = 'Ind AS 116 - Consolidated Journal Entries (Year-wise, All Leases)';
    jttT.font  = { name:'Calibri', bold:true, size:13, color:{ argb:'FF'+CLR.white } };
    jttT.fill  = headerFill; jttT.alignment = { horizontal:'center', vertical:'middle' };
    wsByType.getRow(1).height = 28;
    wsByType.mergeCells('A2:E2');
    const jttS = wsByType.getCell('A2');
    jttS.value = 'Consolidated: ' + portfolio.map(l => l.label).join(' + ')
               + ' | Blue = Debit | Yellow = Credit | Grouped by Financial Year';
    jttS.font  = { name:'Calibri', italic:true, size:9 };
    jttS.fill  = lightFill; jttS.alignment = { horizontal:'center' };
    const jttHR = wsByType.addRow(ledgerHdr); jttHR.height = 22;
    jttHR.eachCell(cell => { cell.fill=headerFill; cell.font=hFont; cell.border=border; cell.alignment={horizontal:'center',vertical:'middle',wrapText:true}; });

    /* ── FY-FIRST: for each FY, show all entry types together ── */
    allFYs2.forEach(fy => {
      // Skip FY if no lease has any data in it
      const fyHasAny = portfolio.some(l =>
        ((l.savedState || l.state)?.fyJournals||[]).some(fb =>
          fb.fy === fy && fb.entries.some(e => e.lines.reduce((s,ln)=>s+(ln.dr||0),0) > 0)
        )
      );
      if (!fyHasAny) return;

      // ── FY Banner (dark header spanning all 5 columns) ──
      const fyBannerIdx = wsByType.rowCount + 1;
      wsByType.mergeCells(fyBannerIdx, 1, fyBannerIdx, 5);
      const fyBanner = wsByType.getCell(fyBannerIdx, 1);
      fyBanner.value = fy;
      fyBanner.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+CLR.header } };
      fyBanner.font  = { name:'Calibri', bold:true, size:12, color:{ argb:'FFFFFFFF' } };
      fyBanner.border = border;
      fyBanner.alignment = { horizontal:'center', vertical:'middle' };
      wsByType.getRow(fyBannerIdx).height = 24;

      const fyGrandDrRefs = [], fyGrandCrRefs = [];

      // ── Loop through each entry type within this FY ──
      JE_TYPES2.forEach(jeType => {
        // Check if ANY lease has this type with amt > 0 in this FY
        const typeHasData = portfolio.some(l => {
          const fb = ((l.savedState || l.state)?.fyJournals||[]).find(f => f.fy === fy);
          if (!fb) return false;
          const e = fb.entries.find(en => en.label === jeType);
          if (!e) return false;
          return e.lines.reduce((s,ln)=>s+(ln.dr||0),0) > 0;
        });
        if (!typeHasData) return;

        // Entry-type sub-header (medium-blue band)
        const secRow = wsByType.rowCount + 1;
        wsByType.mergeCells(secRow, 1, secRow, 5);
        const jtHead = wsByType.getCell(secRow, 1);
        jtHead.value = '[ ' + jeType + ' ]';
        jtHead.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+CLR.subHeader } };
        jtHead.font  = { name:'Calibri', bold:true, size:10, color:{ argb:'FFFFFFFF' } };
        jtHead.border = border;
        jtHead.alignment = { horizontal:'left', vertical:'middle' };
        wsByType.getRow(secRow).height = 20;

        // Column sub-headers
        const subHR2 = wsByType.addRow(ledgerHdr); subHR2.height = 17;
        subHR2.eachCell(cell => { cell.fill=subFill; cell.font=hFont; cell.border=border; cell.alignment={horizontal:'center',vertical:'middle'}; });

        // Collect per-lease amounts
        const perLease = portfolio.map(l => {
          const fb = ((l.savedState || l.state)?.fyJournals||[]).find(f => f.fy === fy);
          if (!fb) return { amt:0, drAcc:jeType, crAcc:jeType };
          const entry = fb.entries.find(e => e.label === jeType);
          if (!entry) return { amt:0, drAcc:jeType, crAcc:jeType };
          const amt = Utils.round2(entry.lines.reduce((s,ln)=>s+(ln.dr||0),0));
          const drLine = entry.lines.find(ln => ln.dr != null);
          const crLine = entry.lines.find(ln => ln.cr != null);
          return {
            amt,
            drAcc: drLine ? drLine.account : jeType,
            crAcc: crLine ? crLine.account : jeType
          };
        });

        const drCellRefs = [], crCellRefs = [];

        // Dr rows (light blue) — one per lease, skip zero
        portfolio.forEach((l, li) => {
          const { amt, drAcc } = perLease[li];
          if (amt <= 0) return;
          const row = wsByType.addRow([fy, l.label, '(Dr) ' + drAcc, amt, '']);
          row.height = 16; styleDataRow2(row, true);
          drCellRefs.push('D' + wsByType.rowCount);
        });

        // Cr rows (light yellow) — one per lease, skip zero
        portfolio.forEach((l, li) => {
          const { amt, crAcc } = perLease[li];
          if (amt <= 0) return;
          const row = wsByType.addRow([fy, l.label, '    (Cr) ' + crAcc, '', amt]);
          row.height = 16; styleDataRow2(row, false);
          crCellRefs.push('E' + wsByType.rowCount);
        });

        // Consolidated Total for this entry type in this FY
        const typeTotRow = wsByType.addRow([
          fy + ' - Consolidated Total', '', '',
          drCellRefs.length ? { formula: drCellRefs.join('+') } : 0,
          crCellRefs.length ? { formula: crCellRefs.join('+') } : 0
        ]);
        typeTotRow.height = 18; styleTotRow2(typeTotRow);
        fyGrandDrRefs.push('D' + wsByType.rowCount);
        fyGrandCrRefs.push('E' + wsByType.rowCount);
        wsByType.addRow([]); // spacer between entry types
      }); // end JE_TYPES2.forEach

      // ── FY Grand Total (all entry types combined for this FY) ──
      if (fyGrandDrRefs.length > 0) {
        const fyGT = wsByType.addRow([
          fy + ' - Grand Total (All Entries)', '', '',
          { formula: fyGrandDrRefs.join('+') },
          { formula: fyGrandCrRefs.join('+') }
        ]);
        fyGT.height = 24;
        fyGT.eachCell((cell, ci) => {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+CLR.header } };
          cell.font = { name:'Calibri', bold:true, size:10, color:{ argb:'FFFFFFFF' } };
          cell.border = border;
          cell.alignment = { horizontal: ci <= 3 ? 'left' : 'right', vertical:'middle' };
          if (ci >= 4) cell.numFmt = numFmt;
        });
      }
      // Two spacer rows between FYs
      wsByType.addRow([]); wsByType.addRow([]);
    }); // end allFYs2.forEach
    wsByType.columns = ledgerCols;

    /* ── SHEET: Portfolio Disclosure (Ind AS 116 Notes to Accounts) ── */
    const wsDisc = wb.addWorksheet('Portfolio Disclosure', { tabColor: { argb: 'FF1E3A5F' }, views: [{ state: 'frozen', ySplit: 2 }] });
    wsDisc.columns = [{ width: 52 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

    const discHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    const discSubFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A9F' } };
    const discTotFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
    const discEvenFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9FF' } };
    const discOddFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    const wFont  = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' }, bold: true };
    const nFont  = { name: 'Calibri', size: 10 };
    const bFont  = { name: 'Calibri', size: 10, bold: true };
    const discBorder = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } };

    const addDiscTitle = (ws, text, mergeCols = 9) => {
      const rIdx = ws.rowCount + 1;
      ws.mergeCells(rIdx, 1, rIdx, mergeCols);
      const r = ws.getRow(rIdx); r.height = 28;
      const c = ws.getCell(rIdx, 1);
      c.value = text; c.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = discHeaderFill; c.alignment = { horizontal: 'center', vertical: 'middle' };
    };
    const addDiscSection = (ws, text, level = 1, mergeCols = 9) => {
      const fills = { 1: 'FF1E3A5F', 2: 'FF2D6A9F', 3: 'FF3A7BD5' };
      const rIdx = ws.rowCount + 1;
      ws.mergeCells(rIdx, 1, rIdx, mergeCols);
      const r = ws.getRow(rIdx); r.height = 20;
      const c = ws.getCell(rIdx, 1);
      c.value = text; c.font = { name: 'Calibri', size: level === 1 ? 11 : 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (fills[level] || fills[1]).slice(2) } };
      c.alignment = { horizontal: 'left', vertical: 'middle' };
    };
    const addDiscSubhead = (ws, text, mergeCols = 9) => {
      const rIdx = ws.rowCount + 1;
      ws.mergeCells(rIdx, 1, rIdx, mergeCols);
      const r = ws.getRow(rIdx); r.height = 18;
      const c = ws.getCell(rIdx, 1);
      c.value = text; c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E3A5F' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
      c.alignment = { horizontal: 'left', vertical: 'middle' };
    };

    // Helpers
    const allFYs_disc = [...new Set(portfolio.flatMap(l => {
      const ss = l.savedState || l.state; return (ss && ss.fySummary || []).map(r => r.fy);
    }))].sort();
    const consol_disc = (() => {
      const fields = ['openBal','interest','payments','closeBal','currentLiab','nonCurrentLiab','dep','rouCloseBV'];
      const fyMap = {};
      portfolio.forEach(l => {
        const ss = l.savedState || l.state;
        (ss && ss.fySummary || []).forEach(row => {
          if (!fyMap[row.fy]) fyMap[row.fy] = { fy: row.fy, openBal:0, interest:0, payments:0, closeBal:0, currentLiab:0, nonCurrentLiab:0, dep:0, rouCloseBV:0 };
          fields.forEach(f => { fyMap[row.fy][f] = Utils.round2((fyMap[row.fy][f] || 0) + (row[f] || 0)); });
        });
      });
      return Object.values(fyMap).sort((a, b) => a.fy < b.fy ? -1 : 1);
    })();
    const totPV   = Utils.round2(portfolio.reduce((s, l) => { const ss = l.savedState || l.state; return s + ((ss && ss.pvResult) ? ss.pvResult.totalPV : 0); }, 0));
    const totROU  = Utils.round2(portfolio.reduce((s, l) => { const ss = l.savedState || l.state; return s + ((ss && ss.inputs) ? ss.inputs.rouInitial : 0); }, 0));
    const totInt  = Utils.round2(portfolio.reduce((s, l) => { const ss = l.savedState || l.state; return s + ((ss && ss.inputs) ? ss.inputs.totalInterest : 0); }, 0));
    const totPmt  = Utils.round2(portfolio.reduce((s, l) => { const ss = l.savedState || l.state; return s + ((ss && ss.inputs) ? ss.inputs.totalPayments : 0); }, 0));
    const totDep  = Utils.round2(portfolio.reduce((s, l) => { const ss = l.savedState || l.state; return s + ((ss && ss.inputs) ? ss.inputs.totalDep : 0); }, 0));

    // Title row
    addDiscTitle(wsDisc, 'Ind AS 116 \u2013 Notes to Accounts: Leases (Portfolio Consolidated Disclosure)');
    // Meta row
    const discMeta = wsDisc.addRow([`Consolidated across ${portfolio.length} lease(s)  |  Prepared by: CA Jimi R Modi  |  Generated: ${new Date().toLocaleDateString('en-IN')}`]);
    wsDisc.mergeCells(wsDisc.rowCount, 1, wsDisc.rowCount, 9);
    discMeta.height = 16; discMeta.getCell(1).font = { name: 'Calibri', size: 9, italic: true }; discMeta.getCell(1).fill = lightFill;

    // KPI Summary
    wsDisc.addRow([]);
    const kpiHdrR = wsDisc.addRow(['Leases in Portfolio','Total Lease Liability (PV)','Total ROU Asset','Total Interest Expense','Total Cash Outflows','Total Depreciation','','','']);
    kpiHdrR.height = 18; kpiHdrR.eachCell((c, ci) => { if (ci <= 6) { c.font = wFont; c.fill = discSubFill; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = discBorder; } });
    const kpiValR = wsDisc.addRow([portfolio.length, Utils.fmtINR(totPV), Utils.fmtINR(totROU), Utils.fmtINR(totInt), Utils.fmtINR(totPmt), Utils.fmtINR(totDep), '','','']);
    kpiValR.height = 20; kpiValR.eachCell((c, ci) => { if (ci <= 6) { c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A5F' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = discBorder; } });
    wsDisc.addRow([]);

    // Section 1: Accounting Policy (text)
    addDiscSection(wsDisc, '1.  Accounting Policy \u2013 Leases (Ind AS 116, Paragraphs 10\u201350)', 1);
    const policyText = [
      'The Company assesses at contract inception whether a contract is, or contains, a lease. A contract contains a lease if it conveys the right to control the use of an identified asset for a period in exchange for consideration (Para 10\u201316).',
      'At the commencement date, the Company recognises a right-of-use (ROU) asset and a corresponding lease liability for all leases, except short-term leases (term \u226412 months) and leases of low-value assets (Para 22).',
      'Lease liabilities are measured at the present value of lease payments not yet paid, discounted at the incremental borrowing rate (IBR) at commencement. The ROU asset is initially measured at cost comprising: (i) the initial lease liability; (ii) lease payments at commencement; (iii) initial direct costs; (iv) restoration costs; less lease incentives received (Para 26\u201331).',
      'Subsequent to commencement, the lease liability increases by interest accrued (effective interest method) and reduces by lease payments. The ROU asset is depreciated on a straight-line basis over the lease term (Para 36). Lease liabilities are classified as current (\u226412m) and non-current (>12m).',
    ];
    policyText.forEach(text => {
      const ri = wsDisc.rowCount + 1;
      wsDisc.mergeCells(ri, 1, ri, 9);
      const pr = wsDisc.addRow([text]);
      pr.height = 48; pr.getCell(1).font = nFont; pr.getCell(1).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    });
    wsDisc.addRow([]);

    // Section 2: Amounts Recognised — FY-wise consolidated tables
    addDiscSection(wsDisc, '2.  Amounts Recognised in Financial Statements (Para 52\u201353)', 1);

    if (consol_disc.length > 0) {
      const fyCount = allFYs_disc.length;
      const totalMergeCols = 1 + fyCount;

      // 2a: Lease Liability Movement
      addDiscSubhead(wsDisc, '2(a)  Movement in Lease Liability (\u20B9)  [Para 52(a), 53(b)]', totalMergeCols);
      const hdr2a = wsDisc.addRow(['Particulars', ...allFYs_disc]); hdr2a.height = 18;
      hdr2a.eachCell((c, ci) => { if (ci <= totalMergeCols) { c.font = wFont; c.fill = discSubFill; c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' }; c.border = discBorder; } });
      [
        ['Opening Lease Liability', 'openBal', false],
        ['Add: Interest Accrued (IBR)', 'interest', false],
        ['Less: Lease Payments Made', 'payments', false],
        ['Closing Lease Liability', 'closeBal', true],
        ['  \u2013 Current Portion', 'currentLiab', false],
        ['  \u2013 Non-Current Portion', 'nonCurrentLiab', false],
      ].forEach(([lbl, fld, isTot], ri) => {
        const dr = wsDisc.addRow([lbl, ...consol_disc.map(r => r[fld])]);
        dr.height = 16;
        dr.eachCell((c, ci) => {
          if (ci > totalMergeCols) return;
          c.border = discBorder; c.font = isTot ? bFont : nFont;
          c.fill = isTot ? { type:'pattern', pattern:'solid', fgColor:{argb:'FFDBEAFE'} } : (ri % 2 === 0 ? discEvenFill : discOddFill);
          c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' };
          if (ci > 1) c.numFmt = numFmt;
        });
      });
      wsDisc.addRow([]);

      // 2b: ROU Asset Movement
      addDiscSubhead(wsDisc, '2(b)  Movement in Right-of-Use Asset (\u20B9)  [Para 29\u201331, 36]', totalMergeCols);
      const hdr2b = wsDisc.addRow(['Particulars', ...allFYs_disc]); hdr2b.height = 18;
      hdr2b.eachCell((c, ci) => { if (ci <= totalMergeCols) { c.font = wFont; c.fill = discSubFill; c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' }; c.border = discBorder; } });
      [
        ['Opening Book Value', consol_disc.map((r, i) => i === 0 ? totROU : consol_disc[i-1].rouCloseBV), false],
        ['Less: Depreciation',  consol_disc.map(r => r.dep), false],
        ['Closing Book Value',  consol_disc.map(r => r.rouCloseBV), true],
      ].forEach(([lbl, vals, isTot], ri) => {
        const dr = wsDisc.addRow([lbl, ...vals]);
        dr.height = 16;
        dr.eachCell((c, ci) => {
          if (ci > totalMergeCols) return;
          c.border = discBorder; c.font = isTot ? bFont : nFont;
          c.fill = isTot ? { type:'pattern', pattern:'solid', fgColor:{argb:'FFDBEAFE'} } : (ri % 2 === 0 ? discEvenFill : discOddFill);
          c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' };
          if (ci > 1) c.numFmt = numFmt;
        });
      });
      wsDisc.addRow([]);

      // 2c: P&L Impact
      addDiscSubhead(wsDisc, '2(c)  Impact on Statement of Profit & Loss (\u20B9)  [Para 49, 53(b)]', totalMergeCols);
      const hdr2c = wsDisc.addRow(['Particulars', ...allFYs_disc]); hdr2c.height = 18;
      hdr2c.eachCell((c, ci) => { if (ci <= totalMergeCols) { c.font = wFont; c.fill = discSubFill; c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' }; c.border = discBorder; } });
      [
        ['Finance Costs \u2013 Interest on Lease Liability', consol_disc.map(r => r.interest), false],
        ['Depreciation \u2013 Right-of-Use Asset', consol_disc.map(r => r.dep), false],
        ['Total Lease P&L Impact', consol_disc.map(r => Utils.round2(r.interest + r.dep)), true],
      ].forEach(([lbl, vals, isTot], ri) => {
        const dr = wsDisc.addRow([lbl, ...vals]);
        dr.height = 16;
        dr.eachCell((c, ci) => {
          if (ci > totalMergeCols) return;
          c.border = discBorder; c.font = isTot ? bFont : nFont;
          c.fill = isTot ? { type:'pattern', pattern:'solid', fgColor:{argb:'FFDBEAFE'} } : (ri % 2 === 0 ? discEvenFill : discOddFill);
          c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' };
          if (ci > 1) c.numFmt = numFmt;
        });
      });
      wsDisc.addRow([]);

      // 2d: Cash Flows
      addDiscSubhead(wsDisc, '2(d)  Cash Outflows from Leases (\u20B9)  [Para 52(b), 54(e)]', totalMergeCols);
      const hdr2d = wsDisc.addRow(['Particulars', ...allFYs_disc]); hdr2d.height = 18;
      hdr2d.eachCell((c, ci) => { if (ci <= totalMergeCols) { c.font = wFont; c.fill = discSubFill; c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' }; c.border = discBorder; } });
      [
        ['Operating \u2013 Interest Paid on Lease', consol_disc.map(r => r.interest), false],
        ['Financing \u2013 Principal Repayment', consol_disc.map(r => Utils.round2(r.payments - r.interest)), false],
        ['Total Cash Outflow from Leases', consol_disc.map(r => r.payments), true],
      ].forEach(([lbl, vals, isTot], ri) => {
        const dr = wsDisc.addRow([lbl, ...vals]);
        dr.height = 16;
        dr.eachCell((c, ci) => {
          if (ci > totalMergeCols) return;
          c.border = discBorder; c.font = isTot ? bFont : nFont;
          c.fill = isTot ? { type:'pattern', pattern:'solid', fgColor:{argb:'FFDBEAFE'} } : (ri % 2 === 0 ? discEvenFill : discOddFill);
          c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' };
          if (ci > 1) c.numFmt = numFmt;
        });
      });
      wsDisc.addRow([]);
    }

    // Section 3: Maturity Analysis
    addDiscSection(wsDisc, '3.  Maturity Analysis \u2013 Undiscounted Lease Payments (Para 52(b))', 1);
    const today_disc = new Date();
    const matBands = [
      { label: 'Less than 1 year',  min: 0,  max: 12,       amount: 0 },
      { label: '1 \u2013 2 years',  min: 12, max: 24,       amount: 0 },
      { label: '2 \u2013 3 years',  min: 24, max: 36,       amount: 0 },
      { label: '3 \u2013 5 years',  min: 36, max: 60,       amount: 0 },
      { label: 'More than 5 years', min: 60, max: Infinity,  amount: 0 },
    ];
    portfolio.forEach(l => {
      const ss = l.savedState || l.state;
      (ss && ss.amortRows || []).forEach(row => {
        const dt = new Date(row.date);
        const mAway = (dt.getFullYear() - today_disc.getFullYear()) * 12 + (dt.getMonth() - today_disc.getMonth());
        matBands.forEach(b => { if (mAway >= b.min && mAway < b.max) b.amount += (row.payment || 0); });
      });
    });
    const matFiltered = matBands.map(b => ({ ...b, amount: Utils.round2(b.amount) })).filter(b => b.amount > 0);
    const matHdr = wsDisc.addRow(['Time Band', 'Undiscounted Payments (\u20B9)']); matHdr.height = 18;
    matHdr.eachCell((c, ci) => { if (ci <= 2) { c.font = wFont; c.fill = discSubFill; c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' }; c.border = discBorder; } });
    let matTotal = 0;
    matFiltered.forEach((b, bi) => {
      matTotal += b.amount;
      const mr = wsDisc.addRow([b.label, b.amount]); mr.height = 16;
      mr.eachCell((c, ci) => { if (ci <= 2) { c.border = discBorder; c.font = nFont; c.fill = bi % 2 === 0 ? discEvenFill : discOddFill; c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' }; if (ci === 2) c.numFmt = numFmt; } });
    });
    const matTotR = wsDisc.addRow(['Total Undiscounted Payments', Utils.round2(matTotal)]); matTotR.height = 18;
    matTotR.eachCell((c, ci) => { if (ci <= 2) { c.border = discBorder; c.font = bFont; c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFDBEAFE'} }; c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' }; if (ci === 2) c.numFmt = numFmt; } });
    wsDisc.addRow([]);

    // Section 4: Key Assumptions per lease
    addDiscSection(wsDisc, '4.  Significant Judgements & Key Assumptions (Para 60)', 1);
    const hdr4 = wsDisc.addRow(['Lease Name', 'Period', 'Term', 'IBR', 'Frequency', 'Escalation', 'Lease Liability (PV)', 'ROU Asset', '']);
    hdr4.height = 18;
    hdr4.eachCell((c, ci) => { if (ci <= 8) { c.font = wFont; c.fill = discSubFill; c.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle', wrapText: true }; c.border = discBorder; } });
    portfolio.forEach((l, li) => {
      const ss  = l.savedState || l.state;
      if (!ss || !ss.inputs) return;
      const inp = ss.inputs;
      const pv  = ss.pvResult ? ss.pvResult.totalPV : 0;
      const escStr = inp.hasVarPayments && inp.escalationRate ? `${inp.escalationRate}% p.a.` : 'Nil';
      const freqLbl = { monthly:'Monthly', quarterly:'Quarterly', 'half-yearly':'Half-Yearly', yearly:'Yearly' }[inp.frequency] || inp.frequency;
      const dr = wsDisc.addRow([l.label, `${Utils.fmtDate(new Date(inp.startDate))} \u2013 ${Utils.fmtDate(new Date(inp.endDate))}`, `${inp.leaseTerm}m`, `${inp.roi}% p.a.`, freqLbl, escStr, pv, inp.rouInitial, '']);
      dr.height = 16;
      dr.eachCell((c, ci) => {
        if (ci > 8) return;
        c.border = discBorder; c.font = nFont;
        c.fill = li % 2 === 0 ? discEvenFill : discOddFill;
        c.alignment = ci <= 2 ? { horizontal:'left' } : { horizontal:'center', vertical:'middle' };
        if (ci >= 7) { c.numFmt = numFmt; c.alignment = { horizontal:'right' }; }
      });
    });
    wsDisc.addRow([]);

    // Section 5: Per-Lease Contribution
    addDiscSection(wsDisc, '5.  Per-Lease Contribution to Consolidated Figures (\u20B9)', 1);
    portfolio.forEach((l, li) => {
      const ss = l.savedState || l.state;
      if (!ss || !ss.inputs || !ss.fySummary || !ss.fySummary.length) return;
      const inp = ss.inputs;
      // Lease banner
      const bannerIdx = wsDisc.rowCount + 1;
      wsDisc.mergeCells(bannerIdx, 1, bannerIdx, 9);
      const bannerR = wsDisc.addRow([`${l.label}  |  ${Utils.fmtDate(new Date(inp.startDate))} \u2013 ${Utils.fmtDate(new Date(inp.endDate))}  |  IBR ${inp.roi}%  |  PV: ${Utils.fmtINR(ss.pvResult ? ss.pvResult.totalPV : 0)}`]);
      bannerR.height = 18; bannerR.getCell(1).font = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} }; bannerR.getCell(1).fill = discSubFill;
      // FY table header
      const phdr = wsDisc.addRow(['Financial Year','Opening Liability','Interest Accrued','Payments Made','Closing Liability','Current','Non-Current','Depreciation','ROU BV']);
      phdr.height = 17;
      phdr.eachCell((c, ci) => { c.font = wFont; c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF3A7BD5'} }; c.alignment = { horizontal:'center', vertical:'middle', wrapText:true }; c.border = discBorder; });
      ss.fySummary.forEach((row, ri) => {
        const dr = wsDisc.addRow([row.fy, row.openBal, row.interest, row.payments, row.closeBal, row.currentLiab, row.nonCurrentLiab, row.dep, row.rouCloseBV]);
        dr.height = 16;
        dr.eachCell((c, ci) => {
          c.border = discBorder; c.font = nFont;
          c.fill = ri % 2 === 0 ? discEvenFill : discOddFill;
          c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' };
          if (ci > 1) c.numFmt = numFmt;
        });
      });
      // Lease total
      const lTot = wsDisc.addRow(['Lease Total', '', inp.totalInterest, inp.totalPayments, '', '', '', inp.totalDep, '']);
      lTot.height = 16;
      lTot.eachCell((c, ci) => { c.border = discBorder; c.font = bFont; c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFDBEAFE'} }; c.alignment = ci === 1 ? { horizontal:'left' } : { horizontal:'right' }; if (ci > 1 && c.value) c.numFmt = numFmt; });
      wsDisc.addRow([]);
    });

    // Grand total
    const gtRow = wsDisc.addRow([`Portfolio Grand Total  |  Interest: ${Utils.fmtINR(totInt)}  |  Payments: ${Utils.fmtINR(totPmt)}  |  Depreciation: ${Utils.fmtINR(totDep)}`]);
    wsDisc.mergeCells(wsDisc.rowCount, 1, wsDisc.rowCount, 9);
    gtRow.height = 20; gtRow.getCell(1).font = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} }; gtRow.getCell(1).fill = discHeaderFill; gtRow.getCell(1).alignment = { horizontal:'center', vertical:'middle' };
    wsDisc.addRow([]);

    // Section 6: Additional Disclosures
    addDiscSection(wsDisc, '6.  Additional Mandatory Disclosures (Para 53\u201360)', 1);
    const addlDisc = [
      ['6(a) Short-term Lease Expense (Para 53(b))', 'The Company does not have any leases with a lease term of 12 months or less accounted for under the short-term lease exemption. No short-term lease expense is recognised during the period. (Nil)'],
      ['6(b) Low-value Asset Lease Expense (Para 53(c))', 'The Company does not have any leases of low-value assets accounted for under the low-value exemption. (Nil)'],
      ['6(c) Variable Lease Payments Not in Liability (Para 53(d))', 'There are no variable lease payments that do not depend on an index or rate excluded from the measurement of the lease liability. (Nil)'],
      ['6(d) Income from Sub-leasing ROU Assets (Para 53(e))', 'The Company has not sub-leased any right-of-use assets during the period. (Nil)'],
      ['6(e) Future Cash Outflows Not in Liabilities (Para 59)', 'The leases in this portfolio do not contain extension options, termination options, or residual value guarantees beyond those already included in the measurement of the respective lease liabilities.'],
      ['6(f) Managing Liquidity Risk from Leases (Para 60)', `The Company manages liquidity risk by maintaining adequate cash reserves and committed credit facilities. The maturity profile is disclosed in Section 3 above. Portfolio covers ${portfolio.length} lease commitment${portfolio.length !== 1 ? 's' : ''}.`],
    ];
    addlDisc.forEach(([heading, body], idx) => {
      const hri = wsDisc.rowCount + 1;
      wsDisc.mergeCells(hri, 1, hri, 9);
      const hr = wsDisc.addRow([heading]); hr.height = 18;
      hr.getCell(1).font = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} }; hr.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1E3A5F'} };
      const bri = wsDisc.rowCount + 1;
      wsDisc.mergeCells(bri, 1, bri, 9);
      const br = wsDisc.addRow([body]); br.height = 42;
      br.getCell(1).font = nFont; br.getCell(1).fill = idx % 2 === 0 ? discEvenFill : discOddFill;
      br.getCell(1).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    });

    /* ── SHEET: Disclaimer ── */
    const wsDis = wb.addWorksheet('Disclaimer', { tabColor: { argb: 'FF7B341E' } });
    wsDis.columns = [{ width: 115 }];

    // Title bar
    const disTitle = wsDis.addRow(['DISCLAIMER & TERMS OF USE']);
    disTitle.height = 30;
    const disTCell = disTitle.getCell(1);
    disTCell.font      = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    disTCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B341E' } };
    disTCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Sub-title bar
    const disSub = wsDis.addRow(['Ind AS 116 Lease Accounting Tool  |  CA Jimi R Modi — Practicing Chartered Accountant']);
    disSub.height = 18;
    const disSCell = disSub.getCell(1);
    disSCell.font      = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
    disSCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.subHeader } };
    disSCell.alignment = { vertical: 'middle', horizontal: 'left' };

    wsDis.addRow([]);

    // Warning banner
    const disWarn = wsDis.addRow(['⚠  IMPORTANT: Please read this disclaimer carefully before using this tool. Use of this tool constitutes your acceptance of the following terms and conditions.']);
    disWarn.height = 28;
    const disWCell = disWarn.getCell(1);
    disWCell.font      = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF92400E' } };
    disWCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };
    disWCell.border    = { left: { style: 'thick', color: { argb: 'FFF59E0B' } } };
    disWCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    wsDis.addRow([]);

    const DISC_CLAUSES = [
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

    DISC_CLAUSES.forEach(([heading, body], idx) => {
      const hRow = wsDis.addRow([heading]);
      hRow.height = 20;
      const hCell = hRow.getCell(1);
      hCell.font      = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      hCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.header } };
      hCell.alignment = { vertical: 'middle', horizontal: 'left' };

      const bRow = wsDis.addRow([body]);
      bRow.height = 54;
      const bCell = bRow.getCell(1);
      bCell.font      = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
      bCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      bCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

      wsDis.addRow([]);
    });

    // Footer bar
    const disFoot = wsDis.addRow(['© CA Jimi R Modi — Practicing Chartered Accountant  |  Ind AS 116 Lease Accounting Tool']);
    const disFCell = disFoot.getCell(1);
    disFCell.font      = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    disFCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.subHeader } };
    disFCell.alignment = { vertical: 'middle', horizontal: 'center' };

/* â� Rs.â� Rs. Write and download â� Rs.â� Rs. */
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `ConsolidatedPortfolio_${_today()}.xlsx`);
  };

  /* â� Rs.â� Rs. Helper â� Rs.â� Rs. */
  const _today = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  };

  return { exportJSON, importJSON, buildConsolidated, renderConsolidatedView, exportConsolidatedExcel };

})();
