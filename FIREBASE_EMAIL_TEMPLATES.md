# Firebase-E-Mail-Vorlagen für PelletTrackr

Einstellen unter **Firebase Console → Authentication → Templates** (Stift-Symbol je Vorlage).
Firebase erlaubt dort nur Text (kein HTML-Layout), daher kurz und klar halten.

## Einmalig: eigene Seite für die Links
Bei jeder Vorlage über **„Aktions-URL anpassen“** eintragen:

    https://pellettrackr.netlify.app/auth-action.html

Dann öffnen die Links die PelletTrackr-Seite (Logo, Passwort-Formular) statt der grauen Firebase-Seite.
Außerdem unter Authentication → Settings → Authorized domains `pellettrackr.netlify.app` eintragen.

## Allgemein (bei allen Vorlagen)
- **Absendername:** PelletTrackr
- **Antwort an:** die Adresse der Werkstatt (optional)

## E-Mail-Adresse bestätigen
**Betreff:** PelletTrackr: Bitte bestätige deine E-Mail-Adresse

    Hallo,

    willkommen bei PelletTrackr! Bestätige bitte kurz deine E-Mail-Adresse, damit wir dein Konto freischalten können:

    %LINK%

    Danach kannst du dich sofort anmelden und deinen ersten Auftrag erfassen.
    Du hast dich nicht registriert? Dann kannst du diese Nachricht einfach ignorieren.

    Viele Grüße
    Dein PelletTrackr-Team

## Passwort zurücksetzen
**Betreff:** PelletTrackr: Neues Passwort festlegen

    Hallo,

    du hast ein neues Passwort für dein PelletTrackr-Konto (%EMAIL%) angefordert.
    Mit diesem Link legst du es fest:

    %LINK%

    Der Link ist nur kurz gültig. Du hast das nicht angefordert? Dann ignoriere diese Nachricht, dein Passwort bleibt unverändert.

    Viele Grüße
    Dein PelletTrackr-Team

## E-Mail-Adresse geändert
**Betreff:** PelletTrackr: Deine E-Mail-Adresse wurde geändert

    Hallo,

    die E-Mail-Adresse deines PelletTrackr-Kontos wurde auf %NEW_EMAIL% geändert.
    Warst du das nicht? Dann stelle die alte Adresse mit diesem Link wieder her:

    %LINK%

    Viele Grüße
    Dein PelletTrackr-Team

## Wenn Mails nicht ankommen
Mails von `noreply@fgf-3d-druck.firebaseapp.com` landen bei Hochschuladressen oft im Spam.
Abhilfe: eine eigene Absender-Domain verwenden (Authentication → Templates → Absender-Domain anpassen,
benötigt DNS-Einträge) oder die IT bitten, den Absender freizugeben.
