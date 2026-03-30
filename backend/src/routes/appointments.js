import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as appointmentsController from '../controllers/appointmentsController.js';

const router = Router();

router.use(authenticateToken);

router.post('/', authorizeRoles('patient'), appointmentsController.create);
router.get('/', authorizeRoles('patient'), appointmentsController.listForPatient);
router.get('/clinic-queue', authorizeRoles('receptionist'), appointmentsController.listForReceptionist);
router.get('/:id', appointmentsController.getOne);
router.put('/:id/cancel', appointmentsController.cancel);
router.put('/:id/reschedule', authorizeRoles('patient', 'receptionist'), appointmentsController.reschedule);

router.put('/:id/approve', authorizeRoles('doctor', 'receptionist'), appointmentsController.approve);
router.put('/:id/reject', authorizeRoles('doctor', 'receptionist'), appointmentsController.reject);
router.put('/:id/start', authorizeRoles('doctor'), appointmentsController.start);
router.put('/:id/complete', authorizeRoles('doctor'), appointmentsController.complete);

export default router;
