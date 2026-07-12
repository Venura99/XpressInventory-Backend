import { body } from 'express-validator';

const COURIERS = ['sl_post', 'koombiyo', 'domex', 'pronto', 'citypak', 'other'];
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
  body('courierChargeToCustomer').optional().isFloat({ min: 0 }).withMessage('Must be a non-negative number'),
  body('actualCourierCost')
    .isFloat({ min: 0 })
    .withMessage('Actual courier cost is required and must be a non-negative number'),
  body('isCOD').optional().isBoolean().withMessage('isCOD must be a boolean'),
  body('codAmountExpected')
    .if((_value, { req }) => req.body.isCOD === true || req.body.isCOD === 'true')
    .isFloat({ min: 0 })
    .withMessage('COD amount expected is required when isCOD is true'),
];

export const updateDeliveryValidator = [
  body('courierCompany').optional().isIn(COURIERS).withMessage('Invalid courier'),
  body('trackingNumber').optional().trim().notEmpty().isLength({ max: 100 }),
  body('deliveryAddress').optional().trim().notEmpty().isLength({ max: 500 }),
  body('estimatedDelivery').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('courierChargeToCustomer').optional().isFloat({ min: 0 }).withMessage('Must be a non-negative number'),
  body('actualCourierCost').optional().isFloat({ min: 0 }).withMessage('Must be a non-negative number'),
  body('isCOD').optional().isBoolean().withMessage('isCOD must be a boolean'),
  body('codAmountExpected').optional().isFloat({ min: 0 }).withMessage('Must be a non-negative number'),
];

export const updateStatusValidator = [
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('note').optional().trim().isLength({ max: 500 }),
  body('returnShippingCost')
    .if(body('status').equals('returned'))
    .isFloat({ min: 0 })
    .withMessage('Return shipping cost is required when marking a delivery as returned'),
  body('returnReason')
    .if(body('status').equals('returned'))
    .trim()
    .notEmpty()
    .withMessage('Return reason is required when marking a delivery as returned')
    .isLength({ max: 500 }),
];

export const recordRemittanceValidator = [
  body('amountRemitted')
    .isFloat({ min: 0 })
    .withMessage('Amount remitted is required and must be a non-negative number'),
  body('remittedDate').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().trim().isLength({ max: 500 }),
];
