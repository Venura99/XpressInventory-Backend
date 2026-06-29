import { body } from 'express-validator';

export const updateSaleValidator = [
  body('discountPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount percent must be 0–100'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be >= 0'),
  body('deliveryFee').optional().isFloat({ min: 0 }).withMessage('Delivery fee must be >= 0'),
  body('isFreeDelivery').optional().isBoolean().withMessage('isFreeDelivery must be boolean'),
  body('paymentMethod').optional().isIn(['cash', 'card', 'bank_transfer', 'cheque', 'city_ledger']).withMessage('Invalid payment method'),
  body('paymentStatus').optional().isIn(['paid', 'partial', 'pending']).withMessage('Invalid payment status'),
  body('amountPaid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be >= 0'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 characters'),
  body('saleDate').optional().isISO8601().withMessage('Invalid date format'),
];

export const createSaleValidator = [
  body('customer').isMongoId().withMessage('Valid customer ID required'),

  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be >= 0'),
  body('items.*.discount').optional().isFloat({ min: 0 }).withMessage('Item discount must be >= 0'),

  body('discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percent must be 0–100'),
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be >= 0'),

  body('deliveryFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Delivery fee must be >= 0'),

  body('isFreeDelivery')
    .optional()
    .isBoolean()
    .withMessage('isFreeDelivery must be boolean'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'cheque', 'city_ledger'])
    .withMessage('Invalid payment method'),
  body('paymentStatus')
    .optional()
    .isIn(['paid', 'partial', 'pending'])
    .withMessage('Invalid payment status'),
  body('amountPaid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be >= 0'),

  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes max 500 characters'),
  body('saleDate').optional().isISO8601().withMessage('Invalid date format'),
];
