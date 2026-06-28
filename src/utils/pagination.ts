import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
}

export const getPaginationOptions = (req: Request): PaginationOptions => {
  const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string, 10) || 20));
  const skip = (page - 1) * limit;

  const sortField = (req.query['sortField'] as string) || 'createdAt';
  const sortOrder = req.query['sortOrder'] === 'asc' ? 1 : -1;

  return { page, limit, skip, sort: { [sortField]: sortOrder } };
};
