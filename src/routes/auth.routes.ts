import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  loginValidator,
  registerValidator,
  changePasswordValidator,
  refreshTokenValidator,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/login', loginValidator, validate, authController.login.bind(authController));
router.post('/refresh-token', refreshTokenValidator, validate, authController.refreshToken.bind(authController));

// Protected routes
router.use(authenticate);

router.post('/logout', authController.logout.bind(authController));
router.get('/profile', authController.getProfile.bind(authController));
router.patch('/change-password', changePasswordValidator, validate, authController.changePassword.bind(authController));

// Admin-only: register new users
router.post(
  '/register',
  authorize('admin'),
  registerValidator,
  validate,
  authController.register.bind(authController)
);

export default router;
