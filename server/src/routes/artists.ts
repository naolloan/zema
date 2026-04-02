import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { artistController } from '../controllers/artistController';

const router = Router();

// Search artists
router.get('/search', optionalAuth, artistController.searchArtists);

// Get artist by ID
router.get('/:id', optionalAuth, artistController.getArtistById);

// Get artist's releases
router.get('/:id/releases', optionalAuth, artistController.getArtistReleases);

export { router as artistRoutes };
