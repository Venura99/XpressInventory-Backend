import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { deliveryService } from '../services/delivery.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { CourierCompany, DeliveryStatus } from '../models/Delivery';

export const getDeliveries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, status, courierCompany, remittanceStatus, sortField, sortOrder } =
      req.query;

    const { deliveries, pagination } = await deliveryService.findAll({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      status: status as string,
      courierCompany: courierCompany as string,
      remittanceStatus: remittanceStatus as string,
      sortField: sortField as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    sendSuccess(res, deliveries, 'Deliveries retrieved', 200, pagination);
  } catch (error) {
    next(error);
  }
};

export const getDelivery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const delivery = await deliveryService.findById(req.params['id']);
    sendSuccess(res, delivery, 'Delivery retrieved');
  } catch (error) {
    next(error);
  }
};

export const getCodSummary = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await deliveryService.getCodSummary();
    sendSuccess(res, summary, 'COD summary retrieved');
  } catch (error) {
    next(error);
  }
};

export const createDelivery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      saleId,
      courierCompany,
      trackingNumber,
      deliveryAddress,
      estimatedDelivery,
      notes,
      courierChargeToCustomer,
      actualCourierCost,
      isCOD,
      codAmountExpected,
    } = req.body;

    const delivery = await deliveryService.create({
      saleId,
      courierCompany: courierCompany as CourierCompany,
      trackingNumber,
      deliveryAddress,
      estimatedDelivery,
      notes,
      courierChargeToCustomer,
      actualCourierCost,
      isCOD,
      codAmountExpected,
      userId: req.user!.id,
    });

    sendCreated(res, delivery, 'Delivery created');
  } catch (error) {
    next(error);
  }
};

export const updateDelivery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      courierCompany,
      trackingNumber,
      deliveryAddress,
      estimatedDelivery,
      notes,
      courierChargeToCustomer,
      actualCourierCost,
      isCOD,
      codAmountExpected,
    } = req.body;
    const delivery = await deliveryService.update(req.params['id'], {
      courierCompany: courierCompany as CourierCompany | undefined,
      trackingNumber,
      deliveryAddress,
      estimatedDelivery,
      notes,
      courierChargeToCustomer,
      actualCourierCost,
      isCOD,
      codAmountExpected,
    });
    sendSuccess(res, delivery, 'Delivery updated');
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, note, returnShippingCost, returnReason } = req.body;
    const returnDetails =
      status === 'returned' ? { returnShippingCost: Number(returnShippingCost), returnReason } : undefined;

    const delivery = await deliveryService.updateStatus(
      req.params['id'],
      status as DeliveryStatus,
      note,
      req.user!.id,
      returnDetails
    );
    sendSuccess(res, delivery, 'Status updated');
  } catch (error) {
    next(error);
  }
};

export const recordRemittance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { amountRemitted, remittedDate, notes } = req.body;
    const delivery = await deliveryService.recordRemittance(req.params['id'], {
      amountRemitted: Number(amountRemitted),
      remittedDate,
      notes,
    });
    sendSuccess(res, delivery, 'Remittance recorded');
  } catch (error) {
    next(error);
  }
};

export const deleteDelivery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deliveryService.delete(req.params['id']);
    sendSuccess(res, null, 'Delivery deleted');
  } catch (error) {
    next(error);
  }
};
