import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import { createExpenseValidator, updateExpenseValidator } from '../validators/expense.validator';
import {
  getSummary,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadReceipt,
  removeReceipt,
} from '../controllers/expense.controller';

const router = Router();

router.use(authenticate);

// All roles can view
router.get('/summary', getSummary);
router.get('/', getExpenses);
router.get('/:id', getExpense);

// Admin and partner can create/update
router.post('/', authorize('admin', 'partner'), createExpenseValidator, validate, createExpense);
router.patch('/:id', authorize('admin', 'partner'), updateExpenseValidator, validate, updateExpense);
router.post('/:id/receipt', authorize('admin', 'partner'), upload.single('receipt'), uploadReceipt);
router.delete('/:id/receipt', authorize('admin', 'partner'), removeReceipt);

// Only admin can delete
router.delete('/:id', authorize('admin'), deleteExpense);

export default router;
