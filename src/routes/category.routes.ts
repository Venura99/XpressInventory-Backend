import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { createCategoryValidator, updateCategoryValidator } from '../validators/category.validator';

const router = Router();
router.use(authenticate);

router.get('/', categoryController.getAll.bind(categoryController));
router.get('/:id', categoryController.getById.bind(categoryController));
router.post('/', authorize('admin', 'partner'), createCategoryValidator, validate, categoryController.create.bind(categoryController));
router.patch('/:id', authorize('admin', 'partner'), updateCategoryValidator, validate, categoryController.update.bind(categoryController));
router.delete('/:id', authorize('admin'), categoryController.delete.bind(categoryController));

export default router;
