/* â”€â”€ portfolio.js â€“ Portfolio Consolidation Module â”€â”€ */
'use strict';

const Portfolio = (() => {

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     EXPORT JSON  â€“  Save entire portfolio to a .json file
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     IMPORT JSON  â€“  Load portfolio from a .json file
     callback(leases) called with parsed array on success
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     BUILD CONSOLIDATED  â€“  Aggregate all leases by FY
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const buildConsolidated = (portfolio) => {
    if (!portfolio || portfolio.length === 0) return null;

    // Portfolio-level totals
    let totalPV       = 0, totalROU  = 0, totalInterest = 0,
        totalPayments = 0, totalDep  = 0;

    // FY-wise aggregation map: fy => { openBal, interest, payments, closeBal, currentLiab, nonCurrentLiab, dep, rouCloseBV }
    const fyMap = {};

    portfolio.forEach(l => {
      const s = l.state;
      totalPV       += s.pvResult.totalPV;
      totalROU      += s.inputs.rouInitial;
      totalInterest += s.inputs.totalInterest;
      totalPayments += s.inputs.totalPayments;
      totalDep      += s.inputs.totalDep;

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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     RENDER CONSOLIDATED VIEW  â€“  Populate #consolidatedView
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        <td>${Utils.fmtINR(l.state.pvResult.totalPV)}</td>
        <td>${Utils.fmtINR(l.state.inputs.rouInitial)}</td>
        <td>${Utils.fmtINR(l.state.inputs.totalInterest)}</td>
        <td>${Utils.fmtINR(l.state.inputs.totalPayments)}</td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="section-title" style="margin-top:0;">ðŸ“Š Consolidated Portfolio KPIs</div>
      <div class="kpi-grid">${kpiHtml}</div>

      <div class="section-title" style="margin-top:28px;">ðŸ“… Consolidated FY-wise Summary (All Leases)</div>
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

      <div class="section-title" style="margin-top:28px;">ðŸ“‹ Individual Lease Breakdown</div>
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     EXPORT CONSOLIDATED EXCEL  â€“  Multi-sheet ExcelJS workbook
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    // â”€â”€ Color palette â”€â”€
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

    /* â”€â”€ SHEET 1: Portfolio Summary â”€â”€ */
    const ws1 = wb.addWorksheet('Portfolio Summary', { views: [{ state: 'frozen', ySplit: 5 }] });
    ws1.mergeCells('A1:I1');
    const t1 = ws1.getCell('A1');
    t1.value = 'Ind AS 116 â€“ Consolidated Lease Portfolio Summary';
    t1.font  = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF' + CLR.white } };
    t1.fill  = headerFill;
    t1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 32;

    ws1.mergeCells('A2:I2');
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
    const s1Headers = ['Lease Name','Start Date','End Date','Term (months)','IBR (%)','Lease Liability (PV) â‚¹','ROU Asset â‚¹','Total Interest â‚¹','Total Payments â‚¹'];
    const s1Row = ws1.addRow(s1Headers);
    s1Row.height = 20;
    s1Row.eachCell((cell, i) => {
      cell.fill = headerFill; cell.font = hFont; cell.border = border;
      cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
    });

    portfolio.forEach((l, idx) => {
      const s = l.state;
      const row = ws1.addRow([
        l.label,
        Utils.fmtDate(new Date(s.inputs.startDate)),
        Utils.fmtDate(new Date(s.inputs.endDate)),
        s.inputs.leaseTerm,
        s.inputs.roi,
        s.pvResult.totalPV,
        s.inputs.rouInitial,
        s.inputs.totalInterest,
        s.inputs.totalPayments
      ]);
      row.height = 18;
      const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      row.eachCell((cell, ci) => {
        cell.fill = fill; cell.font = normFont; cell.border = border;
        cell.alignment = { horizontal: ci === 1 ? 'left' : ci <= 3 ? 'center' : 'right', vertical: 'middle' };
        if (ci >= 6) cell.numFmt = numFmt;
      });
    });

    // Totals row
    const totRow = ws1.addRow(['Portfolio Total', '', '', '', '', c.totalPV, c.totalROU, c.totalInterest, c.totalPayments]);
    totRow.height = 20;
    totRow.eachCell((cell, ci) => {
      cell.fill = totalFill; cell.font = boldFont; cell.border = border;
      cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
      if (ci >= 6) cell.numFmt = numFmt;
    });

    ws1.columns = [{ width: 32 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }];

    /* â”€â”€ SHEET 2: Consolidated FY Summary â”€â”€ */
    const ws2 = wb.addWorksheet('Consolidated FY Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
    ws2.mergeCells('A1:I1');
    const t3 = ws2.getCell('A1');
    t3.value = 'Ind AS 116 â€“ Consolidated FY-wise Lease Summary (All Leases)';
    t3.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF' + CLR.white } };
    t3.fill  = headerFill; t3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 28;

    ws2.mergeCells('A2:I2');
    const t4 = ws2.getCell('A2');
    t4.value = `Aggregated across ${portfolio.length} lease(s)  |  Generated: ${new Date().toLocaleString('en-IN')}`;
    t4.font  = { name: 'Calibri', italic: true, size: 9 }; t4.fill = lightFill; t4.alignment = { horizontal: 'center' };

    const s2Headers = ['Financial Year','Opening Liability â‚¹','Interest Accrued â‚¹','Payments â‚¹','Closing Liability â‚¹','Current Portion â‚¹','Non-Current Portion â‚¹','Depreciation â‚¹','ROU Book Value â‚¹'];
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

    /* â”€â”€ SHEET 3: Consolidated Journal Entries â”€â”€ */
    const wje = wb.addWorksheet('Consolidated Journal Entries', { views: [{ state: 'frozen', ySplit: 3 }] });
    wje.mergeCells('A1:G1');
    const tje = wje.getCell('A1');
    tje.value = 'Ind AS 116 â€“ Consolidated Journal Entries (All Leases, All FYs)';
    tje.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF' + CLR.white } };
    tje.fill  = headerFill; tje.alignment = { horizontal: 'center', vertical: 'middle' };
    wje.getRow(1).height = 28;

    wje.mergeCells('A2:G2');
    const tje2 = wje.getCell('A2');
    tje2.value = `Aggregated across ${portfolio.length} lease(s)  |  Generated: ${new Date().toLocaleString('en-IN')}  |  Prepared by: CA Jimi R Modi`;
    tje2.font  = { name: 'Calibri', italic: true, size: 9 }; tje2.fill = lightFill; tje2.alignment = { horizontal: 'center' };

    const jeHeaders = ['Financial Year', 'Lease Name', 'Journal Entry Type', 'Account / Particulars', 'Dr (â‚¹)', 'Cr (â‚¹)', 'Narration'];
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

    /* â”€â”€ SHEETS 4+: Per-Lease Amortisation â”€â”€ */
    portfolio.forEach((l) => {
      const safeName = (l.label || 'Lease').replace(/[:\\/?*\[\]]/g, '').substring(0, 25) + ' Amort';
      const wsl = wb.addWorksheet(safeName, { views: [{ state: 'frozen', ySplit: 3 }] });

      wsl.mergeCells('A1:I1');
      const tl = wsl.getCell('A1');
      tl.value = `${l.label} â€“ Lease Liability Amortisation Schedule`;
      tl.font  = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF' + CLR.white } };
      tl.fill  = subFill; tl.alignment = { horizontal: 'center', vertical: 'middle' };
      wsl.getRow(1).height = 26;

      wsl.mergeCells('A2:I2');
      const tl2 = wsl.getCell('A2');
      const s = l.state;
      tl2.value = `IBR: ${s.inputs.roi}%  |  Term: ${s.inputs.leaseTerm}m  |  PV: â‚¹${Utils.fmtNum(s.pvResult.totalPV)}  |  ROU: â‚¹${Utils.fmtNum(s.inputs.rouInitial)}`;
      tl2.font  = { name: 'Calibri', italic: true, size: 9 }; tl2.fill = lightFill; tl2.alignment = { horizontal: 'center' };

      const slHeaders = ['#', 'Date', 'FY', 'Months', 'Rate (%)', 'Opening Balance â‚¹', 'Interest â‚¹', 'Payment â‚¹', 'Closing Balance â‚¹'];
      const slHRow = wsl.addRow(slHeaders);
      slHRow.height = 20;
      slHRow.eachCell((cell) => {
        cell.fill = subFill; cell.font = hFont; cell.border = border;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      (s.amortRows || []).forEach((r, idx) => {
        const dateStr = r.date ? Utils.fmtDate(new Date(r.date)) : '';
        const row = wsl.addRow([r.period || (idx + 1), dateStr, r.fy || '', r.months || '', r.rate || '', r.openBal || 0, r.interest || 0, r.payment || 0, r.closeBal || 0]);
        row.height = 16;
        const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
        row.eachCell((cell, ci) => {
          cell.fill = fill; cell.font = normFont; cell.border = border;
          cell.alignment = { horizontal: ci <= 4 ? 'center' : 'right', vertical: 'middle' };
          if (ci >= 6) cell.numFmt = numFmt;
        });
      });

      wsl.columns = [{ width: 6 }, { width: 14 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 18 }];
    });

    /* â”€â”€ SHEETS: Per-Lease Journal Entries â”€â”€ */

    // jeRefMap: track Total row cell refs for formula-linked summary sheets
    const jeRefMap = [];
    const colLtr = (n) => { let s = ''; while (n > 0) { s = String.fromCharCode(65 + (n-1)%26) + s; n = Math.floor((n-1)/26); } return s; };
    portfolio.forEach((l, lIdx) => {
      const safeName = (l.label || 'Lease').replace(/[:\\/?*\[\]]/g, '').substring(0, 25) + ' JE';
      const wsje = wb.addWorksheet(safeName, { views: [{ state: 'frozen', ySplit: 3 }] });
      jeRefMap[lIdx] = { sheetName: safeName, label: l.label, fyMap: {} };

      wsje.mergeCells('A1:F1');
      const tjel = wsje.getCell('A1');
      tjel.value = `${l.label} â€“ Journal Entries (Ind AS 116)`;
      tjel.font  = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF' + CLR.white } };
      tjel.fill  = subFill; tjel.alignment = { horizontal: 'center', vertical: 'middle' };
      wsje.getRow(1).height = 26;

      wsje.mergeCells('A2:F2');
      const tje2l = wsje.getCell('A2');
      tje2l.value = `Prepared by: CA Jimi R Modi  |  Generated: ${new Date().toLocaleString('en-IN')}`;
      tje2l.font  = { name: 'Calibri', italic: true, size: 9 }; tje2l.fill = lightFill; tje2l.alignment = { horizontal: 'center' };

      const jeHdrs = ['Financial Year', 'Journal Entry Type', 'Account / Particulars', 'Dr (â‚¹)', 'Cr (â‚¹)', 'Narration'];
      const jeHR   = wsje.addRow(jeHdrs);
      jeHR.height  = 20;
      jeHR.eachCell((cell, ci) => {
        cell.fill = subFill; cell.font = hFont; cell.border = border;
        cell.alignment = { horizontal: ci <= 2 ? 'center' : ci === 3 ? 'left' : 'right', vertical: 'middle' };
      });

      let leRowIdx = 0;
      let curRow = 4; // rows 1,2=title/sub, row 3=header
      (l.state.fyJournals || []).forEach(fyBlock => {
        // FY subheading
        const fyR = wsje.addRow([fyBlock.fy, '', '', '', '', '']);
        fyR.height = 18;
        jeRefMap[lIdx].fyMap[fyBlock.fy] = {};
        fyR.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };
          cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF1E3A5F' } };
          cell.border = border;
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        });

        fyBlock.entries.forEach(entry => {
          entry.lines.forEach((line, lineIdx) => {
            const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leRowIdx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
            const row = wsje.addRow([
              lineIdx === 0 ? fyBlock.fy : '',
              lineIdx === 0 ? entry.label : '',
              (line.cr !== null ? '    ' : '') + line.account,
              line.dr != null ? line.dr : '',
              line.cr != null ? line.cr : '',
              lineIdx === 0 ? entry.narration : ''
            ]);
            row.height = 16;
            row.eachCell((cell, ci) => {
              cell.fill = fill; cell.font = normFont; cell.border = border;
              if (ci === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' };
              else if (ci >= 4 && ci <= 5) { cell.numFmt = numFmt; cell.alignment = { horizontal: 'right', vertical: 'middle' }; }
              else if (ci === 6) cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              else cell.alignment = { horizontal: 'left', vertical: 'middle' };
            });
            leRowIdx++;
          });

          // Totals per entry
          const drTotal = entry.lines.reduce((s, l) => s + (l.dr || 0), 0);
          const totFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.total } };
          const totRow  = wsje.addRow(['', 'Total', '', Utils.round2(drTotal), Utils.round2(drTotal), '']);
          totRow.height = 15;
          totRow.eachCell((cell, ci) => {
            cell.fill = totFill; cell.font = boldFont; cell.border = border;
            if (ci >= 4 && ci <= 5) { cell.numFmt = numFmt; cell.alignment = { horizontal: 'right', vertical: 'middle' }; }
            else cell.alignment = { horizontal: 'left', vertical: 'middle' };
          });
          // Store ref: wsje.rowCount = row number of this Total row
          jeRefMap[lIdx].fyMap[fyBlock.fy][entry.label] = { sheet: safeName, drCell: 'D' + wsje.rowCount, crCell: 'E' + wsje.rowCount };
        });
      });

      wsje.columns = [{ width: 14 }, { width: 26 }, { width: 38 }, { width: 16 }, { width: 16 }, { width: 44 }];
    });

    
    /* Consolidated JE by Entry Type - values from fySummary (no formula complexity) */
    const allFYs2 = [...new Set(portfolio.flatMap(l => (l.state.fyJournals||[]).map(f=>f.fy)))].sort();

    // Account name lookup from fyJournals
    const getAccNames = (jeType) => {
      for (const l of portfolio) {
        for (const fyBlock of (l.state.fyJournals||[])) {
          const entry = fyBlock.entries.find(e => e.label === jeType);
          if (entry) {
            const drLine = entry.lines.find(ln => ln.dr != null);
            const crLine = entry.lines.find(ln => ln.cr != null);
            return { drAcc: drLine ? drLine.account : jeType, crAcc: crLine ? crLine.account : jeType };
          }
        }
      }
      return { drAcc: jeType, crAcc: jeType };
    };

    // Get FY amount for a given entry type from fySummary
    const getFYAmt = (lease, fy, jeType) => {
      const fyRow = (lease.state.fySummary||[]).find(r => r.fy === fy);
      if (!fyRow) return 0;
      if (jeType === 'Initial Recognition') return 0; // handled separately
      if (jeType === 'Interest Accrual')        return Utils.round2(fyRow.interest  || 0);
      if (jeType === 'Lease Payment')            return Utils.round2(fyRow.payments  || 0);
      if (jeType === 'Depreciation of ROU Asset') return Utils.round2(fyRow.dep     || 0);
      return 0;
    };

    const ledgerCols = [{ width: 16 }, { width: 30 }, { width: 44 }, { width: 18 }, { width: 18 }];
    const ledgerHdr  = ['Financial Year', 'Lease / Entity', 'Account / Particulars', 'Dr (Rs.)', 'Cr (Rs.)'];

    const styleDataRow = (row, isDr) => {
      row.eachCell((cell, ci) => {
        cell.border = border;
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: isDr ? 'FFF0F8FF' : 'FFFFFDE7' } };
        cell.font = normFont;
        cell.alignment = { horizontal: ci <= 3 ? 'left' : 'right', vertical:'middle' };
        if (ci >= 4) cell.numFmt = numFmt;
      });
    };
    const styleTotRow = (row) => {
      row.eachCell((cell, ci) => {
        cell.fill = totalFill; cell.font = boldFont; cell.border = border;
        cell.alignment = { horizontal: ci <= 3 ? 'left' : 'right', vertical:'middle' };
        if (ci >= 4) cell.numFmt = numFmt;
      });
    };

    /* SHEET: Consolidated JE by Entry Type */
    const wsByType = wb.addWorksheet('Consolidated JE', { views: [{ state: 'frozen', ySplit: 3 }] });
    wsByType.mergeCells('A1:E1');
    const jttT = wsByType.getCell('A1');
    jttT.value = 'Ind AS 116 - Consolidated Journal Entries by Entry Type (All Leases)';
    jttT.font  = { name:'Calibri', bold:true, size:13, color:{ argb:'FF'+CLR.white } };
    jttT.fill  = headerFill; jttT.alignment = { horizontal:'center', vertical:'middle' };
    wsByType.getRow(1).height = 28;
    wsByType.mergeCells('A2:E2');
    const jttS = wsByType.getCell('A2');
    jttS.value = 'Consolidated: ' + portfolio.map(l => l.label).join(' + ')
               + ' | Blue = Debit | Yellow = Credit | Dr always equals Cr';
    jttS.font  = { name:'Calibri', italic:true, size:9 };
    jttS.fill  = lightFill; jttS.alignment = { horizontal:'center' };
    const jttHR = wsByType.addRow(ledgerHdr); jttHR.height = 22;
    jttHR.eachCell(cell => { cell.fill=headerFill; cell.font=hFont; cell.border=border; cell.alignment={horizontal:'center',vertical:'middle',wrapText:true}; });

    const JE_DEFS = [
      { type: 'Initial Recognition',      key: null       },
      { type: 'Interest Accrual',          key: 'interest' },
      { type: 'Lease Payment',             key: 'payments' },
      { type: 'Depreciation of ROU Asset', key: 'dep'      }
    ];

    JE_DEFS.forEach(({ type: jeType, key }) => {
      const { drAcc, crAcc } = getAccNames(jeType);

      // Check if any lease has this entry type in any FY
      const hasAnyData = portfolio.some(l => {
        if (jeType === 'Initial Recognition') return (l.state.fyJournals||[]).some(fb => fb.entries.some(e => e.label === jeType));
        return (l.state.fySummary||[]).some(r => (r[key]||0) > 0);
      });
      if (!hasAnyData) return;

      // Section heading
      let jtRow = wsByType.rowCount + 1;
      wsByType.mergeCells(jtRow, 1, jtRow, 5);
      const jtHead = wsByType.getCell(jtRow, 1);
      jtHead.value = '[ ' + jeType + ' ]';
      jtHead.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+CLR.subHeader } };
      jtHead.font  = { name:'Calibri', bold:true, size:11, color:{ argb:'FFFFFFFF' } };
      jtHead.border = border; jtHead.alignment = { horizontal:'left', vertical:'middle' };
      wsByType.getRow(jtRow).height = 22;

      // Sub-headers
      const subHR = wsByType.addRow(ledgerHdr); subHR.height = 18;
      subHR.eachCell(cell => { cell.fill=subFill; cell.font=hFont; cell.border=border; cell.alignment={horizontal:'center',vertical:'middle'}; });

      const grandDrRows = [], grandCrRows = [];

      allFYs2.forEach(fy => {
        // Get amounts per lease for this FY + entry type
        let fyHasData = false;
        const fyAmts = portfolio.map(l => {
          let amt = 0;
          if (jeType === 'Initial Recognition') {
            // Only first FY of each lease
            const fb = (l.state.fyJournals||[]).find(fb => fb.entries.some(e => e.label === jeType));
            if (fb && fb.fy === fy) {
              const entry = fb.entries.find(e => e.label === jeType);
              amt = entry ? entry.lines.reduce((s, ln) => s + (ln.dr||0), 0) : 0;
            }
          } else {
            const fyRow = (l.state.fySummary||[]).find(r => r.fy === fy);
            amt = fyRow ? Utils.round2(fyRow[key]||0) : 0;
          }
          if (amt > 0) fyHasData = true;
          return amt;
        });
        if (!fyHasData) return;

        // Dr rows (one per lease)
        const drCellRefs = [], crCellRefs = [];
        portfolio.forEach((l, li) => {
          const amt = fyAmts[li];
          const drRow = wsByType.addRow([fy, l.label, '(Dr) ' + drAcc, amt, '']);
          drRow.height = 16; styleDataRow(drRow, true);
          drCellRefs.push('D' + wsByType.rowCount);
        });
        // Cr rows (one per lease)
        portfolio.forEach((l, li) => {
          const amt = fyAmts[li];
          const crRow = wsByType.addRow([fy, l.label, '    (Cr) ' + crAcc, '', amt]);
          crRow.height = 16; styleDataRow(crRow, false);
          crCellRefs.push('E' + wsByType.rowCount);
        });

        // Consolidated total row
        const totDr = fyAmts.reduce((s, a) => s + a, 0);
        const totRow = wsByType.addRow([
          fy + ' - Consolidated Total', '', '',
          { formula: drCellRefs.join('+') }, { formula: crCellRefs.join('+') }
        ]);
        totRow.height = 18; styleTotRow(totRow);
        grandDrRows.push('D' + wsByType.rowCount);
        grandCrRows.push('E' + wsByType.rowCount);
        wsByType.addRow([]); // spacer
      });

      // Grand Total for this entry type
      if (grandDrRows.length > 0) {
        const gt = wsByType.addRow([
          'Grand Total - ' + jeType, '', '',
          { formula: grandDrRows.join('+') },
          { formula: grandCrRows.join('+') }
        ]);
        gt.height = 22;
        gt.eachCell((cell, ci) => {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+CLR.header } };
          cell.font = { name:'Calibri', bold:true, size:10, color:{ argb:'FFFFFFFF' } };
          cell.border = border;
          cell.alignment = { horizontal: ci <= 3 ? 'left' : 'right', vertical:'middle' };
          if (ci >= 4) cell.numFmt = numFmt;
        });
      }
      wsByType.addRow([]); wsByType.addRow([]);
    });
    wsByType.columns = ledgerCols;
/* â”€â”€ Write and download â”€â”€ */
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `ConsolidatedPortfolio_${_today()}.xlsx`);
  };

  /* â”€â”€ Helper â”€â”€ */
  const _today = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  };

  return { exportJSON, importJSON, buildConsolidated, renderConsolidatedView, exportConsolidatedExcel };

})();
