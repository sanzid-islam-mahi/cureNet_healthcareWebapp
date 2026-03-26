import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import * as remindersController from '../controllers/remindersController.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('patient'));

router.post('/preview', remindersController.preview);
router.post('/', remindersController.create);
router.get('/', remindersController.listPlans);
router.get('/doses', remindersController.listDoses);
router.post('/doses/:id/taken', remindersController.markDoseTaken);
router.put('/:id/pause', remindersController.pause);
router.put('/:id/resume', remindersController.resume);
router.put('/:id/stop', remindersController.stop);

export default router;
