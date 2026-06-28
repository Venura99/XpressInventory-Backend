import { body } from 'express-validator';

export const updateStatusValidator = [
  body('status')
    .isIn(['active', 'expired', 'claimed', 'voided'])
    .withMessage('Status must be one of: active, expired, claimed, voided'),
  body('claimNotes')
    .if(body('status').equals('claimed'))
    .notEmpty()
    .withMessage('Claim notes are required when marking as claimed')
    .bail()
    .isLength({ max: 1000 })
    .withMessage('Claim notes must not exceed 1000 characters'),
];
