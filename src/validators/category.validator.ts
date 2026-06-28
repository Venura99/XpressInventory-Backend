import { body } from 'express-validator';

export const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 200 }),
];

export const updateCategoryValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 200 }),
];
