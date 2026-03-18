import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as prescriptionsController from '../controllers/prescriptionsController.js';

const router = Router();

router.use(authenticateToken);

router.get('/history/patient', authorizeRoles('patient'), prescriptionsController.getPatientHistory);
router.get('/history/doctor', authorizeRoles('doctor'), prescriptionsController.getDoctorContinuity);
router.get('/appointment/:id', prescriptionsController.getByAppointment);
router.post('/', authorizeRoles('doctor'), prescriptionsController.create);
router.put('/:id', authorizeRoles('doctor'), prescriptionsController.editPrescription);
export default router;
