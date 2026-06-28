import { body } from 'express-validator';

const COURIERS = ['koombiyo', 'domex', 'pronto', 'citypak', 'other'];
const STATUSES = ['pending', 'packed', 'dispatched', 'delivered', 'returned'];

export const createDeliveryValidator = [
  body('saleId').isMongoId().withMessage('Valid sale ID required'),
  body('courierCompany').isIn(COURIERS).withMessage(`Courier must be one of: ${COURIERS.join(', ')}`),
  body('trackingNumber')
    .trim()
    .notEmpty()
    .withMessage('Tracking number is required')
    .isLength({ max: 100 }),
  body('deliveryAddress')
    .trim()
    .notEmpty()
    .withMessage('Delivery address is required')
    .isLength({ max: 500 }),
  body('estimatedDelivery').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const updateDeliveryValidator = [
  body('courierCompany').optional().isIn(COURIERS).withMessage('Invalid courier'),
  body('trackingNumber').optional().trim().notEmpty().isLength({ max: 100 }),
  body('deliveryAddress').optional().trim().notEmpty().isLength({ max: 500 }),
  body('estimatedDelivery').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const updateStatusValidator = [
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('note').optional().trim().isLength({ max: 500 }),
];
