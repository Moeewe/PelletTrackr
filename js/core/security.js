// ==================== SICHERHEITSSYSTEM ====================
// Erweiterte Sicherheitsfunktionen für PelletTrackr

// ===== DATENVERSCHLÜSSELUNG =====

class DataEncryption {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  // Generiere sicheren Schlüssel
  async generateKey() {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: this.algorithm,
          length: this.keyLength
        },
        true,
        ['encrypt', 'decrypt']
      );
      return key;
    } catch (error) {
      console.error('❌ Fehler beim Generieren des Schlüssels:', error);
      throw error;
    }
  }

  // Verschlüssele Daten
  async encryptData(data, key) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        encodedData
      );
      
      return {
        data: Array.from(new Uint8Array(encryptedData)),
        iv: Array.from(iv)
      };
    } catch (error) {
      console.error('❌ Fehler beim Verschlüsseln:', error);
      throw error;
    }
  }

  // Entschlüssele Daten
  async decryptData(encryptedData, key) {
    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: new Uint8Array(encryptedData.iv)
        },
        key,
        new Uint8Array(encryptedData.data)
      );
      
      const decodedData = new TextDecoder().decode(decryptedData);
      return JSON.parse(decodedData);
    } catch (error) {
      console.error('❌ Fehler beim Entschlüsseln:', error);
      throw error;
    }
  }
}

// ===== SESSION-MANAGEMENT =====

class SessionManager {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 Minuten
    this.lastActivity = Date.now();
    this.setupActivityTracking();
  }

  // Aktivität verfolgen
  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      });
    });
  }

  // Prüfe Session-Gültigkeit
  isSessionValid() {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    return timeSinceLastActivity < this.sessionTimeout;
  }

  // Logout bei Inaktivität
  logout() {
    if (typeof window.logout === 'function') {
      window.logout();
    }
  }

  // Session-Monitoring starten
  startSessionMonitoring() {
    setInterval(() => {
      if (!this.isSessionValid()) {
        console.log('⏰ Session abgelaufen, Logout...');
        this.logout();
      }
    }, 60000); // Prüfe jede Minute
  }
}

// ===== AUDIT-LOGGING =====

class AuditLogger {
  constructor() {
    this.enabled = true;
  }

  // Logge Sicherheitsereignisse
  logSecurityEvent(event, details = {}) {
    if (!this.enabled) return;
    
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event: event,
        details: details,
        userId: this.getCurrentUserId(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId()
      };
      
      console.log('🔒 Security Event:', logEntry);
      this.sendToServer(logEntry);
      
    } catch (error) {
      console.warn('⚠️ Fehler beim Logging:', error);
    }
  }

  // Hole aktuelle User ID (mit Firebase-Check)
  getCurrentUserId() {
    try {
      // Prüfe ob Firebase Auth verfügbar ist
      if (window.auth && window.auth.currentUser) {
        return window.auth.currentUser.uid;
      }
      
      // Fallback: Prüfe localStorage
      const sessionData = localStorage.getItem('pelletTrackrSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.uid || 'anonymous';
      }
      
      return 'anonymous';
    } catch (error) {
      console.warn('⚠️ Fehler beim Abrufen der User ID:', error);
      return 'unknown';
    }
  }

  // Hole Session ID
  getSessionId() {
    try {
      return sessionStorage.getItem('sessionId') || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  // Sende Log an Server (mit Firebase-Check)
  async sendToServer(logEntry) {
    try {
      // Prüfe ob Firestore verfügbar ist
      if (window.db) {
        await window.db.collection('auditLogs').add(logEntry);
      } else {
        console.log('📝 Audit Log (Firebase nicht verfügbar):', logEntry);
      }
    } catch (error) {
      console.warn('⚠️ Could not send audit log to server:', error);
    }
  }

  // Logge spezifische Ereignisse
  logDataAccess(collection, documentId, operation) {
    this.logSecurityEvent('DATA_ACCESS', {
      collection: collection,
      documentId: documentId,
      operation: operation
    });
  }

  logAuthenticationEvent(event, success) {
    this.logSecurityEvent('AUTHENTICATION', {
      event: event,
      success: success
    });
  }

  logDataModification(collection, documentId, operation, changes) {
    this.logSecurityEvent('DATA_MODIFICATION', {
      collection: collection,
      documentId: documentId,
      operation: operation,
      changes: changes
    });
  }
}

// ===== RATE LIMITING =====

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.maxRequests = 100; // Max 100 Requests pro Minute
    this.timeWindow = 60000; // 1 Minute
  }

  // Prüfe Rate Limit
  isAllowed(operation) {
    const now = Date.now();
    const key = `${operation}_${this.getCurrentUserId()}`;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Entferne alte Requests
    const validRequests = requests.filter(time => now - time < this.timeWindow);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Füge neuen Request hinzu
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  // Wrapper für Firebase-Operationen
  async withRateLimit(operation, operationName) {
    if (!this.isAllowed(operationName)) {
      throw new Error('Rate limit exceeded');
    }
    
    return await operation();
  }
}

