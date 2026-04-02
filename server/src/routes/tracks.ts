import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { trackController } from '../controllers/trackController';

const router = Router();

// Search tracks
router.get('/search', optionalAuth, trackController.searchTracks);

// Get track by ID
router.get('/:id', optionalAuth, trackController.getTrackById);

export { router as trackRoutes };
