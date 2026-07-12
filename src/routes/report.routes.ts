import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import {
  getPnLReport,
  getSalesReport,
  getInventoryReport,
  getWarrantyDeliveryReport,
} from '../controllers/report.controller';
import { exportSalesCustomers } from '../controllers/export.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'partner'));

router.get('/pnl', getPnLReport);
router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/warranty-delivery', getWarrantyDeliveryReport);
router.get('/export/excel', exportSalesCustomers);

export default router;
