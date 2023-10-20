// @flow

import crypto from 'crypto';
import bcrypt from 'twin-bcrypt';

function isBcryptHash(cookieHash: string): boolean {
  return cookieHash.startsWith('$2y$');
}

function getCookieHash(cookiePassword: string): string {
  return crypto.createHash('sha256').update(cookiePassword).digest('hex');
}

function verifyCookieHash(cookiePassword: string, cookieHash: string): boolean {
  if (isBcryptHash(cookieHash)) {
    return bcrypt.compareSync(cookiePassword, cookieHash);
  }
  const expectedCookieHash = getCookieHash(cookiePassword);
  return cookieHash === expectedCookieHash;
}

export { isBcryptHash, getCookieHash, verifyCookieHash };
