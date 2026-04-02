import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { listController } from '../controllers/listController';

const router = Router();

// Create list
router.post('/', authenticateToken, listController.createList);

// Update list
router.put('/:id', authenticateToken, listController.updateList);

// Delete list
router.delete('/:id', authenticateToken, listController.deleteList);

// Get user's lists
router.get('/user/:userId', optionalAuth, listController.getUserLists);

// Discover public lists
router.get('/discover', optionalAuth, listController.getDiscoverLists);

// Get list by ID
router.get('/:id', optionalAuth, listController.getListById);

// Like list
router.post('/:id/like', authenticateToken, listController.likeList);

// Unlike list
router.delete('/:id/like', authenticateToken, listController.unlikeList);

// List comments
router.post('/:id/comments', authenticateToken, listController.addComment);
router.delete('/:id/comments/:commentId', authenticateToken, listController.deleteComment);

// Add item to list
router.post('/:id/items', authenticateToken, listController.addListItem);

// Update list item
router.put('/:id/items/:itemId', authenticateToken, listController.updateListItem);

// Remove item from list
router.delete('/:id/items/:itemId', authenticateToken, listController.removeListItem);

// Reorder list items
router.put('/:id/reorder', authenticateToken, listController.reorderListItems);

export { router as listRoutes };
