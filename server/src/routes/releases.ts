import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { releaseController } from '../controllers/releaseController';

const router = Router();

// Search releases
router.get('/search', optionalAuth, releaseController.searchReleases);

// Get release by ID
router.get('/:id', optionalAuth, releaseController.getReleaseById);

// Get release's tracks
router.get('/:id/tracks', optionalAuth, releaseController.getReleaseTracks);

// Get release's ratings for a specific bar
router.get('/:id/ratings', optionalAuth, releaseController.getReleaseRatings);

// Get release's public logs
router.get('/:id/logs', optionalAuth, releaseController.getReleaseLogs);

// Get public lists containing this release
router.get('/:id/lists', optionalAuth, releaseController.getReleaseLists);

// Get users who liked this release
router.get('/:id/likes', optionalAuth, releaseController.getReleaseLikes);

// Get release's reviews
router.get('/:id/reviews', optionalAuth, releaseController.getReleaseReviews);

// Rate a release
router.post('/:id/rate', authenticateToken, releaseController.rateRelease);

// Update rating
router.put('/:id/rate', authenticateToken, releaseController.updateRating);

// Delete rating
router.delete('/:id/rate', authenticateToken, releaseController.deleteRating);

// Like a release
router.post('/:id/like', authenticateToken, releaseController.addToFavorites);

// Unlike a release
router.delete('/:id/like', authenticateToken, releaseController.removeFromFavorites);

// Want to hear
router.post('/:id/want-to-hear', authenticateToken, releaseController.addToWantToHear);
router.delete('/:id/want-to-hear', authenticateToken, releaseController.removeFromWantToHear);

export { router as releaseRoutes };
