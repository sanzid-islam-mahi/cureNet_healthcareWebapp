import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/stats', adminController.getStats);
router.get('/analytics/appointments', adminController.getAppointmentAnalytics);
router.get('/doctor-verifications', adminController.getDoctorVerifications);
router.put('/doctors/:id/verify', adminController.verifyDoctor);
router.put('/doctors/:id/unverify', adminController.unverifyDoctor);
router.get('/clinics', adminController.listClinics);
router.post('/clinics', adminController.createClinic);
router.put('/clinics/:id', adminController.updateClinic);

router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);

router.get('/patients', adminController.listPatients);
router.get('/appointments', adminController.listAppointments);
router.get('/logs', adminController.getLogs);

export default router;
