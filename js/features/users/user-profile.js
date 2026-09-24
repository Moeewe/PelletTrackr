// ==================== USER PROFILE MODULE ====================
// Benutzerprofil-Verwaltung mit Modal und Firebase Integration

// Modal Management
function openUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.style.display = 'block';
        window.prepareDialog?.(modal);
        const trainingDetails = document.getElementById('profileSafetyDetails');
        if (trainingDetails) trainingDetails.open = false;
        loadUserProfileData();
        console.log('👤 Benutzerprofil-Modal geöffnet');
    }
}

function closeUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.style.display = 'none';
        window.restoreDialogFocus?.();
        const trainingDetails = document.getElementById('profileSafetyDetails');
        if (trainingDetails) trainingDetails.open = false;
        window.SafetyTraining?.cleanup();
        console.log('👤 Benutzerprofil-Modal geschlossen');
    }
}

// Load user profile data into form
async function loadUserProfileData() {
    try {
        if (!window.currentUser) {
            safeShowToast('Kein Benutzer angemeldet', 'error');
            return;
        }

        // Load data from current user session
        const user = window.currentUser;

        // Split name into first and last name
        const nameParts = (user.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Fill form fields
        document.getElementById('profileFirstName').value = firstName;
        document.getElementById('profileLastName').value = lastName;
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profilePhone').value = user.phone || '';
        document.getElementById('profileUsername').value = user.username || '';

        // Load additional data from Firebase if available
        if (typeof firebase !== 'undefined' && firebase.firestore && user.uid) {
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();

                    // Update form with additional data
                    if (userData.phone) {
                        document.getElementById('profilePhone').value = userData.phone;
                    }

                    // Update account info
                    await updateAccountInfo(userData);
                }
            } catch (error) {
                console.warn('⚠️ Could not load additional user data:', error);
            }
        }

        // Update account info with current user data
        await updateAccountInfo(user);

    } catch (error) {
        console.error('❌ Error loading user profile data:', error);
        safeShowToast('Fehler beim Laden der Profildaten', 'error');
    }
}

// Update account information display
async function updateAccountInfo(userData) {
    const accountCreated = document.getElementById('accountCreated');
    const lastLogin = document.getElementById('lastLogin');
    const accountType = document.getElementById('accountType');
    const emailVerified = document.getElementById('emailVerified');

    if (accountCreated) {
        let createdDate = 'Unbekannt';
        if (userData.createdAt) {
            if (userData.createdAt.toDate) {
                createdDate = new Date(userData.createdAt.toDate()).toLocaleDateString('de-DE');
            } else if (userData.createdAt instanceof Date) {
                createdDate = userData.createdAt.toLocaleDateString('de-DE');
            } else if (typeof userData.createdAt === 'string') {
                createdDate = new Date(userData.createdAt).toLocaleDateString('de-DE');
            }
        }
        accountCreated.textContent = createdDate;
    }

    if (lastLogin) {
        let loginDate = 'Heute';
        if (userData.lastLogin) {
            if (userData.lastLogin.toDate) {
                loginDate = new Date(userData.lastLogin.toDate()).toLocaleDateString('de-DE');
            } else if (userData.lastLogin instanceof Date) {
                loginDate = userData.lastLogin.toLocaleDateString('de-DE');
            } else if (typeof userData.lastLogin === 'string') {
                loginDate = new Date(userData.lastLogin).toLocaleDateString('de-DE');
            }
        }
        lastLogin.textContent = loginDate;
    }

    if (accountType) {
        const isAdmin = userData.isAdmin || window.currentUser?.isAdmin || false;
        accountType.textContent = isAdmin ? 'Administrator' : 'Benutzer';
    }

    if (emailVerified) {
        const verified = userData.emailVerified || window.currentUser?.emailVerified || false;
        emailVerified.textContent = verified ? 'Ja' : 'Nein';

        // Add resend verification button if email not verified
        const emailVerifiedRow = emailVerified.closest('.info-row');
        if (emailVerifiedRow && !verified) {
            // Remove existing button if any
            const existingBtn = emailVerifiedRow.querySelector('.resend-verification-btn');
            if (existingBtn) {
                existingBtn.remove();
            }

            // Add resend button
            const resendBtn = document.createElement('button');
            resendBtn.className = 'btn btn-sm btn-warning resend-verification-btn';
            resendBtn.textContent = 'Erneut senden';
            resendBtn.onclick = resendEmailVerification;
            resendBtn.style.marginLeft = '10px';
            emailVerifiedRow.appendChild(resendBtn);
        }
    }
}

