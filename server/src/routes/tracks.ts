import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { trackController } from '../controllers/trackController';

const router = Router();

// Search tracks
router.get('/search', optionalAuth, trackController.searchTracks);

// Get track by ID
router.get('/:id', optionalAuth, trackController.getTrackById);
router.post('/:id/rate', authenticateToken, trackController.rateTrack);
router.delete('/:id/rate', authenticateToken, trackController.removeTrackRating);

export { router as trackRoutes };
