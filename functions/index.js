const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

initializeApp();

const db = getFirestore();

/**
 * Let an authenticated, email-verified account claim its own legacy profile.
 * No legacy privilege is copied. Current admin status is retained only when
 * it was already assigned to the destination UID by an administrator.
 */
exports.linkLegacyAccount = onCall({ region: 'europe-west1', maxInstances: 10 }, async request => {
  const uid = request.auth?.uid;
  const email = String(request.auth?.token?.email || '').trim().toLowerCase();
  if (!uid || !email) {
    throw new HttpsError('unauthenticated', 'Bitte melde dich mit deinem Konto an.');
  }
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Bestätige zuerst deine E-Mail-Adresse.');
  }

  const kennung = String(request.data?.kennung || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,40}$/.test(kennung)) {
    throw new HttpsError('invalid-argument', 'Bitte gib eine gültige FH-Kennung ein.');
  }

  const targetRef = db.collection('users').doc(uid);
  const directLegacyRef = db.collection('users').doc(kennung);
  const [targetSnap, directLegacySnap, byKennung, byLegacyKennung] = await Promise.all([
    targetRef.get(),
    directLegacyRef.get(),
    db.collection('users').where('kennung', '==', kennung).limit(3).get(),
    db.collection('users').where('legacyKennung', '==', kennung).limit(3).get()
  ]);

  const candidates = new Map();
  if (directLegacySnap.exists && directLegacySnap.id !== uid) candidates.set(directLegacySnap.id, directLegacySnap);
  for (const snapshot of [byKennung, byLegacyKennung]) {
    for (const doc of snapshot.docs) {
      if (doc.id !== uid) candidates.set(doc.id, doc);
    }
  }

  const matches = [...candidates.values()].filter(doc => {
    const legacy = doc.data();
    const storedEmail = String(legacy.email || '').trim().toLowerCase();
    const storedKennung = String(legacy.kennung || legacy.legacyKennung || doc.id).trim().toLowerCase();
    return storedKennung === kennung && storedEmail === email;
  });

  if (matches.length === 0) {
    logger.info('Legacy profile not found for verified account', { uid, kennung });
    return { linked: false };
  }
  if (matches.length !== 1) {
    throw new HttpsError('failed-precondition', 'Die Altdaten sind nicht eindeutig. Bitte wende dich an die Administration.');
  }

  const legacyRef = matches[0].ref;
  await db.runTransaction(async transaction => {
    const [freshTarget, freshLegacy] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(legacyRef)
    ]);
    if (!freshLegacy.exists) throw new HttpsError('aborted', 'Das alte Profil wurde inzwischen geändert.');

    const legacy = freshLegacy.data();
    const target = freshTarget.exists ? freshTarget.data() : {};
    if (legacy.linkedToUid && legacy.linkedToUid !== uid) {
      throw new HttpsError('failed-precondition', 'Dieses alte Profil ist bereits mit einem anderen Konto verbunden.');
    }
    if (String(legacy.email || '').trim().toLowerCase() !== email
        || String(legacy.kennung || legacy.legacyKennung || freshLegacy.id).trim().toLowerCase() !== kennung) {
      throw new HttpsError('permission-denied', 'E-Mail-Adresse und FH-Kennung stimmen nicht mit dem Altprofil überein.');
    }

    transaction.set(targetRef, {
      name: target.name || legacy.name || request.auth.token.name || email.split('@')[0],
      email,
      username: target.username || kennung,
      kennung,
      legacyKennung: kennung,
      ...(target.phone || !legacy.phone ? {} : { phone: legacy.phone }),
      isAdmin: target.isAdmin === true,
      legacyLinkedAt: FieldValue.serverTimestamp(),
      legacySourceId: freshLegacy.id,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.update(legacyRef, {
      linkedToUid: uid,
      linkedAt: FieldValue.serverTimestamp()
    });
  });

  logger.info('Legacy profile linked', { uid, sourceId: matches[0].id });
  return { linked: true };
});
