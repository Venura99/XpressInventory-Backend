import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { updateStatusValidator } from '../validators/warranty.validator';
import {
  getStats,
  getWarranties,
  getWarranty,
  updateWarrantyStatus,
} from '../controllers/warranty.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', getStats);
router.get('/', getWarranties);
router.get('/:id', getWarranty);
router.patch(
  '/:id/status',
  authorize('admin', 'partner'),
  updateStatusValidator,
  validate,
  updateWarrantyStatus
);

export default router;
