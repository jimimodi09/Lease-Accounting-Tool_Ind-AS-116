/* ── utils.js ── */
'use strict';

const Utils = (() => {

  /* ── Number Formatting ── */
  const fmtINR = (n) => {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    let s;
    if (abs >= 1e7)      s = (n / 1e7).toFixed(2) + ' Cr';
    else if (abs >= 1e5) s = (n / 1e5).toFixed(2) + ' L';
    else                 s = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    return '₹' + s;
  };

  const fmtNum = (n, decimals = 2) => {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  };

  const fmtPct = (n) => (n == null || isNaN(n)) ? '—' : n.toFixed(2) + '%';

  /* ── Date Utilities ──
     All user-facing dates are DD-MM-YYYY.
     Internal storage: JS Date objects.
  ── */

  /**
   * Parse a date string.  Accepts:
   *   DD-MM-YYYY  (primary – used in UI and templates)
   *   YYYY-MM-DD  (ISO fallback for backward compat)
   *   DD/MM/YYYY
   */
  const parseDate = (str) => {
    if (!str) return null;
    str = str.toString().trim();

    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmy) {
      const [, d, m, y] = dmy.map(Number);
      return new Date(y, m - 1, d);
    }

    // YYYY-MM-DD (ISO – backward compat)
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const [, y, m, d] = iso.map(Number);
      return new Date(y, m - 1, d);
    }

    return null;
  };

  /** Format a JS Date → "DD-MM-YYYY" string (for template / display) */
  const toDateStr = (dt) => {
    if (!dt) return '';
    const d = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${d}-${m}-${y}`;
  };

  /** Human-readable date label  e.g. "01-Apr-2024" */
  const fmtDate = (dt) => {
    if (!dt) return '—';
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
             .replace(/ /g, '-');
  };

  // Exact fractional months elapsed between d1 and d2
  const monthsBetween = (d1, d2) => {
    let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    const isD1First = d1.getDate() === 1;
    const isD2Last  = d2.getDate() === new Date(d2.getFullYear(), d2.getMonth() + 1, 0).getDate();
    
    if (isD1First && isD2Last) {
      months += 1;
    } else if (d2.getDate() < d1.getDate()) {
      months -= 1;
      const daysInD1Month = new Date(d1.getFullYear(), d1.getMonth() + 1, 0).getDate();
      months += ((daysInD1Month - d1.getDate()) + d2.getDate()) / 30.4167; // average days
    } else if (d2.getDate() > d1.getDate()) {
      months += (d2.getDate() - d1.getDate()) / 30.4167;
    }
    return Math.max(0, months);
  };

  // Add N months to a date
  const addMonths = (dt, n) => {
    const d = new Date(dt);
    d.setMonth(d.getMonth() + n);
    return d;
  };

  // Add N days
  const addDays = (dt, n) => new Date(dt.getTime() + n * 86400000);

  /* ── Financial Year Helpers ── */
  // fyStartMonth: 4 = April (Indian FY), 1 = January etc.
  const fyLabel = (dt, fyStartMonth) => {
    const m = dt.getMonth() + 1;
    const y = dt.getFullYear();
    if (fyStartMonth === 1) return `FY ${y}`;
    const fyYear = m >= fyStartMonth ? y : y - 1;
    return `FY ${fyYear}-${String(fyYear + 1).slice(-2)}`;
  };

  const fyRange = (dt, fyStartMonth) => {
    const m = dt.getMonth() + 1;
    const y = dt.getFullYear();
    const fyYear = m >= fyStartMonth ? y : y - 1;
    const start = new Date(fyYear, fyStartMonth - 1, 1);
    let end;
    if (fyStartMonth === 1) {
      end = new Date(fyYear, 11, 31);
    } else {
      end = new Date(fyYear + 1, fyStartMonth - 1, 0);
    }
    return { start, end };
  };

  const leaseFYs = (startDate, endDate, fyStartMonth) => {
    const fys = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      const lbl = fyLabel(d, fyStartMonth);
      if (!fys.includes(lbl)) fys.push(lbl);
      d = addMonths(d, 1);
    }
    return fys;
  };

  /* ── Frequency Helpers ── */
  const freqMonths = { monthly: 1, quarterly: 3, halfyearly: 6, yearly: 12 };
  const freqLabel  = { monthly: 'Monthly', quarterly: 'Quarterly', halfyearly: 'Half-Yearly', yearly: 'Yearly' };

  /* ── Clamp / Round ── */
  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    fmtINR, fmtNum, fmtPct, fmtDate,
    parseDate, toDateStr, addMonths, addDays, monthsBetween,
    fyLabel, fyRange, leaseFYs,
    freqMonths, freqLabel, round2
  };
})();
