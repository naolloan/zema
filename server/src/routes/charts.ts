import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { chartController } from '../controllers/chartController';

const router = Router();

// Get top releases chart
router.get('/top-releases', optionalAuth, chartController.getTopReleases);

// Get official dynamic list chart
router.get('/official/:slug', optionalAuth, chartController.getOfficialList);

// Get chart by type
router.get('/:type', optionalAuth, chartController.getChartByType);

export { router as chartRoutes };
