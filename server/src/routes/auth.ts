import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Email verification
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email/resend', authController.resendVerificationEmail);

// Password reset
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authenticateToken, authController.changePassword);
router.delete('/delete-account', authenticateToken, authController.deleteAccount);

// Google OAuth
router.get('/google/start', authController.startGoogleAuth);
router.get('/google/callback', authController.handleGoogleCallback);
router.get('/spotify/start', authController.startSpotifyAuth);
router.get('/spotify/callback', authController.handleSpotifyCallback);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Logout user
router.post('/logout', authController.logout);

export { router as authRoutes };
