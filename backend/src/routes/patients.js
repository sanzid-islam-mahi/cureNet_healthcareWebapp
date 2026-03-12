import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as patientsController from '../controllers/patientsController.js';
import * as medicationController from '../controllers/medicationController.js';
import * as notificationsController from '../controllers/notificationsController.js';
import upload from '../config/multerConfig.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('patient'));

router.get('/profile', patientsController.getProfile);
router.put('/profile', upload.single('profileImage'), patientsController.updateProfile);
router.get('/:id/dashboard/stats', patientsController.getDashboardStats);
router.get('/:id/appointments', patientsController.getAppointments);
router.get('/:id/medication-trackers', patientsController.getMedicationTrackers);
router.patch('/:id/medication-trackers/:trackerId', patientsController.updateMedicationTracker);
router.get('/:id/doses', medicationController.getDoses);
router.post('/:id/doses/:doseId/mark', medicationController.markDose);
router.get('/:id/notifications', notificationsController.listForPatient);
router.post('/:id/notifications/:notificationId/read', notificationsController.markRead);

export default router;
