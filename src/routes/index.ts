import { Router } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import customerRoutes from './customer.routes';
import saleRoutes from './sale.routes';
import inventoryRoutes from './inventory.routes';
import warrantyRoutes from './warranty.routes';
import expenseRoutes from './expense.routes';
import dashboardRoutes from './dashboard.routes';
import deliveryRoutes from './delivery.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', saleRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/warranties', warrantyRoutes);
router.use('/expenses', expenseRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/reports', reportRoutes);

export default router;
