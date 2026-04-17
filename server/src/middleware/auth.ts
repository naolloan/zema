import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { getTokenFromCookieHeader } from '../utils/auth';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const token = bearerToken || getTokenFromCookieHeader(req.headers.cookie);

  if (!token) {
    return next(createError('Access token required', 401));
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return next(createError('Invalid or expired token', 403));
    }
    req.user = user as any;
    next();
  });
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const token = bearerToken || getTokenFromCookieHeader(req.headers.cookie);

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
      if (!err) {
        req.user = user as any;
      }
    });
  }
  next();
};
