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
    // Normalise: export uses 'savedState' key — migrate old 'state' entries on the fly
    const normalisedLeases = portfolio.map(l => ({
      id: l.id,
      label: l.label,
      savedState: l.savedState || l.state  // handle legacy in-memory entries
    }));
    const payload = {
      exportedAt: new Date().toISOString(),
      tool: 'Ind AS 116 Lease Accounting Tool',
      author: 'CA Jimi R Modi',
      version: '2.0',
      leases: normalisedLeases
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
          // Normalise: migrate old format that used 'state' key to 'savedState'
          leases.forEach(l => {
            if (!l.savedState && l.state) {
              l.savedState = l.state;
              delete l.state;
            }
          // Re-hydrate dates on savedState (NOT in-place on portfolio — caller deep-clones)
            const ss = l.savedState;
            if (ss && ss.inputs && ss.inputs.startDate) {
              ss.inputs.startDate = new Date(ss.inputs.startDate);
            }
            if (ss && ss.inputs && ss.inputs.endDate) {
              ss.inputs.endDate = new Date(ss.inputs.endDate);
            }
            if (ss && ss.amortRows) {
              ss.amortRows.forEach(r => { r.date = new Date(r.date); });
            }
            if (ss && ss.pvResult && ss.pvResult.schedule) {
              ss.pvResult.schedule.forEach(r => { r.date = new Date(r.date); });
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
      const s = l.savedState || l.state;  // support legacy in-memory entries
      if (!s || !s.inputs) return;         // guard: skip entries with missing inputs
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
    const leaseRows = portfolio.map(l => {
      const s = l.savedState || l.state;
      if (!s || !s.inputs) return '';
      return `
      <tr>
        <td style="text-align:left;font-weight:500;">${l.label}</td>
        <td>${Utils.fmtDate(new Date(s.inputs.startDate))}</td>
        <td>${Utils.fmtDate(new Date(s.inputs.endDate))}</td>
        <td>${s.inputs.leaseTerm}m</td>
        <td>${s.inputs.roi}%</td>
        <td>${Utils.fmtINR((s.pvResult && s.pvResult.totalPV) || 0)}</td>
        <td>${Utils.fmtINR(s.inputs.rouInitial)}</td>
        <td>${Utils.fmtINR(s.inputs.totalInterest)}</td>
        <td>${Utils.fmtINR(s.inputs.totalPayments)}</td>
      </tr>`;
    }).join('');

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

    // Escalation display helper
    const getEscStr = (inp) => {
      if (!inp.hasVarPayments || !inp.escalationRate) return 'No Escalation';
      const typeStr = inp.escalationType === 'percent' ? '%' : ' ₹ fixed';
      const freqMap = { '12': 'Annual', '24': 'Bi-Annual', '36': 'Tri-Annual', '6': 'Every 6M' };
      const freqStr = String(inp.escalationFreq) === 'custom'
        ? `Every ${inp.escalationCustom}m`
        : (freqMap[String(inp.escalationFreq)] || `Every ${inp.escalationFreq}m`);
      return `Yes | ${inp.escalationRate}${typeStr} | ${freqStr}`;
    };

    /* â”€â”€ SHEET 1: Portfolio Summary â”€â”€ */
    const ws1 = wb.addWorksheet('Portfolio Summary', { views: [{ state: 'frozen', ySplit: 5 }] });
    ws1.mergeCells('A1:J1');
    const t1 = ws1.getCell('A1');
    t1.value = 'Ind AS 116 â€“ Consolidated Lease Portfolio Summary';
    t1.font  = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF' + CLR.white } };
    t1.fill  = headerFill;
    t1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 32;

    ws1.mergeCells('A2:J2');
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
    const s1Headers = ['Lease Name','Start Date','End Date','Term (months)','IBR (%)','Lease Liability (PV) â‚¹','ROU Asset â‚¹','Total Interest â‚¹','Total Payments â‚¹','Escalation'];
    const s1Row = ws1.addRow(s1Headers);
    s1Row.height = 20;
    s1Row.eachCell((cell, i) => {
      cell.fill = headerFill; cell.font = hFont; cell.border = border;
      cell.alignment = { horizontal: (i === 1 || i === 10) ? 'left' : 'center', vertical: 'middle' };
    });

    portfolio.forEach((l, idx) => {
      const s = l.savedState || l.state;
      if (!s || !s.inputs) return;
      const row = ws1.addRow([
        l.label,
        Utils.fmtDate(new Date(s.inputs.startDate)),
        Utils.fmtDate(new Date(s.inputs.endDate)),
        s.inputs.leaseTerm,
        s.inputs.roi,
        (s.pvResult && s.pvResult.totalPV) || 0,
        s.inputs.rouInitial,
        s.inputs.totalInterest,
        s.inputs.totalPayments,
        getEscStr(s.inputs)
      ]);
      row.height = 18;
      const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      row.eachCell((cell, ci) => {
        cell.fill = fill; cell.font = normFont; cell.border = border;
        cell.alignment = { horizontal: (ci === 1 || ci === 10) ? 'left' : ci <= 3 ? 'center' : 'right', vertical: 'middle' };
        if (ci >= 6 && ci <= 9) cell.numFmt = numFmt;
      });
    });

    // Totals row
    const totRow = ws1.addRow(['Portfolio Total', '', '', '', '', c.totalPV, c.totalROU, c.totalInterest, c.totalPayments, '']);
    totRow.height = 20;
    totRow.eachCell((cell, ci) => {
      cell.fill = totalFill; cell.font = boldFont; cell.border = border;
      cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
      if (ci >= 6 && ci <= 9) cell.numFmt = numFmt;
    });

    ws1.columns = [{ width: 32 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 24 }];

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
      portfolio.flatMap(l => {
        const ss = l.savedState || l.state;
        return ss ? (ss.fyJournals || []).map(f => f.fy) : [];
      })
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
        const ss = l.savedState || l.state;
        const fyJournals = (ss && ss.fyJournals) ? ss.fyJournals : [];
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

    /* â”€â”€ SHEET: Financial Statement Disclosures (Ind AS 116) â”€â”€ */
    const wsd = wb.addWorksheet('FS Disclosures', { views: [{ state: 'frozen', ySplit: 2 }] });

    // Title
    {
      const r = wsd.addRow(['Ind AS 116 â€“ Notes to Accounts: Leases', '', '', '', '', '', '', '']);
      wsd.mergeCells(r.number, 1, r.number, 8);
      r.height = 32;
      r.getCell(1).fill = headerFill;
      r.getCell(1).font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    {
      const r = wsd.addRow([`Portfolio: ${portfolio.length} Lease(s)  |  Generated: ${new Date().toLocaleString('en-IN')}  |  Prepared by: CA Jimi R Modi`, '', '', '', '', '', '', '']);
      wsd.mergeCells(r.number, 1, r.number, 8);
      r.height = 18;
      r.getCell(1).fill = lightFill;
      r.getCell(1).font = { name: 'Calibri', italic: true, size: 9 };
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // â”€â”€ Section heading helper â”€â”€
    const dSecHdr = (ws, text, clr) => {
      const r = ws.addRow([text, '', '', '', '', '', '', '']);
      ws.mergeCells(r.number, 1, r.number, 8);
      r.height = 22;
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + clr } };
      r.getCell(1).font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(1).border = border;
    };
    const dSubHdr = (ws, text) => {
      const r = ws.addRow([text, '', '', '', '', '', '', '']);
      ws.mergeCells(r.number, 1, r.number, 8);
      r.height = 18;
      r.getCell(1).fill = totalFill;
      r.getCell(1).font = boldFont;
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(1).border = border;
    };
    const dBlank = (ws) => { ws.addRow([]); };

    // â”€â”€ 1. Accounting Policy â”€â”€
    dBlank(wsd);
    dSecHdr(wsd, '1. Accounting Policy â€“ Leases (Ind AS 116)', CLR.header);

    const policyLines = [
      ['Para 10â€“16', 'The Company assesses at contract inception whether a contract is, or contains, a lease. A contract contains a lease if it conveys the right to control the use of an identified asset for a period in exchange for consideration.'],
      ['Para 22',    'At the commencement date, the Company recognises a right-of-use (ROU) asset and a corresponding lease liability for all leases, except short-term leases (term â‰¤12 months) and leases of low-value assets.'],
      ['Para 26â€“28', 'Lease liabilities are measured at the present value of lease payments not yet paid, discounted at the incremental borrowing rate (IBR) at commencement. Payments include fixed amounts, variable amounts based on an index, residual value guarantees and purchase/extension option payments where reasonably certain.'],
      ['Para 29â€“31', 'The ROU asset is initially measured at cost comprising: (i) initial lease liability; (ii) lease payments made at or before commencement; (iii) initial direct costs; (iv) estimated restoration costs; less lease incentives received.'],
      ['Para 36',    'Subsequent to commencement, the lease liability is increased by interest accrued (effective interest method) and reduced by lease payments. The ROU asset is depreciated on a straight-line basis over the lease term.'],
      ['Para 44â€“46', 'Lease modifications and reassessment events (change in lease term, purchase option, IBR changes) trigger remeasurement of the lease liability with a corresponding adjustment to the ROU asset.'],
      ['Para 47',    'Lease liabilities are classified as current (due â‰¤12 months) and non-current (due >12 months). ROU assets are presented separately from other assets in the Balance Sheet.'],
      ['Para 49â€“50', 'Interest on lease liabilities is presented under Finance Costs (P&L). Principal repayments appear under Financing Activities; interest under Operating Activities in the Statement of Cash Flows.']
    ];
    policyLines.forEach(([para, text]) => {
      const r = wsd.addRow([para, text, '', '', '', '', '', '']);
      wsd.mergeCells(r.number, 2, r.number, 8);
      r.height = 40;
      r.getCell(1).fill = lightFill;
      r.getCell(1).font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF1E3A5F' } };
      r.getCell(1).alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
      r.getCell(1).border = border;
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFCFF' } };
      r.getCell(2).font = { name: 'Calibri', size: 9 };
      r.getCell(2).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      r.getCell(2).border = border;
    });

    // â”€â”€ 2. Amounts Recognised â”€â”€
    dBlank(wsd);
    dSecHdr(wsd, '2. Amounts Recognised in Financial Statements (Ind AS 116, Para 52â€“53)', CLR.subHeader);

    const fyHdrs = c.fySummary.map(r => r.fy);
    const addDataHdr = (ws, firstCol, cols) => {
      const r = ws.addRow([firstCol, ...cols]);
      r.height = 20;
      r.eachCell((cell, ci) => {
        cell.fill = subFill; cell.font = hFont; cell.border = border;
        cell.alignment = { horizontal: ci === 1 ? 'left' : 'center', vertical: 'middle' };
      });
    };
    const addDataRow = (ws, lbl, vals, isTot, ri) => {
      const r = ws.addRow([lbl, ...vals]);
      r.height = isTot ? 20 : 16;
      r.eachCell((cell, ci) => {
        cell.fill = isTot ? totalFill : { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
        cell.font = isTot ? boldFont : normFont;
        cell.border = border;
        cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' };
        if (ci > 1) cell.numFmt = numFmt;
      });
    };

    // (a) Lease Liability Movement
    dBlank(wsd);
    dSubHdr(wsd, '(a) Movement in Lease Liability (â‚¹)  [Para 52(a), 53(b)]');
    addDataHdr(wsd, 'Particulars', fyHdrs);
    [
      ['Opening Lease Liability',     c.fySummary.map(r => r.openBal),      false],
      ['Add: Interest Accrued (IBR)', c.fySummary.map(r => r.interest),     false],
      ['Less: Lease Payments Made',   c.fySummary.map(r => r.payments),     false],
      ['Closing Lease Liability',     c.fySummary.map(r => r.closeBal),     true ],
      [' â€” Current Portion',          c.fySummary.map(r => r.currentLiab),  false],
      [' â€” Non-Current Portion',      c.fySummary.map(r => r.nonCurrentLiab),false]
    ].forEach(([lbl, vals, isTot], ri) => addDataRow(wsd, lbl, vals, isTot, ri));

    // (b) ROU Asset Movement
    dBlank(wsd);
    dSubHdr(wsd, '(b) Movement in Right-of-Use Asset (â‚¹)  [Para 29â€“31, 36]');
    addDataHdr(wsd, 'Particulars', fyHdrs);
    const totalROUInit = portfolio.reduce((s, l) => {
      const st = l.savedState || l.state;
      return s + (st && st.inputs ? (st.inputs.rouInitial || 0) : 0);
    }, 0);
    [
      ['Opening Book Value',  c.fySummary.map((r, i) => i === 0 ? Utils.round2(totalROUInit) : Utils.round2(c.fySummary[i-1].rouCloseBV)), false],
      ['Less: Depreciation',  c.fySummary.map(r => r.dep),       false],
      ['Closing Book Value',  c.fySummary.map(r => r.rouCloseBV),true ]
    ].forEach(([lbl, vals, isTot], ri) => addDataRow(wsd, lbl, vals, isTot, ri));

    // (c) P&L Impact
    dBlank(wsd);
    dSubHdr(wsd, '(c) Impact on Statement of Profit & Loss (â‚¹)  [Para 49, 53(b)]');
    addDataHdr(wsd, 'Particulars', fyHdrs);
    [
      ['Finance Costs â€“ Interest on Lease Liability', c.fySummary.map(r => r.interest),                          false],
      ['Depreciation â€“ Right-of-Use Asset',           c.fySummary.map(r => r.dep),                               false],
      ['Total Lease Impact on P&L',                    c.fySummary.map(r => Utils.round2(r.interest + r.dep)),    true ]
    ].forEach(([lbl, vals, isTot], ri) => addDataRow(wsd, lbl, vals, isTot, ri));

    // (d) Cash Flow
    dBlank(wsd);
    dSubHdr(wsd, '(d) Cash Outflows from Leases (â‚¹)  [Para 52(b), 54(e), 50]');
    addDataHdr(wsd, 'Particulars', fyHdrs);
    [
      ['Operating Activities â€“ Interest Paid on Lease',  c.fySummary.map(r => r.interest),                                 false],
      ['Financing Activities â€“ Principal Repayment',      c.fySummary.map(r => Utils.round2(r.payments - r.interest)),     false],
      ['Total Cash Outflow from Leases',                   c.fySummary.map(r => r.payments),                                 true ]
    ].forEach(([lbl, vals, isTot], ri) => addDataRow(wsd, lbl, vals, isTot, ri));

    // â”€â”€ 3. Maturity Analysis â”€â”€
    dBlank(wsd);
    dSecHdr(wsd, '3. Maturity Analysis â€“ Undiscounted Lease Payments (Ind AS 116, Para 52(b))', CLR.subHeader);

    const matBands = [
      { label: 'Less than 1 year',  min: 0,  max: 12,       amount: 0 },
      { label: '1â€“2 years',         min: 12, max: 24,       amount: 0 },
      { label: '2â€“3 years',         min: 24, max: 36,       amount: 0 },
      { label: '3â€“5 years',         min: 36, max: 60,       amount: 0 },
      { label: 'More than 5 years', min: 60, max: Infinity,  amount: 0 }
    ];
    const matToday = new Date();
    portfolio.forEach(l => {
      ((l.savedState || l.state).amortRows || []).forEach(row => {
        const mAway = Utils.monthsBetween(matToday, new Date(row.date));
        matBands.forEach(b => { if (mAway >= b.min && mAway < b.max) b.amount += (row.payment || 0); });
      });
    });
    matBands.forEach(b => { b.amount = Utils.round2(b.amount); });

    dBlank(wsd);
    {
      const r = wsd.addRow(['Time Band', 'Undiscounted Lease Payments (â‚¹)', '', '', '', '', '', '']);
      wsd.mergeCells(r.number, 2, r.number, 8);
      r.height = 20;
      r.eachCell(cell => { cell.fill = subFill; cell.font = hFont; cell.border = border; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    }
    const activeBands = matBands.filter(b => b.amount > 0);
    activeBands.forEach((b, bi) => {
      const r = wsd.addRow([b.label, b.amount, '', '', '', '', '', '']);
      wsd.mergeCells(r.number, 2, r.number, 8);
      r.height = 16;
      const f = { type: 'pattern', pattern: 'solid', fgColor: { argb: bi % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      r.eachCell((cell, ci) => { cell.fill = f; cell.font = normFont; cell.border = border; cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' }; });
      r.getCell(2).numFmt = numFmt;
    });
    {
      const r = wsd.addRow(['Total Undiscounted Payments', Utils.round2(activeBands.reduce((s,b)=>s+b.amount,0)), '', '', '', '', '', '']);
      wsd.mergeCells(r.number, 2, r.number, 8);
      r.height = 20;
      r.eachCell((cell, ci) => { cell.fill = totalFill; cell.font = boldFont; cell.border = border; cell.alignment = { horizontal: ci === 1 ? 'left' : 'right', vertical: 'middle' }; });
      r.getCell(2).numFmt = numFmt;
    }

    // â”€â”€ 4. Key Assumptions â”€â”€
    dBlank(wsd);
    dSecHdr(wsd, '4. Significant Judgements & Key Assumptions (Ind AS 116, Para 60)', CLR.subHeader);
    dBlank(wsd);
    {
      const r = wsd.addRow(['Lease Name', 'Period', 'Term', 'IBR', 'Frequency', 'Escalation', 'Lease Liability (PV) â‚¹', 'ROU Asset â‚¹']);
      r.height = 20;
      r.eachCell(cell => { cell.fill = subFill; cell.font = hFont; cell.border = border; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    }
    portfolio.forEach((l, ai) => {
      const ss = l.savedState || l.state;
      if (!ss) return;
      const inp = ss.inputs;
      const r = wsd.addRow([
        l.label,
        Utils.fmtDate(new Date(inp.startDate)) + ' to ' + Utils.fmtDate(new Date(inp.endDate)),
        inp.leaseTerm + 'm',
        inp.roi + '% p.a.',
        Utils.freqLabel[inp.frequency] || inp.frequency,
        getEscStr(inp),
        Utils.round2((ss.pvResult && ss.pvResult.totalPV) || 0),
        Utils.round2(inp.rouInitial)
      ]);
      r.height = 18;
      const f = { type: 'pattern', pattern: 'solid', fgColor: { argb: ai % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
      r.eachCell((cell, ci) => { cell.fill = f; cell.font = normFont; cell.border = border; cell.alignment = { horizontal: ci === 1 || ci === 6 ? 'left' : 'center', vertical: 'middle', wrapText: true }; });
      r.getCell(7).numFmt = numFmt; r.getCell(7).alignment.horizontal = 'right';
      r.getCell(8).numFmt = numFmt; r.getCell(8).alignment.horizontal = 'right';
    });

    wsd.columns = [{ width: 36 }, { width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 20 }];

    /* â”€â”€ SHEET: Disclaimer â”€â”€ */
    const wsdis = wb.addWorksheet('Disclaimer');

    {
      const r = wsdis.addRow(['DISCLAIMER', '', '', '']);
      wsdis.mergeCells(r.number, 1, r.number, 4);
      r.height = 40;
      r.getCell(1).fill = headerFill;
      r.getCell(1).font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    {
      const r = wsdis.addRow(['Ind AS 116 Lease Accounting Tool  |  Prepared by CA Jimi R Modi  |  For Internal Use Only', '', '', '']);
      wsdis.mergeCells(r.number, 1, r.number, 4);
      r.height = 24;
      r.getCell(1).fill = lightFill;
      r.getCell(1).font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF1E3A5F' } };
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const disItems = [
      ['Purpose',
       'This report has been generated by the Ind AS 116 Lease Accounting Tool developed by CA Jimi R Modi. It is intended to serve as a working paper and internal planning document to assist in the preparation of financial statements under Ind AS 116 â€“ Leases.'],
      ['Not a Substitute for Professional Advice',
       'This document does not constitute professional legal, accounting, tax, or financial advice. Users are strongly advised to consult a qualified Chartered Accountant or Ind AS technical expert before finalising disclosures or financial statements.'],
      ['Accuracy of Inputs',
       'All calculations and outputs are based entirely on data and parameters entered by the user. The accuracy, completeness, and appropriateness of all inputs (lease dates, IBR, payments, escalation terms, etc.) are the sole responsibility of the user.'],
      ['Methodology & Assumptions',
       'This tool applies standard Ind AS 116 methodology including: the effective interest method for lease liability amortisation; straight-line depreciation for ROU assets; and proportional interest accruals for partial periods. Each lease contract may contain specific facts and circumstances requiring professional judgement.'],
      ['Escalation & Variable Payments',
       'Where escalation clauses or variable payment schedules have been applied, the present value is computed using the payment schedule as provided. Post-commencement changes in variable payments or index-based escalations may require reassessment under Ind AS 116 Para 42â€“44.'],
      ['Modifications, Subleases & Reassessment',
       'This tool does not automatically handle lease modifications, subleases, sale-and-leaseback transactions, or reassessment triggers (e.g. change in lease term or purchase option certainty). Such events require separate professional assessment under Ind AS 116 Para 44â€“46.'],
      ['Limitation of Liability',
       'To the fullest extent permitted by applicable law, CA Jimi R Modi and the developers of this tool accept no liability for any loss, damage, financial inaccuracy, or error arising from the use, misuse, or reliance upon outputs generated by this tool.'],
      ['Confidentiality',
       'This document contains confidential financial working papers. It is intended solely for the internal use of the entity for which it was prepared. Unauthorised disclosure, reproduction, or distribution is prohibited.'],
      ['Generation Details',
       `Report generated on: ${new Date().toLocaleString('en-IN')}  |  Tool Version: 1.0  |  Prepared by: CA Jimi R Modi`]
    ];

    disItems.forEach(([heading, text], di) => {
      wsdis.addRow([]);
      {
        const r = wsdis.addRow([heading, '', '', '']);
        wsdis.mergeCells(r.number, 1, r.number, 4);
        r.height = 20;
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + CLR.subHeader } };
        r.getCell(1).font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        r.getCell(1).border = border;
      }
      {
        const r = wsdis.addRow([text, '', '', '']);
        wsdis.mergeCells(r.number, 1, r.number, 4);
        r.height = 64;
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: di % 2 === 0 ? 'FFF5F9FF' : 'FFFFFFFF' } };
        r.getCell(1).font = { name: 'Calibri', size: 10 };
        r.getCell(1).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        r.getCell(1).border = border;
      }
    });

    wsdis.columns = [{ width: 100 }, { width: 10 }, { width: 10 }, { width: 10 }];

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
