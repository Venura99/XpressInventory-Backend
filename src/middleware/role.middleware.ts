import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../models/User';
import { sendForbidden } from '../utils/response';

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, 'Not authenticated');
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      sendForbidden(res, `Role '${req.user.role}' is not authorized for this action`);
      return;
    }

    next();
  };
};
