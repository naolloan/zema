import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { userController } from '../controllers/userController';

const router = Router();

router.get('/search', optionalAuth, userController.searchUsers);
router.get('/me', authenticateToken, userController.getProfile);
router.get('/me/notifications', authenticateToken, userController.getMyNotifications);
router.post('/me/notifications/read', authenticateToken, userController.markNotificationsRead);
router.post('/me/notifications/:notificationId/read', authenticateToken, userController.markNotificationReadState);
router.post('/me/avatar', authenticateToken, userController.uploadAvatar);
router.put('/me', authenticateToken, userController.updateProfile);
router.post('/me/favorites/releases', authenticateToken, userController.addFavoriteRelease);
router.delete('/me/favorites/releases/:releaseId', authenticateToken, userController.removeFavoriteRelease);
router.post('/me/favorites/artists', authenticateToken, userController.addFavoriteArtist);
router.delete('/me/favorites/artists/:artistId', authenticateToken, userController.removeFavoriteArtist);
router.get('/:id/followers', optionalAuth, userController.getFollowers);
router.get('/:id/following', optionalAuth, userController.getFollowing);
router.post('/:id/follow', authenticateToken, userController.followUser);
router.delete('/:id/follow', authenticateToken, userController.unfollowUser);
router.get('/:id', optionalAuth, userController.getUserById);
router.get('/:id/reviews', optionalAuth, userController.getUserReviews);
router.get('/:id/diary', optionalAuth, userController.getUserDiary);
router.get('/:id/favorites', optionalAuth, userController.getUserFavorites);
router.get('/:id/release-likes', optionalAuth, userController.getUserReleaseLikes);
router.get('/:id/want-to-hear', optionalAuth, userController.getUserWantToHear);
router.get('/:id/lists', optionalAuth, userController.getUserLists);

export { router as userRoutes };
