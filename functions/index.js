const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { logger } = require('firebase-functions');

initializeApp();

const db = getFirestore();
const masterAdminEmail = 'm.wesseler@fh-muenster.de';
const masterAdminClaimExpiresAt = defineString('MASTER_ADMIN_CLAIM_EXPIRES_AT', {
  default: '2026-10-31T23:59:59Z'
});

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

function requireVerifiedAccount(request) {
  if (!request.auth?.uid || request.auth.token?.email_verified !== true) {
    throw new HttpsError('unauthenticated', 'Bitte melde dich mit bestätigtem Konto an.');
  }
  return request.auth.uid;
}

function sessionMachineCollection(value) {
  if (!['printers', 'equipment', 'machines'].includes(value)) {
    throw new HttpsError('invalid-argument', 'Diese Maschinenart kann nicht zeitbasiert erfasst werden.');
  }
  return value;
}

exports.startMachineSession = onCall({ region: 'europe-west1', maxInstances: 20 }, async request => {
  const uid = requireVerifiedAccount(request);
  const collection = sessionMachineCollection(String(request.data?.machineCollection || ''));
  const machineId = String(request.data?.machineId || '').trim();
  if (!machineId || machineId.includes('/')) throw new HttpsError('invalid-argument', 'Bitte eine Maschine auswählen.');

  const profileRef = db.collection('users').doc(uid);
  const machineRef = db.collection(collection).doc(machineId);
  const [profileSnap, machineSnap] = await Promise.all([profileRef.get(), machineRef.get()]);
  if (!profileSnap.exists || !machineSnap.exists) throw new HttpsError('not-found', 'Nutzer oder Maschine wurde nicht gefunden.');
  const profile = profileSnap.data();
  const machine = machineSnap.data();
  if (machine.active === false || ['broken', 'maintenance'].includes(machine.status)) {
    throw new HttpsError('failed-precondition', 'Diese Maschine ist aktuell nicht freigegeben.');
  }

  if (machine.requiresSafetyTraining === true || machine.trainingTypeName) {
    const trainings = await db.collection('safetyTrainings').where('userId', '==', uid).limit(100).get();
    const trained = trainings.docs.some(doc => {
      const record = doc.data();
      return record.status === 'active' && record.machineId === machineId && record.machineCollection === collection;
    });
    if (!trained) throw new HttpsError('permission-denied', 'Für diese Maschine ist eine gültige Sicherheitsunterweisung erforderlich.');
  }

  const group = profile.billingGroup || 'standard';
  const policyRef = db.collection('billingPolicies').doc(`${collection}__${machineId}`);
  const policySnap = await policyRef.get();
  if (!policySnap.exists) throw new HttpsError('failed-precondition', 'Für diese Maschine ist noch kein Zeittarif eingerichtet.');
  const policy = policySnap.data();
  const tariff = policy.rates?.[group] || policy.rates?.standard;
  if (!tariff || !['minute', 'hour'].includes(tariff.mode) || !Number.isInteger(tariff.rateCents) || tariff.rateCents <= 0) {
    throw new HttpsError('failed-precondition', 'Für deine Nutzergruppe ist kein positiver Minuten- oder Stundentarif eingerichtet.');
  }
  if (tariff.materialRule !== 'none') {
    throw new HttpsError('failed-precondition', 'Die Zeiterfassung ist nur für Tarife ohne Materialverbrauch freigegeben.');
  }

  const sessionRef = db.collection('machineSessions').doc();
  const activeRef = db.collection('activeMachineSessions').doc(`${collection}__${machineId}`);
  const startedAtMs = Date.now();
  await db.runTransaction(async transaction => {
    const active = await transaction.get(activeRef);
    if (active.exists) throw new HttpsError('already-exists', 'Diese Maschine hat bereits eine laufende Zeiterfassung.');
    transaction.create(sessionRef, {
      userId: uid, userName: profile.name || request.auth.token.name || '',
      userEmail: request.auth.token.email || profile.email || '',
      machineCollection: collection, machineId, machineName: machine.name || machineId,
      billingGroup: group, tariffSnapshot: tariff, policyRevision: policy.revision || 0,
      startedAt: FieldValue.serverTimestamp(), startedAtMs, status: 'running'
    });
    transaction.create(activeRef, {
      sessionId: sessionRef.id, userId: uid, userName: profile.name || '',
      machineCollection: collection, machineId, machineName: machine.name || machineId,
      billingGroup: group, tariffSnapshot: tariff, startedAtMs, status: 'running'
    });
  });
  logger.info('Machine time session started', { uid, sessionId: sessionRef.id, machineId });
  return { sessionId: sessionRef.id, startedAtMs, machineName: machine.name || machineId, tariff };
});

