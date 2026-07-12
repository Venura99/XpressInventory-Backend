import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload, excelUpload } from '../middleware/upload.middleware';
import { createSaleValidator, updateSaleValidator } from '../validators/sale.validator';
import {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  uploadChequeImage,
} from '../controllers/sale.controller';
import { downloadSalesTemplate, importSales } from '../controllers/import.controller';

const router = Router();

router.use(authenticate);

router.get('/import/template', downloadSalesTemplate);
router.post('/import', excelUpload.single('file'), importSales);
router.get('/', getSales);
router.get('/:id', getSale);
router.post('/', createSaleValidator, validate, createSale);
router.patch('/:id', updateSaleValidator, validate, updateSale);
router.delete('/:id', deleteSale);
router.post('/:id/cheque-image', upload.single('chequeImage'), uploadChequeImage);

export default router;
