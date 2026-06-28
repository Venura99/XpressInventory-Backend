import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import {
  getPnLReport,
  getSalesReport,
  getInventoryReport,
  getWarrantyDeliveryReport,
} from '../controllers/report.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'partner'));

router.get('/pnl', getPnLReport);
router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/warranty-delivery', getWarrantyDeliveryReport);

export default router;
