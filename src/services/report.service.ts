import { Sale } from '../models/Sale';
import { Expense } from '../models/Expense';
import { Product } from '../models/Product';
import { Warranty } from '../models/Warranty';
import { Delivery } from '../models/Delivery';

class ReportService {
  // ── P&L ──────────────────────────────────────────────────────────────────────

  async getPnLReport(dateFrom: Date, dateTo: Date) {
    const salesMatch = { saleDate: { $gte: dateFrom, $lte: dateTo } };
    const expenseMatch = { date: { $gte: dateFrom, $lte: dateTo } };

    const [salesAgg, expensesAgg] = await Promise.all([
      Sale.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalAmount' },
            cost: { $sum: '$totalCost' },
            grossProfit: { $sum: '$totalProfit' },
            orders: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const s = salesAgg[0] ?? { revenue: 0, cost: 0, grossProfit: 0, orders: 0, avgOrderValue: 0 };
    const expenseTotal = (expensesAgg as { total: number }[]).reduce((acc, e) => acc + e.total, 0);
    const netProfit = s.grossProfit - expenseTotal;

    return {
      sales: {
        revenue: s.revenue,
        cost: s.cost,
        grossProfit: s.grossProfit,
        orders: s.orders,
        avgOrderValue: s.avgOrderValue,
      },
      expenses: {
        total: expenseTotal,
        byCategory: (expensesAgg as { _id: string; total: number; count: number }[]).map(e => ({
          category: e._id,
          total: e.total,
          count: e.count,
        })),
      },
      netProfit,
      grossMargin: s.revenue > 0 ? (s.grossProfit / s.revenue) * 100 : 0,
      netMargin: s.revenue > 0 ? (netProfit / s.revenue) * 100 : 0,
    };
  }

  // ── Sales breakdown ───────────────────────────────────────────────────────────

  async getSalesReport(dateFrom: Date, dateTo: Date) {
    const match = { saleDate: { $gte: dateFrom, $lte: dateTo } };

    const [paymentBreakdown, topProducts, topCustomers, dailyTrend] = await Promise.all([
      Sale.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.productName' },
            sku: { $first: '$items.sku' },
            qty: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
            profit: { $sum: '$items.profit' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: '$customer', orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customerDoc',
          },
        },
        { $unwind: { path: '$customerDoc', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$customerDoc.name', 'Unknown'] },
            phone: { $ifNull: ['$customerDoc.phone', ''] },
            orders: 1,
            revenue: 1,
          },
        },
      ]),
      Sale.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      paymentBreakdown: (paymentBreakdown as { _id: string; total: number; count: number }[]).map(p => ({
        method: p._id,
        total: p.total,
        count: p.count,
      })),
      topProducts: (topProducts as { _id: unknown; name: string; sku: string; qty: number; revenue: number; profit: number }[]).map(p => ({
        name: p.name,
        sku: p.sku,
        qty: p.qty,
        revenue: p.revenue,
        profit: p.profit,
      })),
      topCustomers: (topCustomers as { _id: unknown; name: string; phone: string; orders: number; revenue: number }[]).map(c => ({
        name: c.name,
        phone: c.phone,
        orders: c.orders,
        revenue: c.revenue,
      })),
      dailyTrend: (dailyTrend as { _id: string; revenue: number; orders: number }[]).map(d => ({
        date: d._id,
        revenue: d.revenue,
        orders: d.orders,
      })),
    };
  }

  // ── Inventory ─────────────────────────────────────────────────────────────────

  async getInventoryReport() {
    const [byCategory, totals] = await Promise.all([
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'cat',
          },
        },
        { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$cat.name', 'Uncategorised'] },
            count: { $sum: 1 },
            stockValue: { $sum: { $multiply: ['$stockQuantity', '$costPrice'] } },
            retailValue: { $sum: { $multiply: ['$stockQuantity', '$sellingPrice'] } },
            totalQty: { $sum: '$stockQuantity' },
            lowStock: {
              $sum: { $cond: [{ $lte: ['$stockQuantity', '$lowStockThreshold'] }, 1, 0] },
            },
            outOfStock: {
              $sum: { $cond: [{ $eq: ['$stockQuantity', 0] }, 1, 0] },
            },
          },
        },
        { $sort: { stockValue: -1 } },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStockValue: { $sum: { $multiply: ['$stockQuantity', '$costPrice'] } },
            totalRetailValue: { $sum: { $multiply: ['$stockQuantity', '$sellingPrice'] } },
            lowStockCount: {
              $sum: { $cond: [{ $lte: ['$stockQuantity', '$lowStockThreshold'] }, 1, 0] },
            },
            outOfStockCount: {
              $sum: { $cond: [{ $eq: ['$stockQuantity', 0] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const t = (totals as { totalProducts: number; totalStockValue: number; totalRetailValue: number; lowStockCount: number; outOfStockCount: number }[])[0]
      ?? { totalProducts: 0, totalStockValue: 0, totalRetailValue: 0, lowStockCount: 0, outOfStockCount: 0 };

    return {
      totalProducts: t.totalProducts,
      totalStockValue: t.totalStockValue,
      totalRetailValue: t.totalRetailValue,
      lowStockCount: t.lowStockCount,
      outOfStockCount: t.outOfStockCount,
      byCategory: (byCategory as { _id: string; count: number; stockValue: number; retailValue: number; totalQty: number; lowStock: number; outOfStock: number }[]).map(c => ({
        category: c._id,
        count: c.count,
        stockValue: c.stockValue,
        retailValue: c.retailValue,
        totalQty: c.totalQty,
        lowStock: c.lowStock,
        outOfStock: c.outOfStock,
      })),
    };
  }

  // ── Warranty & Delivery ───────────────────────────────────────────────────────

  async getWarrantyDeliveryReport(dateFrom: Date, dateTo: Date) {
    const deliveryMatch = { createdAt: { $gte: dateFrom, $lte: dateTo } };

    const [warrantyByStatus, deliveryByStatus, deliveryByCourier] = await Promise.all([
      Warranty.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Delivery.aggregate([
        { $match: deliveryMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Delivery.aggregate([
        { $match: deliveryMatch },
        {
          $group: {
            _id: '$courierCompany',
            count: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      warranties: (warrantyByStatus as { _id: string; count: number }[]).map(w => ({
        status: w._id,
        count: w.count,
      })),
      deliveries: {
        byStatus: (deliveryByStatus as { _id: string; count: number }[]).map(d => ({
          status: d._id,
          count: d.count,
        })),
        byCourier: (deliveryByCourier as { _id: string; count: number; delivered: number }[]).map(d => ({
          courier: d._id,
          count: d.count,
          delivered: d.delivered,
        })),
      },
    };
  }
}

export const reportService = new ReportService();