// Resend email verification
async function resendEmailVerification() {
    try {
        if (!window.currentUser || !window.currentUser.email) {
            safeShowToast('Kein Benutzer angemeldet', 'error');
            return;
        }

        const user = firebase.auth().currentUser;
        if (!user) {
            safeShowToast('Nicht bei Firebase angemeldet', 'error');
            return;
        }

        await user.sendEmailVerification();
        safeShowToast('E-Mail-Bestätigung wurde erneut gesendet', 'success');

        // Update the verification status
        const emailVerified = document.getElementById('emailVerified');
        if (emailVerified) {
            emailVerified.textContent = 'Gesendet';
        }

    } catch (error) {
        console.error('❌ Error sending email verification:', error);
        safeShowToast('Fehler beim Senden der E-Mail-Bestätigung', 'error');
    }
}

// Save personal data
async function savePersonalData() {
    try {
        const form = document.getElementById('personalDataForm');
        form.classList.add('loading');

        const firstName = document.getElementById('profileFirstName').value.trim();
        const lastName = document.getElementById('profileLastName').value.trim();
        const email = document.getElementById('profileEmail').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();
        const username = document.getElementById('profileUsername').value.trim();

        // Validation
        if (!firstName || !lastName) {
            safeShowToast('Bitte Vor- und Nachname eingeben', 'warning');
            return;
        }

        if (!email || !isValidEmail(email)) {
            safeShowToast('Bitte gültige E-Mail-Adresse eingeben', 'warning');
            return;
        }

        const fullName = `${firstName} ${lastName}`.trim();

        // Update current user object
        window.currentUser.name = fullName;
        window.currentUser.email = email;
        window.currentUser.username = username;
        window.currentUser.phone = phone;

        // Save to Firebase if available
        if (typeof firebase !== 'undefined' && firebase.firestore && window.currentUser.uid) {
            try {
                await firebase.firestore().collection('users').doc(window.currentUser.uid).update({
                    name: fullName,
                    email: email,
                    username: username,
                    phone: phone,
                    updatedAt: new Date()
                });
            } catch (error) {
                console.warn('⚠️ Could not save to Firebase:', error);
            }
        }

        // Save to session
        saveSession(window.currentUser);

        // Update UI
        updateWelcomeMessage();
        updateUserPrintsLabel();

        safeShowToast('Persönliche Daten erfolgreich gespeichert', 'success');
        console.log('✅ Personal data saved');

    } catch (error) {
        console.error('❌ Error saving personal data:', error);
        safeShowToast('Fehler beim Speichern der Daten', 'error');
    } finally {
        const form = document.getElementById('personalDataForm');
        form.classList.remove('loading');
    }
}

// Change password
async function changePassword() {
    try {
        const form = document.getElementById('passwordChangeForm');
        form.classList.add('loading');

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            safeShowToast('Bitte alle Felder ausfüllen', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            safeShowToast('Neue Passwörter stimmen nicht überein', 'warning');
            return;
        }

        if (newPassword.length < 6) {
            safeShowToast('Neues Passwort muss mindestens 6 Zeichen lang sein', 'warning');
            return;
        }

        // Change password in Firebase
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                const user = firebase.auth().currentUser;
                if (user) {
                    // Re-authenticate user
                    const credential = firebase.auth.EmailAuthProvider.credential(
                        user.email,
                        currentPassword
                    );
                    await user.reauthenticateWithCredential(credential);

                    // Change password
                    await user.updatePassword(newPassword);

                    safeShowToast('Passwort erfolgreich geändert', 'success');
                    console.log('✅ Password changed successfully');

                    // Clear form
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmNewPassword').value = '';

                } else {
                    safeShowToast('Benutzer nicht angemeldet', 'error');
                }
            } catch (error) {
                console.error('❌ Error changing password:', error);

                switch (error.code) {
                    case 'auth/wrong-password':
                        safeShowToast('Aktuelles Passwort ist falsch', 'error');
                        break;
                    case 'auth/weak-password':
                        safeShowToast('Neues Passwort ist zu schwach', 'error');
                        break;
                    default:
                        safeShowToast('Fehler beim Ändern des Passworts: ' + error.message, 'error');
                }
            }
        } else {
            safeShowToast('Passwort-Änderung nicht verfügbar', 'error');
        }

    } catch (error) {
        console.error('❌ Error in changePassword:', error);
        safeShowToast('Fehler beim Ändern des Passworts', 'error');
    } finally {
        const form = document.getElementById('passwordChangeForm');
        form.classList.remove('loading');
    }
}

// Make welcome message clickable
function makeWelcomeMessageClickable() {
    const welcomeElement = document.querySelector('.welcome-message');
    if (welcomeElement) {
        welcomeElement.addEventListener('click', function() {
            openUserProfileModal();
        });
        console.log('✅ Welcome message made clickable');
    }
}

// ==================== GLOBAL EXPORTS ====================
// Export all functions to global scope for HTML access

window.openUserProfileModal = openUserProfileModal;
window.closeUserProfileModal = closeUserProfileModal;
window.loadUserProfileData = loadUserProfileData;
window.updateAccountInfo = updateAccountInfo;
window.savePersonalData = savePersonalData;
window.changePassword = changePassword;
window.makeWelcomeMessageClickable = makeWelcomeMessageClickable;
window.resendEmailVerification = resendEmailVerification;
