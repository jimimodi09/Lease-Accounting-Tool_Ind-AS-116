/* ── upload.js – Template upload, parse & validate (DD-MM-YYYY aware) ── */
'use strict';

const Upload = (() => {

  /** Maps lowercase field names → input element IDs */
  const FIELD_MAP = {
    'lease name / asset description':                     'leaseName',
    'lease start date':                                   'leaseStart',
    'lease end date':                                     'leaseEnd',
    'lease term (months)':                                'leaseTerm',
    'lease payment amount (₹)':                          'paymentAmount',
    'payment frequency':                                  'frequency',
    'payment timing':                                     'paymentTiming',
    'incremental borrowing rate (% p.a.)':                'roi',
    'initial direct costs (₹)':                          'initialDirectCosts',
    'lease incentives received (₹)':                     'leaseIncentives',
    'restoration / dismantling costs (₹)':               'restorationCosts',
    'residual value guarantee (₹)':                      'residualValue',
    'financial year start (month)':                       'fyStart',
    'opening lease liability (₹)':                       'openingLiability',
  };

  const DATE_FIELDS  = ['leaseStart', 'leaseEnd'];
  const VALID_FREQ   = ['monthly', 'quarterly', 'halfyearly', 'yearly'];
  const VALID_TIMING = ['beginning', 'end'];

  const DATE_DMY = /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/;
  const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Convert Excel serial date number → DD-MM-YYYY string.
   * Excel epoch: 1899-12-30 (with Lotus 1-2-3 leap year bug).
   */
  const excelSerialToDateStr = (serial) => {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + serial * 86400000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${d.getFullYear()}`;
  };

  /** Normalise any date value (string or Excel serial) → DD-MM-YYYY */
  const normDate = (val) => {
    if (val == null || val === '') return '';
    // Numeric → Excel serial number
    if (typeof val === 'number' && val > 1000) return excelSerialToDateStr(val);
    const str = val.toString().trim();
    // Already DD-MM-YYYY or DD/MM/YYYY
    if (DATE_DMY.test(str)) {
      const [d, m, y] = str.split(/[-\/]/).map(Number);
      return `${String(d).padStart(2,'0')}-${String(m).padStart(2,'0')}-${y}`;
    }
    // ISO YYYY-MM-DD → convert
    if (DATE_ISO.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      return `${String(d).padStart(2,'0')}-${String(m).padStart(2,'0')}-${y}`;
    }
    return str;
  };

  const setStatus = (msg, type = '') => {
    const el = document.getElementById('uploadStatus');
    el.textContent = msg;
    el.className = 'upload-status ' + type;
  };

  /** Switch app to the Inputs tab so user can review populated fields */
  const switchToInputs = () => {
    const tab = document.querySelector('.nav-tab[data-tab="inputs"]');
    if (tab) tab.click();
  };

  /**
   * Parse Lease Inputs sheet rows → [{field:string, value:any}]
   * NOTE: value is kept as its raw type (number|string) so that
   * normDate() can correctly handle Excel serial-number dates.
   */
  const parseLeaseInputRows = (rows) => {
    return rows.slice(1).map(r => ({
      field: ((r[0] || '').toString().trim()).toLowerCase(),
      value: r[1] != null ? r[1] : ''   // preserve raw type — NOT .toString() yet
    }));
  };

  /**
   * Parse Payment Schedule sheet rows.
   * Expects columns: Period #, Payment Date (DD-MM-YYYY), Payment Amount (₹)
   * Row 1 = NOTE row, Row 2 = Header, Row 3+ = data
   * Returns [{period, date, payment}] or null if no valid data.
   */
  const parsePaymentSchedule = (rows) => {
    if (!rows || rows.length < 3) return null;

    // Find header row (contains "period" and "payment")
    let dataStart = 1;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const first = (rows[i][0] || '').toString().toLowerCase();
      if (first.includes('period')) { dataStart = i + 1; break; }
    }

    const schedule = [];
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      const period  = parseInt(row[0]);
      // Normalise date: handles serial numbers and string formats
      const dateStr = normDate(row[1]);
      const pmtVal  = row[2];
      const payment = (pmtVal !== '' && pmtVal != null) ? parseFloat(pmtVal) : null;

      if (isNaN(period) || period < 1) continue;
      if (payment === null || isNaN(payment)) continue;

      schedule.push({ period, date: dateStr, payment });
    }

    return schedule.length > 0 ? schedule : null;
  };

  /** Validate & populate the form from Lease Inputs pairs */
  const populateForm = (pairs) => {
    const errors = [];
    pairs.forEach(({ field, value }) => {
      const id = FIELD_MAP[field];
      if (!id || value === '' || value == null) return;

      // ── Date fields: normalise serial numbers / ISO / DMY → DD-MM-YYYY ──
      if (DATE_FIELDS.includes(id)) {
        const normalised = normDate(value);   // handles numbers AND strings
        const parsed = Utils.parseDate(normalised);
        if (!parsed) {
          errors.push(`"${field}": invalid date "${value}" (use DD-MM-YYYY)`);
          return;
        }
        const el = document.getElementById(id);
        if (el) {
          if (el._flatpickr) {
            el._flatpickr.setDate(normalised, true, 'd-m-Y');
          } else {
            el.value = normalised;
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input',  { bubbles: true }));
        }
        return;
      }

      // Coerce to string for non-date fields only at this point
      const strVal = value.toString().trim();

      if (id === 'frequency' && !VALID_FREQ.includes(strVal.toLowerCase())) {
        errors.push(`"${field}": must be ${VALID_FREQ.join(' | ')}`); return;
      }
      if (id === 'paymentTiming' && !VALID_TIMING.includes(strVal.toLowerCase())) {
        errors.push(`"${field}": must be end | beginning`); return;
      }

      const el = document.getElementById(id);
      if (el) {
        el.value = strVal;
        // Fire both events so reactive listeners and select-change handlers fire
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input',  { bubbles: true }));
      }
    });
    return errors;
  };

  /** Parse CSV text into [{field, value}] */
  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).slice(1); // skip header
    return lines.map(line => {
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];
      const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
      return { field: (clean[0] || '').toLowerCase(), value: clean[1] || '' };
    });
  };

  /** Parse XLSX workbook: returns {inputPairs, paymentSchedule} */
  const parseExcel = (arrayBuf) => {
    // raw:true keeps numbers as numbers (so date serials arrive as numbers, not strings)
    // cellDates:false prevents SheetJS from auto-converting serials to JS Date objects
    const wb = XLSX.read(arrayBuf, { type: 'array', raw: true, cellDates: false });

    // Sheet 1: Lease Inputs
    const inputSheet = wb.Sheets[wb.SheetNames[0]];
    const inputRows  = XLSX.utils.sheet_to_json(inputSheet, { header: 1, raw: true, defval: '' });
    const inputPairs = parseLeaseInputRows(inputRows);

    // Sheet 2: Payment Schedule (optional)
    let paymentSchedule = null;
    const schedSheetName = wb.SheetNames.find(n =>
      n.toLowerCase().includes('payment') || n.toLowerCase().includes('schedule')
    );
    if (schedSheetName) {
      const schedSheet = wb.Sheets[schedSheetName];
      const schedRows  = XLSX.utils.sheet_to_json(schedSheet, { header: 1, raw: true, defval: '' });
      paymentSchedule  = parsePaymentSchedule(schedRows);
    }

    return { inputPairs, paymentSchedule };
  };

  /**
   * Main entry point.
   * onVarPayments(schedule|null) – callback with parsed period-wise schedule.
   */
  const handleFile = (file, onVarPayments) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    setStatus('Reading file…');

    const reader = new FileReader();

    if (ext === 'csv') {
      reader.onload = (e) => {
        try {
          const pairs  = parseCSV(e.target.result);
          const errors = populateForm(pairs);
          if (errors.length) {
            setStatus('⚠ Loaded with warnings: ' + errors.join('; '), 'error');
          } else {
            setStatus('✔ Template loaded. Review inputs and click Compute.', 'success');
          }
          document.getElementById('leaseStart').dispatchEvent(new Event('change'));
          document.getElementById('leaseEnd').dispatchEvent(new Event('change'));
          if (onVarPayments) onVarPayments(null);
          // Notify app.js that upload is complete
          document.dispatchEvent(new CustomEvent('upload-complete'));
        } catch (err) {
          setStatus('✘ Failed to parse CSV: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);

    } else if (['xlsx', 'xls'].includes(ext)) {
      if (typeof XLSX === 'undefined') { setStatus('✘ Excel library not loaded.', 'error'); return; }
      reader.onload = (e) => {
        try {
          const { inputPairs, paymentSchedule } = parseExcel(new Uint8Array(e.target.result));
          const errors = populateForm(inputPairs);

          const statusMsg = errors.length
            ? '⚠ Loaded with warnings: ' + errors.join('; ')
            : '✔ Template loaded. Review inputs below and click Compute.';

          const fullMsg = paymentSchedule && paymentSchedule.length > 0
            ? statusMsg + ` | ${paymentSchedule.length} period-wise payments loaded.`
            : statusMsg;

          setStatus(fullMsg, errors.length ? 'error' : 'success');
          document.getElementById('leaseStart').dispatchEvent(new Event('change'));
          document.getElementById('leaseEnd').dispatchEvent(new Event('change'));

          if (onVarPayments) onVarPayments(paymentSchedule);

          // Notify app.js that upload is complete (triggers autoTerm + recompute)
          document.dispatchEvent(new CustomEvent('upload-complete'));

          // Switch to Inputs tab so user can review and modify populated fields
          if (!errors.length) setTimeout(switchToInputs, 150);
        } catch (err) {
          setStatus('✘ Failed to parse Excel: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);

    } else {
      setStatus('✘ Unsupported file type. Use CSV or XLSX.', 'error');
    }
  };

  return { handleFile };
})();
