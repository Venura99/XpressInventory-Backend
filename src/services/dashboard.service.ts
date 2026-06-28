import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { Warranty } from '../models/Warranty';
import { Expense } from '../models/Expense';

class DashboardService {
  async getData() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Auto-expire stale warranties before counting
    await Warranty.updateMany(
      { status: 'active', expiryDate: { $lt: now } },
      { $set: { status: 'expired' } }
    );

    const [
      todaySales,
      monthSales,
      monthExpensesAgg,
      outstandingAgg,
      lowStockCount,
      activeWarranties,
      salesTrend,
      paymentBreakdown,
      recentSales,
      lowStockProducts,
    ] = await Promise.all([
      // Today's revenue + order count
      Sale.aggregate<{ revenue: number; profit: number; orders: number }>([
        { $match: { saleDate: { $gte: todayStart } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, orders: { $sum: 1 } } },
      ]),

      // This month's revenue + profit
      Sale.aggregate<{ revenue: number; profit: number; orders: number }>([
        { $match: { saleDate: { $gte: monthStart } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' }, orders: { $sum: 1 } } },
      ]),

      // This month's expenses
      Expense.aggregate<{ total: number }>([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Outstanding balance (pending + partial sales)
      Sale.aggregate<{ total: number; count: number }>([
        { $match: { paymentStatus: { $in: ['pending', 'partial'] } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$totalAmount', '$amountPaid'] } },
            count: { $sum: 1 },
          },
        },
      ]),

      // Low stock + out-of-stock product count
      Product.countDocuments({
        isActive: true,
        $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      }),

      // Active warranty count
      Warranty.countDocuments({ status: 'active' }),

      // Daily sales for last 30 days
      Sale.aggregate<{ _id: string; revenue: number; profit: number; orders: number }>([
        { $match: { saleDate: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
            revenue: { $sum: '$totalAmount' },
            profit: { $sum: '$totalProfit' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Payment method breakdown this month
      Sale.aggregate<{ _id: string; total: number; count: number }>([
        { $match: { saleDate: { $gte: monthStart } } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // 5 most recent sales
      Sale.find()
        .populate('customer', 'name phone')
        .sort({ saleDate: -1 })
        .limit(5)
        .select('invoiceNumber customer totalAmount amountPaid saleDate paymentStatus paymentMethod')
        .lean(),

      // Most urgent low-stock products
      Product.find({
        isActive: true,
        $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      })
        .select('name sku stockQuantity lowStockThreshold')
        .sort({ stockQuantity: 1 })
        .limit(8)
        .lean(),
    ]);

    const monthRevenueVal = monthSales[0]?.revenue ?? 0;
    const monthExpensesVal = monthExpensesAgg[0]?.total ?? 0;

    return {
      kpis: {
        todayRevenue: todaySales[0]?.revenue ?? 0,
        todayOrders: todaySales[0]?.orders ?? 0,
        monthRevenue: monthRevenueVal,
        monthProfit: monthSales[0]?.profit ?? 0,
        monthExpenses: monthExpensesVal,
        netProfit: monthRevenueVal - monthExpensesVal,
        outstandingAmount: outstandingAgg[0]?.total ?? 0,
        outstandingCount: outstandingAgg[0]?.count ?? 0,
        lowStockCount,
        activeWarranties,
      },
      salesTrend: salesTrend.map((d) => ({
        date: d._id,
        revenue: d.revenue,
        profit: d.profit,
        orders: d.orders,
      })),
      paymentBreakdown: paymentBreakdown.map((d) => ({
        method: d._id,
        total: d.total,
        count: d.count,
      })),
      recentSales,
      lowStockProducts,
    };
  }
}

export const dashboardService = new DashboardService();
