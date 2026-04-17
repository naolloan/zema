import { createHash, randomBytes, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';
const DEFAULT_AUTH_COOKIE_NAME = 'zema_session';
const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = Pick<
  User,
  'id' | 'email' | 'username' | 'displayName' | 'bio' | 'avatarUrl' | 'createdAt' | 'commentPermission' | 'emailVerifiedAt'
>;

export function getFrontendUrl() {
  return process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
}

export function getPublicApiUrl(req?: { protocol?: string; get?: (name: string) => string | undefined }) {
  if (process.env.PUBLIC_API_BASE_URL) {
    return process.env.PUBLIC_API_BASE_URL;
  }

  const host = req?.get?.('host');
  if (req?.protocol && host) {
    return `${req.protocol}://${host}`;
  }

  return 'http://localhost:5000';
}

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken() {
  return randomBytes(32).toString('hex');
}

function buildOAuthRedirectTarget(redirectPath: string, frontendOrigin?: string) {
  const fallback = new URL(redirectPath, getFrontendUrl());
  if (!frontendOrigin) {
    return fallback.toString();
  }

  try {
    const candidate = new URL(frontendOrigin);
    if (!['http:', 'https:'].includes(candidate.protocol)) {
      return fallback.toString();
    }

    const configured = new URL(getFrontendUrl());
    const allowedHosts = new Set([configured.hostname, 'localhost', '127.0.0.1']);
    if (!allowedHosts.has(candidate.hostname)) {
      return fallback.toString();
    }

    return new URL(redirectPath, candidate.origin).toString();
  } catch {
    return fallback.toString();
  }
}

function createOAuthStateToken(redirectPath: string, frontendOrigin?: string) {
  return jwt.sign(
    {
      nonce: randomUUID(),
      redirectTo: buildOAuthRedirectTarget(redirectPath, frontendOrigin),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
}

export function createGoogleStateToken(frontendOrigin?: string) {
  return createOAuthStateToken('/auth/google/callback', frontendOrigin);
}

export function createSpotifyStateToken(frontendOrigin?: string) {
  return createOAuthStateToken('/auth/spotify/callback', frontendOrigin);
}

export function verifyOAuthStateToken(state: string) {
  return jwt.verify(state, process.env.JWT_SECRET!) as { nonce: string; redirectTo?: string };
}

export function signSessionToken(user: Pick<User, 'id' | 'email' | 'username'>) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

export function getSessionCookieName() {
  return process.env.AUTH_COOKIE_NAME || DEFAULT_AUTH_COOKIE_NAME;
}

function getCookieSecureFlag() {
  if (typeof process.env.AUTH_COOKIE_SECURE === 'string') {
    return process.env.AUTH_COOKIE_SECURE.toLowerCase() === 'true';
  }

  return process.env.NODE_ENV === 'production';
}

function getCookieSameSite() {
  const configured = (process.env.AUTH_COOKIE_SAME_SITE || '').toLowerCase();
  if (configured === 'strict') return 'Strict';
  if (configured === 'none') return 'None';
  return 'Lax';
}

function formatCookieDate(timestamp: number) {
  return new Date(timestamp).toUTCString();
}

export function createSessionCookie(token: string) {
  const secure = getCookieSecureFlag();
  const sameSite = getCookieSameSite();
  const parts = [
    `${getSessionCookieName()}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    `Max-Age=${Math.floor(SESSION_COOKIE_MAX_AGE_MS / 1000)}`,
    `Expires=${formatCookieDate(Date.now() + SESSION_COOKIE_MAX_AGE_MS)}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  if (process.env.AUTH_COOKIE_DOMAIN) {
    parts.push(`Domain=${process.env.AUTH_COOKIE_DOMAIN}`);
  }

  return parts.join('; ');
}

export function createExpiredSessionCookie() {
  const secure = getCookieSecureFlag();
  const sameSite = getCookieSameSite();
  const parts = [
    `${getSessionCookieName()}=`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Max-Age=0',
    `Expires=${formatCookieDate(0)}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  if (process.env.AUTH_COOKIE_DOMAIN) {
    parts.push(`Domain=${process.env.AUTH_COOKIE_DOMAIN}`);
  }

  return parts.join('; ');
}

export function getTokenFromCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return null;
  }

  const cookieName = getSessionCookieName();
  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (rawName === cookieName) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

export function serializeSessionUser(user: SessionUser) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
    commentPermission: user.commentPermission,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
  };
}
