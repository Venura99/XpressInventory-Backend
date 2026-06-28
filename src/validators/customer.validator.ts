import { body } from 'express-validator';

export const createCustomerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('phone').trim().notEmpty().withMessage('Phone number is required').isLength({ max: 20 }),
  body('whatsapp').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid email'),
  body('address').optional().trim().isLength({ max: 500 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const updateCustomerValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional().trim().notEmpty().isLength({ max: 20 }),
  body('whatsapp').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('address').optional().trim().isLength({ max: 500 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];
