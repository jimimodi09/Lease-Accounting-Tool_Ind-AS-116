/* ── schedules.js – DOM rendering for schedules ── */
'use strict';

const Schedules = (() => {

  /** Render PV Calculation Table */
  const renderPV = (pvSchedule, totalPV) => {
    const body = document.getElementById('pvBody');
    const foot = document.getElementById('pvFoot');
    body.innerHTML = '';
    let totalPmt = 0;

    pvSchedule.forEach(row => {
      totalPmt += row.payment;
      body.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${row.index}</td>
          <td>${Utils.fmtDate(row.date)}</td>
          <td>${row.period}</td>
          <td>${Utils.fmtNum(row.payment)}</td>
          <td>${row.discountFactor.toFixed(6)}</td>
          <td>${Utils.fmtNum(row.pv)}</td>
        </tr>`);
    });

    foot.innerHTML = `
      <tr>
        <td colspan="3">Total</td>
        <td>${Utils.fmtNum(totalPmt)}</td>
        <td></td>
        <td>${Utils.fmtNum(totalPV)}</td>
      </tr>`;
  };

  /** Render Amortisation Schedule */
  const renderAmort = (amortRows) => {
    const body = document.getElementById('amortBody');
    const foot = document.getElementById('amortFoot');
    body.innerHTML = '';
    let prevFY = null, totInt = 0, totPmt = 0;

    amortRows.forEach(row => {
      const fyBreak = prevFY && prevFY !== row.fy ? 'fy-separator' : '';
      body.insertAdjacentHTML('beforeend', `
        <tr class="${fyBreak}">
          <td>${row.index}</td>
          <td>${Utils.fmtDate(row.date)}</td>
          <td>${row.fy}</td>
          <td>${row.months}</td>
          <td>${row.ratePct}%</td>
          <td>${Utils.fmtNum(row.openBal)}</td>
          <td>${Utils.fmtNum(row.interest)}</td>
          <td>${Utils.fmtNum(row.payment)}</td>
          <td>${Utils.fmtNum(row.closeBal)}</td>
        </tr>`);
      prevFY = row.fy;
      totInt += row.interest;
      totPmt += row.payment;
    });

    foot.innerHTML = `
      <tr>
        <td colspan="5">Totals</td>
        <td></td>
        <td>${Utils.fmtNum(Utils.round2(totInt))}</td>
        <td>${Utils.fmtNum(Utils.round2(totPmt))}</td>
        <td></td>
      </tr>`;
  };

  /** Render ROU Asset Schedule */
  const renderROU = (rouRows, rouInitial) => {
    const body = document.getElementById('rouBody');
    const foot = document.getElementById('rouFoot');
    body.innerHTML = '';
    let totDep = 0;

    rouRows.forEach(row => {
      body.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${row.fy}</td>
          <td>${Utils.fmtNum(row.openBV)}</td>
          <td>${Utils.fmtNum(row.dep)}</td>
          <td>${Utils.fmtNum(row.closeBV)}</td>
        </tr>`);
      totDep += row.dep;
    });

    foot.innerHTML = `
      <tr>
        <td>Total</td>
        <td>${Utils.fmtNum(rouInitial)}</td>
        <td>${Utils.fmtNum(Utils.round2(totDep))}</td>
        <td>—</td>
      </tr>`;
  };

  /** Render FY Summary Table */
  const renderFYSummary = (fySummary) => {
    const body = document.getElementById('fySummaryBody');
    body.innerHTML = '';

    fySummary.forEach(row => {
      body.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${row.fy}</td>
          <td>${Utils.fmtNum(row.openBal)}</td>
          <td>${Utils.fmtNum(row.interest)}</td>
          <td>${Utils.fmtNum(row.payments)}</td>
          <td>${Utils.fmtNum(row.closeBal)}</td>
          <td>${Utils.fmtNum(row.currentLiab)}</td>
          <td>${Utils.fmtNum(row.nonCurrentLiab)}</td>
          <td>${Utils.fmtNum(row.dep)}</td>
          <td>${Utils.fmtNum(row.rouCloseBV)}</td>
        </tr>`);
    });
  };

  return { renderPV, renderAmort, renderROU, renderFYSummary };
})();
