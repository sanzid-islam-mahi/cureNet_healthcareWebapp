import { Router } from 'express';
import upload from '../config/multerConfig.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as doctorsController from '../controllers/doctorsController.js';

const router = Router();

// Literal routes first so /profile is not matched by /:id/...
router.get('/profile', authenticateToken, authorizeRoles('doctor'), doctorsController.getProfile);
router.put('/profile', authenticateToken, authorizeRoles('doctor'), doctorsController.updateProfile);
router.post('/upload-image', authenticateToken, authorizeRoles('doctor'), upload.single('profileImage'), doctorsController.uploadImage);

router.get('/', doctorsController.list);
router.get('/:id/available-slots', doctorsController.getAvailableSlots);
router.get('/:id/upcoming-slots', doctorsController.getUpcomingSlots);
router.get('/:id/ratings', doctorsController.getRatings);
router.get('/:id', doctorsController.getPublicProfile);

router.get('/:id/dashboard/stats', authenticateToken, authorizeRoles('doctor'), doctorsController.getDashboardStats);
router.get('/:id/appointments', authenticateToken, authorizeRoles('doctor'), doctorsController.getAppointments);

export default router;
