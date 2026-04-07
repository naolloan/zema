import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { trackController } from '../controllers/trackController';

const router = Router();

// Search tracks
router.get('/search', optionalAuth, trackController.searchTracks);

// Get track by ID
router.get('/:id', optionalAuth, trackController.getTrackById);
router.get('/:id/reviews', optionalAuth, trackController.getTrackReviews);
router.post('/:id/rate', authenticateToken, trackController.rateTrack);
router.delete('/:id/rate', authenticateToken, trackController.removeTrackRating);
router.post('/:id/reviews', authenticateToken, trackController.createTrackReview);
router.patch('/reviews/:reviewId', authenticateToken, trackController.updateTrackReview);
router.delete('/reviews/:reviewId', authenticateToken, trackController.deleteTrackReview);

export { router as trackRoutes };
