import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createCustomerValidator, updateCustomerValidator } from '../validators/customer.validator';

const router = Router();
router.use(authenticate);

// Specific routes before /:id
router.get('/search', customerController.searchByPhone.bind(customerController));

// CRUD
router.get('/', customerController.getAll.bind(customerController));
router.get('/:id', customerController.getById.bind(customerController));
router.post('/', createCustomerValidator, validate, customerController.create.bind(customerController));
router.patch('/:id', updateCustomerValidator, validate, customerController.update.bind(customerController));
router.delete('/:id', customerController.delete.bind(customerController));

export default router;