exports.finishMachineSession = onCall({ region: 'europe-west1', maxInstances: 20 }, async request => {
  const uid = requireVerifiedAccount(request);
  const sessionId = String(request.data?.sessionId || '').trim();
  if (!sessionId || sessionId.includes('/')) throw new HttpsError('invalid-argument', 'Die Zeiterfassung wurde nicht gefunden.');
  const sessionRef = db.collection('machineSessions').doc(sessionId);
  const entryRef = db.collection('entries').doc();
  const endedAtMs = Date.now();
  let result;

  await db.runTransaction(async transaction => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists || sessionSnap.data().status !== 'running') {
      throw new HttpsError('failed-precondition', 'Diese Zeiterfassung ist bereits beendet oder existiert nicht.');
    }
    const session = sessionSnap.data();
    const profileRef = db.collection('users').doc(uid);
    const [profileSnap] = await Promise.all([transaction.get(profileRef)]);
    const isAdmin = profileSnap.exists && profileSnap.data().isAdmin === true;
    if (session.userId !== uid && !isAdmin) throw new HttpsError('permission-denied', 'Nur die startende Person oder ein Admin darf die Zeit beenden.');

    const activeRef = db.collection('activeMachineSessions').doc(`${session.machineCollection}__${session.machineId}`);
    const activeSnap = await transaction.get(activeRef);
    if (!activeSnap.exists || activeSnap.data().sessionId !== sessionId) {
      throw new HttpsError('failed-precondition', 'Der aktive Maschinenstatus stimmt nicht mehr. Bitte Admin kontaktieren.');
    }

    const durationMs = Math.max(0, endedAtMs - Number(session.startedAtMs || endedAtMs));
    const unitMs = session.tariffSnapshot.mode === 'minute' ? 60000 : 3600000;
    const machineCents = Math.round(durationMs * session.tariffSnapshot.rateCents / unitMs);
    const machineRef = db.collection(session.machineCollection).doc(session.machineId);
    const machineSnap = await transaction.get(machineRef);
    if (!machineSnap.exists) throw new HttpsError('not-found', 'Die Maschine ist nicht mehr verfügbar.');
    const machine = machineSnap.data();
    const durationMinutes = durationMs / 60000;
    const totalCents = machineCents;
    const totalCost = totalCents / 100;
    const profile = profileSnap.exists ? profileSnap.data() : {};

    const entry = {
      name: session.userName || profile.name || request.auth.token.name || '',
      kennung: profile.kennung || profile.legacyKennung || profile.username || uid,
      userId: session.userId, billingVersion: 1, billingGroup: session.billingGroup,
      tariffSnapshot: session.tariffSnapshot, policyRevision: session.policyRevision,
      machineCollection: session.machineCollection, machineId: session.machineId,
      machineName: session.machineName, printer: session.machineName,
      operationType: (machine.jobTypes || ['Maschinennutzung'])[0],
      printTime: durationMinutes, durationMinutes,
      printerPricePerHour: session.tariffSnapshot.mode === 'hour' ? session.tariffSnapshot.rateCents / 100 : 0,
      printerCost: totalCost, material: '', materialId: '', materialMenge: 0, materialPrice: 0, materialCost: 0,
      masterbatch: '', masterbatchId: '', masterbatchMenge: 0, masterbatchPrice: 0, masterbatchCost: 0,
      ownMaterialUsed: false, totalCost, machineCents, materialCents: 0, additiveCents: 0,
      totalCents, jobName: `Maschinenzeit · ${session.machineName}`,
      jobNotes: `Serverseitig erfasste Nutzung · ${new Date(session.startedAtMs).toLocaleString('de-DE')} bis ${new Date(endedAtMs).toLocaleString('de-DE')}`,
      timestamp: FieldValue.serverTimestamp(), paid: false,
      machineSessionId: sessionId
    };

    transaction.create(entryRef, entry);
    transaction.update(sessionRef, {
      status: 'finished', endedAt: FieldValue.serverTimestamp(), endedAtMs,
      durationMs, machineCents, entryId: entryRef.id
    });
    transaction.delete(activeRef);
    result = { entryId: entryRef.id, durationMs, machineCents, totalCents, machineName: session.machineName };
  });

  logger.info('Machine time session finished', { uid, sessionId, entryId: result.entryId, totalCents: result.totalCents });
  return result;
});

exports.claimOneTimeMasterAdmin = onCall({ region: 'europe-west1', maxInstances: 1 }, async request => {
  const uid = requireVerifiedAccount(request);
  const email = String(request.auth.token.email || '').trim().toLowerCase();
  const expiresAt = Date.parse(masterAdminClaimExpiresAt.value());
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    throw new HttpsError('deadline-exceeded', 'Der zeitlich begrenzte Erstzugang ist abgelaufen. Bitte wende dich an einen bestehenden Admin.');
  }
  if (email !== masterAdminEmail) {
    throw new HttpsError('permission-denied', 'Diese verifizierte E-Mail-Adresse ist nicht für den einmaligen Erstzugang freigegeben.');
  }

  const claimRef = db.collection('adminBootstrapClaims').doc('initial-master-admin');
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async transaction => {
    const [claimSnap, userSnap] = await Promise.all([transaction.get(claimRef), transaction.get(userRef)]);
    if (claimSnap.exists) throw new HttpsError('already-exists', 'Der einmalige Master-Admin-Zugang wurde bereits verwendet.');
    const profile = userSnap.exists ? userSnap.data() : {};
    transaction.set(userRef, {
      name: profile.name || request.auth.token.name || email.split('@')[0],
      email, username: profile.username || email.split('@')[0],
      isAdmin: true,
      billingGroup: profile.billingGroup || 'standard',
      updatedAt: FieldValue.serverTimestamp(),
      ...(userSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() })
    }, { merge: true });
    transaction.create(claimRef, {
      uid, email, claimedAt: FieldValue.serverTimestamp(), expiresAt: new Date(expiresAt)
    });
  });
  logger.warn('One-time master admin bootstrap claimed', { uid, email });
  return { granted: true };
});
