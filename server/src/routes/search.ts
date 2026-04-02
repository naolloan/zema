import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { searchController } from '../controllers/searchController';

const router = Router();

// Global search
router.get('/', optionalAuth, searchController.globalSearch);

export { router as searchRoutes };
