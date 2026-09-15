import crypto from 'crypto';

// -------------------------------------------------------------------
// Server-Only Cryptographic Password & PIN Engine
// Uses Node.js crypto scrypt with unique cryptographically random salts
// -------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization
};

/**
 * Generates a high-entropy random salt (16 bytes, hex encoded).
 */
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hashes a plaintext string with scrypt and a unique salt.
 * Formats output as: "scrypt$<salt>$<hash>"
 */
async function scryptHash(secret: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(secret, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Compares two hex strings in constant time to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------------
// Password Utilities
// -------------------------------------------------------------------

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password rules:
 * - Minimum 8 characters
 * - Confirmation must match
 */
export function validatePassword(password?: string, confirmPassword?: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { valid: false, error: 'Password confirmation does not match.' };
  }
  return { valid: true };
}

/**
 * Hashes a user password using scrypt with unique salt.
 */
export async function hashPassword(password: string): Promise<string> {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid password.');
  }
  const salt = generateSalt();
  const hash = await scryptHash(password, salt);
  return `scrypt$${salt}$${hash}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }
    const salt = parts[1];
    const expectedHash = parts[2];
    const computedHash = await scryptHash(password, salt);
    return constantTimeCompare(computedHash, expectedHash);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------------
// 4-Digit Transaction PIN Utilities
// -------------------------------------------------------------------

export interface PinValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a transaction PIN is exactly 4 digits.
 */
export function validatePin(pin?: string, confirmPin?: string): PinValidationResult {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: '4-digit transaction PIN is required.' };
  }
  if (!/^\d{4}$/.test(pin.trim())) {
    return { valid: false, error: 'Transaction PIN must be exactly 4 numeric digits (e.g. 1234).' };
  }
  if (confirmPin !== undefined && pin.trim() !== confirmPin.trim()) {
    return { valid: false, error: 'Transaction PIN confirmation does not match.' };
  }
  return { valid: true };
}

/**
 * Hashes a 4-digit transaction PIN using scrypt with unique salt.
 */
export async function hashPin(pin: string): Promise<string> {
  const cleanPin = pin.trim();
  const validation = validatePin(cleanPin);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid PIN.');
  }
  const salt = generateSalt();
  const hash = await scryptHash(cleanPin, salt);
  return `scrypt$${salt}$${hash}`;
}

/**
 * Verifies a 4-digit transaction PIN against a stored scrypt hash.
 */
export async function verifyPin(pin: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!pin || !storedHash || typeof storedHash !== 'string') {
    return false;
  }
  try {
    const cleanPin = pin.trim();
    if (!/^\d{4}$/.test(cleanPin)) return false;

    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }
    const salt = parts[1];
    const expectedHash = parts[2];
    const computedHash = await scryptHash(cleanPin, salt);
    return constantTimeCompare(computedHash, expectedHash);
  } catch {
    return false;
  }
}

/**
 * Strips password_hash, pin_hash, two_factor_secret from a user object before returning to client.
 */
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'password_hash' | 'pin_hash' | 'two_factor_secret'> {
  if (!user) return user;
  const { password_hash, pin_hash, two_factor_secret, ...safeUser } = user;
  return safeUser;
}
