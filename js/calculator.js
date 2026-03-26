/* ── calculator.js ── */
'use strict';

const Calculator = (() => {

  /**
   * Generate payment dates array.
   * Returns [{date, period}]
   */
  /**
   * Generate payment dates.
   * endDate (optional): lease end date — last payment is capped to endDate
   * to prevent day-of-month drift pushing the final date into the next FY.
   */
  const generatePaymentDates = (startDate, frequency, timing, termMonths, endDate, varPayments) => {
    const intervalMonths = Utils.freqMonths[frequency];
    const cap = endDate || Utils.addMonths(startDate, termMonths);

    if (varPayments && varPayments.length > 0) {
      return varPayments.map((v, i) => {
        let pd = Utils.parseDate(v.date);
        if (!pd) {
          pd = Utils.addMonths(startDate, (i + (timing === 'beginning' ? 0 : 1)) * intervalMonths);
          if (pd > cap) pd = new Date(cap);
        }
        return {
          date: pd,
          period: Utils.monthsBetween(startDate, pd)
        };
      });
    }

    const dates = [];
    let period = 0;

    if (timing === 'beginning') {
      let d = new Date(startDate);
      while (d < cap) {
        dates.push({ date: new Date(d), period });
        d = Utils.addMonths(d, intervalMonths);
        period += intervalMonths;
      }
    } else {
      let d = Utils.addMonths(startDate, intervalMonths);
      period = intervalMonths;
      while (d <= cap) {
        dates.push({ date: new Date(d), period });
        d = Utils.addMonths(d, intervalMonths);
        period += intervalMonths;
      }
      // If the last pushed date was before the cap, push a final partial period
      if (dates.length > 0) {
        const lastDate = dates[dates.length - 1].date;
        if (lastDate < cap) {
          dates.push({ date: new Date(cap), period: termMonths });
        }
      } else if (cap > startDate) {
        dates.push({ date: new Date(cap), period: termMonths });
      }
    }
    return dates;
  };

  /**
   * Periodic rate from annual ROI
   */
  const periodicRate = (annualRatePct, frequency) => {
    const months = Utils.freqMonths[frequency];
    return annualRatePct / 100 / (12 / months);
  };

  /**
   * Look up payment for period i from variable schedule or fallback to uniform amount.
   * varPayments: array of {period, payment} indexed 0..n-1
   */
  const getPmt = (varPayments, i, uniformAmount) => {
    if (varPayments && varPayments[i] != null && !isNaN(varPayments[i].payment)) {
      return varPayments[i].payment;
    }
    return uniformAmount;
  };

  /**
   * Compute PV schedule – handles variable payments per period.
   * varPayments: optional [{date, period, payment}] from uploaded schedule.
   * Returns {schedule, totalPV}
   */
  const computePVSchedule = ({ paymentDates, paymentAmount, roi, frequency, timing, residualValue, varPayments, startDate }) => {
    const r = periodicRate(roi, frequency);
    const annualRate = roi / 100;
    const intervalMonths = Utils.freqMonths[frequency];
    const schedule = [];
    let totalPV = 0;

    paymentDates.forEach((pd, i) => {
      const pmt = getPmt(varPayments, i, paymentAmount);
      // Add residual value to last period
      const isLast = i === paymentDates.length - 1;
      const effectivePmt = isLast && residualValue > 0 ? pmt + residualValue : pmt;

      // Exactly align mathematical discounting with the daily fractions used in Amortisation
      const daysElapsed = Math.round((pd.date - startDate) / 86400000);
      const exactN = daysElapsed / 365;
      
      const discountFactor = 1 / Math.pow(1 + annualRate, exactN);
      const pv = Utils.round2(effectivePmt * discountFactor);
      totalPV += pv;

      schedule.push({
        index: i + 1,
        date: pd.date,
        period: pd.period,
        payment: effectivePmt,
        discountFactor,
        pv
      });
    });

    return { schedule, totalPV: Utils.round2(totalPV) };
  };

  /**
   * Build amortisation schedule – handles variable payments per period.
   *
   * Effective interest method per Ind AS 116:
   *  • End-of-period   : Interest = OpenBal × r  ; CloseBal = OpenBal + Interest − Payment
   *  • Beginning-of-period: Payment reduces principal first, THEN interest accrues:
   *                         Interest = (OpenBal − Payment) × r ; CloseBal = (OpenBal − Payment) + Interest
   */
  const buildAmortSchedule = ({
    paymentDates, paymentAmount, roi, frequency, fyStartMonth,
    openingLiability, startDate, varPayments, paymentTiming, endDate
  }) => {
    const r = periodicRate(roi, frequency);
    const annualRate = roi / 100;
    const intervalMonths = Utils.freqMonths[frequency];

    // 1. Build initial timeline of events
    const allEvents = paymentDates.map((pd, i) => {
      return {
        date: pd.date,
        type: 'payment',
        payment: getPmt(varPayments, i, paymentAmount),
        isLastPayment: i === paymentDates.length - 1
      };
    });

    // 2. Generate FY End Dates
    let startYear = startDate.getFullYear();
    const endMonth = fyStartMonth === 1 ? 11 : fyStartMonth - 2; 
    let currentFyEnd = new Date(startYear, endMonth + 1, 0); 
    if (currentFyEnd <= startDate) {
      currentFyEnd = new Date(startYear + 1, endMonth + 1, 0);
    }
    
    const leaseEnd = endDate || paymentDates[paymentDates.length - 1].date;
    
    while (currentFyEnd <= leaseEnd) {
      // Don't add if a payment lands on exactly the same day 
      const isDup = allEvents.some(e => Math.abs(e.date - currentFyEnd) < 43200000);
      if (!isDup) {
        allEvents.push({
          date: new Date(currentFyEnd),
          type: 'fyEnd',
          payment: 0,
          isLastPayment: false
        });
      }
      currentFyEnd = new Date(currentFyEnd.getFullYear() + 1, endMonth + 1, 0); // next year
    }

    // Also explicitly force the lease end date into events if not present
    if (endDate && !allEvents.some(e => Math.abs(e.date - endDate) < 43200000)) {
      allEvents.push({
        date: new Date(endDate),
        type: 'leaseEnd',
        payment: 0,
        isLastPayment: false
      });
    }

    // Sort chronologically
    allEvents.sort((a, b) => a.date - b.date);

    // 3. Process events sequentially
    const rows = [];
    let balance = Utils.round2(openingLiability);
    let lastDate = startDate;

    allEvents.forEach((ev, i) => {
      const openBal = Utils.round2(balance);

      // Exact days for simple interest fraction (Days/365)
      const daysElapsed = Math.round((ev.date - lastDate) / 86400000);
      const exactPeriodRate = annualRate * (daysElapsed / 365);

      // Accrue interest on the balance, then deduct any payments for this event
      let interest = Utils.round2(openBal * exactPeriodRate);
      let closeBal = Utils.round2(openBal + interest - ev.payment);

      const isAbsoluteLast = i === allEvents.length - 1;
      if (isAbsoluteLast || Math.abs(closeBal) < 0.05) closeBal = 0;

      const fy = Utils.fyLabel(ev.date, fyStartMonth);
      rows.push({
        index: i + 1,
        date: ev.date,
        fy,
        days: daysElapsed,
        ratePct: roi,
        openBal,
        interest,
        payment: ev.payment,
        closeBal: Math.max(0, closeBal),
        type: ev.type
      });

      balance = Math.max(0, closeBal);
      lastDate = ev.date;
    });

    return rows;
  };


  /**
   * Build ROU depreciation schedule (straight-line) per FY
   */
  const buildROUSchedule = ({ rouAssetInitial, startDate, endDate, fyStartMonth }) => {
    const fys = Utils.leaseFYs(startDate, endDate, fyStartMonth);
    const termMonths = Utils.monthsBetween(startDate, endDate);
    const monthlyDep = rouAssetInitial / termMonths;
    const rows = [];
    let bookValue = Utils.round2(rouAssetInitial);

    fys.forEach((fyLbl) => {
      const fyR = fyRangeFromLabel(fyLbl, fyStartMonth);
      const overlapStart = fyR.start < startDate ? startDate : fyR.start;
      const overlapEnd   = fyR.end   > endDate   ? endDate   : fyR.end;
      if (overlapStart > overlapEnd) return;

      const months = Utils.monthsBetween(overlapStart, overlapEnd);

      let dep = Utils.round2(monthlyDep * Math.min(months, 12));
      if (dep > bookValue) dep = bookValue;

      const openBV  = bookValue;
      const closeBV = Utils.round2(bookValue - dep);
      rows.push({ fy: fyLbl, openBV, dep, closeBV });
      bookValue = closeBV;
    });

    // Force last row to exactly zero to absorb cumulative rounding residuals
    if (rows.length > 0) {
      const last = rows[rows.length - 1];
      if (last.closeBV !== 0 && Math.abs(last.closeBV) < 1) {
        last.dep    = Utils.round2(last.dep + last.closeBV);
        last.closeBV = 0;
      }
    }

    return rows;
  };

  /**
   * Build FY-wise summary from amortisation + ROU schedules.
   *
   * Fixes:
   *  1. All FYs from rouRows are seeded into fyMap so the final FY
   *     (which may have ROU dep but no liability payments) is never skipped.
   *  2. Current liability = liability reduction in the *next* FY
   *     (i.e. nextRow.openBal − nextRow.closeBal), which equals
   *     principal repaid next year. For the last FY the full balance is current.
   */
  const buildFYSummary = ({ amortRows, rouRows, fyStartMonth }) => {
    const fyMap = {};

    // Seed every FY that appears in rouRows first (ensures last FY is always present)
    rouRows.forEach(r => {
      if (!fyMap[r.fy]) fyMap[r.fy] = { fy: r.fy, openBal: 0, interest: 0, payments: 0, closeBal: 0 };
    });

    // Populate liability data from amortisation rows
    amortRows.forEach(row => {
      if (!fyMap[row.fy]) fyMap[row.fy] = { fy: row.fy, openBal: row.openBal, interest: 0, payments: 0, closeBal: 0 };
      // Set openBal only on the first row of this FY
      if (fyMap[row.fy].interest === 0 && fyMap[row.fy].payments === 0) {
        fyMap[row.fy].openBal = row.openBal;
      }
      fyMap[row.fy].interest += row.interest;
      fyMap[row.fy].payments += row.payment;
      fyMap[row.fy].closeBal  = row.closeBal;
    });

    // ── Build chronologically-ordered FY list ──────────────────────────────
    // rouRows start from LEASE COMMENCEMENT (correct first FY).
    // amortRows start from FIRST PAYMENT (may be next FY for end-timing).
    // Lead with rouRows so the commencement FY is never skipped.
    const allFYs = [];
    const seenFYs = new Set();
    rouRows.forEach(r  => { if (!seenFYs.has(r.fy)) { allFYs.push(r.fy); seenFYs.add(r.fy); } });
    amortRows.forEach(r => { if (!seenFYs.has(r.fy)) { allFYs.push(r.fy); seenFYs.add(r.fy); } });

    // Pre-payment FYs: lease recognised but first payment is in a later FY.
    // Liability = initial PV (no cash movement yet).
    const amortFYSet       = new Set(amortRows.map(r => r.fy));
    const initialLiability = amortRows.length > 0 ? amortRows[0].openBal : 0;

    const result = allFYs.map(fyLbl => {
      const fy       = fyMap[fyLbl];
      const rouRow   = rouRows.find(r => r.fy === fyLbl) || {};
      const isPrePmt = !amortFYSet.has(fyLbl);  // commencement FY before first payment
      return {
        fy:         fyLbl,
        openBal:    isPrePmt ? Utils.round2(initialLiability) : Utils.round2(fy.openBal),
        interest:   isPrePmt ? 0 : Utils.round2(fy.interest),
        payments:   isPrePmt ? 0 : Utils.round2(fy.payments),
        closeBal:   isPrePmt ? Utils.round2(initialLiability) : Utils.round2(fy.closeBal),
        dep:        rouRow.dep     || 0,
        rouCloseBV: rouRow.closeBV || 0,
        currentLiab:    0,
        nonCurrentLiab: 0,
      };
    });

    // ── Current vs Non-current split ──────────────────────────────────────
    // Current portion  = principal repaid in the NEXT financial year
    //                  = nextRow.openBal − nextRow.closeBal
    // This equals the reduction in lease liability due within 12 months of
    // the reporting date, per Ind AS 116 / IAS 1 presentation requirements.
    // For the last FY the entire closing balance is current (settled within 1 yr).
    result.forEach((row, i) => {
      if (i < result.length - 1) {
        const nextRow = result[i + 1];
        // Principal repaid next year = opening of next year − closing of next year
        const nextYearPrincipal = Utils.round2(nextRow.openBal - nextRow.closeBal);
        row.currentLiab    = Utils.round2(Math.min(row.closeBal, Math.max(0, nextYearPrincipal)));
        row.nonCurrentLiab = Utils.round2(Math.max(0, row.closeBal - row.currentLiab));
      } else {
        // Last FY – entire balance is current
        row.currentLiab    = Utils.round2(row.closeBal);
        row.nonCurrentLiab = 0;
      }
    });

    return result;
  };

  // ── Internal helper ──
  const fyRangeFromLabel = (label, fyStartMonth) => {
    const parts  = label.replace('FY ', '').split('-');
    const fyYear = parseInt(parts[0]);
    const start  = new Date(fyYear, fyStartMonth - 1, 1);
    let end;
    if (parts.length === 1) {
      end = new Date(fyYear, 11, 31);
    } else {
      end = new Date(fyYear + 1, fyStartMonth - 1, 0);
    }
    return { start, end };
  };

  return {
    generatePaymentDates, periodicRate,
    computePVSchedule, buildAmortSchedule,
    buildROUSchedule, buildFYSummary
  };
})();
