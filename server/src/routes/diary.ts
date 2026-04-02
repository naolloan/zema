import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { diaryController } from '../controllers/diaryController';

const router = Router();

// Create diary entry
router.post('/', authenticateToken, diaryController.createDiaryEntry);

// Get recent public diary entries
router.get('/recent', optionalAuth, diaryController.getRecentDiaryEntries);

// Get user's diary entries
router.get('/my-entries', authenticateToken, diaryController.getMyDiaryEntries);

// Get user's diary entries by user ID
router.get('/user/:userId', optionalAuth, diaryController.getUserDiaryEntries);

// Update diary entry
router.put('/:id', authenticateToken, diaryController.updateDiaryEntry);

// Delete diary entry
router.delete('/:id', authenticateToken, diaryController.deleteDiaryEntry);

export { router as diaryRoutes };
