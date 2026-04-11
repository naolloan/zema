import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { AuthTokenType, User } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { CreateUserInput, LoginInput } from '../types';
import { prisma } from '../prisma';
import { sendTransactionalEmail } from '../services/emailService';
import {
  createGoogleStateToken,
  createSpotifyStateToken,
  createOpaqueToken,
  getFrontendUrl,
  hashOpaqueToken,
  serializeSessionUser,
  signSessionToken,
  verifyOAuthStateToken,
} from '../utils/auth';
import { AuthRequest } from '../middleware/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const ACCOUNT_DELETE_CONFIRMATION = 'DELETE';
const USER_SESSION_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  commentPermission: true,
  emailVerifiedAt: true,
} as const;

class AuthController {
  private readonly spotifyRequestTimeoutMs = Number(process.env.SPOTIFY_REQUEST_TIMEOUT_MS || 20000);
  private readonly spotifyForceIpv4 = (process.env.SPOTIFY_FORCE_IPV4 || 'false').toLowerCase() === 'true';
  private readonly spotifyHttpsAgent = this.spotifyForceIpv4 ? new https.Agent({ family: 4 }) : undefined;

  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.logout = this.logout.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.resendVerificationEmail = this.resendVerificationEmail.bind(this);
    this.requestPasswordReset = this.requestPasswordReset.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.deleteAccount = this.deleteAccount.bind(this);
    this.startGoogleAuth = this.startGoogleAuth.bind(this);
    this.handleGoogleCallback = this.handleGoogleCallback.bind(this);
    this.startSpotifyAuth = this.startSpotifyAuth.bind(this);
    this.handleSpotifyCallback = this.handleSpotifyCallback.bind(this);
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, password, displayName, bio }: CreateUserInput = req.body;
      const normalizedEmail = email?.trim().toLowerCase();
      const normalizedUsername = username?.trim();

      if (!normalizedEmail || !normalizedUsername || !password) {
        return next(createError('Email, username, and password are required', 400));
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return next(createError('Please enter a valid email address', 400));
      }

      if (password.length < PASSWORD_MIN_LENGTH) {
        return next(createError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`, 400));
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            { username: { equals: normalizedUsername, mode: 'insensitive' } },
          ],
        },
      });

      if (existingUser) {
        return next(createError('User with this email or username already exists', 409));
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          username: normalizedUsername,
          password: hashedPassword,
          displayName: displayName?.trim() || undefined,
          bio: bio?.trim() || undefined,
        },
        select: USER_SESSION_SELECT,
      });

      const verification = await this.issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, EMAIL_VERIFICATION_TTL_MS);
      const verificationUrl = `${getFrontendUrl()}/auth/verify-email?token=${verification.token}`;
      const delivery = await this.sendVerificationEmail(user, verificationUrl);

      res.status(201).json({
        success: true,
        message: 'Account created. Please verify your email before signing in.',
        data: {
          requiresEmailVerification: true,
          email: user.email,
          previewUrl: delivery.delivered ? null : verificationUrl,
          deliveryMode: delivery.mode,
          deliveryReason: delivery.reason ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password }: LoginInput = req.body;
      const identifier = email?.trim();

      if (!identifier || !password) {
        return next(createError('Email or username and password are required', 400));
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase() },
            { username: { equals: identifier, mode: 'insensitive' } },
          ],
        },
        select: {
          ...USER_SESSION_SELECT,
          password: true,
        },
      });

      if (!user) {
        return next(createError('Invalid email or password', 401));
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return next(createError('Invalid email or password', 401));
      }

      if (!user.emailVerifiedAt) {
        const verification = await this.issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, EMAIL_VERIFICATION_TTL_MS);
        const verificationUrl = `${getFrontendUrl()}/auth/verify-email?token=${verification.token}`;
        const delivery = await this.sendVerificationEmail(user, verificationUrl);

        res.status(403).json({
          error: 'Please verify your email before signing in.',
          data: {
            requiresEmailVerification: true,
            email: user.email,
            previewUrl: delivery.delivered ? null : verificationUrl,
            deliveryMode: delivery.mode,
            deliveryReason: delivery.reason ?? null,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: this.buildSessionResponse(user),
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.query.token || req.body?.token || '').trim();
      if (!token) {
        return next(createError('Verification token is required', 400));
      }

      const authToken = await prisma.authToken.findFirst({
        where: {
          type: AuthTokenType.EMAIL_VERIFICATION,
          tokenHash: hashOpaqueToken(token),
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            select: USER_SESSION_SELECT,
          },
        },
      });

      if (!authToken) {
        return next(createError('This verification link is invalid or has expired', 400));
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: authToken.userId },
          data: { emailVerifiedAt: new Date() },
        }),
        prisma.authToken.update({
          where: { id: authToken.id },
          data: { usedAt: new Date() },
        }),
        prisma.authToken.updateMany({
          where: {
            userId: authToken.userId,
            type: AuthTokenType.EMAIL_VERIFICATION,
            usedAt: null,
            id: { not: authToken.id },
          },
          data: { usedAt: new Date() },
        }),
      ]);

      const verifiedUser = {
        ...authToken.user,
        emailVerifiedAt: new Date(),
      };

      res.json({
        success: true,
        message: 'Your email has been verified.',
        data: {
          session: this.buildSessionResponse(verifiedUser),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !EMAIL_REGEX.test(email)) {
        return next(createError('Please enter a valid email address', 400));
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: USER_SESSION_SELECT,
      });

      if (!user || user.emailVerifiedAt) {
        res.json({
          success: true,
          message: 'If that email can be verified, a fresh verification link has been sent.',
          data: { previewUrl: null, deliveryMode: 'email', deliveryReason: null },
        });
        return;
      }

      const verification = await this.issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, EMAIL_VERIFICATION_TTL_MS);
      const verificationUrl = `${getFrontendUrl()}/auth/verify-email?token=${verification.token}`;
      const delivery = await this.sendVerificationEmail(user, verificationUrl);

      res.json({
        success: true,
        message: 'If that email can be verified, a fresh verification link has been sent.',
        data: {
          previewUrl: delivery.delivered ? null : verificationUrl,
          deliveryMode: delivery.mode,
          deliveryReason: delivery.reason ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !EMAIL_REGEX.test(email)) {
        return next(createError('Please enter a valid email address', 400));
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: USER_SESSION_SELECT,
      });

      if (!user) {
        res.json({
          success: true,
          message: 'If an account exists for that email, a password reset link has been sent.',
          data: { previewUrl: null, deliveryMode: 'email', deliveryReason: null },
        });
        return;
      }

      const reset = await this.issueAuthToken(user.id, AuthTokenType.PASSWORD_RESET, PASSWORD_RESET_TTL_MS);
      const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${reset.token}`;
      const delivery = await this.sendPasswordResetEmail(user, resetUrl);

      res.json({
        success: true,
        message: 'If an account exists for that email, a password reset link has been sent.',
        data: {
          previewUrl: delivery.delivered ? null : resetUrl,
          deliveryMode: delivery.mode,
          deliveryReason: delivery.reason ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.body?.token || '').trim();
      const password = String(req.body?.password || '');

      if (!token) {
        return next(createError('Reset token is required', 400));
      }

      if (password.length < PASSWORD_MIN_LENGTH) {
        return next(createError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`, 400));
      }

      const authToken = await prisma.authToken.findFirst({
        where: {
          type: AuthTokenType.PASSWORD_RESET,
          tokenHash: hashOpaqueToken(token),
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            select: USER_SESSION_SELECT,
          },
        },
      });

      if (!authToken) {
        return next(createError('This password reset link is invalid or has expired', 400));
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const now = new Date();

      await prisma.$transaction([
        prisma.user.update({
          where: { id: authToken.userId },
          data: {
            password: hashedPassword,
            emailVerifiedAt: authToken.user.emailVerifiedAt ?? now,
          },
        }),
        prisma.authToken.update({
          where: { id: authToken.id },
          data: { usedAt: now },
        }),
        prisma.authToken.updateMany({
          where: {
            userId: authToken.userId,
            type: AuthTokenType.PASSWORD_RESET,
            usedAt: null,
            id: { not: authToken.id },
          },
          data: { usedAt: now },
        }),
      ]);

      const updatedUser = {
        ...authToken.user,
        emailVerifiedAt: authToken.user.emailVerifiedAt ?? now,
      };

      res.json({
        success: true,
        message: 'Your password has been reset.',
        data: {
          session: this.buildSessionResponse(updatedUser),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user?.id;
      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');
      const confirmPassword = String(req.body?.confirmPassword || '');

      if (!userId) {
        return next(createError('Access token required', 401));
      }

      if (!currentPassword || !newPassword || !confirmPassword) {
        return next(createError('Current password, new password, and confirm password are required', 400));
      }

      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        return next(createError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`, 400));
      }

      if (newPassword !== confirmPassword) {
        return next(createError('New password and confirm password must match', 400));
      }

      if (currentPassword === newPassword) {
        return next(createError('Your new password must be different from the current password', 400));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
        },
      });

      if (!user) {
        return next(createError('User not found', 404));
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return next(createError('Current password is incorrect', 400));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      });

      res.json({
        success: true,
        message: 'Password updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user?.id;
      const currentPassword = String(req.body?.currentPassword || '');
      const confirmation = String(req.body?.confirmation || '').trim().toUpperCase();

      if (!userId) {
        return next(createError('Access token required', 401));
      }

      if (confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
        return next(createError(`Type ${ACCOUNT_DELETE_CONFIRMATION} to confirm account deletion`, 400));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
          googleId: true,
          spotifyAccountId: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        return next(createError('User not found', 404));
      }

      if (!user.googleId && !user.spotifyAccountId) {
        if (!currentPassword) {
          return next(createError('Current password is required to delete this account', 400));
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return next(createError('Current password is incorrect', 400));
        }
      } else if (currentPassword) {
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return next(createError('Current password is incorrect', 400));
        }
      }

      const avatarUrl = user.avatarUrl;

      await prisma.user.delete({
        where: { id: user.id },
      });

      if (avatarUrl) {
        await this.deleteStoredAvatar(avatarUrl);
      }

      res.json({
        success: true,
        message: 'Your account has been deleted.',
      });
    } catch (error) {
      next(error);
    }
  }

  async startGoogleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const frontendOrigin = typeof req.query.frontend_origin === 'string' ? req.query.frontend_origin : undefined;
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        return next(createError('Google sign-in is not configured on this server yet', 500));
      }

      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
      url.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('prompt', 'select_account');
      url.searchParams.set('state', createGoogleStateToken(frontendOrigin));

      res.redirect(url.toString());
    } catch (error) {
      next(error);
    }
  }

  async handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
    const frontendCallbackUrl = new URL(`${getFrontendUrl()}/auth/google/callback`);

    try {
      const providerError = String(req.query.error || '').trim();
      if (providerError) {
        frontendCallbackUrl.searchParams.set('error', 'Google sign-in was cancelled.');
        res.redirect(frontendCallbackUrl.toString());
        return;
      }

      const code = String(req.query.code || '').trim();
      const state = String(req.query.state || '').trim();
      if (!code || !state) {
        frontendCallbackUrl.searchParams.set('error', 'Google sign-in did not return the required data.');
        res.redirect(frontendCallbackUrl.toString());
        return;
      }

      const verifiedState = verifyOAuthStateToken(state);
      const callbackUrl = verifiedState.redirectTo ? new URL(verifiedState.redirectTo) : frontendCallbackUrl;

      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        }
      );

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        throw new Error('Google did not return an access token');
      }

      const profileResponse = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      });

      const googleProfile = profileResponse.data as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
      };

      if (!googleProfile.sub || !googleProfile.email || !googleProfile.email_verified) {
        frontendCallbackUrl.searchParams.set('error', 'Google account email is unavailable or not verified.');
        res.redirect(frontendCallbackUrl.toString());
        return;
      }

      const normalizedEmail = googleProfile.email.trim().toLowerCase();
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: googleProfile.sub },
            { email: normalizedEmail },
          ],
        },
        select: USER_SESSION_SELECT,
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleProfile.sub,
            emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
            displayName: user.displayName || googleProfile.name || undefined,
            avatarUrl: user.avatarUrl || googleProfile.picture || undefined,
          },
          select: USER_SESSION_SELECT,
        });
      } else {
        const username = await this.generateUniqueUsername(googleProfile.name || normalizedEmail.split('@')[0]);
        const randomPassword = await bcrypt.hash(createOpaqueToken(), 12);
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            username,
            password: randomPassword,
            googleId: googleProfile.sub,
            emailVerifiedAt: new Date(),
            displayName: googleProfile.name || username,
            avatarUrl: googleProfile.picture || undefined,
          },
          select: USER_SESSION_SELECT,
        });
      }

      const sessionPayload = Buffer.from(JSON.stringify(this.buildSessionResponse(user))).toString('base64url');
      callbackUrl.searchParams.set('session', sessionPayload);
      res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error('[google-auth-callback-failed]', {
        message: error instanceof Error ? error.message : 'Unknown Google auth error',
        stack: error instanceof Error ? error.stack : undefined,
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      frontendCallbackUrl.searchParams.set('error', 'Google sign-in could not be completed.');
      res.redirect(frontendCallbackUrl.toString());
    }
  }

  async startSpotifyAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const frontendOrigin = typeof req.query.frontend_origin === 'string' ? req.query.frontend_origin : undefined;
      if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_OAUTH_REDIRECT_URI) {
        return next(createError('Spotify sign-in is not configured on this server yet', 500));
      }

      const url = new URL(process.env.SPOTIFY_AUTHORIZE_URL || 'https://accounts.spotify.com/authorize');
      url.searchParams.set('client_id', process.env.SPOTIFY_CLIENT_ID);
      url.searchParams.set('redirect_uri', process.env.SPOTIFY_OAUTH_REDIRECT_URI);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', process.env.SPOTIFY_OAUTH_SCOPES || 'user-read-email user-read-private');
      url.searchParams.set('show_dialog', 'true');
      url.searchParams.set('state', createSpotifyStateToken(frontendOrigin));

      res.redirect(url.toString());
    } catch (error) {
      next(error);
    }
  }

  async handleSpotifyCallback(req: Request, res: Response, next: NextFunction) {
    const frontendCallbackUrl = new URL(`${getFrontendUrl()}/auth/spotify/callback`);

    try {
      const providerError = String(req.query.error || '').trim();
      if (providerError) {
        frontendCallbackUrl.searchParams.set('error', 'Spotify sign-in was cancelled.');
        res.redirect(frontendCallbackUrl.toString());
        return;
      }

      const code = String(req.query.code || '').trim();
      const state = String(req.query.state || '').trim();
      if (!code || !state) {
        frontendCallbackUrl.searchParams.set('error', 'Spotify sign-in did not return the required data.');
        res.redirect(frontendCallbackUrl.toString());
        return;
      }

      const verifiedState = verifyOAuthStateToken(state);
      const callbackUrl = verifiedState.redirectTo ? new URL(verifiedState.redirectTo) : frontendCallbackUrl;

      const tokenResponse = await axios.post(
        process.env.SPOTIFY_OAUTH_TOKEN_URL || 'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          code,
          redirect_uri: process.env.SPOTIFY_OAUTH_REDIRECT_URI!,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID!}:${process.env.SPOTIFY_CLIENT_SECRET!}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: this.spotifyRequestTimeoutMs,
          httpsAgent: this.spotifyHttpsAgent,
        }
      );

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        throw new Error('Spotify did not return an access token');
      }

      const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: this.spotifyRequestTimeoutMs,
        httpsAgent: this.spotifyHttpsAgent,
      });

      const spotifyProfile = profileResponse.data as {
        id?: string;
        email?: string;
        display_name?: string;
        images?: Array<{ url?: string }>;
      };

      if (!spotifyProfile.id || !spotifyProfile.email) {
        frontendCallbackUrl.searchParams.set('error', 'Spotify account email is unavailable.');
        res.redirect(frontendCallbackUrl.toString());
        return;
      }

      const normalizedEmail = spotifyProfile.email.trim().toLowerCase();
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { spotifyAccountId: spotifyProfile.id },
            { email: normalizedEmail },
          ],
        },
        select: USER_SESSION_SELECT,
      });

      const avatarUrl = spotifyProfile.images?.[0]?.url || undefined;

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            spotifyAccountId: spotifyProfile.id,
            emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
            displayName: user.displayName || spotifyProfile.display_name || undefined,
            avatarUrl: user.avatarUrl || avatarUrl,
          },
          select: USER_SESSION_SELECT,
        });
      } else {
        const username = await this.generateUniqueUsername(spotifyProfile.display_name || normalizedEmail.split('@')[0]);
        const randomPassword = await bcrypt.hash(createOpaqueToken(), 12);
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            username,
            password: randomPassword,
            spotifyAccountId: spotifyProfile.id,
            emailVerifiedAt: new Date(),
            displayName: spotifyProfile.display_name || username,
            avatarUrl,
          },
          select: USER_SESSION_SELECT,
        });
      }

      const sessionPayload = Buffer.from(JSON.stringify(this.buildSessionResponse(user))).toString('base64url');
      callbackUrl.searchParams.set('session', sessionPayload);
      res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error('[spotify-auth-callback-failed]', {
        message: error instanceof Error ? error.message : 'Unknown Spotify auth error',
        stack: error instanceof Error ? error.stack : undefined,
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      frontendCallbackUrl.searchParams.set('error', 'Spotify sign-in could not be completed.');
      res.redirect(frontendCallbackUrl.toString());
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return next(createError('Token is required', 401));
      }

      jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
        if (err) {
          return next(createError('Invalid token', 403));
        }

        const newToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            username: user.username,
          },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        res.json({
          success: true,
          data: {
            token: newToken,
          },
        });
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  private buildSessionResponse(user: Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'bio' | 'avatarUrl' | 'createdAt' | 'commentPermission' | 'emailVerifiedAt'>) {
    return {
      user: serializeSessionUser(user),
      token: signSessionToken(user),
    };
  }

  private async issueAuthToken(userId: string, type: AuthTokenType, ttlMs: number) {
    await prisma.authToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const token = createOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(Date.now() + ttlMs);

    await prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  private async sendVerificationEmail(user: Pick<User, 'email' | 'displayName'>, verificationUrl: string) {
    return sendTransactionalEmail({
      to: user.email,
      subject: 'Verify your Zeማa account',
      text: `Welcome to Zeማa. Verify your email by opening this link: ${verificationUrl}`,
      html: `<p>Welcome to <strong>Zeማa</strong>.</p><p>Verify your email by opening this link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });
  }

  private async sendPasswordResetEmail(user: Pick<User, 'email' | 'displayName'>, resetUrl: string) {
    return sendTransactionalEmail({
      to: user.email,
      subject: 'Reset your Zeማa password',
      text: `A password reset was requested for your Zeማa account. Open this link to set a new password: ${resetUrl}`,
      html: `<p>A password reset was requested for your <strong>Zeማa</strong> account.</p><p>Open this link to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  private async generateUniqueUsername(seed: string) {
    const base = this.sanitizeUsername(seed);
    let candidate = base;
    let suffix = 1;

    while (await prisma.user.findFirst({ where: { username: { equals: candidate, mode: 'insensitive' } }, select: { id: true } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }

    return candidate;
  }

  private sanitizeUsername(seed: string) {
    const normalized = seed
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/g, '')
      .toLowerCase();

    return normalized.slice(0, 20) || `listener${Math.floor(Math.random() * 10_000)}`;
  }

  private async deleteStoredAvatar(avatarUrl: string) {
    try {
      const parsedUrl = new URL(avatarUrl, getFrontendUrl());
      if (!parsedUrl.pathname.startsWith('/uploads/avatars/')) {
        return;
      }

      const targetPath = path.resolve(process.cwd(), parsedUrl.pathname.replace(/^\//, ''));
      await fs.unlink(targetPath);
    } catch {
      // Ignore avatar cleanup failures so account deletion still succeeds.
    }
  }
}

export const authController = new AuthController();
