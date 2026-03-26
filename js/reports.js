/* ── reports.js – Financial Statements, Disclosure, Compliance ── */
'use strict';

const Reports = (() => {

  /* ───────────────────────────────────────────────
     FINANCIAL STATEMENTS
  ─────────────────────────────────────────────── */
  const renderFinancials = ({ fySummary, rouInitial, totalInterest, totalDep, totalPayments, roi, frequency }) => {

    // ── Balance Sheet ──
    const bsDiv = document.getElementById('bsView');
    bsDiv.innerHTML = '';

    fySummary.forEach(row => {
      bsDiv.insertAdjacentHTML('beforeend', `
        <div class="fs-section-head">${row.fy}</div>
        <div class="fs-item"><span class="fs-label">Non-Current Liabilities – Lease Liability</span><span class="fs-value">${Utils.fmtNum(row.nonCurrentLiab)}</span></div>
        <div class="fs-item"><span class="fs-label">Current Liabilities – Lease Liability (Current Portion)</span><span class="fs-value">${Utils.fmtNum(row.currentLiab)}</span></div>
        <div class="fs-item"><span class="fs-label">Total Lease Liability</span><span class="fs-value">${Utils.fmtNum(row.closeBal)}</span></div>
        <div class="fs-item"><span class="fs-label">Right-of-Use Asset (Net)</span><span class="fs-value">${Utils.fmtNum(row.rouCloseBV)}</span></div>
        <hr style="border-color:var(--border);margin:8px 0;"/>
      `);
    });

    // ── P&L ──
    const plDiv = document.getElementById('plView');
    plDiv.innerHTML = '';

    fySummary.forEach(row => {
      plDiv.insertAdjacentHTML('beforeend', `
        <div class="fs-section-head">${row.fy}</div>
        <div class="fs-item"><span class="fs-label">Finance Costs – Interest on Lease Liability</span><span class="fs-value">${Utils.fmtNum(row.interest)}</span></div>
        <div class="fs-item"><span class="fs-label">Depreciation – Right-of-Use Asset</span><span class="fs-value">${Utils.fmtNum(row.dep)}</span></div>
        <div class="fs-item fs-subtotal"><span class="fs-label">Total Lease P&L Impact</span><span class="fs-value">${Utils.fmtNum(Utils.round2(row.interest + row.dep))}</span></div>
        <hr style="border-color:var(--border);margin:8px 0;"/>
      `);
    });

    // ── Cash Flow ──
    const cfDiv = document.getElementById('cfView');
    cfDiv.innerHTML = '';
    fySummary.forEach(row => {
      cfDiv.insertAdjacentHTML('beforeend', `
        <div class="fs-section-head">${row.fy}</div>
        <div class="fs-item"><span class="fs-label">Operating Activities – Interest portion of lease payment</span><span class="fs-value">(${Utils.fmtNum(row.interest)})</span></div>
        <div class="fs-item"><span class="fs-label">Financing Activities – Principal portion of lease payment</span><span class="fs-value">(${Utils.fmtNum(Utils.round2(row.payments - row.interest))})</span></div>
        <div class="fs-item fs-subtotal"><span class="fs-label">Total Cash Outflow from Lease</span><span class="fs-value">(${Utils.fmtNum(row.payments)})</span></div>
        <hr style="border-color:var(--border);margin:8px 0;"/>
      `);
    });
  };

  /* ───────────────────────────────────────────────
     DISCLOSURE NOTES
  ─────────────────────────────────────────────── */
  const renderDisclosure = ({ inputs, pvResult, fySummary, rouInitial, totalInterest, totalDep, totalPayments, amortRows }) => {
    const container = document.getElementById('disclosureContainer');
    container.innerHTML = '';

    const { leaseName, startDate, endDate, termMonths, roi, frequency, paymentAmount, fyStartMonth, leaseTerm } = inputs;

    // Section 1 – Accounting Policy
    container.insertAdjacentHTML('beforeend', `
      <div class="disclosure-section">
        <div class="disclosure-title">1. Accounting Policy – Leases (Ind AS 116)</div>
        <div class="disclosure-text">
          The Company assesses at contract inception whether a contract is, or contains, a lease.
          The Company recognises a <strong>right-of-use (ROU) asset</strong> and a corresponding
          <strong>lease liability</strong> with respect to all lease arrangements in which it is the lessee,
          except for short-term leases (defined as leases with a term of 12 months or less) and leases of
          low-value assets.<br/><br/>
          At the commencement date of the lease, the Company recognises <strong>lease liabilities</strong>
          measured at the present value of lease payments to be made over the lease term.
          Lease payments are discounted using the <strong>incremental borrowing rate (IBR)</strong> of
          <strong>${roi}% per annum</strong> applicable at the commencement date.<br/><br/>
          The <strong>right-of-use asset</strong> is initially measured at cost, comprising the initial
          measurement of the lease liability, any initial direct costs incurred, and an estimate of costs
          to dismantle and restore the underlying asset. ROU assets are depreciated on a
          <strong>straight-line basis</strong> over the lease term.
        </div>
      </div>`);

    // Section 2 – Amounts Recognised in Financial Statements
    const totalLeaseLiabFY = fySummary.length > 0 ? fySummary[0].closeBal : 0;
    container.insertAdjacentHTML('beforeend', `
      <div class="disclosure-section">
        <div class="disclosure-title">2. Amounts Recognised in Financial Statements</div>
        <div class="disclosure-text">
          <strong>Balance Sheet (as at end of respective FY):</strong><br/>
          <table class="maturity-table" style="margin-bottom:16px;">
            <thead>
              <tr>
                <th>Item</th>
                ${fySummary.map(r => `<th>${r.fy}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ROU Asset (Net)</td>
                ${fySummary.map(r => `<td>₹${Utils.fmtNum(r.rouCloseBV)}</td>`).join('')}
              </tr>
              <tr>
                <td>Lease Liability – Non-Current</td>
                ${fySummary.map(r => `<td>₹${Utils.fmtNum(r.nonCurrentLiab)}</td>`).join('')}
              </tr>
              <tr>
                <td>Lease Liability – Current</td>
                ${fySummary.map(r => `<td>₹${Utils.fmtNum(r.currentLiab)}</td>`).join('')}
              </tr>
            </tbody>
          </table>
          <strong>P&L Impact:</strong><br/>
          <table class="maturity-table">
            <thead>
              <tr><th>Item</th>${fySummary.map(r => `<th>${r.fy}</th>`).join('')}</tr>
            </thead>
            <tbody>
              <tr>
                <td>Interest on Lease Liability</td>
                ${fySummary.map(r => `<td>₹${Utils.fmtNum(r.interest)}</td>`).join('')}
              </tr>
              <tr>
                <td>Depreciation of ROU Asset</td>
                ${fySummary.map(r => `<td>₹${Utils.fmtNum(r.dep)}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>`);

    // Section 3 – Maturity Analysis
    const maturityBands = buildMaturityBands(amortRows, inputs.fyStartMonth);
    container.insertAdjacentHTML('beforeend', `
      <div class="disclosure-section">
        <div class="disclosure-title">3. Maturity Analysis – Undiscounted Lease Payments</div>
        <div class="disclosure-text">
          <table class="maturity-table">
            <thead>
              <tr><th>Band</th><th>Undiscounted Payments (₹)</th></tr>
            </thead>
            <tbody>
              ${maturityBands.map(b => `<tr><td>${b.label}</td><td>${Utils.fmtNum(b.amount)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`);

    // Section 4 – Key Assumptions
    container.insertAdjacentHTML('beforeend', `
      <div class="disclosure-section">
        <div class="disclosure-title">4. Key Assumptions & Judgements</div>
        <div class="disclosure-text">
          <ul style="padding-left:20px;line-height:2;">
            <li><strong>Lease Asset:</strong> ${leaseName || 'Not specified'}</li>
            <li><strong>Lease Commencement:</strong> ${Utils.fmtDate(startDate)}</li>
            <li><strong>Lease Expiry:</strong> ${Utils.fmtDate(endDate)}</li>
            <li><strong>Lease Term:</strong> ${leaseTerm} months</li>
            <li><strong>Periodic Payment:</strong> ₹${Utils.fmtNum(paymentAmount)} (${Utils.freqLabel[frequency]})</li>
            <li><strong>Incremental Borrowing Rate:</strong> ${roi}% per annum</li>
            <li><strong>Initial Lease Liability (PV):</strong> ₹${Utils.fmtNum(pvResult.totalPV)}</li>
            <li><strong>ROU Asset (at cost):</strong> ₹${Utils.fmtNum(rouInitial)}</li>
            <li><strong>Total Cash Outflow:</strong> ₹${Utils.fmtNum(totalPayments)}</li>
            <li><strong>Total Finance Cost:</strong> ₹${Utils.fmtNum(totalInterest)}</li>
            <li><strong>Depreciation Method:</strong> Straight-line over lease term</li>
          </ul>
        </div>
      </div>`);
  };

  // Build maturity bands from amort rows
  const buildMaturityBands = (amortRows, fyStartMonth) => {
    const today = new Date();
    const bands = [
      { label: 'Less than 1 year', min: 0, max: 12, amount: 0 },
      { label: '1 – 2 years', min: 12, max: 24, amount: 0 },
      { label: '2 – 3 years', min: 24, max: 36, amount: 0 },
      { label: '3 – 5 years', min: 36, max: 60, amount: 0 },
      { label: 'More than 5 years', min: 60, max: Infinity, amount: 0 },
    ];
    amortRows.forEach(row => {
      const monthsAway = Utils.monthsBetween(today, row.date);
      bands.forEach(b => { if (monthsAway >= b.min && monthsAway < b.max) b.amount += row.payment; });
    });
    return bands.filter(b => b.amount > 0).map(b => ({ ...b, amount: Utils.round2(b.amount) }));
  };

  /* ───────────────────────────────────────────────
     COMPLIANCE MAPPING
  ─────────────────────────────────────────────── */
  const renderCompliance = () => {
    const container = document.getElementById('complianceContainer');
    const rows = [
      ['Para 22', 'Initial Recognition', 'Lessee shall recognise right-of-use asset and lease liability at commencement date.', 'Lease Liability (PV), ROU Asset'],
      ['Para 26–28', 'Initial Measurement of Lease Liability', 'Present value of lease payments discounted at IBR or rate implicit in lease.', 'PV Calculation Schedule'],
      ['Para 29–31', 'Initial Measurement of ROU Asset', 'Cost = initial lease liability + initial direct costs + prepayments – incentives.', 'ROU Asset computation'],
      ['Para 36', 'Subsequent Measurement of Lease Liability', 'Effective interest method; reduced by payments; remeasured on modification.', 'Amortisation Schedule'],
      ['Para 31', 'Subsequent Measurement of ROU Asset', 'Straight-line depreciation from commencement to end of lease term.', 'ROU Depreciation Schedule'],
      ['Para 47', 'Presentation – Balance Sheet', 'Lease liabilities separated into current and non-current. ROU asset presented separately.', 'Financial Statement view'],
      ['Para 49', 'Presentation – P&L', 'Interest on lease liability under Finance Costs; Depreciation under respective expense line.', 'P&L Extract'],
      ['Para 50', 'Presentation – Cash Flow', 'Principal repayments under Financing; Interest under Operating or Financing per policy.', 'Cash Flow Extract'],
      ['Para 52–60', 'Disclosures', 'Quantitative & qualitative disclosures incl. maturity analysis, expense breakdown, accounting policy.', 'Disclosure Notes'],
      ['Para 44–46', 'Lease Modification', 'Reassess IBR, remeasure lease liability; adjust ROU asset accordingly.', 'Modification inputs'],
    ];

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="compliance-table">
          <thead>
            <tr>
              <th>Ind AS 116 Reference</th>
              <th>Requirement</th>
              <th>Description</th>
              <th>Tool Output</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td><span class="badge">${r[0]}</span></td>
                <td>${r[1]}</td>
                <td>${r[2]}</td>
                <td>${r[3]}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  return { renderFinancials, renderDisclosure, renderCompliance };
})();
