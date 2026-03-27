import { Router } from 'express';
import upload from '../config/multerConfig.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as doctorsController from '../controllers/doctorsController.js';

const router = Router();

// Literal routes first so /profile is not matched by /:id/...
router.get('/profile', authenticateToken, authorizeRoles('doctor'), doctorsController.getProfile);
router.put('/profile', authenticateToken, authorizeRoles('doctor'), doctorsController.updateProfile);
router.post('/upload-image', authenticateToken, authorizeRoles('doctor'), upload.single('profileImage'), doctorsController.uploadImage);
router.get('/clinic-roster', authenticateToken, authorizeRoles('receptionist'), doctorsController.getClinicRosterForReceptionist);

router.get('/', doctorsController.list);
router.get('/:id/available-slots', doctorsController.getAvailableSlots);
router.get('/:id/upcoming-slots', doctorsController.getUpcomingSlots);
router.get('/:id/ratings', doctorsController.getRatings);
router.get('/:id', doctorsController.getPublicProfile);

router.get('/:id/dashboard/stats', authenticateToken, authorizeRoles('doctor'), doctorsController.getDashboardStats);
router.get('/:id/appointments', authenticateToken, authorizeRoles('doctor'), doctorsController.getAppointments);
router.get('/:id/patients', authenticateToken, authorizeRoles('doctor'), doctorsController.getPatients);
router.get('/:id/patients/:patientId/context', authenticateToken, authorizeRoles('doctor'), doctorsController.getPatientContext);

export default router;
