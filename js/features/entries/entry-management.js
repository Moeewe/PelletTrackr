// ==================== ENTRY MANAGEMENT MODULE ====================
// CRUD-Operationen für Drucke (Create, Read, Update, Delete)
// Version: 1.0.1 - Verbesserte Live-Kostenberechnung

// Neuen Druck hinzufügen
async function addEntry() { return window.Billing.addEntry(); }

// Druck löschen
async function deleteEntry(id) {
  if (!window.checkAdminAccess()) return;

  if (!window.toast?.confirm) {
    if (!confirm("Eintrag wirklich löschen?")) return;
  } else {
    const confirmed = await window.toast.confirm(
      "Möchten Sie diesen Eintrag wirklich löschen?",
      'Löschen',
      'Abbrechen'
    );
    if (!confirmed) return;
  }

  try {
    await window.db.collection("entries").doc(id).delete();

    // Dashboard aktualisieren
    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();

    window.toast.success("Eintrag erfolgreich gelöscht!");

  } catch (error) {
    console.error("Error deleting entry:", error);
    window.toast.error("Fehler beim Löschen: " + error.message);
  }
}

// Druck als bezahlt markieren - Enhanced with payment request coupling
async function markEntryAsPaid(entryId) {
  if (!window.checkAdminAccess()) return;

  try {
    const updateData = {
      paid: true,
      paidAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      paymentMethod: 'admin_direct',
      processedByAdmin: window.currentUser?.name || 'Admin',
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };

    await window.db.collection('entries').doc(entryId).update(updateData);

    // Clean up related payment requests when marking as paid
    await cleanupRelatedPaymentRequests(entryId);

    // EXPLICIT button update for admin interface
    updateAdminPaymentButton(entryId, true);

    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();
    window.toast.success("Als bezahlt markiert!");

  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error);
    window.toast.error("Fehler beim Markieren als bezahlt: " + error.message);
  }
}

// Druck als unbezahlt markieren - Enhanced with payment request coupling
async function markEntryAsUnpaid(entryId) {
  if (!window.checkAdminAccess()) return;

  try {
    const updateData = {
      paid: false,
      paidAt: null,
      paymentMethod: null,
      processedByAdmin: null,
      requestId: null,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };

    await window.db.collection('entries').doc(entryId).update(updateData);

    // EXPLICIT button update for admin interface
    updateAdminPaymentButton(entryId, false);

    if (window.loadAdminStats) window.loadAdminStats();
    if (window.loadAllEntries) window.loadAllEntries();
    window.toast.success("Als unbezahlt markiert!");

  } catch (error) {
    console.error('Fehler beim Markieren als unbezahlt:', error);
    window.toast.error("Fehler beim Markieren als unbezahlt: " + error.message);
  }
}

async function archiveEntry(entryId, archived) {
  if (!window.checkAdminAccess()) return;
  const action = archived ? 'ins Archiv verschieben' : 'wiederherstellen';
  const confirmed = await window.toast.confirm(
    `Möchtest du diesen Auftrag ${action}? Der Eintrag und seine Zahlungsdaten bleiben erhalten.`,
    archived ? 'Archivieren' : 'Wiederherstellen',
    'Abbrechen'
  );
  if (!confirmed) return;

  try {
    const user = window.firebase.auth().currentUser;
    await window.db.collection('entries').doc(entryId).update({
      archived: Boolean(archived),
      ...(archived ? {
        archivedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        archivedBy: user.uid,
        archivedByName: window.currentUser?.name || 'Admin'
      } : {
        unarchivedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        unarchivedBy: user.uid
      })
    });
    window.toast.success(archived ? 'Auftrag archiviert. Er bleibt vollständig erhalten.' : 'Auftrag wiederhergestellt.');
    window.loadAdminStats?.();
    window.loadAllEntries?.();
  } catch (error) {
    window.toast.error('Auftrag konnte nicht archiviert werden: ' + error.message);
  }
}

async function archiveOlderEntries() {
  if (!window.checkAdminAccess()) return;
  const input = document.getElementById('adminArchiveBefore');
  const day = input?.value;
  if (!day) return window.toast.warning('Bitte zuerst einen Stichtag auswählen.');
  const cutoff = new Date(`${day}T00:00:00`);
  if (!Number.isFinite(cutoff.getTime())) return window.toast.warning('Der Stichtag ist ungültig.');
  const confirmed = await window.toast.confirm(
    `Alle Aufträge vor dem ${cutoff.toLocaleDateString('de-DE')} werden in das Archiv verschoben. Es werden keine Aufträge oder Zahlungsdaten gelöscht.`,
    'Alte Aufträge archivieren', 'Abbrechen'
  );
  if (!confirmed) return;

  try {
    const db = window.db;
    const user = window.firebase.auth().currentUser;
    let cursor = null;
    let archivedCount = 0;
    while (true) {
      let query = db.collection('entries').where('timestamp', '<', cutoff)
        .orderBy('timestamp', 'asc').limit(450);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      const batch = db.batch();
      let writes = 0;
      snapshot.docs.forEach(doc => {
        if (doc.data().archived === true) return;
        batch.update(doc.ref, {
          archived: true,
          archivedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          archivedBy: user.uid,
          archivedByName: window.currentUser?.name || 'Admin'
        });
        writes++;
      });
      if (writes) {
        await batch.commit();
        archivedCount += writes;
      }
      cursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.docs.length < 450) break;
    }
    window.toast.success(`${archivedCount} alte ${archivedCount === 1 ? 'Auftrag wurde' : 'Aufträge wurden'} archiviert; nichts wurde gelöscht.`);
    window.loadAdminStats?.();
    window.loadAllEntries?.();
  } catch (error) {
    window.toast.error('Alte Aufträge konnten nicht archiviert werden: ' + error.message);
  }
}