// ===== INPUT VALIDATION =====

class InputValidator {
  constructor() {
    this.patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[0-9\s\-\(\)]{10,}$/,
      fhKennung: /^[a-z]{2}[0-9]{4}$/i
    };
  }

  // Validiere E-Mail
  validateEmail(email) {
    return this.patterns.email.test(email);
  }

  // Validiere Telefonnummer
  validatePhone(phone) {
    return this.patterns.phone.test(phone);
  }

  // Validiere FH-Kennung
  validateFHKennung(kennung) {
    return this.patterns.fhKennung.test(kennung);
  }

  // Sanitize Input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  // Validiere Objekt-Struktur
  validateObject(obj, requiredFields) {
    for (const field of requiredFields) {
      if (!obj.hasOwnProperty(field) || obj[field] === null || obj[field] === undefined) {
        return false;
      }
    }
    return true;
  }
}

// ===== GLOBALE SICHERHEITSINSTANZEN =====

const security = {
  encryption: new DataEncryption(),
  session: new SessionManager(),
  audit: new AuditLogger(),
  rateLimiter: new RateLimiter(),
  validator: new InputValidator()
};

// ===== SICHERHEITS-WRAPPER FÜR FIREBASE =====

// Sichere Firebase-Operationen
const secureFirebase = {
  // Sichere Collection-Referenz
  collection: (name) => {
    security.audit.logDataAccess(name, null, 'collection_access');
    return window.db.collection(name);
  },

  // Sichere Document-Referenz
  doc: (collection, docId) => {
    security.audit.logDataAccess(collection, docId, 'document_access');
    return window.db.collection(collection).doc(docId);
  },

  // Sichere Get-Operation
  get: async (ref) => {
    return await security.rateLimiter.withRateLimit(
      () => ref.get(),
      'firebase_get'
    );
  },

  // Sichere Set-Operation
  set: async (ref, data) => {
    // Validiere Daten
    const sanitizedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitizedData[key] = security.validator.sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    security.audit.logDataModification(
      ref.parent.id,
      ref.id,
      'set',
      sanitizedData
    );

    return await security.rateLimiter.withRateLimit(
      () => ref.set(sanitizedData),
      'firebase_set'
    );
  },

  // Sichere Update-Operation
  update: async (ref, data) => {
    const sanitizedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitizedData[key] = security.validator.sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    security.audit.logDataModification(
      ref.parent.id,
      ref.id,
      'update',
      sanitizedData
    );

    return await security.rateLimiter.withRateLimit(
      () => ref.update(sanitizedData),
      'firebase_update'
    );
  }
};

// ===== INITIALISIERUNG =====

document.addEventListener('DOMContentLoaded', () => {
  // Starte Session-Monitoring
  security.session.startSessionMonitoring();
  
  // Logge App-Start
  security.audit.logSecurityEvent('APP_START', {
    version: '1.0.1',
    timestamp: new Date().toISOString()
  });
});

// ===== GLOBALE EXPORTS =====

window.security = security;
window.secureFirebase = secureFirebase;
window.validateSession = () => security.session.isSessionValid();
window.logSecurityEvent = (event, details) => security.audit.logSecurityEvent(event, details); 