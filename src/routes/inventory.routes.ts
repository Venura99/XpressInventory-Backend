import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  stockInValidator,
  stockOutValidator,
  adjustmentValidator,
} from '../validators/inventory.validator';
import {
  getStats,
  getLogs,
  stockIn,
  stockOut,
  adjustment,
} from '../controllers/inventory.controller';

const router = Router();

router.use(authenticate);

// Read endpoints — all roles
router.get('/stats', getStats);
router.get('/logs', getLogs);

// Write endpoints — admin and partner only
router.post('/stock-in', authorize('admin', 'partner'), stockInValidator, validate, stockIn);
router.post('/stock-out', authorize('admin', 'partner'), stockOutValidator, validate, stockOut);
router.post(
  '/adjustment',
  authorize('admin', 'partner'),
  adjustmentValidator,
  validate,
  adjustment
);

export default router;
