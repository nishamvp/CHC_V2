import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
export const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

export const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};
