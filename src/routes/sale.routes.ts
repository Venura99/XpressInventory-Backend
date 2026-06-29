import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import { createSaleValidator, updateSaleValidator } from '../validators/sale.validator';
import {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  uploadChequeImage,
} from '../controllers/sale.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSales);
router.get('/:id', getSale);
router.post('/', createSaleValidator, validate, createSale);
router.patch('/:id', updateSaleValidator, validate, updateSale);
router.delete('/:id', deleteSale);
router.post('/:id/cheque-image', upload.single('chequeImage'), uploadChequeImage);

export default router;
