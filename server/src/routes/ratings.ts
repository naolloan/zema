import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ratingController } from '../controllers/ratingController';

const router = Router();

// Get user's ratings
router.get('/my-ratings', authenticateToken, ratingController.getUserRatings);

export { router as ratingRoutes };
