import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import { createProductValidator, updateProductValidator } from '../validators/product.validator';

const router = Router();
router.use(authenticate);

// Specific route before /:id to avoid collision
router.get('/low-stock', productController.getLowStock.bind(productController));

// CRUD
router.get('/', productController.getAll.bind(productController));
router.get('/:id', productController.getById.bind(productController));
router.post(
  '/',
  authorize('admin', 'partner'),
  createProductValidator,
  validate,
  productController.create.bind(productController)
);
router.patch(
  '/:id',
  authorize('admin', 'partner'),
  updateProductValidator,
  validate,
  productController.update.bind(productController)
);
router.delete('/:id', authorize('admin'), productController.delete.bind(productController));

// Image management
router.post(
  '/:id/images',
  authorize('admin', 'partner'),
  upload.array('images', 5),
  productController.uploadImages.bind(productController)
);
router.delete(
  '/:id/images/:publicId',
  authorize('admin', 'partner'),
  productController.deleteImage.bind(productController)
);
router.patch(
  '/:id/images/:publicId/primary',
  authorize('admin', 'partner'),
  productController.setPrimaryImage.bind(productController)
);

export default router;
