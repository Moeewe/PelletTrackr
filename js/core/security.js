// ==================== CLIENT-SEITIGE SICHERHEIT ====================
// Zusätzliche Sicherheitsmaßnahmen für Client-seitige Daten

// ===== DATENVERSCHLÜSSELUNG =====

// Einfache Verschlüsselung für sensitive Daten
class DataEncryption {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  // Generiere einen sicheren Schlüssel
  async generateKey() {
    return await window.crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Verschlüssele sensitive Daten
  async encryptData(data, key) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await window.crypto.subtle.encrypt(
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
  }

  // Entschlüssele sensitive Daten
  async decryptData(encryptedData, key) {
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv: new Uint8Array(encryptedData.iv)
      },
      key,
      new Uint8Array(encryptedData.data)
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }
}

// ===== SESSION MANAGEMENT =====

class SessionManager {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 Minuten
    this.lastActivity = Date.now();
    this.setupActivityTracking();
  }

  // Tracke Benutzeraktivität
  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      });
    });
  }

  // Prüfe Session-Timeout
  isSessionValid() {
    const timeSinceActivity = Date.now() - this.lastActivity;
    if (timeSinceActivity > this.sessionTimeout) {
      this.logout();
      return false;
    }
    return true;
  }

  // Erzwinge Logout bei Timeout
  logout() {
    if (window.firebase && window.firebase.auth) {
      window.firebase.auth().signOut();
    }
    window.location.href = '/';
  }

  // Prüfe Session regelmäßig
  startSessionMonitoring() {
    setInterval(() => {
      if (!this.isSessionValid()) {
        console.warn('⚠️ Session timeout - logging out');
      }
    }, 60000); // Prüfe jede Minute
  }
}

// ===== AUDIT LOGGING =====

class AuditLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
  }

  // Logge Sicherheitsereignisse
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      event: event,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: details
    };

    this.logs.push(logEntry);
    
    // Begrenze Log-Größe
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Sende an Server (falls verfügbar)
    this.sendToServer(logEntry);
    
    console.log('🔒 Security Event:', logEntry);
  }

  // Hole aktuelle User ID
  getCurrentUserId() {
    if (window.firebase && window.firebase.auth) {
      const user = window.firebase.auth().currentUser;
      return user ? user.uid : 'anonymous';
    }
    return 'unknown';
  }

  // Sende Log an Server
  async sendToServer(logEntry) {
    try {
      if (window.db) {
        await window.db.collection('auditLogs').add(logEntry);
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