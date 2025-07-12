// ==================== ENTRY STATS MODULE ====================
// Statistiken für User und Admin Dashboard

// User-Statistiken laden
async function loadUserStats() {
  try {
    const snapshot = await window.db.collection("entries")
      .where("name", "==", window.currentUser.name)
      .where("kennung", "==", window.currentUser.kennung)
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    const totalEntries = entries.length;
    const totalCost = entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const paidEntries = entries.filter(entry => entry.paid || entry.isPaid);
    const paidAmount = paidEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const unpaidAmount = totalCost - paidAmount;

    // Stats anzeigen
    document.getElementById('userTotalEntries').textContent = totalEntries;
    document.getElementById('userTotalCost').textContent = formatCurrency(totalCost);
    document.getElementById('userPaidAmount').textContent = formatCurrency(paidAmount);
    document.getElementById('userUnpaidAmount').textContent = formatCurrency(unpaidAmount);

  } catch (error) {
    console.error('Fehler beim Laden der User-Stats:', error);
  }
}

// User-Drucke laden
async function loadUserEntries() {
  try {
    const snapshot = await window.db.collection("entries")
      .where("name", "==", window.currentUser.name)
      .where("kennung", "==", window.currentUser.kennung)
      .get();

    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });

    // Global speichern für Suche
    window.allUserEntries = entries;
    
    renderUserEntries(entries);
    
  } catch (error) {
    console.error("Fehler beim Laden der User-Drucke:", error);
    document.getElementById("userEntriesTable").innerHTML = '<p>Fehler beim Laden der Drucke.</p>';
  }
}

// Admin-Statistiken laden
async function loadAdminStats() {
  try {
    const snapshot = await window.db.collection('entries').get();
    
    let totalEntries = 0;
    let totalRevenue = 0;
    let pendingAmount = 0;
    const users = new Set();
    
    snapshot.forEach(doc => {
      const entry = doc.data();
      totalEntries++;
      
      if (entry.name) {
        users.add(entry.name);
      }
      
      const cost = entry.totalCost || 0;
      totalRevenue += cost;
      
      if (!entry.paid) {
        pendingAmount += cost;
      }
    });
    
    // Stats anzeigen
    document.getElementById('adminTotalEntries').textContent = totalEntries;
    document.getElementById('adminTotalUsers').textContent = users.size;
    document.getElementById('adminTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('adminPendingAmount').textContent = formatCurrency(pendingAmount);
    
  } catch (error) {
    console.error('Fehler beim Laden der Admin-Stats:', error);
  }
}

// Alle Drucke für Admin laden
async function loadAllEntries() {
  try {
    const snapshot = await window.db.collection('entries').get();
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    
    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });
    
    // Global speichern für Suche
    window.allAdminEntries = entries;
    
    renderAdminEntries(entries);
    
  } catch (error) {
    console.error('Fehler beim Laden der Admin-Drucke:', error);
  }
}
