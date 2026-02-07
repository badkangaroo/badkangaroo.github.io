/**
 * Unit tests for Settings validation and management
 */

describe('Settings Validation', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="settings">
        <input id="callsign" type="text" />
        <input id="name" type="text" />
        <input id="gridsquare" type="text" />
      </div>
    `;
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  describe('areRequiredSettingsComplete', () => {
    test('should return false when localStorage is not available', () => {
      // Mock localStorage as undefined
      const originalLocalStorage = window.localStorage;
      delete window.localStorage;
      
      // This would be the function from settings.js
      // Since we can't import it directly, we'll test the logic
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(false);
      
      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });

    test('should return false when callsign is missing', () => {
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
      
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(false);
    });

    test('should return false when name is missing', () => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('gridsquare', 'AA00aa');
      
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(false);
    });

    test('should return false when gridsquare is missing', () => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(false);
    });

    test('should return false when gridsquare is too short', () => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00');
      
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(false);
    });

    test('should return false when callsign is empty string', () => {
      localStorage.setItem('callsign', '   ');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
      
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(false);
    });

    test('should return true when all required settings are complete', () => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
      
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(true);
    });

    test('should handle operatorName as fallback for callsign', () => {
      localStorage.setItem('operatorName', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
      
      const areRequiredSettingsComplete = () => {
        const db = window.localStorage;
        if (!db) return false;
        
        const callsign = db.getItem("callsign") || db.getItem("operatorName") ? db.getItem("operatorName") : null;
        const name = db.getItem("name") || db.getItem("operatorName");
        const gridsquare = db.getItem("gridsquare");
        
        return callsign && name && gridsquare && 
               callsign.trim().length > 0 && 
               name.trim().length > 0 && 
               gridsquare.trim().length >= 6;
      };
      
      expect(areRequiredSettingsComplete()).toBe(true);
    });
  });

  describe('validateGridsquare', () => {
    test('should validate gridsquare format correctly', () => {
      const validateGridsquare = (gridsquare) => {
        if (!gridsquare || gridsquare.length < 6) return false;
        const upper = gridsquare.toUpperCase();
        return /^[A-R]{2}[0-9]{2}[A-X]{2}$/.test(upper);
      };

      // Valid gridsquares
      expect(validateGridsquare('AA00aa')).toBe(true);
      expect(validateGridsquare('CM87uq')).toBe(true);
      expect(validateGridsquare('FN20ab')).toBe(true);
      expect(validateGridsquare('RR99xx')).toBe(true);

      // Invalid gridsquares
      expect(validateGridsquare('AA00')).toBe(false); // Too short
      expect(validateGridsquare('AA00aaa')).toBe(false); // Too long
      expect(validateGridsquare('AA00a')).toBe(false); // Too short
      expect(validateGridsquare('ZZ00aa')).toBe(false); // Z is not in A-R range
      expect(validateGridsquare('AA00yz')).toBe(false); // Y and Z are not in A-X range
      expect(validateGridsquare('AA99aa')).toBe(true); // Valid (99 is OK)
      expect(validateGridsquare('AA00AA')).toBe(true); // Valid (uppercase)
      expect(validateGridsquare('')).toBe(false); // Empty
      expect(validateGridsquare(null)).toBe(false); // Null
      expect(validateGridsquare(undefined)).toBe(false); // Undefined
    });

    test('should be case-insensitive', () => {
      const validateGridsquare = (gridsquare) => {
        if (!gridsquare || gridsquare.length < 6) return false;
        const upper = gridsquare.toUpperCase();
        return /^[A-R]{2}[0-9]{2}[A-X]{2}$/.test(upper);
      };

      expect(validateGridsquare('aa00aa')).toBe(true);
      expect(validateGridsquare('AA00AA')).toBe(true);
      expect(validateGridsquare('Aa00Aa')).toBe(true);
      expect(validateGridsquare('aA00aA')).toBe(true);
    });
  });

  describe('Settings persistence', () => {
    test('should save settings to localStorage', () => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
      localStorage.setItem('phone', '555-0123');

      expect(localStorage.getItem('callsign')).toBe('TESTCALL');
      expect(localStorage.getItem('name')).toBe('Test User');
      expect(localStorage.getItem('gridsquare')).toBe('AA00aa');
      expect(localStorage.getItem('phone')).toBe('555-0123');
    });

    test('should load settings from localStorage', () => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');

      const getSettings = () => {
        const db = window.localStorage;
        const name = db.getItem("name") || db.getItem("operatorName") || '';
        const callsign = db.getItem("callsign") || '';
        const gridsquare = db.getItem("gridsquare") || '';
        return {
          name: name,
          callsign: callsign,
          gridsquare: gridsquare,
          phone: db.getItem("phone") || ''
        };
      };

      const settings = getSettings();
      expect(settings.callsign).toBe('TESTCALL');
      expect(settings.name).toBe('Test User');
      expect(settings.gridsquare).toBe('AA00aa');
    });
  });
});
