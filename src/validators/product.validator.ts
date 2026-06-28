import { body } from 'express-validator';

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 100 }),
  body('sku').trim().notEmpty().withMessage('SKU is required').isLength({ max: 50 }),
  body('category').isMongoId().withMessage('Valid category ID required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be 0 or greater'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be 0 or greater'),
  body('warrantyMonths').optional().isInt({ min: 0 }).withMessage('Warranty months must be 0 or greater'),
  body('stockQuantity').isInt({ min: 0 }).withMessage('Stock quantity must be 0 or greater'),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
];

export const updateProductValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('sku').optional().trim().notEmpty().isLength({ max: 50 }),
  body('category').optional().isMongoId(),
  body('brand').optional().trim().notEmpty(),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
  body('warrantyMonths').optional().isInt({ min: 0 }),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
];
