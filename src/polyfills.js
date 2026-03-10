// src/polyfills.js
// ─── MOVE-X GLOBAL LOGISTICS ENGINE ───────────────────────────────────
// DECODING RECALIBRATION: SDK 53+ Hermès doesn't support 'utf-16le'. 
// This polyfill MUST run before any other module loads.

(function() {
  // Prevent double polyfilling
  if (typeof global.TextDecoder !== 'undefined' && global.TextDecoder.__isMoveX) {
    return;
  }

  const OriginalTextDecoder = typeof global.TextDecoder !== 'undefined' ? global.TextDecoder : null;

  class PolyfilledTextDecoder {
    static __isMoveX = true;
    
    constructor(encoding = 'utf-8', options) {
      const normalized = (encoding || 'utf-8').toLowerCase().replace(/[-_]/g, '');
      
      if (normalized.includes('utf16') || normalized.includes('ucs2')) {
        this._type = 'utf16le';
      } else if (OriginalTextDecoder) {
        try {
          this._inner = new OriginalTextDecoder(encoding, options);
          this._type = 'native';
        } catch (e) {
          // Fallback if native fails for some reason
          this._type = 'utf8';
        }
      } else {
        this._type = 'utf8';
      }
    }

    decode(input, options) {
      if (!input) return '';
      
      const buffer = input.buffer || input;
      const view = new Uint8Array(buffer);

      if (this._type === 'utf16le') {
        let str = '';
        for (let i = 0; i < view.length; i += 2) {
          if (i + 1 < view.length) {
            str += String.fromCharCode(view[i] | (view[i + 1] << 8));
          } else {
            str += String.fromCharCode(view[i]);
          }
        }
        return str;
      }
      
      if (this._type === 'native' && this._inner) {
        return this._inner.decode(input, options);
      }

      // Fallback simple UTF-8 (decodes ASCII correctly at least)
      let str = '';
      for (let i = 0; i < view.length; i++) {
        str += String.fromCharCode(view[i]);
      }
      return str;
    }
  }

  global.TextDecoder = PolyfilledTextDecoder;

  // TextEncoder polyfill
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = class {
      encode(str) {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          arr[i] = str.charCodeAt(i) & 0xFF;
        }
        return arr;
      }
    };
  }

  // console.log('[MoveX] Polyfills deployed: TextDecoder (UTF-16LE ready)');
})();
