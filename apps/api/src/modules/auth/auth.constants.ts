export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const REFRESH_TOKEN_DAYS = 7;
export const MAX_SESSIONS_PER_USER = 5;
export const USED_TOKEN_KEEP_HOURS = 24;
export const REUSE_GRACE_SECONDS = 10;
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
};
export const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/auth',
};
