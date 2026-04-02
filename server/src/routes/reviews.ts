import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { reviewController } from '../controllers/reviewController';

const router = Router();

// Create review
router.post('/', authenticateToken, reviewController.createReview);

// Update review
router.put('/:id', authenticateToken, reviewController.updateReview);

// Delete review
router.delete('/:id', authenticateToken, reviewController.deleteReview);

// Get recent reviews
router.get('/recent', optionalAuth, reviewController.getRecentReviews);

// Get review by ID
router.get('/:id', optionalAuth, reviewController.getReviewById);

// Like/unlike review
router.post('/:id/like', authenticateToken, reviewController.toggleLike);
router.post('/:id/comments', authenticateToken, reviewController.addComment);
router.delete('/:id/comments/:commentId', authenticateToken, reviewController.deleteComment);

export { router as reviewRoutes };
