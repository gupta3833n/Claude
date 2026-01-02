import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// Generate a random session password (6 characters alphanumeric)
export function generateSessionPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
  const length = 6;
  const randomBytes = nacl.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

// Validate session password (case-insensitive)
export function validateSessionPassword(input: string, expected: string): boolean {
  return input.toUpperCase().replace(/\s/g, '') === expected.toUpperCase();
}

// Generate encryption key pair for E2E encryption
export function generateKeyPair(): { publicKey: string; secretKey: string } {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: naclUtil.encodeBase64(keyPair.publicKey),
    secretKey: naclUtil.encodeBase64(keyPair.secretKey),
  };
}

// Encrypt message for peer
export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderSecretKey: string
): { encrypted: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = naclUtil.decodeUTF8(message);
  const publicKey = naclUtil.decodeBase64(recipientPublicKey);
  const secretKey = naclUtil.decodeBase64(senderSecretKey);

  const encrypted = nacl.box(messageBytes, nonce, publicKey, secretKey);

  return {
    encrypted: naclUtil.encodeBase64(encrypted),
    nonce: naclUtil.encodeBase64(nonce),
  };
}

// Decrypt message from peer
export function decryptMessage(
  encrypted: string,
  nonce: string,
  senderPublicKey: string,
  recipientSecretKey: string
): string | null {
  try {
    const encryptedBytes = naclUtil.decodeBase64(encrypted);
    const nonceBytes = naclUtil.decodeBase64(nonce);
    const publicKey = naclUtil.decodeBase64(senderPublicKey);
    const secretKey = naclUtil.decodeBase64(recipientSecretKey);

    const decrypted = nacl.box.open(encryptedBytes, nonceBytes, publicKey, secretKey);
    if (!decrypted) {
      return null;
    }

    return naclUtil.encodeUTF8(decrypted);
  } catch {
    return null;
  }
}

// Generate a secure random token
export function generateToken(length: number = 32): string {
  const bytes = nacl.randomBytes(length);
  return naclUtil.encodeBase64(bytes);
}

// Hash a value (using SHA-512)
export function hashValue(value: string): string {
  const bytes = naclUtil.decodeUTF8(value);
  const hash = nacl.hash(bytes);
  return naclUtil.encodeBase64(hash);
}

// Symmetric encryption using secretbox (for file encryption)
export function encryptData(
  data: Uint8Array,
  key: Uint8Array
): { encrypted: Uint8Array; nonce: Uint8Array } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(data, nonce, key);
  return { encrypted, nonce };
}

// Symmetric decryption
export function decryptData(
  encrypted: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array
): Uint8Array | null {
  return nacl.secretbox.open(encrypted, nonce, key);
}

// Generate a random encryption key
export function generateEncryptionKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

// Convert key to base64 for storage/transfer
export function keyToBase64(key: Uint8Array): string {
  return naclUtil.encodeBase64(key);
}

// Convert base64 back to key
export function base64ToKey(base64: string): Uint8Array {
  return naclUtil.decodeBase64(base64);
}
