// ==================== PAYMENT PROOF SYSTEM ====================

async function showPaymentProof(entryId) {
  try {
    const entryDoc = await window.db.collection('entries').doc(entryId).get();
    
    if (!entryDoc.exists) {
      if (window.toast && typeof window.toast.error === 'function') {
        window.toast.error('Druck nicht gefunden!');
      } else {
        alert('Druck nicht gefunden!');
      }
      return;
    }
    
    const entry = { id: entryDoc.id, ...entryDoc.data() };
    
    // Prüfen ob bezahlt
    if (!(entry.paid || entry.isPaid)) {
      if (window.toast && typeof window.toast.warning === 'function') {
        window.toast.warning('Für diesen Druck wurde noch keine Zahlung registriert!');
      } else {
        alert('Für diesen Druck wurde noch keine Zahlung registriert!');
      }
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
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler beim Laden des Zahlungsnachweises: ' + error.message);
    } else {
      alert('Fehler beim Laden des Zahlungsnachweises: ' + error.message);
    }
  }
}

function closePaymentProofModal() {
  document.getElementById('paymentProofModal').classList.remove('active');
  window.currentProofEntry = null;
}

function printPaymentProof() {
  // Prüfen ob ein Nachweis geladen ist
  if (!window.currentProofEntry) {
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler: Kein Zahlungsnachweis geladen!');
    } else {
      alert('Fehler: Kein Zahlungsnachweis geladen!');
    }
    return;
  }
  
  // Hole den Inhalt des Payment Proof
  const proofContent = document.getElementById('paymentProofContent').innerHTML;
  
  if (!proofContent) {
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler: Zahlungsnachweis-Inhalt nicht gefunden!');
    } else {
      alert('Fehler: Zahlungsnachweis-Inhalt nicht gefunden!');
    }
    return;
  }
  
  // Erstelle ein neues Fenster nur für den Druck
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  const printDocument = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Zahlungsnachweis - PelletTrackr</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 12pt;
                line-height: 1.4;
                color: #000;
                background: #fff;
                padding: 20px;
            }
            
            .payment-proof {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 30px;
            }
            
            .proof-header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #000;
            }
            
            .proof-title {
                font-size: 28pt;
                font-weight: bold;
                margin-bottom: 10px;
                color: #000;
            }
            
            .proof-title .highlight {
                background: #FFEB00;
                padding: 4px 8px;
                color: #000;
            }
            
            .proof-subtitle {
                font-size: 16pt;
                font-weight: bold;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            
            .proof-details {
                margin-bottom: 30px;
            }
            
            .proof-section {
                margin-bottom: 25px;
                padding: 15px;
                border: 1px solid #ddd;
                background: #f9f9f9;
            }
            
            .proof-section h3 {
                font-size: 14pt;
                font-weight: bold;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #000;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .proof-item {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #eee;
            }
            
            .proof-item:last-child {
                border-bottom: none;
            }
            
            .proof-label {
                font-weight: 500;
                color: #333;
                flex-shrink: 0;
                min-width: 140px;
            }
            
            .proof-value {
                font-weight: bold;
                color: #000;
                text-align: right;
                flex: 1;
            }
            
            .proof-total {
                background: #FFEB00;
                border: 3px solid #000;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }
            
            .proof-total div:first-child {
                font-size: 14pt;
                margin-bottom: 10px;
                color: #000;
                font-weight: normal;
            }
            
            .proof-total-amount {
                font-size: 24pt;
                font-weight: bold;
                color: #000;
            }
            
            .proof-footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #666;
                text-align: center;
                font-size: 10pt;
                color: #666;
                line-height: 1.3;
            }
            
            .proof-footer p {
                margin: 3px 0;
            }
            
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                }
                
                .payment-proof {
                    padding: 0;
                    margin: 0;
                    max-width: none;
                }
                
                .proof-section {
                    page-break-inside: avoid;
                }
                
                .proof-total {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        ${proofContent}
        <script>
            window.onload = function() {
                window.print();
                window.onafterprint = function() {
                    window.close();
                };
                // Fallback: Schließe nach 3 Sekunden falls onafterprint nicht funktioniert
                setTimeout(function() {
                    window.close();
                }, 3000);
            };
        </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(printDocument);
  printWindow.document.close();
}