// ==================== GLOBAL EXPORTS ====================
// Export functions to window for global access
window.markEntryAsPaid = markEntryAsPaid;
window.markEntryAsUnpaid = markEntryAsUnpaid;
window.archiveEntry = archiveEntry;
window.archiveOlderEntries = archiveOlderEntries;

/**
 * Update admin payment button state immediately
 */
function updateAdminPaymentButton(entryId, isPaid) {
    // Find the entry row
    const entryRow = document.querySelector(`#entry-${entryId}`);
    if (!entryRow) return;

    // Find the actions cell
    const actionsCell = entryRow.querySelector('.actions');
    if (!actionsCell) return;

    // Update the button HTML based on payment status
    const newButtonsHtml = isPaid ?
        `${window.ButtonFactory.undoPayment(entryId)}
         ${window.ButtonFactory.showNachweis(entryId, true)}` :
        `${window.ButtonFactory.registerPayment(entryId)}`;

    // Update the buttons (preserve edit and delete buttons)
    const editButton = actionsCell.querySelector(`[onclick*="editEntry('${entryId}')"]`);
    const deleteButton = actionsCell.querySelector(`[onclick*="deleteEntry('${entryId}')"]`);

    // Get the existing non-payment buttons
    const editButtonHtml = editButton ? editButton.outerHTML : '';
    const deleteButtonHtml = deleteButton ? deleteButton.outerHTML : '';

    // Update the actions cell with new payment buttons + existing buttons
    actionsCell.innerHTML = `
        ${newButtonsHtml}
        ${editButtonHtml}
        ${deleteButtonHtml}
    `;

    // Also update the status badge
    const statusBadge = entryRow.querySelector('.entry-status-badge');
    if (statusBadge) {
        if (isPaid) {
            statusBadge.className = 'entry-status-badge status-paid';
            statusBadge.textContent = 'Bezahlt';
        } else {
            statusBadge.className = 'entry-status-badge status-unpaid';
            statusBadge.textContent = 'Offen';
        }
    }

    // Update mobile cards as well
    const entryCard = document.querySelector(`[data-entry-id="${entryId}"]`);
    if (entryCard) {
        const cardActions = entryCard.querySelector('.card-actions');
        if (cardActions) {
            const cardEditButton = cardActions.querySelector(`[onclick*="editEntry('${entryId}')"]`);
            const cardDeleteButton = cardActions.querySelector(`[onclick*="deleteEntry('${entryId}')"]`);

            const cardEditButtonHtml = cardEditButton ? cardEditButton.outerHTML : '';
            const cardDeleteButtonHtml = cardDeleteButton ? cardDeleteButton.outerHTML : '';

            cardActions.innerHTML = `
                ${newButtonsHtml}
                ${cardEditButtonHtml}
                ${cardDeleteButtonHtml}
            `;
        }

        // Update mobile card status badge
        const cardStatusBadge = entryCard.querySelector('.status-badge');
        if (cardStatusBadge) {
            if (isPaid) {
                cardStatusBadge.className = 'status-badge status-paid';
                cardStatusBadge.textContent = 'BEZAHLT';
            } else {
                cardStatusBadge.className = 'status-badge status-unpaid';
                cardStatusBadge.textContent = 'OFFEN';
            }
        }
    }
}

/**
 * Clean up related payment requests when entry is marked as paid directly
 */
async function cleanupRelatedPaymentRequests(entryId) {
  try {
    const pendingRequests = await window.db.collection('paymentRequests')
      .where('entryId', '==', entryId)
      .where('status', '==', 'pending')
      .get();

    if (!pendingRequests.empty) {
      const batch = window.db.batch();

      pendingRequests.forEach(doc => {
        batch.update(doc.ref, {
          status: 'resolved',
          resolvedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          resolvedBy: 'admin_direct_payment',
          adminNotes: 'Zahlung wurde direkt vom Admin registriert'
        });
      });

      await batch.commit();
      console.log(`Cleaned up ${pendingRequests.size} payment requests for entry ${entryId} after direct payment`);
    }
  } catch (error) {
    console.error('Error cleaning up payment requests:', error);
  }
}

// Formular zurücksetzen
function clearForm() {
  const printer = document.getElementById("printer");
  const printTime = document.getElementById("printTime");
  const material = document.getElementById("material");
  const materialMenge = document.getElementById("materialMenge");
  const masterbatch = document.getElementById("masterbatch");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const jobName = document.getElementById("jobName");
  const jobNotes = document.getElementById("jobNotes");
  const ownMaterialUsed = document.getElementById("ownMaterialUsed");
  const costPreview = document.getElementById("costPreview");

  if (printer) printer.value = '';
  if (printTime) printTime.value = '';
  if (material) material.value = '';
  if (materialMenge) materialMenge.value = '';
  if (masterbatch) masterbatch.value = '';
  if (masterbatchMenge) masterbatchMenge.value = '';
  if (jobName) jobName.value = '';
  if (jobNotes) jobNotes.value = '';
  if (ownMaterialUsed) ownMaterialUsed.checked = false;
  if (costPreview) costPreview.textContent = '0,00 €';
}



// ==================== COST CALCULATION ====================
// Update cost preview when form values change
async function updateCostPreview() { return window.Billing.preview(); }

// ==================== GLOBAL EXPOSURE ====================
// Funktionen global verfügbar machen

window.addEntry = addEntry;
window.deleteEntry = deleteEntry;
window.markEntryAsPaid = markEntryAsPaid;
window.markEntryAsUnpaid = markEntryAsUnpaid;
window.clearForm = clearForm;
window.updateCostPreview = updateCostPreview;
