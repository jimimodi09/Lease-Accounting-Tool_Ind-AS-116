/* ── portfolio_disclosure.js – Consolidated Ind AS 116 Portfolio Disclosure ── */
'use strict';

const PortfolioDisclosure = (() => {

  /* ─────────────────────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────────────────────── */

  /** Return sorted unique FY labels across all leases */
  const allFYs = (portfolio) =>
    [...new Set(portfolio.flatMap(l => (l.savedState.fySummary || []).map(r => r.fy)))]
      .sort();

  /** Build consolidated fySummary array from all saved leases */
  const buildConsolidatedFY = (portfolio) => {
    const fields = ['openBal','interest','payments','closeBal','currentLiab','nonCurrentLiab','dep','rouCloseBV'];
    const fyMap = {};
    portfolio.forEach(l => {
      (l.savedState.fySummary || []).forEach(row => {
        if (!fyMap[row.fy]) fyMap[row.fy] = { fy: row.fy, openBal:0, interest:0, payments:0, closeBal:0, currentLiab:0, nonCurrentLiab:0, dep:0, rouCloseBV:0 };
        fields.forEach(f => { fyMap[row.fy][f] = Utils.round2((fyMap[row.fy][f] || 0) + (row[f] || 0)); });
      });
    });
    return Object.values(fyMap).sort((a, b) => a.fy < b.fy ? -1 : 1);
  };

  /** Build consolidated maturity bands from all leases' amortRows */
  const buildMaturityBands = (portfolio, referenceDate) => {
    const ref = referenceDate || new Date();
    const bands = [
      { label: 'Less than 1 year',  min: 0,  max: 12,      amount: 0 },
      { label: '1 \u2013 2 years',  min: 12, max: 24,      amount: 0 },
      { label: '2 \u2013 3 years',  min: 24, max: 36,      amount: 0 },
      { label: '3 \u2013 5 years',  min: 36, max: 60,      amount: 0 },
      { label: 'More than 5 years', min: 60, max: Infinity, amount: 0 }
    ];
    portfolio.forEach(l => {
      (l.savedState.amortRows || []).forEach(row => {
        const mAway = Utils.monthsBetween(ref, new Date(row.date));
        bands.forEach(b => { if (mAway >= b.min && mAway < b.max) b.amount += (row.payment || 0); });
      });
    });
    return bands.map(b => ({ ...b, amount: Utils.round2(b.amount) })).filter(b => b.amount > 0);
  };

  /* ─────────────────────────────────────────────────────────────
     HTML HELPERS
  ───────────────────────────────────────────────────────────── */

  const secHead = (text, level) => {
    const colours = { 1: '#1E3A5F', 2: '#2D6A9F', 3: '#3A7BD5' };
    const c = colours[level || 1];
    return `<div class="disc-section-head" style="background:${c};">${text}</div>`;
  };

  const subHead = (text) => `<div class="disc-sub-head">${text}</div>`;

  const tblOpen = (headers) => `
    <div class="table-wrapper" style="margin:10px 0 20px;">
      <table class="data-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>`;

  const tblClose = (footerHtml) =>
    `</tbody>${footerHtml ? `<tfoot>${footerHtml}</tfoot>` : ''}</table></div>`;

  /* ─────────────────────────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────────────────────────── */
  const render = (portfolio) => {
    const container = document.getElementById('portDisclosureContainer');
    if (!container) return;

    if (!portfolio || portfolio.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:64px 24px;">
          <div style="font-size:48px;margin-bottom:16px;">&#128203;</div>
          <div style="font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">No Leases Saved to Portfolio</div>
          <div style="color:var(--text-muted);font-size:14px;">Compute a lease and click <strong>Save Current Lease</strong> on the Portfolio tab to generate consolidated disclosures.</div>
        </div>`;
      return;
    }

    const fyList   = allFYs(portfolio);
    const consol   = buildConsolidatedFY(portfolio);
    const today    = new Date();
    const matBands = buildMaturityBands(portfolio, today);

    /* aggregate totals from savedState only */
    const totalPV       = Utils.round2(portfolio.reduce((s, l) => s + (l.savedState.pvResult  ? l.savedState.pvResult.totalPV           : 0), 0));
    const totalROU      = Utils.round2(portfolio.reduce((s, l) => s + (l.savedState.inputs     ? l.savedState.inputs.rouInitial          : 0), 0));
    const totalInterest = Utils.round2(portfolio.reduce((s, l) => s + (l.savedState.inputs     ? l.savedState.inputs.totalInterest       : 0), 0));
    const totalPayments = Utils.round2(portfolio.reduce((s, l) => s + (l.savedState.inputs     ? l.savedState.inputs.totalPayments       : 0), 0));
    const totalDep      = Utils.round2(portfolio.reduce((s, l) => s + (l.savedState.inputs     ? l.savedState.inputs.totalDep            : 0), 0));

    let html = '';

    /* ── Header strip ── */
    html += `
      <div class="port-disc-header">
        <div class="port-disc-title">Ind AS 116 \u2013 Notes to Accounts: Leases</div>
        <div class="port-disc-meta">
          Consolidated disclosure across <strong>${portfolio.length}</strong> lease${portfolio.length !== 1 ? 's' : ''}
          &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}
          &nbsp;|&nbsp; Prepared by: <strong>CA Jimi R Modi</strong>
        </div>
      </div>`;

    /* ── Portfolio KPI banner ── */
    html += `<div class="port-disc-kpi-grid">`;
    [
      ['Leases in Portfolio',          portfolio.length],
      ['Total Lease Liability (PV)',    Utils.fmtINR(totalPV)],
      ['Total ROU Asset',               Utils.fmtINR(totalROU)],
      ['Total Interest Expense',        Utils.fmtINR(totalInterest)],
      ['Total Cash Outflows',           Utils.fmtINR(totalPayments)],
      ['Total Depreciation',            Utils.fmtINR(totalDep)]
    ].forEach(([l, v]) => {
      html += `<div class="kpi-card"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`;
    });
    html += `</div>`;

    /* ══════════════════════════════════════════════════
       SECTION 1 – ACCOUNTING POLICY
    ══════════════════════════════════════════════════ */
    html += secHead('1.&nbsp; Accounting Policy \u2013 Leases (Ind AS 116, Paragraphs 10\u201350)', 1);
    html += `
      <div class="disclosure-section">
        <div class="disclosure-text">
          The Company assesses at contract inception whether a contract is, or contains, a lease.
          A contract contains a lease if it conveys the right to control the use of an identified asset
          for a period in exchange for consideration (Para 10\u201316).<br/><br/>
          At the commencement date, the Company recognises a <strong>right-of-use (ROU) asset</strong> and
          a corresponding <strong>lease liability</strong> for all leases, except short-term leases
          (term \u2264\u202012 months) and leases of low-value assets (Para 22).<br/><br/>
          <strong>Lease liabilities</strong> are measured at the present value of lease payments not yet paid,
          discounted at the incremental borrowing rate (IBR) at commencement. Payments include fixed amounts,
          variable amounts based on an index or rate, residual value guarantees, and purchase/extension option
          payments where exercise is reasonably certain (Para 26\u201328).<br/><br/>
          The <strong>ROU asset</strong> is initially measured at cost comprising: (i) the initial lease liability;
          (ii) lease payments made at or before commencement; (iii) initial direct costs;
          (iv) estimated restoration costs; less lease incentives received (Para 29\u201331).<br/><br/>
          Subsequent to commencement, the lease liability is increased by interest accrued (effective interest
          method) and reduced by lease payments. The ROU asset is depreciated on a
          <strong>straight-line basis</strong> over the lease term (Para 36).<br/><br/>
          Lease liabilities are classified as current (due \u2264\u202012 months) and non-current
          (due &gt;\u202012 months). ROU assets are presented separately in the Balance Sheet.
          Interest on lease liabilities is presented under Finance Costs; principal repayments appear under
          Financing Activities in the Statement of Cash Flows (Para 47\u201350).
        </div>
      </div>`;

    /* ══════════════════════════════════════════════════
       SECTION 2 – AMOUNTS RECOGNISED
    ══════════════════════════════════════════════════ */
    html += secHead('2.&nbsp; Amounts Recognised in Financial Statements (Para 52\u201353)', 2);

    /* 2a – Lease Liability Movement */
    if (consol.length > 0) {
      html += subHead('2(a) Movement in Lease Liability (₹) &nbsp;[Para 52(a), 53(b)]');
      html += tblOpen(['Particulars', ...fyList]);

      // Opening = prior year closing (0 for first FY)
      html += '<tr class="disc-row-even">' +
        '<td style="text-align:left;">Opening Lease Liability</td>' +
        consol.map((r, i) => '<td>' + Utils.fmtNum(i === 0 ? 0 : consol[i - 1].closeBal) + '</td>').join('') +
        '</tr>';

      // New Leases Recognized during the Year = openBal - prevClose
      html += '<tr style="background:#fffff8;">' +
        '<td style="text-align:left;font-weight:600;color:#7b5800;">Add: New Leases Recognized during the Year</td>' +
        consol.map((r, i) => {
          const newL = Utils.round2(r.openBal - (i === 0 ? 0 : consol[i - 1].closeBal));
          return '<td style="font-weight:600;color:#7b5800;background:#fffff8c4;">' + Utils.fmtNum(newL) + '</td>';
        }).join('') +
        '</tr>';

      // Interest
      html += '<tr>' +
        '<td style="text-align:left;">Add: Interest Accrued (IBR)</td>' +
        consol.map(r => '<td>' + Utils.fmtNum(r.interest) + '</td>').join('') +
        '</tr>';

      // Payments
      html += '<tr class="disc-row-even">' +
        '<td style="text-align:left;">Less: Lease Payments Made</td>' +
        consol.map(r => '<td>' + Utils.fmtNum(r.payments) + '</td>').join('') +
        '</tr>';

      // Closing
      html += '<tr class="disc-total-row">' +
        '<td style="text-align:left;font-weight:600;">Closing Lease Liability</td>' +
        consol.map(r => '<td style="font-weight:600;">' + Utils.fmtNum(r.closeBal) + '</td>').join('') +
        '</tr>';

      // Current portion
      html += '<tr>' +
        '<td style="text-align:left;">&nbsp;&nbsp;– Current Portion</td>' +
        consol.map(r => '<td>' + Utils.fmtNum(r.currentLiab) + '</td>').join('') +
        '</tr>';

      // Non-current portion
      html += '<tr class="disc-row-even">' +
        '<td style="text-align:left;">&nbsp;&nbsp;– Non-Current Portion</td>' +
        consol.map(r => '<td>' + Utils.fmtNum(r.nonCurrentLiab) + '</td>').join('') +
        '</tr>';

      // Formula footnote
      html += '<tr><td colspan="' + (1 + fyList.length) + '" style="text-align:left;font-size:11px;color:#78350f;background:#fffde7;padding:4px 8px;font-style:italic;">' +
        '&#9432;&nbsp; Formula: Opening + New Leases Recognized + Interest &minus; Payments = Closing Liability' +
        '</td></tr>';

      html += tblClose('');

      /* 2b – ROU Asset Movement */
      html += subHead('2(b) Movement in Right-of-Use Asset (\u20B9) &nbsp;[Para 29\u201331, 36]');
      html += tblOpen(['Particulars', ...fyList]);
      html += `<tr class="disc-row-even"><td style="text-align:left;">Opening Book Value</td>
        ${consol.map((r, i) => `<td>${Utils.fmtNum(i === 0 ? totalROU : consol[i-1].rouCloseBV)}</td>`).join('')}
      </tr>`;
      html += `<tr><td style="text-align:left;">Less: Depreciation</td>
        ${consol.map(r => `<td>${Utils.fmtNum(r.dep)}</td>`).join('')}
      </tr>`;
      html += `<tr class="disc-total-row"><td style="text-align:left;font-weight:600;">Closing Book Value</td>
        ${consol.map(r => `<td style="font-weight:600;">${Utils.fmtNum(r.rouCloseBV)}</td>`).join('')}
      </tr>`;
      html += tblClose('');

      /* 2c – P&L Impact */
      html += subHead('2(c) Impact on Statement of Profit &amp; Loss (\u20B9) &nbsp;[Para 49, 53(b)]');
      html += tblOpen(['Particulars', ...fyList]);
      [
        ['Finance Costs \u2013 Interest on Lease Liability', 'interest',  false],
        ['Depreciation \u2013 Right-of-Use Asset',           'dep',       false],
        ['Total Lease P&amp;L Impact',                       'pl_total',  true ],
      ].forEach(([label, key, isTot], ri) => {
        const vals = consol.map(r => Utils.fmtNum(
          key === 'pl_total' ? Utils.round2(r.interest + r.dep) : r[key]
        ));
        html += `<tr class="${isTot ? 'disc-total-row' : ri % 2 === 0 ? 'disc-row-even' : ''}">
          <td style="text-align:left;${isTot ? 'font-weight:600;' : ''}">${label}</td>
          ${vals.map(v => `<td${isTot ? ' style="font-weight:600;"' : ''}>${v}</td>`).join('')}
        </tr>`;
      });
      html += tblClose('');

      /* 2d – Cash Flow */
      html += subHead('2(d) Cash Outflows from Leases (\u20B9) &nbsp;[Para 52(b), 54(e), 50]');
      html += tblOpen(['Particulars', ...fyList]);
      [
        ['Operating Activities \u2013 Interest Paid on Lease',  'interest',  false],
        ['Financing Activities \u2013 Principal Repayment',      'principal', false],
        ['Total Cash Outflow from Leases',                       'payments',  true ],
      ].forEach(([label, key, isTot], ri) => {
        const vals = consol.map(r => Utils.fmtNum(
          key === 'principal' ? Utils.round2(r.payments - r.interest) : r[key]
        ));
        html += `<tr class="${isTot ? 'disc-total-row' : ri % 2 === 0 ? 'disc-row-even' : ''}">
          <td style="text-align:left;${isTot ? 'font-weight:600;' : ''}">${label}</td>
          ${vals.map(v => `<td${isTot ? ' style="font-weight:600;"' : ''}>${v}</td>`).join('')}
        </tr>`;
      });
      html += tblClose('');
    }

    /* ══════════════════════════════════════════════════
       SECTION 3 – MATURITY ANALYSIS
    ══════════════════════════════════════════════════ */
    html += secHead('3.&nbsp; Maturity Analysis \u2013 Undiscounted Lease Payments (Para 52(b))', 2);
    html += `<div style="font-size:12px;color:var(--text-muted);margin:8px 0 4px;">
      Reference date: ${today.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
      &nbsp;|&nbsp; Aggregated across all ${portfolio.length} lease(s)
    </div>`;
    if (matBands.length > 0) {
      const matTotal = Utils.round2(matBands.reduce((s, b) => s + b.amount, 0));
      html += tblOpen(['Time Band', 'Undiscounted Payments (\u20B9)']);
      matBands.forEach((b, bi) => {
        html += `<tr class="${bi % 2 === 0 ? 'disc-row-even' : ''}">
          <td style="text-align:left;">${b.label}</td>
          <td>${Utils.fmtNum(b.amount)}</td>
        </tr>`;
      });
      html += tblClose(`<tr class="disc-total-row">
        <td style="text-align:left;font-weight:600;">Total Undiscounted Payments</td>
        <td style="font-weight:600;">${Utils.fmtNum(matTotal)}</td>
      </tr>`);
    } else {
      html += `<div class="disclosure-text" style="color:var(--text-muted);">All lease payment dates have passed. No future undiscounted payments.</div>`;
    }

    /* ══════════════════════════════════════════════════
       SECTION 4 – KEY ASSUMPTIONS (per lease)
    ══════════════════════════════════════════════════ */
    html += secHead('4.&nbsp; Significant Judgements &amp; Key Assumptions (Para 60)', 2);
    html += tblOpen(['Lease Name', 'Period', 'Term', 'IBR', 'Frequency', 'Lease Liability (PV)', 'ROU Asset']);
    portfolio.forEach((l, li) => {
      const inp     = l.savedState.inputs;
      const pv      = l.savedState.pvResult ? l.savedState.pvResult.totalPV : 0;
      const freqLbl = (Utils.freqLabel && Utils.freqLabel[inp.frequency]) || inp.frequency;
      html += `<tr class="${li % 2 === 0 ? 'disc-row-even' : ''}">
        <td style="text-align:left;font-weight:500;">${l.label}</td>
        <td style="text-align:left;font-size:12px;">${Utils.fmtDate(new Date(inp.startDate))} \u2013 ${Utils.fmtDate(new Date(inp.endDate))}</td>
        <td>${inp.leaseTerm}m</td>
        <td>${inp.roi}% p.a.</td>
        <td>${freqLbl}</td>
        <td>${Utils.fmtINR(pv)}</td>
        <td>${Utils.fmtINR(inp.rouInitial)}</td>
      </tr>`;
    });
    html += tblClose('');

    /* ══════════════════════════════════════════════════
       SECTION 5 – PER-LEASE CONTRIBUTION BREAKDOWN
    ══════════════════════════════════════════════════ */
    html += secHead('5.&nbsp; Per-Lease Contribution to Consolidated Figures (\u20B9)', 2);

    portfolio.forEach(l => {
      const inp = l.savedState.inputs;
      const lFY = l.savedState.fySummary || [];
      if (!lFY.length) return;

      html += `<div class="disc-lease-banner">
        <span>&#128196;</span>
        <strong>${l.label}</strong>
        <span style="font-size:12px;font-weight:400;color:var(--text-muted);margin-left:12px;">
          ${Utils.fmtDate(new Date(inp.startDate))} \u2013 ${Utils.fmtDate(new Date(inp.endDate))}
          &nbsp;|&nbsp; IBR ${inp.roi}%
          &nbsp;|&nbsp; PV: ${Utils.fmtINR(l.savedState.pvResult ? l.savedState.pvResult.totalPV : 0)}
        </span>
      </div>`;

      html += tblOpen(['Financial Year','Opening Liability','Interest Accrued','Payments Made',
                       'Closing Liability','Current','Non-Current','Depreciation','ROU BV']);
      lFY.forEach((row, ri) => {
        html += `<tr class="${ri % 2 === 0 ? 'disc-row-even' : ''}">
          <td>${row.fy}</td>
          <td>${Utils.fmtNum(row.openBal)}</td>
          <td>${Utils.fmtNum(row.interest)}</td>
          <td>${Utils.fmtNum(row.payments)}</td>
          <td>${Utils.fmtNum(row.closeBal)}</td>
          <td>${Utils.fmtNum(row.currentLiab)}</td>
          <td>${Utils.fmtNum(row.nonCurrentLiab)}</td>
          <td>${Utils.fmtNum(row.dep)}</td>
          <td>${Utils.fmtNum(row.rouCloseBV)}</td>
        </tr>`;
      });
      html += tblClose(`<tr class="disc-total-row">
        <td style="text-align:left;font-weight:600;">Lease Total</td>
        <td></td>
        <td style="font-weight:600;">${Utils.fmtNum(inp.totalInterest)}</td>
        <td style="font-weight:600;">${Utils.fmtNum(inp.totalPayments)}</td>
        <td></td><td></td><td></td>
        <td style="font-weight:600;">${Utils.fmtNum(inp.totalDep)}</td>
        <td></td>
      </tr>`);
    });

    /* Grand total strip */
    html += `<div class="disc-grand-total">
      <span style="font-weight:600;">Portfolio Grand Total</span>
      <span>Interest:&nbsp;<strong>${Utils.fmtINR(totalInterest)}</strong></span>
      <span>Payments:&nbsp;<strong>${Utils.fmtINR(totalPayments)}</strong></span>
      <span>Depreciation:&nbsp;<strong>${Utils.fmtINR(totalDep)}</strong></span>
    </div>`;

    /* ══════════════════════════════════════════════════
       SECTION 6 – ADDITIONAL MANDATORY DISCLOSURES
    ══════════════════════════════════════════════════ */
    html += secHead('6.&nbsp; Additional Mandatory Disclosures (Para 53\u201360)', 2);
    html += `
      <div class="disclosure-section">
        <div class="disclosure-text">
          <strong>6(a) Short-term Lease Expense (Para 53(b)):</strong><br/>
          The Company does not have any leases with a lease term of 12 months or less accounted for
          under the short-term lease exemption. No short-term lease expense is recognised during the period.
          <em>(Nil)</em><br/><br/>

          <strong>6(b) Low-value Asset Lease Expense (Para 53(c)):</strong><br/>
          The Company does not have any leases of low-value assets accounted for under the low-value
          exemption. <em>(Nil)</em><br/><br/>

          <strong>6(c) Variable Lease Payments Not Included in Lease Liability (Para 53(d)):</strong><br/>
          There are no variable lease payments that do not depend on an index or rate and are not included
          in the measurement of the lease liability. <em>(Nil)</em><br/><br/>

          <strong>6(d) Income from Sub-leasing ROU Assets (Para 53(e)):</strong><br/>
          The Company has not sub-leased any right-of-use assets during the period. <em>(Nil)</em><br/><br/>

          <strong>6(e) Future Cash Outflows Not Reflected in Lease Liabilities (Para 59):</strong><br/>
          The leases in this portfolio do not contain extension options, termination options, or residual
          value guarantees beyond those already included in the measurement of the respective lease
          liabilities. There are no potential cash outflows not already reflected in the recognised lease
          liabilities above.<br/><br/>

          <strong>6(f) Managing Liquidity Risk from Leases (Para 60):</strong><br/>
          The Company manages liquidity risk arising from lease obligations by maintaining adequate cash
          reserves and committed credit facilities. The maturity profile of undiscounted lease obligations
          is disclosed in Section 3 above, providing a basis for assessing near-term and long-term liquidity
          requirements across all ${portfolio.length} lease commitment${portfolio.length !== 1 ? 's' : ''} in this portfolio.
        </div>
      </div>`;

    /* Disclaimer strip */
    html += `
      <div class="port-disc-disclaimer">
        &#9888; This disclosure is auto-generated from saved lease data and is a working paper only.
        It does not constitute professional accounting advice. Verify all inputs and consult a qualified
        Chartered Accountant before finalising financial statements.
        &nbsp;|&nbsp; Tool developed by CA Jimi R Modi.
      </div>`;

    container.innerHTML = html;
  };

  return { render };
})();
