import { Router } from 'express';
import imagingUpload from '../config/imagingUpload.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as imagingController from '../controllers/imagingController.js';

const router = Router();

router.use(authenticateToken);

router.post('/', authorizeRoles('doctor', 'receptionist', 'patient'), imagingUpload.single('file'), imagingController.createImagingRecord);
router.get('/my', authorizeRoles('patient'), imagingController.listMyImaging);
router.get('/appointment/:appointmentId', imagingController.listAppointmentImaging);
router.get('/patient/:patientId', imagingController.listPatientImaging);
router.get('/:id', imagingController.getImagingRecord);
router.put('/:id', authorizeRoles('doctor', 'receptionist', 'patient', 'admin'), imagingUpload.single('file'), imagingController.updateImagingRecord);
router.delete('/:id', authorizeRoles('doctor', 'admin'), imagingController.deleteImagingRecord);

export default router;
