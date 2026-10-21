// ==================== LIST PAGINATION ====================
// Lange Listen zeigen zuerst nur wenige Einträge und laden per Button weitere nach.
// Die Firestore-Abfragen (50 pro Seite) bleiben unverändert; hier geht es nur um die Anzeige.
(function () {
  const PAGE = 20;
  const limits = { admin: PAGE, user: PAGE, payments: 10 };
  const containers = { admin: 'adminEntriesTable', user: 'userEntriesTable' };
  const resetFields = {
    admin: ['adminSearchInput', 'adminArchiveSelect', 'adminSortSelect'],
    user: ['userSearchInput', 'userSortSelect']
  };

  function moreButton(kind, shown, total, step) {
    const rest = total - shown;
    return `<div class="entry-show-more"><span>${shown} von ${total} angezeigt</span><button type="button" class="btn btn-secondary" onclick="showMoreEntries('${kind}')">${Math.min(step, rest)} weitere anzeigen</button></div>`;
  }

  function wrapEntries(kind, name) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (entries) {
      const list = Array.isArray(entries) ? entries : [];
      const shown = list.slice(0, limits[kind]);
      original.call(this, shown);
      const container = document.getElementById(containers[kind]);
      if (container && shown.length < list.length) container.insertAdjacentHTML('beforeend', moreButton(kind, shown.length, list.length, PAGE));
    };
  }

  window.showMoreEntries = function (kind) {
    limits[kind] += PAGE;
    if (kind === 'admin') window.filterAdminEntries?.();
    else if (document.getElementById('userSearchInput')?.value) window.searchUserEntries?.();
    else window.sortUserEntries?.();
  };

  // Bei Such-, Filter- oder Sortieränderung wieder mit der ersten Seite beginnen (vor den eigentlichen Handlern).
  const resetLimit = event => {
    for (const [kind, ids] of Object.entries(resetFields)) if (ids.includes(event.target?.id)) limits[kind] = PAGE;
  };
  document.addEventListener('input', resetLimit, true);
  document.addEventListener('change', resetLimit, true);

  wrapEntries('admin', 'renderAdminEntries');
  wrapEntries('user', 'renderUserEntries');

  // Zahlungsanfragen (Admin-Dialog)
  const originalPayments = window.renderPaymentRequestsList;
  let lastPaymentRequests = [];
  if (typeof originalPayments === 'function') {
    window.renderPaymentRequestsList = function (requests) {
      lastPaymentRequests = Array.isArray(requests) ? requests : [];
      const shown = lastPaymentRequests.slice(0, limits.payments);
      const more = shown.length < lastPaymentRequests.length
        ? moreButton('payments', shown.length, lastPaymentRequests.length, 10) : '';
      return originalPayments.call(this, shown) + more;
    };
  }
  const baseShowMore = window.showMoreEntries;
  window.showMoreEntries = function (kind) {
    if (kind !== 'payments') return baseShowMore(kind);
    limits.payments += 10;
    const container = document.getElementById('paymentRequestsList');
    if (container) container.innerHTML = window.renderPaymentRequestsList(lastPaymentRequests);
  };
})();
