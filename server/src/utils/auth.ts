import { createHash, randomBytes, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export type SessionUser = Pick<
  User,
  'id' | 'email' | 'username' | 'displayName' | 'bio' | 'avatarUrl' | 'createdAt' | 'commentPermission' | 'emailVerifiedAt'
>;

export function getFrontendUrl() {
  return process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
}

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken() {
  return randomBytes(32).toString('hex');
}

function createOAuthStateToken(redirectPath: string) {
  return jwt.sign(
    {
      nonce: randomUUID(),
      redirectTo: `${getFrontendUrl()}${redirectPath}`,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
}

export function createGoogleStateToken() {
  return createOAuthStateToken('/auth/google/callback');
}

export function createSpotifyStateToken() {
  return createOAuthStateToken('/auth/spotify/callback');
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
