/* ── app.js – Main Controller ── */
'use strict';

(function () {

  /* ─────────────────────────  STATE  ───────────────────────── */
  let _state       = null;   // working computed result for the lease currently on-screen
  let _auditTrail  = [];     // [{ts, summary}]
  let _portfolio   = [];     // saved leases [{id, label, savedState}]  ← savedState is FROZEN until explicit Save
  let _varPayments = null;   // [{period, date, payment}] – from upload OR escalation
  let _loadedLeaseId = null; // ID of the portfolio entry currently loaded into the form (null = new lease)

  /* ─────────────────────────  TAB NAVIGATION  ───────────────────────── */
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'portfolio')        { renderPortfolio(); }
      if (btn.dataset.tab === 'port-disclosure')  { PortfolioDisclosure.render(_portfolio); }
    });
  });

  /* ─────────────────────────  SCHEDULE SUB-TABS  ───────────────────────── */
  document.querySelectorAll('.sch-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sch-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sch-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.sch).classList.add('active');
    });
  });

  /* ─────────────────────────  AUTO LEASE TERM  ───────────────────────── */
  const syncTermYears = () => {
    const months = parseInt(document.getElementById('leaseTerm').value);
    const el = document.getElementById('leaseTermYears');
    if (!isNaN(months) && months > 0) {
      el.value = (months / 12).toFixed(2);
    } else {
      el.value = '';
    }
  };
  const autoTerm = () => {
    const s = document.getElementById('leaseStart').value;
    const e = document.getElementById('leaseEnd').value;
    if (s && e) {
      const sd = Utils.parseDate(s), ed = Utils.parseDate(e);
      if (sd && ed && ed > sd) {
        const months = Utils.monthsBetween(sd, ed);
        document.getElementById('leaseTerm').value = Math.round(months);
      }
    }
    syncTermYears();
  };
  document.getElementById('leaseStart').addEventListener('change', autoTerm);
  document.getElementById('leaseEnd').addEventListener('change', autoTerm);
  document.getElementById('leaseTerm').addEventListener('input', syncTermYears);

  /* ─────────────────────────  TOOLTIPS  ───────────────────────── */
  const popup = document.getElementById('tooltipPopup');
  document.querySelectorAll('.tooltip').forEach(el => {
    el.addEventListener('mouseenter', e => {
      popup.textContent = el.dataset.tip;
      popup.style.display = 'block';
      popup.style.left = e.pageX + 12 + 'px';
      popup.style.top  = e.pageY + 12 + 'px';
    });
    el.addEventListener('mousemove', e => {
      popup.style.left = e.pageX + 12 + 'px';
      popup.style.top  = e.pageY + 12 + 'px';
    });
    el.addEventListener('mouseleave', () => { popup.style.display = 'none'; });
  });

  /* ─────────────────────────  FILE UPLOAD  ───────────────────────── */
  const fileInput  = document.getElementById('fileInput');
  const uploadArea = document.getElementById('uploadArea');

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) Upload.handleFile(fileInput.files[0], (varPmts) => {
      _varPayments = varPmts || null;
    });
  });
  uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', ()  => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) Upload.handleFile(e.dataTransfer.files[0], v => { _varPayments = v || null; });
  });
  uploadArea.addEventListener('click', () => fileInput.click());

  // After upload populates form, refresh term/years and recompute if state exists
  document.addEventListener('upload-complete', () => {
    autoTerm();
    if (_state) {
      try { compute(true); } catch(_) {}
    }
  });

  /* ─────────────────────────  TEMPLATE DOWNLOAD  ───────────────────────── */
  document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
    const ctx = {
      leaseName:     document.getElementById('leaseName').value || '',
      leaseStart:    document.getElementById('leaseStart').value,
      leaseEnd:      document.getElementById('leaseEnd').value,
      frequency:     document.getElementById('frequency').value || 'monthly',
      timing:        document.getElementById('paymentTiming').value || 'end',
      payment:       parseFloat(document.getElementById('paymentAmount').value) || 0,
      roi:           document.getElementById('roi').value || '',
      fyStart:       document.getElementById('fyStart').value || '4'
    };
    if (typeof XLSX !== 'undefined') Template.downloadExcel(ctx);
    else Template.downloadCSV();
  });

  /* ─────────────────────────  RESET  ───────────────────────── */
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset all inputs?')) return;
    document.querySelectorAll('.date-picker').forEach(el => {
      if (el._flatpickr) el._flatpickr.clear();
    });
    document.querySelectorAll('input:not(.date-picker), select').forEach(el => {
      if (el.type === 'number') el.value = '';
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    ['initialDirectCosts','leaseIncentives','restorationCosts','residualValue']
      .forEach(id => { document.getElementById(id).value = '0'; });
    document.getElementById('leaseTermYears').value = '';
    _state         = null;
    _varPayments   = null;
    _loadedLeaseId = null;   // no longer editing any saved lease
    clearEscalation();
    hideError();
  });

  /* ─────────────────────────  ESCALATION CLAUSE  ───────────────────────── */
  document.getElementById('escalationFreq').addEventListener('change', () => {
    const isCustom = document.getElementById('escalationFreq').value === 'custom';
    document.getElementById('escalationCustomGroup').style.display = isCustom ? '' : 'none';
  });

  function buildEscalationSchedule() {
    const startStr  = document.getElementById('leaseStart').value;
    const endStr    = document.getElementById('leaseEnd').value;
    const frequency = document.getElementById('frequency').value || 'monthly';
    const timing    = document.getElementById('paymentTiming').value || 'end';
    const baseAmt   = parseFloat(document.getElementById('paymentAmount').value);
    const rate      = parseFloat(document.getElementById('escalationRate').value);
    const type      = document.getElementById('escalationType').value;
    let   freqVal   = document.getElementById('escalationFreq').value;
    if (freqVal === 'custom') freqVal = parseInt(document.getElementById('escalationCustomMonths').value) || 12;
    else freqVal = parseInt(freqVal);

    if (!startStr || !endStr) return null;
    if (isNaN(baseAmt) || baseAmt <= 0) return null;
    if (isNaN(rate) || rate <= 0) return null;

    const sd = Utils.parseDate(startStr), ed = Utils.parseDate(endStr);
    if (!sd || !ed) return null;
    const termMonths = Utils.monthsBetween(sd, ed);
    const dates = Calculator.generatePaymentDates(sd, frequency, timing, termMonths, ed);
    if (!dates.length) return null;

    const intervalMonths = Utils.freqMonths[frequency];
    const periodsPerStep = Math.round(freqVal / intervalMonths);

    let current = baseAmt;
    return dates.map((pd, i) => {
      if (i > 0 && i % periodsPerStep === 0) {
        current = type === 'percent'
          ? Utils.round2(current * (1 + rate / 100))
          : Utils.round2(current + rate);
      }
      return { period: i + 1, date: Utils.toDateStr(pd.date), payment: current };
    });
  }

  document.getElementById('previewEscalationBtn').addEventListener('click', () => {
    const sched = buildEscalationSchedule();
    if (!sched) {
      alert('Please fill Lease Start Date, End Date, Base Payment Amount, and Escalation Rate first.'); return;
    }
    renderEscalationTable(sched);
    document.getElementById('escalationTableWrap').style.display = '';
  });

  function renderEscalationTable(sched) {
    const tbody = document.getElementById('escalationBody');
    let step = 0;
    let prevPmt = sched[0] ? sched[0].payment : 0;
    tbody.innerHTML = sched.map((r, i) => {
      const changed = i > 0 && r.payment !== prevPmt;
      if (changed || i === 0) step++;
      prevPmt = r.payment;
      return `<tr${changed ? ' style="background:rgba(99,102,241,.08);"' : ''}>
        <td>${step}</td>
        <td>${r.period}</td>
        <td style="text-align:left;font-family:var(--mono);font-size:11px;">${r.date}</td>
        <td><input type="number" class="esc-pmt-input" data-idx="${i}" value="${r.payment}"
             style="width:110px;background:transparent;border:1px solid var(--border);border-radius:4px;
             color:var(--text-primary);padding:3px 6px;font-family:var(--mono);font-size:12px;"/></td>
      </tr>`;
    }).join('');
  }

  document.getElementById('applyEscalationBtn').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.esc-pmt-input');
    if (!inputs.length) { alert('Preview the schedule first.'); return; }
    const sched = [];
    document.getElementById('escalationBody').querySelectorAll('tr').forEach((tr, i) => {
      const inp = tr.querySelector('.esc-pmt-input');
      const dateEl = tr.querySelectorAll('td')[2];
      sched.push({
        period:  i + 1,
        date:    dateEl ? dateEl.textContent.trim() : '',
        payment: parseFloat(inp.value) || 0
      });
    });
    _varPayments = sched;
    document.getElementById('applyEscalationBtn').textContent = '✔ Schedule Applied';
    document.getElementById('applyEscalationBtn').style.color = 'var(--success)';
    document.getElementById('applyEscalationBtn').style.borderColor = 'var(--success)';
  });

  document.getElementById('clearEscalationBtn').addEventListener('click', clearEscalation);
  function clearEscalation() {
    _varPayments = null;
    document.getElementById('escalationTableWrap').style.display = 'none';
    document.getElementById('escalationBody').innerHTML = '';
    document.getElementById('escalationRate').value = '';
    const applyBtn = document.getElementById('applyEscalationBtn');
    if (applyBtn) { applyBtn.textContent = '✔ Apply Schedule to Computation'; applyBtn.style.color = ''; applyBtn.style.borderColor = ''; }
  }

  /* ─────────────────────────  COMPUTE  ───────────────────────── */
  document.getElementById('computeBtn').addEventListener('click', compute);

  // ── Reactive recompute: re-run whenever an input changes (if already computed) ──
  // NOTE: reactive recompute ONLY updates the display — it NEVER touches _portfolio savedState
  const REACTIVE_IDS = [
    'leaseName','leaseStart','leaseEnd','leaseTerm',
    'frequency','paymentTiming','roi','paymentAmount','fyStart',
    'initialDirectCosts','leaseIncentives','restorationCosts','residualValue','openingLiability'
  ];
  let _reactiveDebounce = null;
  const scheduleRecompute = () => {
    if (!_state) return;
    clearTimeout(_reactiveDebounce);
    _reactiveDebounce = setTimeout(() => {
      try { compute(true); } catch(_) {}
    }, 400);
  };
  REACTIVE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, scheduleRecompute);
    if (el.classList.contains('date-picker')) {
      el.addEventListener('change', scheduleRecompute);
    }
  });

  function getVal(id, fallback = '') {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = el.value;
    return (v === '' || v === null) ? fallback : v;
  }

  function gatherInputs() {
    const leaseStartStr = getVal('leaseStart');
    const leaseEndStr   = getVal('leaseEnd');
    const leaseName     = getVal('leaseName');
    const frequency     = getVal('frequency', 'monthly');
    const paymentTiming = getVal('paymentTiming', 'end');
    const fyStartMonth  = parseInt(getVal('fyStart', '4'));

    if (!leaseStartStr) throw new Error('Lease Start Date is required.');
    if (!leaseEndStr)   throw new Error('Lease End Date is required.');

    const startDate = Utils.parseDate(leaseStartStr);
    const endDate   = Utils.parseDate(leaseEndStr);
    if (!startDate) throw new Error('Lease Start Date is invalid. Use DD-MM-YYYY format.');
    if (!endDate)   throw new Error('Lease End Date is invalid. Use DD-MM-YYYY format.');
    if (endDate <= startDate) throw new Error('Lease End Date must be after Start Date.');

    const leaseTerm = parseInt(getVal('leaseTerm')) || Math.round(Utils.monthsBetween(startDate, endDate));
    if (leaseTerm < 1) throw new Error('Lease Term must be at least 1 month.');

    const paymentAmount = parseFloat(getVal('paymentAmount'));
    if (!_varPayments && (!paymentAmount || paymentAmount <= 0))
      throw new Error('Lease Payment Amount must be positive, or preview and apply an escalation schedule.');

    const roi = parseFloat(getVal('roi'));
    if (isNaN(roi) || roi < 0) throw new Error('IBR / ROI must be a non-negative number.');

    const initialDirectCosts  = parseFloat(getVal('initialDirectCosts',  '0')) || 0;
    const leaseIncentives     = parseFloat(getVal('leaseIncentives',     '0')) || 0;
    const restorationCosts    = parseFloat(getVal('restorationCosts',    '0')) || 0;
    const residualValue       = parseFloat(getVal('residualValue',       '0')) || 0;
    const openingLiabilityRaw = parseFloat(getVal('openingLiability'));

    const escalationRate   = parseFloat(document.getElementById('escalationRate')?.value) || null;
    const escalationType   = document.getElementById('escalationType')?.value  || 'percent';
    const escalationFreq   = document.getElementById('escalationFreq')?.value  || '12';
    const escalationCustom = parseInt(document.getElementById('escalationCustomMonths')?.value) || null;

    return {
      leaseStartStr, leaseEndStr, leaseName, frequency, paymentTiming, fyStartMonth,
      startDate, endDate, leaseTerm, paymentAmount: paymentAmount || 0, roi,
      initialDirectCosts, leaseIncentives, restorationCosts, residualValue,
      openingLiabilityRaw, escalationRate, escalationType, escalationFreq, escalationCustom
    };
  }

  function runCalculation(inputs, overrides = {}) {
    const {
      startDate, endDate, leaseTerm, frequency, paymentTiming, fyStartMonth,
      initialDirectCosts, leaseIncentives, restorationCosts, residualValue, openingLiabilityRaw
    } = inputs;

    const roi           = overrides.roi           != null ? overrides.roi           : inputs.roi;
    const paymentAmount = overrides.paymentAmount != null ? overrides.paymentAmount : inputs.paymentAmount;
    const termMonths    = overrides.termMonths    != null ? overrides.termMonths    : leaseTerm;
    const varPayments   = overrides.clearVar ? null : _varPayments;

    const paymentDates = Calculator.generatePaymentDates(startDate, frequency, paymentTiming, termMonths, endDate, varPayments);
    if (!paymentDates.length) throw new Error('No payment periods could be generated.');

    const pvResult = Calculator.computePVSchedule({
      paymentDates, paymentAmount, roi, frequency,
      timing: paymentTiming, residualValue, varPayments, startDate
    });

    const openingLiability = (!isNaN(openingLiabilityRaw)) ? openingLiabilityRaw : pvResult.totalPV;

    const amortRows = Calculator.buildAmortSchedule({
      paymentDates, paymentAmount, roi, frequency, fyStartMonth,
      openingLiability, startDate, varPayments, paymentTiming, endDate
    });
    const rouInitial = Utils.round2(pvResult.totalPV + initialDirectCosts - leaseIncentives + restorationCosts);
    const endDateForROU = overrides.termMonths ? Utils.addMonths(startDate, termMonths) : endDate;

    const rouRows   = Calculator.buildROUSchedule({ rouAssetInitial: rouInitial, startDate, endDate: endDateForROU, fyStartMonth });
    const fySummary = Calculator.buildFYSummary({
      amortRows,
      rouRows,
      fyStartMonth: inputs.fyStartMonth
    });

    return {
      pvResult, amortRows, rouRows, fySummary, rouInitial,
      totalInterest: Utils.round2(amortRows.reduce((s, r) => s + r.interest, 0)),
      totalPayments: Utils.round2(amortRows.reduce((s, r) => s + r.payment, 0)),
      totalDep:      Utils.round2(rouRows.reduce((s, r) => s + r.dep, 0))
    };
  }

  function compute(isReactive = false) {
    hideError();
    try {
      const inp  = gatherInputs();
      const calc = runCalculation(inp);
      const { pvResult, amortRows, rouRows, fySummary, rouInitial, totalInterest, totalPayments, totalDep } = calc;

      const fyJournals = Journals.buildJournals({
        fySummary, rouInitial, pvInitial: pvResult.totalPV,
        leaseName: inp.leaseName, startDate: inp.startDate, amortRows,
        initialDirectCosts: inp.initialDirectCosts,
        leaseIncentives:    inp.leaseIncentives,
        restorationCosts:   inp.restorationCosts
      });

      const inputs = {
        leaseName: inp.leaseName, leaseStart: inp.leaseStartStr, leaseEnd: inp.leaseEndStr,
        startDate: inp.startDate, endDate: inp.endDate,
        leaseTerm: inp.leaseTerm, frequency: inp.frequency, paymentTiming: inp.paymentTiming,
        paymentAmount: inp.paymentAmount, roi: inp.roi,
        initialDirectCosts: inp.initialDirectCosts, leaseIncentives: inp.leaseIncentives,
        restorationCosts: inp.restorationCosts, residualValue: inp.residualValue,
        fyStartMonth: inp.fyStartMonth, rouInitial, totalInterest, totalPayments, totalDep,
        hasVarPayments: !!_varPayments,
        escalationRate: inp.escalationRate, escalationType: inp.escalationType,
        escalationFreq: inp.escalationFreq, escalationCustom: inp.escalationCustom
      };

      // _state holds the working result for the CURRENT on-screen lease only
      // It does NOT automatically update _portfolio savedState
      _state = { inputs, pvResult, amortRows, rouRows, fySummary, fyJournals, leaseName: inp.leaseName };

      if (isReactive !== true) {
        _auditTrail.unshift({
          ts: new Date().toLocaleString('en-IN'),
          summary: `Computed: ${inp.leaseName || 'Lease'} | ${inp.leaseTerm}m | IBR ${inp.roi}% | Liability ₹${Utils.fmtNum(pvResult.totalPV)} | ROU ₹${Utils.fmtNum(rouInitial)}${_varPayments ? ' [Escalation]' : ''}`
        });
      }

      renderAll(_state);

      if (isReactive !== true) {
        switchTab('summary');
      }

    } catch (err) { showError(err.message); }
  }

  /* ─────────────────────────  RENDER ALL  ───────────────────────── */
  function renderAll(s) {
    const { inputs, pvResult, amortRows, rouRows, fySummary, fyJournals, leaseName } = s;
    const set = (id, v) => { document.getElementById(id).textContent = v; };
    set('kpiPV',       Utils.fmtINR(pvResult.totalPV));
    set('kpiROU',      Utils.fmtINR(inputs.rouInitial));
    set('kpiTotalPmt', Utils.fmtINR(inputs.totalPayments));
    set('kpiTotalInt', Utils.fmtINR(inputs.totalInterest));
    set('kpiTotalDep', Utils.fmtINR(inputs.totalDep));
    const termYrs = (inputs.leaseTerm / 12).toFixed(2);
    set('kpiTerm',     inputs.leaseTerm + ' months (' + termYrs + ' yrs)');
    set('kpiROI',      inputs.roi + '% p.a.');
    set('kpiFreq',     Utils.freqLabel[inputs.frequency] + (inputs.hasVarPayments ? ' (Escalated)' : ''));

    if (inputs.hasVarPayments && inputs.escalationRate) {
      const typeStr = inputs.escalationType === 'percent' ? '% p.a.' : ' ₹ (fixed)';
      set('kpiEscRate', inputs.escalationRate + typeStr);
      const freqMap = { '12': 'Annual', '24': 'Bi-Annual', '36': 'Tri-Annual', '6': 'Every 6 Months' };
      const freqLabel = inputs.escalationFreq === 'custom'
        ? `Every ${inputs.escalationCustom} months`
        : (freqMap[inputs.escalationFreq] || `Every ${inputs.escalationFreq} months`);
      set('kpiEscFreq', freqLabel);
    } else {
      set('kpiEscRate', 'N/A — No Escalation');
      set('kpiEscFreq', 'N/A — No Escalation');
    }
    document.getElementById('summarySubtitle').textContent =
      `${leaseName || 'Lease'} | ${Utils.fmtDate(inputs.startDate)} – ${Utils.fmtDate(inputs.endDate)}`;

    Schedules.renderPV(pvResult.schedule, pvResult.totalPV);
    Schedules.renderAmort(amortRows);
    Schedules.renderROU(rouRows, inputs.rouInitial);
    Schedules.renderFYSummary(fySummary);
    Journals.renderJournals(fyJournals);
    Reports.renderFinancials({ fySummary, rouInitial: inputs.rouInitial, totalInterest: inputs.totalInterest, totalDep: inputs.totalDep, totalPayments: inputs.totalPayments, roi: inputs.roi, frequency: inputs.frequency });
    Reports.renderDisclosure({ inputs, pvResult, fySummary, rouInitial: inputs.rouInitial, totalInterest: inputs.totalInterest, totalDep: inputs.totalDep, totalPayments: inputs.totalPayments, amortRows });
    Reports.renderCompliance();
  }

  /* ─────────────────────────  EXPORTS  ───────────────────────── */
  document.getElementById('exportExcelBtn').addEventListener('click', () => {
    if (!_state) { alert('Compute a lease first.'); return; }
    Export.toExcel(_state);
  });
  document.getElementById('exportPdfBtn').addEventListener('click', () => {
    if (!_state) { alert('Compute a lease first.'); return; }
    Export.toPDF(_state);
  });

  /* ─────────────────────────  PORTFOLIO  ───────────────────────── */

  /**
   * SAVE CURRENT LEASE
   * ─────────────────
   * Deep-clones _state into portfolio entry's savedState.
   * Uses _loadedLeaseId for ID-based lookup (prevents name-collision bugs).
   * ONLY the targeted lease entry is updated — all other leases are untouched.
   */
  document.getElementById('saveLeaseBtn').addEventListener('click', () => {
    if (!_state) { alert('Compute a lease first.'); return; }

    const label = _state.leaseName || ('Lease ' + (_portfolio.length + 1));

    // Deep-clone the current working state — this becomes the frozen savedState
    const frozenState = JSON.parse(JSON.stringify(_state));

    if (_loadedLeaseId !== null) {
      // Update the specific lease that was loaded (ID-based — immune to label changes)
      const idx = _portfolio.findIndex(l => l.id === _loadedLeaseId);
      if (idx >= 0) {
        _portfolio[idx].label      = label;       // allow rename
        _portfolio[idx].savedState = frozenState;
      } else {
        // ID no longer found (shouldn't happen), treat as new
        _loadedLeaseId = Date.now();
        _portfolio.push({ id: _loadedLeaseId, label, savedState: frozenState });
      }
    } else {
      // New lease — check for label collision as a secondary guard
      const byLabel = _portfolio.findIndex(l => l.label === label);
      if (byLabel >= 0) {
        _portfolio[byLabel].savedState = frozenState;
        _loadedLeaseId = _portfolio[byLabel].id;
      } else {
        _loadedLeaseId = Date.now();
        _portfolio.push({ id: _loadedLeaseId, label, savedState: frozenState });
      }
    }

    _auditTrail.unshift({ ts: new Date().toLocaleString('en-IN'), summary: `Saved: ${label}` });
    renderPortfolio();
    // Refresh portfolio disclosure if it's currently active
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab && activeTab.dataset.tab === 'port-disclosure') {
      PortfolioDisclosure.render(_portfolio);
    }
    alert(`"${label}" saved to portfolio.`);
  });

  document.getElementById('newLeaseBtn').addEventListener('click', () => {
    if (!confirm('Clear inputs for a new lease?')) return;
    _loadedLeaseId = null;    // detach from any loaded lease
    document.getElementById('resetBtn').click();
    switchTab('inputs');
  });

  /* ── Export Portfolio JSON ── */
  document.getElementById('exportPortfolioJsonBtn').addEventListener('click', () => {
    Portfolio.exportJSON(_portfolio);
    if (_portfolio.length > 0) {
      _auditTrail.unshift({ ts: new Date().toLocaleString('en-IN'), summary: `Exported portfolio JSON (${_portfolio.length} lease${_portfolio.length > 1 ? 's' : ''})` });
      renderPortfolio();
    }
  });

  /* ── Import Portfolio JSON ── */
  document.getElementById('importPortfolioJsonBtn').addEventListener('click', () => {
    Portfolio.importJSON((importedLeases) => {
      let added = 0, updated = 0;
      importedLeases.forEach(imported => {
        // Support both old format (state) and new format (savedState)
        if (!imported.savedState && imported.state) {
          imported.savedState = imported.state;
          delete imported.state;
        }
        if (!imported.savedState) return;  // skip invalid entries
        const idx = _portfolio.findIndex(l => l.id === imported.id || l.label === imported.label);
        if (idx >= 0) { _portfolio[idx] = imported; updated++; }
        else           { _portfolio.push(imported); added++; }
      });
      _auditTrail.unshift({
        ts: new Date().toLocaleString('en-IN'),
        summary: `Imported portfolio JSON — ${added} added, ${updated} updated`
      });
      renderPortfolio();
      alert(`Import complete: ${added} lease(s) added, ${updated} lease(s) updated.`);
    });
  });

  /* ── Export Consolidated Excel ── */
  document.getElementById('exportConsolidatedExcelBtn').addEventListener('click', () => {
    Portfolio.exportConsolidatedExcel(_portfolio).catch(err => alert('Excel export failed: ' + err.message));
    if (_portfolio.length > 0) {
      _auditTrail.unshift({ ts: new Date().toLocaleString('en-IN'), summary: `Exported consolidated Excel (${_portfolio.length} lease${_portfolio.length > 1 ? 's' : ''})` });
      renderPortfolio();
    }
  });

  function renderPortfolio() {
    const listDiv   = document.getElementById('portfolioList');
    const kpiDiv    = document.getElementById('portfolioKPIs');
    const auditBody = document.getElementById('auditBody');

    if (_portfolio.length === 0) {
      listDiv.innerHTML = '<p style="color:var(--text-muted);padding:16px 0;">No leases saved. Compute and click Save Current Lease.</p>';
      kpiDiv.innerHTML  = '';
    } else {
      // Totals always read from savedState only — never from _state or live calculations
      let tPV=0, tROU=0, tInt=0, tPmt=0;
      _portfolio.forEach(l => {
        const ss = l.savedState;
        if (!ss || !ss.inputs) return;
        tPV  += (ss.pvResult && ss.pvResult.totalPV) ? ss.pvResult.totalPV : 0;
        tROU += ss.inputs.rouInitial  || 0;
        tInt += ss.inputs.totalInterest || 0;
        tPmt += ss.inputs.totalPayments || 0;
      });

      listDiv.innerHTML = `<div class="table-wrapper"><table class="data-table"><thead><tr>
        <th style="text-align:left;">Lease</th><th>Start</th><th>End</th><th>Term</th><th>IBR</th><th>Liability (PV)</th><th>ROU Asset</th><th>Actions</th>
      </tr></thead><tbody>
      ${_portfolio.map(l => {
        const s = l.savedState;
        if (!s || !s.inputs) return '';   // skip malformed entries
        const isLoaded = l.id === _loadedLeaseId;
        return `<tr${isLoaded ? ' style="background:rgba(99,102,241,.06);outline:2px solid var(--primary);outline-offset:-2px;"' : ''}>
          <td style="font-family:var(--font);font-weight:${isLoaded ? '600' : '400'};">
            ${l.label}${isLoaded ? ' <span style="font-size:10px;color:var(--primary);font-weight:500;">[editing]</span>' : ''}
          </td>
          <td>${Utils.fmtDate(new Date(s.inputs.startDate))}</td>
          <td>${Utils.fmtDate(new Date(s.inputs.endDate))}</td>
          <td>${s.inputs.leaseTerm}m</td><td>${s.inputs.roi}%</td>
          <td>${Utils.fmtINR((s.pvResult && s.pvResult.totalPV) || 0)}</td>
          <td>${Utils.fmtINR(s.inputs.rouInitial)}</td>
          <td style="text-align:center;">
            <button class="btn-outline" onclick="window._portfolioLoad(${l.id})">Load</button>
            <button class="btn-outline" style="color:var(--danger);border-color:var(--danger);margin-left:4px;" onclick="window._portfolioDelete(${l.id})">✕</button>
          </td></tr>`;
      }).join('')}
      </tbody><tfoot><tr><td colspan="5">Portfolio Total</td>
        <td>${Utils.fmtINR(Utils.round2(tPV))}</td><td>${Utils.fmtINR(Utils.round2(tROU))}</td><td></td>
      </tr></tfoot></table></div>`;

      kpiDiv.innerHTML = [
        ['Total Leases',         _portfolio.length],
        ['Portfolio Liability',  Utils.fmtINR(Utils.round2(tPV))],
        ['Portfolio ROU',        Utils.fmtINR(Utils.round2(tROU))],
        ['Total Interest',       Utils.fmtINR(Utils.round2(tInt))],
        ['Total Payments',       Utils.fmtINR(Utils.round2(tPmt))]
      ].map(([l,v]) => `<div class="kpi-card"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`).join('');
    }

    auditBody.innerHTML = _auditTrail.length
      ? _auditTrail.map(e => `<tr><td style="font-family:var(--mono);font-size:11px;white-space:nowrap;text-align:left;">${e.ts}</td><td style="text-align:left;">${e.summary}</td></tr>`).join('')
      : '<tr><td colspan="2" style="color:var(--text-muted);">No actions recorded.</td></tr>';

    // Consolidated view in portfolio tab
    Portfolio.renderConsolidatedView(_portfolio);
  }

  /* ── Populate all Inputs-tab form fields from a saved state ── */
  function populateInputsFromState(inp) {
    const setField  = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    const setSelect = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = String(val); };
    const setDate   = (id, str) => {
      const el = document.getElementById(id);
      if (!el || !str) return;
      if (el._flatpickr) el._flatpickr.setDate(str, true, 'd-m-Y');
      else el.value = str;
    };

    setField('leaseName',          inp.leaseName || '');
    setField('paymentAmount',      inp.paymentAmount != null ? inp.paymentAmount : '');
    setField('roi',                inp.roi         != null ? inp.roi           : '');
    setField('leaseTerm',          inp.leaseTerm   || '');
    setField('initialDirectCosts', inp.initialDirectCosts != null ? inp.initialDirectCosts : 0);
    setField('leaseIncentives',    inp.leaseIncentives   != null ? inp.leaseIncentives   : 0);
    setField('restorationCosts',   inp.restorationCosts  != null ? inp.restorationCosts  : 0);
    setField('residualValue',      inp.residualValue     != null ? inp.residualValue     : 0);

    setSelect('frequency',     inp.frequency);
    setSelect('paymentTiming', inp.paymentTiming);
    setSelect('fyStart',       inp.fyStartMonth);

    setDate('leaseStart', inp.leaseStart);
    setDate('leaseEnd',   inp.leaseEnd);

    const custGrp = document.getElementById('escalationCustomGroup');
    if (inp.hasVarPayments && inp.escalationRate) {
      setField('escalationRate', inp.escalationRate);
      setSelect('escalationType', inp.escalationType || 'percent');
      const freqVal = String(inp.escalationFreq || '12');
      setSelect('escalationFreq', freqVal);
      const isCustom = freqVal === 'custom';
      if (custGrp) custGrp.style.display = isCustom ? '' : 'none';
      if (isCustom && inp.escalationCustom) setField('escalationCustomMonths', inp.escalationCustom);
    } else {
      if (custGrp) custGrp.style.display = 'none';
    }

    syncTermYears();
  }

  /**
   * LOAD LEASE FROM PORTFOLIO
   * ──────────────────────────
   * Deep-clones savedState so the portfolio entry is NEVER mutated.
   * The working copy is used for renderAll() and the form.
   * _loadedLeaseId is set so that the next Save targets this exact entry.
   */
  window._portfolioLoad = (id) => {
    const item = _portfolio.find(l => l.id === id);
    if (!item) return;

    // Deep-clone savedState — NEVER mutate the portfolio entry directly
    const workingCopy = JSON.parse(JSON.stringify(item.savedState));

    // Re-hydrate Date objects on the working copy only
    workingCopy.inputs.startDate = new Date(workingCopy.inputs.startDate);
    workingCopy.inputs.endDate   = new Date(workingCopy.inputs.endDate);
    workingCopy.amortRows.forEach(r => { r.date = new Date(r.date); });
    if (workingCopy.pvResult && workingCopy.pvResult.schedule) {
      workingCopy.pvResult.schedule.forEach(r => { r.date = new Date(r.date); });
    }

    // Set working state and clear any leftover var-payments from previous session
    _state         = workingCopy;
    _varPayments   = null;
    _loadedLeaseId = id;

    populateInputsFromState(workingCopy.inputs);
    renderAll(_state);
    _auditTrail.unshift({ ts: new Date().toLocaleString('en-IN'), summary: `Loaded: ${item.label}` });
    renderPortfolio(); // refresh to show [editing] badge
    switchTab('inputs');  // jump straight to Inputs so user can review / edit
  };

  window._portfolioDelete = (id) => {
    const item = _portfolio.find(l => l.id === id);
    if (!item || !confirm(`Remove "${item.label}"?`)) return;
    _portfolio = _portfolio.filter(l => l.id !== id);
    if (_loadedLeaseId === id) {
      _loadedLeaseId = null;  // the loaded lease was deleted — detach
    }
    _auditTrail.unshift({ ts: new Date().toLocaleString('en-IN'), summary: `Removed: ${item.label}` });
    renderPortfolio();
    // Refresh disclosure if open
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab && activeTab.dataset.tab === 'port-disclosure') {
      PortfolioDisclosure.render(_portfolio);
    }
  };

  /* ─────────────────────────  HELPERS  ───────────────────────── */
  function switchTab(id) {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + id));
  }
  function showError(msg) {
    const el = document.getElementById('errorBanner');
    el.textContent = '⚠ ' + msg; el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideError() { document.getElementById('errorBanner').style.display = 'none'; }

  /* ─────────────────────────  INIT  ───────────────────────── */
  Reports.renderCompliance();

  const DEMO = { leaseName:'Office Premises – Mumbai', paymentAmount:'100000', frequency:'monthly', paymentTiming:'end', roi:'10.5', initialDirectCosts:'25000', leaseIncentives:'0', restorationCosts:'0', residualValue:'0', fyStart:'4' };
  Object.entries(DEMO).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });

  setTimeout(() => {
    const s = document.getElementById('leaseStart'), e = document.getElementById('leaseEnd');
    if (s._flatpickr) s._flatpickr.setDate('01-04-2024', true, 'd-m-Y'); else s.value = '01-04-2024';
    if (e._flatpickr) e._flatpickr.setDate('31-03-2029', true, 'd-m-Y'); else e.value = '31-03-2029';
    autoTerm();
    syncTermYears();
  }, 100);

})();
