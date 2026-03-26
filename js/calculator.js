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
      // Dynamic shift: If the UI start date was changed AFTER template upload, 
      // intelligently shift all imported template dates to preserve the curve logic!
      const firstExcelDate = Utils.parseDate(varPayments[0].date);
      const shiftMonths = firstExcelDate ? Utils.monthsBetween(firstExcelDate, startDate) : 0;

      let scheduled = varPayments.map((v, i) => {
        let pd = Utils.parseDate(v.date);
        if (pd && shiftMonths !== 0) pd = Utils.addMonths(pd, shiftMonths);
        
        if (!pd) {
          pd = Utils.addMonths(startDate, (i + (timing === 'beginning' ? 0 : 1)) * intervalMonths);
        }
        if (pd > cap) pd = new Date(cap);
        
        return {
          date: pd,
          period: Utils.monthsBetween(startDate, pd)
        };
      });
      
      // Strict safety barrier: No payment mathematically prior to commencement can be in the schedule
      const barrier = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 5).getTime();
      return scheduled.filter(p => p.date.getTime() >= barrier);
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

      // Fractional discounting aligned to the periodic rate (e.g. 9% / 2 = 4.5% per half-year).
      // This mathematically guarantees 100% convergence with the simple interest applied in Amortisation.
      // e.g., 6 months elapsed / 6 months interval = 1 exact period. DF = 1 / (1 + 0.045)^1
      const monthsElapsed = Utils.monthsBetween(startDate, pd.date);
      const exactPeriods = monthsElapsed / intervalMonths;
      
      const discountFactor = 1 / Math.pow(1 + r, exactPeriods);
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

  const buildAmortSchedule = ({
    paymentDates, paymentAmount, roi, frequency, fyStartMonth,
    openingLiability, startDate, varPayments, paymentTiming, endDate, isForFySummary
  }) => {
    const r = periodicRate(roi, frequency);
    const annualRate = roi / 100;
    const intervalMonths = Utils.freqMonths[frequency];
    const isBeg = paymentTiming === 'beginning';

    // 1. Gather all important timeline boundaries (Milestones)
    let rawMilestones = [];
    rawMilestones.push(startDate.getTime());
    if (endDate) rawMilestones.push(endDate.getTime());
    paymentDates.forEach(p => rawMilestones.push(p.date.getTime()));

    let startYear = startDate.getFullYear();
    const endMonth = fyStartMonth === 1 ? 11 : fyStartMonth - 2; 
    let currentFyEnd = new Date(startYear, endMonth + 1, 0); 
    if (currentFyEnd <= startDate) {
      currentFyEnd = new Date(startYear + 1, endMonth + 1, 0);
    }
    const leaseEnd = endDate || paymentDates[paymentDates.length - 1].date;

    rawMilestones.sort((a,b) => a - b);

    // Merge milestones within 3 days (e.g. 31-Mar and 01-Apr merge into 31-Mar boundary)
    const uniqueMilestones = [];
    rawMilestones.forEach(m => {
       if (uniqueMilestones.length === 0) {
           uniqueMilestones.push(m);
       } else {
           const last = uniqueMilestones[uniqueMilestones.length - 1];
           if (m - last > 3 * 86400000) {
               uniqueMilestones.push(m);
           }
       }
    });

    // 2. Process each Period (Milestone[i-1] to Milestone[i])
    const rows = [];
    let balance = Utils.round2(openingLiability);

    for (let i = 1; i < uniqueMilestones.length; i++) {
        const periodStart = new Date(uniqueMilestones[i - 1]);
        const periodEnd   = new Date(uniqueMilestones[i]);
        
        let monthsElapsed = Utils.monthsBetween(periodStart, periodEnd);
        if (monthsElapsed === 0) continue;

        const exactPeriodRate = annualRate * (monthsElapsed / 12);
        const fy = Utils.fyLabel(periodEnd, fyStartMonth);

        // Find payments attached to this period (using 3-day proximity window due to merged milestones)
        let pmtSum = 0;
        let pmtType = 'payment';

        if (isBeg) {
           const matches = paymentDates.filter(p => Math.abs(p.date.getTime() - periodStart.getTime()) <= 3 * 86400000);
           matches.forEach(p => {
               pmtSum += getPmt(varPayments, paymentDates.indexOf(p), paymentAmount);
               pmtType = p.type || 'payment';
           });
           
           if (i === uniqueMilestones.length - 1) {
               const tailMatches = paymentDates.filter(p => Math.abs(p.date.getTime() - periodEnd.getTime()) <= 3 * 86400000);
               tailMatches.forEach(p => { pmtSum += getPmt(varPayments, paymentDates.indexOf(p), paymentAmount); });
           }
        } else {
           const matches = paymentDates.filter(p => Math.abs(p.date.getTime() - periodEnd.getTime()) <= 3 * 86400000);
           matches.forEach(p => {
               pmtSum += getPmt(varPayments, paymentDates.indexOf(p), paymentAmount);
               pmtType = p.type || 'payment';
           });
           
           if (i === 1) {
               const headMatches = paymentDates.filter(p => Math.abs(p.date.getTime() - periodStart.getTime()) <= 3 * 86400000);
               headMatches.forEach(p => { pmtSum += getPmt(varPayments, paymentDates.indexOf(p), paymentAmount); });
           }
        }

        const openBal = Utils.round2(balance);
        let interest = 0;
        let closeBal = 0;

        if (isBeg) {
            // Pre-payment principal base for interest
            interest = Utils.round2(Math.max(0, openBal - pmtSum) * exactPeriodRate);
            closeBal = Utils.round2(openBal - pmtSum + interest);
        } else {
            // Full principal base for interest
            interest = Utils.round2(openBal * exactPeriodRate);
            closeBal = Utils.round2(openBal + interest - pmtSum);
        }

        const isAbsoluteLast = i === uniqueMilestones.length - 1;
        if (isAbsoluteLast || Math.abs(closeBal) < 0.05) closeBal = 0;

        let rowDate = isBeg ? periodStart : periodEnd;
        if (pmtSum === 0) rowDate = periodEnd;

        rows.push({
          index: rows.length + 1,
          date: rowDate,
          periodStart,
          periodEnd,
          fy,
          months: monthsElapsed,
          ratePct: roi,
          openBal,
          interest,
          payment: pmtSum,
          closeBal: Math.max(0, closeBal),
          type: pmtType
        });

        balance = Math.max(0, closeBal);
    }

    // Filter out trailing zero-rows if the liability was successfully settled
    return rows.filter((r, idx) => {
       if (idx === 0) return true;
       if (Math.abs(r.openBal) < 0.1 && r.payment === 0 && r.interest === 0) return false;
       return true;
    }).map((r, idx) => ({ ...r, index: idx + 1 }));
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
   * Build FY-wise summary directly from the standard period Amortisation rows
   * by correctly apportioning accrued interest and payments chronologically.
   */
  const buildFYSummary = ({ amortRows, rouRows, fyStartMonth }) => {
    const fyMap = {};

    rouRows.forEach(r => {
      if (!fyMap[r.fy]) fyMap[r.fy] = { fy: r.fy, interest: 0, payments: 0 };
    });

    amortRows.forEach(row => {
      // 1. Apportion Interest mathematically day by day 
      //    so we never diverge from the master Amortisation compound curve
      const sT = row.periodStart.getTime();
      const eT = row.periodEnd.getTime();
      const diffDays = Math.max(1, Math.round((eT - sT) / 86400000));
      const dailyInt = row.interest / diffDays;
      let curr = sT;

      while (curr < eT) {
        const lbl = Utils.fyLabel(new Date(curr), fyStartMonth);
        if (!fyMap[lbl]) fyMap[lbl] = { fy: lbl, interest: 0, payments: 0 };
        fyMap[lbl].interest += dailyInt;
        curr += 86400000;
      }

      // 2. Payment lands instantly on the exact payment date
      //    (row.date is either periodStart or periodEnd based on timing mode)
      const pLbl = Utils.fyLabel(row.date, fyStartMonth);
      if (!fyMap[pLbl]) fyMap[pLbl] = { fy: pLbl, interest: 0, payments: 0 };
      fyMap[pLbl].payments += row.payment;

      // Accumulations complete. `openBal` and `closeBal` generated chronologically downstream.
    });

    // ── Build chronologically-ordered FY list ──────────────────────────────
    const allFYs = [];
    const seenFYs = new Set();
    rouRows.forEach(r  => { if (!seenFYs.has(r.fy)) { allFYs.push(r.fy); seenFYs.add(r.fy); } });
    amortRows.forEach(r => { 
        [Utils.fyLabel(r.periodStart, fyStartMonth), Utils.fyLabel(r.periodEnd, fyStartMonth)].forEach(f => {
            if (!seenFYs.has(f)) { allFYs.push(f); seenFYs.add(f); }
        });
    });

    const amortFYSet       = new Set(amortRows.map(r => Utils.fyLabel(r.periodStart, fyStartMonth)));
    const initialLiability = amortRows.length > 0 ? amortRows[0].openBal : 0;

    let runningBal = initialLiability;

    const result = allFYs.map((fyLbl, idx) => {
      const fy       = fyMap[fyLbl] || { interest: 0, payments: 0 };
      const hasAmort = amortFYSet.has(fyLbl);
      
      const firstAmortIdx = Array.from(amortFYSet).map(f => allFYs.indexOf(f)).find(i => i >= 0);
      const isBefore = !hasAmort && idx < (firstAmortIdx !== undefined ? firstAmortIdx : 999);

      let currentOpenBal = runningBal;
      let currentInterest = fy.interest || 0;
      let currentPayments = fy.payments || 0;
      let currentCloseBal = Utils.round2(currentOpenBal + currentInterest - currentPayments);
      
      runningBal = currentCloseBal;

      const rou = rouRows.find(r => r.fy === fyLbl);

      let currentLiab = 0;
      if (allFYs[idx + 1] && !isBefore) {
         const nextFy = fyMap[allFYs[idx + 1]] || { interest: 0, payments: 0 };
         currentLiab = Math.max(0, nextFy.payments - nextFy.interest);
         if (currentLiab > currentCloseBal) currentLiab = currentCloseBal;
      }

      if (idx === allFYs.length - 1 || Math.abs(currentCloseBal - currentLiab) < 0.05) {
          currentLiab = currentCloseBal;
      }

      const nonCurrentLiab = Math.max(0, currentCloseBal - currentLiab);

      return {
        fy: fyLbl,
        openBal: isBefore ? initialLiability : Utils.round2(currentOpenBal),
        interest: isBefore ? 0 : Utils.round2(currentInterest),
        payments: isBefore ? 0 : Utils.round2(currentPayments),
        closeBal: isBefore ? initialLiability : Math.max(0, currentCloseBal),
        dep: rou ? rou.dep : 0,
        rouCloseBV: rou ? rou.closeBV : 0,
        currentLiab: isBefore ? 0 : Utils.round2(currentLiab),
        nonCurrentLiab: isBefore ? initialLiability : Utils.round2(nonCurrentLiab)
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
