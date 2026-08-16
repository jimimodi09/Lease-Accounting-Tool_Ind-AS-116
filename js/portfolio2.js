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
            if (l.state && l.state.inputs) {
              l.state.inputs.startDate = new Date(l.state.inputs.startDate);
              l.state.inputs.endDate   = new Date(l.state.inputs.endDate);
            }
            if (l.state && l.state.amortRows) {
              l.state.amortRows.forEach(r => { r.date = new Date(r.date); });
            }
            if (l.state && l.state.pvResult && l.state.pvResult.schedule) {
              l.state.pvResult.schedule.forEach(r => { r.date = new Date(r.date); });
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
      const s = l.state;
      if (!s) return;
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
    const leaseRows = portfolio.map(l => `
      <tr>
        <td style="text-align:left;font-weight:500;">${l.label}</td>
        <td>${Utils.fmtDate(new Date(l.state.inputs.startDate))}</td>
        <td>${Utils.fmtDate(new Date(l.state.inputs.endDate))}</td>
        <td>${l.state.inputs.leaseTerm}m</td>
        <td>${l.state.inputs.roi}%</td>
        <td>${Utils.fmtINR((l.state.pvResult && l.state.pvResult.totalPV) || 0)}</td>
        <td>${Utils.fmtINR(l.state.inputs.rouInitial)}</td>
        <td>${Utils.fmtINR(l.state.inputs.totalInterest)}</td>
        <td>${Utils.fmtINR(l.state.inputs.totalPayments)}</td>
      </tr>`).join('');

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
        ? inp.escalationRate + '%'
        : 'Rs. ' + inp.escalationRate + ' (Fixed)';
    };
    const getEscFreq = (inp) => {
      if (!inp.hasVarPayments || !inp.escalationRate) return 'Nil';
      if (String(inp.escalationFreq) === 'custom') return 'Every ' + inp.escalationCustom + 'm';
      const freqMap = { '6': 'Every 6 Months', '12': 'Annual', '24': 'Bi-Annual', '36': 'Tri-Annual' };
      return freqMap[String(inp.escalationFreq)] || ('Every ' + inp.escalationFreq + 'm');
    };

    portfolio.forEach((l, idx) => {
      const s = l.state;
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

    ws1.columns = [{ width: 32 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 18 }, { width: 22 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }];

    /* â� Rs.â� Rs. SHEET 2: Consolidated FY Summary â� Rs.â� Rs. */
    const ws2 = wb.addWorksheet('Consolidated FY Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
    ws2.mergeCells('A1:I1');
    const t3 = ws2.getCell('A1');
    t3.value = 'Ind AS 116  -  Consolidated FY-wise Lease Summary (All Leases)';
    t3.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF' + CLR.white } };
    t3.fill  = headerFill; t3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 28;

    ws2.mergeCells('A2:I2');
    const t4 = ws2.getCell('A2');
    t4.value = `Aggregated across ${portfolio.length} lease(s)  |  Generated: ${new Date().toLocaleString('en-IN')}`;
    t4.font  = { name: 'Calibri', italic: true, size: 9 }; t4.fill = lightFill; t4.alignment = { horizontal: 'center' };

    const s2Headers = ['Financial Year','Opening Liability Rs.','Interest Accrued Rs.','Payments Rs.','Closing Liability Rs.','Current Portion Rs.','Non-Current Portion Rs.','Depreciation Rs.','ROU Book Value Rs.'];
    const s2HRow = ws2.addRow(s2Headers);
    s2HRow.height = 20;
    s2HRow.eachCell((cell, i) => {
      cell.fill = headerFill; cell.font = hFont; cell.border = border;
      cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
    });

    c.fySummary.forEach((r, idx) => {
      const row = ws2.addRow([r.fy, r.openBal, r.interest, r.payments, r.closeBal, r.currentLiab, r.nonCurrentLiab, r.dep, r.rouCloseBV]);
      row.height = 18;
      const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      row.eachCell((cell, ci) => {
        cell.fill = fill; cell.font = normFont; cell.border = border;
        cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
        if (ci > 1) cell.numFmt = numFmt;
      });
    });

    // Grand total row
    const gt = ws2.addRow(['Grand Total', '', Utils.round2(c.fySummary.reduce((s,r)=>s+r.interest,0)), Utils.round2(c.fySummary.reduce((s,r)=>s+r.payments,0)), '', '', '', Utils.round2(c.fySummary.reduce((s,r)=>s+r.dep,0)), '']);
    gt.height = 20;
    gt.eachCell((cell, ci) => {
      cell.fill = totalFill; cell.font = boldFont; cell.border = border;
      cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
      if (ci > 1) cell.numFmt = numFmt;
    });

    ws2.columns = [{ width: 16 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 20 }, { width: 16 }, { width: 18 }];

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
      portfolio.flatMap(l => (l.state.fyJournals || []).map(f => f.fy))
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
        const fyJournals = l.state.fyJournals || [];
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
    const allFYs2 = [...new Set(portfolio.flatMap(l => (l.state.fyJournals||[]).map(f=>f.fy)))].sort();
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
        (l.state.fyJournals||[]).some(fb =>
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
          const fb = (l.state.fyJournals||[]).find(f => f.fy === fy);
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
          const fb = (l.state.fyJournals||[]).find(f => f.fy === fy);
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
