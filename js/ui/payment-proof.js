// ==================== PAYMENT PROOF SYSTEM ====================

async function showPaymentProof(entryId) {
  try {
    const entryDoc = await window.db.collection('entries').doc(entryId).get();
    
    if (!entryDoc.exists) {
      alert('Druck nicht gefunden!');
      return;
    }
    
    const entry = { id: entryDoc.id, ...entryDoc.data() };
    
    // Prüfen ob bezahlt
    if (!(entry.paid || entry.isPaid)) {
      alert('Für diesen Druck wurde noch keine Zahlung registriert!');
      return;
    }
    
    const paidDate = entry.paidAt ? 
      new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : 
      new Date().toLocaleDateString('de-DE');
    
    const proofContent = `
      <div class="payment-proof">
        <div class="proof-header">
          <div class="proof-title">
            <span class="highlight">Pellet</span>Trackr
          </div>
          <div class="proof-subtitle">Zahlungsnachweis</div>
        </div>
        
        <div class="proof-details">
          <div class="proof-section">
            <h3>Rechnungsdetails</h3>
            <div class="proof-item">
              <span class="proof-label">Datum</span>
              <span class="proof-value">${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Job-Name</span>
              <span class="proof-value">${entry.jobName || '3D-Druck Auftrag'}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material</span>
              <span class="proof-value">${entry.material}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Material-Menge</span>
              <span class="proof-value">${entry.materialMenge.toFixed(2)} kg</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Masterbatch</span>
              <span class="proof-value">${entry.masterbatch}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">MB-Menge</span>
              <span class="proof-value">${entry.masterbatchMenge.toFixed(2)} g</span>
            </div>
            ${entry.jobNotes ? `
            <div class="proof-item">
              <span class="proof-label">Notizen</span>
              <span class="proof-value">${entry.jobNotes}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="proof-section">
            <h3>Zahlungsinformationen</h3>
            <div class="proof-item">
              <span class="proof-label">Student/in</span>
              <span class="proof-value">${entry.name}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">FH-Kennung</span>
              <span class="proof-value">${entry.kennung}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Bezahlt am</span>
              <span class="proof-value">${paidDate}</span>
            </div>
            <div class="proof-item">
              <span class="proof-label">Zahlungsstatus</span>
              <span class="proof-value" style="color: #4CAF50; font-weight: 700;">✅ BEZAHLT</span>
            </div>
          </div>
        </div>
        
        <div class="proof-total">
          <div style="font-size: 16px; margin-bottom: 8px; color: #000;">Gesamtbetrag</div>
          <div class="proof-total-amount">${window.formatCurrency(entry.totalCost)}</div>
        </div>
        
        <div class="proof-footer">
          <p><strong>Generiert am:</strong> ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
          <p><strong>FGF 3D-Druck Verwaltung</strong> • FH Münster • PelletTrackr System</p>
          <p>Dieser Zahlungsnachweis ist maschinell erstellt und ohne Unterschrift gültig.</p>
        </div>
      </div>
    `;
    
    document.getElementById('paymentProofContent').innerHTML = proofContent;
    document.getElementById('paymentProofModal').classList.add('active');
    
    // Store entry data for email/print
    window.currentProofEntry = entry;
    
  } catch (error) {
    console.error('Fehler beim Laden des Zahlungsnachweises:', error);
    alert('Fehler beim Laden des Zahlungsnachweises: ' + error.message);
  }
}

function closePaymentProofModal() {
  document.getElementById('paymentProofModal').classList.remove('active');
  window.currentProofEntry = null;
}

function printPaymentProof() {
  // Prüfen ob ein Nachweis geladen ist
  if (!window.currentProofEntry) {
    alert('Fehler: Kein Zahlungsnachweis geladen!');
    return;
  }
  
  // Kurze Verzögerung damit das CSS wirken kann
  setTimeout(() => {
    window.print();
  }, 100);
}

function emailPaymentProof() {
  if (!window.currentProofEntry) {
    alert('Fehler: Kein Druck geladen!');
    return;
  }
  
  const entry = window.currentProofEntry;
  const paidDate = entry.paidAt ? 
    new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : 
    new Date().toLocaleDateString('de-DE');
  
  const subject = encodeURIComponent(`PelletTrackr - Zahlungsnachweis für ${entry.name}`);
  const body = encodeURIComponent(`Hallo ${entry.name},

hiermit bestätigen wir den Eingang Ihrer Zahlung für den 3D-Druck Auftrag.

RECHNUNGSDETAILS:
- Datum: ${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}
- Job: ${entry.jobName || '3D-Druck Auftrag'}
- Material: ${entry.material} (${entry.materialMenge.toFixed(2)} kg)
- Masterbatch: ${entry.masterbatch} (${entry.masterbatchMenge.toFixed(2)} kg)
${entry.jobNotes ? `- Notizen: ${entry.jobNotes}` : ''}

ZAHLUNGSINFORMATIONEN:
- Name: ${entry.name}
- FH-Kennung: ${entry.kennung}
- Bezahlt am: ${paidDate}
- Gesamtbetrag: ${window.formatCurrency(entry.totalCost)}
- Status: ✅ BEZAHLT

Vielen Dank für Ihr Vertrauen!

Mit freundlichen Grüßen
Ihr FGF 3D-Druck Team

---
Diese E-Mail wurde automatisch von PelletTrackr generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}.`);
  
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');
}

// Modal beim Klick außerhalb schließen
document.addEventListener('click', function(event) {
  const modal = document.getElementById('paymentProofModal');
  if (event.target === modal) {
    closePaymentProofModal();
  }
});

// ==================== PAYMENT PROOF MODULE ====================

// Alle Funktionen sind bereits global verfügbar
console.log("💳 Payment Proof Module geladen");
