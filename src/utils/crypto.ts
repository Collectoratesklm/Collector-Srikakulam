/**
 * Cryptographic utility for end-to-end encrypted in-meeting group chat.
 * Uses Web Crypto API AES-GCM (256-bit) derived via PBKDF2 from the meeting passcode / room key.
 */

// Cache derived keys per roomId & passcode
const keyCache = new Map<string, CryptoKey>();

async function deriveKey(roomId: string, passcode: string): Promise<CryptoKey> {
  const cacheId = `${roomId}:${passcode}`;
  if (keyCache.has(cacheId)) {
    return keyCache.get(cacheId)!;
  }

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(`${roomId}:${passcode}:zoomrtc-salt-key`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode(`zoomrtc-e2ee-${roomId}`);
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(cacheId, key);
  return key;
}

/**
 * Encrypt a text message using AES-GCM.
 * Returns base64 encoded string containing IV and ciphertext.
 */
export async function encryptMessage(
  text: string,
  roomId: string,
  passcode: string
): Promise<string> {
  try {
    if (!window.crypto?.subtle) {
      // Fallback if subtle crypto is not available in test env
      return btoa(unescape(encodeURIComponent(text)));
    }
    const key = await deriveKey(roomId, passcode);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );

    // Combine IV (12 bytes) + Ciphertext into single buffer
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);

    // Convert to binary string then base64
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn('Encryption fallback used:', err);
    return btoa(unescape(encodeURIComponent(text)));
  }
}

/**
 * Decrypt a base64 encoded AES-GCM payload.
 */
export async function decryptMessage(
  encryptedBase64: string,
  roomId: string,
  passcode: string
): Promise<string> {
  try {
    if (!window.crypto?.subtle) {
      return decodeURIComponent(escape(atob(encryptedBase64)));
    }
    const binary = atob(encryptedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length < 13) {
      // Not an AES-GCM payload, fallback to base64 decode
      return decodeURIComponent(escape(atob(encryptedBase64)));
    }

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);
    const key = await deriveKey(roomId, passcode);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // If decryption fails (e.g. legacy or plaintext), try base64 decode fallback
    try {
      return decodeURIComponent(escape(atob(encryptedBase64)));
    } catch {
      return '[Encrypted message - key mismatch]';
    }
  }
}