function emailPaymentProof() {
  if (!window.currentProofEntry) {
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error('Fehler: Kein Druck geladen!');
    } else {
      alert('Fehler: Kein Druck geladen!');
    }
    return;
  }
  
  const entry = window.currentProofEntry;
  const paidDate = entry.paidAt ? 
    new Date(entry.paidAt.toDate()).toLocaleDateString('de-DE') : 
    new Date().toLocaleDateString('de-DE');
  
  const currentDate = new Date().toLocaleDateString('de-DE');
  const currentTime = new Date().toLocaleTimeString('de-DE');
  
  // Professioneller E-Mail-Subject
  const subject = encodeURIComponent(`✅ Zahlungsbestätigung FGF 3D-Druck - ${entry.jobName || 'Auftrag'} (${entry.kennung})`);
  
  // Professionelle HTML-E-Mail mit Corporate Design
  const htmlBody = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zahlungsbestätigung FGF 3D-Druck</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="background: #000; color: #fff; padding: 20px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px;">
            <span style="background: #FFEB00; color: #000; padding: 4px 8px;">Pellet</span>Trackr
        </h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #ccc;">FGF 3D-Druck Verwaltung • FH Münster</p>
    </div>
    
    <!-- Hauptinhalt -->
    <div style="background: #f9f9f9; padding: 25px; border: 1px solid #ddd; margin-bottom: 20px;">
        <h2 style="color: #4CAF50; margin-top: 0; display: flex; align-items: center;">
            ✅ Zahlungsbestätigung
        </h2>
        
        <p>Sehr geehrte/r <strong>${entry.name}</strong>,</p>
        
        <p>hiermit bestätigen wir den <strong>erfolgreichen Eingang Ihrer Zahlung</strong> für den nachfolgenden 3D-Druck Auftrag.</p>
        
        <div style="background: #fff; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #4CAF50; font-weight: bold;">
                ✓ Zahlung erfolgreich verbucht am ${paidDate}
            </p>
        </div>
    </div>
    
    <!-- Rechnungsdetails -->
    <div style="background: #fff; border: 2px solid #000; margin-bottom: 20px;">
        <div style="background: #000; color: #fff; padding: 15px;">
            <h3 style="margin: 0; font-size: 16px;">📋 RECHNUNGSDETAILS</h3>
        </div>
        <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">Auftragsdatum:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">Job-Name:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${entry.jobName || '3D-Druck Auftrag'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">Material:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${entry.material}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">Material-Menge:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${entry.materialMenge.toFixed(2)} kg</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">Masterbatch:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${entry.masterbatch}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; ${entry.jobNotes ? 'border-bottom: 1px solid #eee;' : ''} font-weight: 500;">Masterbatch-Menge:</td>
                    <td style="padding: 8px 0; ${entry.jobNotes ? 'border-bottom: 1px solid #eee;' : ''} text-align: right; font-weight: bold;">${entry.masterbatchMenge.toFixed(2)} g</td>
                </tr>
                ${entry.jobNotes ? `
                <tr>
                    <td style="padding: 8px 0; font-weight: 500;">Notizen:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold;">${entry.jobNotes}</td>
                </tr>
                ` : ''}
            </table>
        </div>
    </div>
    
    <!-- Zahlungsinformationen -->
    <div style="background: #fff; border: 2px solid #000; margin-bottom: 20px;">
        <div style="background: #4CAF50; color: #fff; padding: 15px;">
            <h3 style="margin: 0; font-size: 16px;">💳 ZAHLUNGSINFORMATIONEN</h3>
        </div>
        <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">Student/in:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${entry.name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">FH-Kennung:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${entry.kennung}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 500;">Zahlungsdatum:</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${paidDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 500;">Status:</td>
                    <td style="padding: 8px 0; text-align: right;">
                        <span style="background: #4CAF50; color: #fff; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 12px;">
                            ✅ BEZAHLT
                        </span>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    
    <!-- Gesamtbetrag -->
    <div style="background: #FFEB00; border: 3px solid #000; padding: 25px; text-align: center; margin-bottom: 30px;">
        <div style="font-size: 16px; margin-bottom: 10px; color: #000; font-weight: normal;">Gesamtbetrag</div>
        <div style="font-size: 28px; font-weight: bold; color: #000;">${window.formatCurrency(entry.totalCost)}</div>
    </div>
    
    <!-- Abschluss -->
    <div style="background: #f0f8ff; border-left: 4px solid #2196F3; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0; color: #2196F3; font-weight: bold;">Wichtige Information</p>
        <p style="margin: 10px 0 0 0;">Ihre Zahlung wurde erfolgreich verbucht. Sie können diesen Zahlungsnachweis jederzeit über Ihr PelletTrackr Dashboard abrufen.</p>
    </div>
    
    <p><strong>Vielen Dank für die Nutzung unseres 3D-Druck Services!</strong></p>
    
    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    
    <p>Mit freundlichen Grüßen<br>
    <strong>Ihr FGF 3D-Druck Team</strong><br>
    Fachhochschule Münster</p>
    
    <!-- Footer -->
    <div style="border-top: 2px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 5px 0;">
            <strong>FGF 3D-Druck Verwaltung</strong> • Fachhochschule Münster • PelletTrackr System
        </p>
        <p style="margin: 5px 0;">
            Automatisch generiert am ${currentDate} um ${currentTime}
        </p>
        <p style="margin: 5px 0;">
            Dieser Zahlungsnachweis ist maschinell erstellt und ohne Unterschrift rechtsgültig.
        </p>
    </div>
    
</body>
</html>
  `;
  
  // Konvertiere HTML zu Text-Fallback (für E-Mail-Clients ohne HTML-Support)
  const textBody = `
FGF 3D-DRUCK VERWALTUNG - ZAHLUNGSBESTÄTIGUNG
==============================================

Sehr geehrte/r ${entry.name},

hiermit bestätigen wir den ERFOLGREICHEN EINGANG IHRER ZAHLUNG für den nachfolgenden 3D-Druck Auftrag.

✅ ZAHLUNG ERFOLGREICH VERBUCHT AM ${paidDate}

RECHNUNGSDETAILS:
─────────────────
• Auftragsdatum: ${entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt'}
• Job-Name: ${entry.jobName || '3D-Druck Auftrag'}
• Material: ${entry.material}
• Material-Menge: ${entry.materialMenge.toFixed(2)} kg
• Masterbatch: ${entry.masterbatch}
• Masterbatch-Menge: ${entry.masterbatchMenge.toFixed(2)} g${entry.jobNotes ? `
• Notizen: ${entry.jobNotes}` : ''}

ZAHLUNGSINFORMATIONEN:
─────────────────────
• Student/in: ${entry.name}
• FH-Kennung: ${entry.kennung}
• Zahlungsdatum: ${paidDate}
• Status: ✅ BEZAHLT

GESAMTBETRAG: ${window.formatCurrency(entry.totalCost)}

WICHTIGE INFORMATION:
Ihre Zahlung wurde erfolgreich verbucht. Sie können diesen Zahlungsnachweis jederzeit über Ihr PelletTrackr Dashboard abrufen.

Vielen Dank für die Nutzung unseres 3D-Druck Services!

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr FGF 3D-Druck Team
Fachhochschule Münster

──────────────────────────────────────────────
FGF 3D-Druck Verwaltung • FH Münster • PelletTrackr System
Automatisch generiert am ${currentDate} um ${currentTime}
Dieser Zahlungsnachweis ist maschinell erstellt und ohne Unterschrift rechtsgültig.
  `;
  
  // Erstelle Mailto-Link (verwende Text-Version da HTML in Mailto nicht zuverlässig funktioniert)
  const mailtoLink = `mailto:${entry.kennung}@fh-muenster.de?subject=${subject}&body=${encodeURIComponent(textBody)}`;
  
  // Öffne E-Mail-Client
  window.open(mailtoLink, '_blank');
  
  // Zeige Erfolgsmeldung
  if (window.toast && typeof window.toast.success === 'function') {
    window.toast.success('E-Mail-Client wurde geöffnet. Bitte senden Sie die E-Mail manuell ab.');
  }
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
