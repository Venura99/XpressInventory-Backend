import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createDeliveryValidator,
  updateDeliveryValidator,
  updateStatusValidator,
} from '../validators/delivery.validator';
import {
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  deleteDelivery,
} from '../controllers/delivery.controller';

const router = Router(); 

router.use(authenticate);

router.get('/', getDeliveries);
router.get('/:id', getDelivery);

router.post('/', authorize('admin', 'partner'), createDeliveryValidator, validate, createDelivery);
router.patch('/:id', authorize('admin', 'partner'), updateDeliveryValidator, validate, updateDelivery);
router.patch(
  '/:id/status',
  authorize('admin', 'partner', 'sales_staff'),
  updateStatusValidator,
  validate,
  updateDeliveryStatus
);
router.delete('/:id', authorize('admin'), deleteDelivery);

export default router;
