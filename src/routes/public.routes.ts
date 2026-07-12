import { Router } from 'express';
import {
  getPublicProducts,
  getPublicProduct,
  getPublicCategories,
} from '../controllers/public.controller';

const router = Router();

router.get('/products',     getPublicProducts);
router.get('/products/:id', getPublicProduct);
router.get('/categories',   getPublicCategories);

export default router;
