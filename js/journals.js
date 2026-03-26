/* ── journals.js – Journal Entry generation & rendering ── */
'use strict';

const Journals = (() => {

  /**
   * Build journal entries for all FYs
   * Returns array of { fy, entries: [{label, narration, lines:[{account,dr,cr}]}] }
   */
  const buildJournals = ({ fySummary, rouInitial, leaseName, startDate, amortRows }) => {
    const all = [];
    const assetLabel = leaseName || 'Leased Asset';

    fySummary.forEach((row, idx) => {
      const entries = [];

      if (idx === 0) {
        // ── Initial Recognition (first FY only) ──
        entries.push({
          label: 'Initial Recognition',
          narration: `Being initial recognition of lease liability and ROU asset on commencement of lease (${Utils.fmtDate(startDate)}) as per Ind AS 116 Para 26.`,
          lines: [
            { account: `Right-of-Use Asset – ${assetLabel}`, dr: Utils.round2(rouInitial), cr: null },
            { account: 'Lease Liability', dr: null, cr: Utils.round2(rouInitial) }
          ]
        });
      }

      // ── Interest Accrual ──
      if (row.interest > 0) {
        entries.push({
          label: 'Interest Accrual',
          narration: `Being interest expense on lease liability for ${row.fy} recognised at ${Utils.fmtNum(row.interest)} using effective interest method (Ind AS 116 Para 36(b)).`,
          lines: [
            { account: 'Finance Cost – Interest on Lease Liability', dr: Utils.round2(row.interest), cr: null },
            { account: 'Lease Liability (Accrued Interest)', dr: null, cr: Utils.round2(row.interest) }
          ]
        });
      }

      // ── Lease Payment ──
      if (row.payments > 0) {
        entries.push({
          label: 'Lease Payment',
          narration: `Being lease payment of ${Utils.fmtNum(row.payments)} made during ${row.fy} (Ind AS 116 Para 36(a)).`,
          lines: [
            { account: 'Lease Liability', dr: Utils.round2(row.payments), cr: null },
            { account: 'Bank / Cash', dr: null, cr: Utils.round2(row.payments) }
          ]
        });
      }

      // ── Depreciation ──
      if (row.dep > 0) {
        entries.push({
          label: 'Depreciation of ROU Asset',
          narration: `Being straight-line depreciation of ROU asset for ${row.fy} (Ind AS 116 Para 31).`,
          lines: [
            { account: `Depreciation – ${assetLabel}`, dr: Utils.round2(row.dep), cr: null },
            { account: `Accumulated Depreciation – ${assetLabel}`, dr: null, cr: Utils.round2(row.dep) }
          ]
        });
      }

      all.push({ fy: row.fy, entries });
    });

    return all;
  };

  /** Render journal entries to DOM */
  const renderJournals = (fyJournals) => {
    const container = document.getElementById('journalsContainer');
    container.innerHTML = '';

    if (!fyJournals || fyJournals.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Compute a lease first.</p>';
      return;
    }

    fyJournals.forEach(({ fy, entries }) => {
      const fyDiv = document.createElement('div');
      fyDiv.className = 'fy-journal';
      fyDiv.innerHTML = `<div class="fy-journal-title">📅 ${fy}</div>`;

      entries.forEach(entry => {
        const total = entry.lines.reduce((s, l) => s + (l.dr || 0), 0);
        const lines = entry.lines.map(l => `
          <tr>
            <td class="${l.cr !== null ? 'je-cr' : 'je-dr'}">${l.account}</td>
            <td>${l.dr != null ? Utils.fmtNum(l.dr) : ''}</td>
            <td>${l.cr != null ? Utils.fmtNum(l.cr) : ''}</td>
          </tr>`).join('');

        fyDiv.insertAdjacentHTML('beforeend', `
          <div class="journal-entry">
            <div class="journal-entry-header">${entry.label}</div>
            <table>
              <thead>
                <tr>
                  <td style="color:var(--text-muted);font-size:11px;padding:6px 14px;width:55%;">Particulars</td>
                  <td style="color:var(--text-muted);font-size:11px;padding:6px 14px;text-align:right;width:22%;">Dr (₹)</td>
                  <td style="color:var(--text-muted);font-size:11px;padding:6px 14px;text-align:right;width:22%;">Cr (₹)</td>
                </tr>
              </thead>
              <tbody>${lines}</tbody>
              <tfoot>
                <tr class="je-total-border">
                  <td style="font-size:11px;padding:6px 14px;color:var(--text-muted);">
                    <em>${entry.narration}</em>
                  </td>
                  <td style="text-align:right;padding:6px 14px;font-family:var(--mono);">${Utils.fmtNum(total)}</td>
                  <td style="text-align:right;padding:6px 14px;font-family:var(--mono);">${Utils.fmtNum(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>`);
      });

      container.appendChild(fyDiv);
    });
  };

  return { buildJournals, renderJournals };
})();
