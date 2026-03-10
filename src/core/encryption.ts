import crypto from 'crypto';
import { env } from '../config/env-config';

// Must be exactly 32 bytes for aes-256-gcm
// We pad or truncate the provided key to ensure it's 32 bytes
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY).subarray(0, 32);
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns a payload containing the IV, encrypted data, and auth tag, all base64 encoded.
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted string using AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText; // Not encrypted or malformed
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText; // Fallback for plain text or old data
    
    const [ivBase64, authTagBase64, encryptedBase64] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed. Returning original or empty string.', error);
    return ''; // Return empty string to prevent application crashes on corrupted tokens
  }
}
