import { body } from 'express-validator';

export const stockInValidator = [
  body('productId').isMongoId().withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const stockOutValidator = [
  body('productId').isMongoId().withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const adjustmentValidator = [
  body('productId').isMongoId().withMessage('Valid product ID required'),
  body('newQuantity').isInt({ min: 0 }).withMessage('New quantity must be >= 0'),
  body('notes').optional().trim().isLength({ max: 500 }),
];
