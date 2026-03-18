import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as notificationsController from '../controllers/notificationsController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', notificationsController.list);
router.put('/read-all', notificationsController.markAllRead);
router.put('/:id/read', notificationsController.markRead);

export default router;
