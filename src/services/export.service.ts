import ExcelJS from 'exceljs';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Delivery } from '../models/Delivery';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F2937' },
};

function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  row.height = 20;
}

class ExportService {
  async generateSalesCustomersWorkbook(dateFrom?: Date, dateTo?: Date): Promise<ExcelJS.Workbook> {
    const salesMatch: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) range['$gte'] = dateFrom;
      if (dateTo) range['$lte'] = dateTo;
      salesMatch['saleDate'] = range;
    }

    const [sales, customers] = await Promise.all([
      Sale.find(salesMatch)
        .populate('customer', 'name phone')
        .sort({ saleDate: -1 })
        .lean(),
      Customer.find({ isActive: true }).sort({ name: 1 }).lean(),
    ]);

    const saleIds = sales.map((s) => s._id);
    const deliveries = await Delivery.find({ sale: { $in: saleIds } })
      .select('sale actualCourierCost status remittanceStatus isCOD')
      .lean();
    const deliveryBySale = new Map(deliveries.map((d) => [String(d.sale), d]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GadgetXpress';
    workbook.created = new Date();

    // ── Sales sheet ──────────────────────────────────────────────
    const salesSheet = workbook.addWorksheet('Sales');
    salesSheet.columns = [
      { header: 'Invoice #', key: 'invoice', width: 16 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Customer', key: 'customer', width: 22 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Items', key: 'items', width: 40 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Discount', key: 'discount', width: 12 },
      { header: 'Delivery Fee', key: 'deliveryFee', width: 12 },
      { header: 'Total Amount', key: 'total', width: 14 },
      { header: 'Item Cost', key: 'itemCost', width: 12 },
      { header: 'Gross Profit', key: 'grossProfit', width: 14 },
      { header: 'Courier Cost', key: 'courierCost', width: 12 },
      { header: 'COD Status', key: 'codStatus', width: 14 },
      { header: 'Delivery Status', key: 'deliveryStatus', width: 14 },
      { header: 'Payment Method', key: 'paymentMethod', width: 14 },
      { header: 'Payment Status', key: 'paymentStatus', width: 14 },
      { header: 'Returned', key: 'returned', width: 10 },
    ];
    styleHeaderRow(salesSheet.getRow(1));

    for (const sale of sales) {
      const customer = sale.customer as unknown as { name?: string; phone?: string } | null;
      const delivery = deliveryBySale.get(String(sale._id));
      salesSheet.addRow({
        invoice: sale.invoiceNumber,
        date: new Date(sale.saleDate).toLocaleDateString('en-LK'),
        customer: customer?.name ?? '—',
        phone: customer?.phone ?? '—',
        items: sale.items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
        subtotal: sale.subtotal,
        discount: sale.discountAmount,
        deliveryFee: sale.deliveryFee,
        total: sale.totalAmount,
        itemCost: sale.totalCost,
        grossProfit: sale.totalProfit,
        courierCost: delivery?.actualCourierCost ?? 0,
        codStatus: delivery?.isCOD ? delivery.remittanceStatus : 'N/A',
        deliveryStatus: delivery?.status ?? 'No delivery',
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        returned: sale.isReturned ? 'Yes' : 'No',
      });
    }

    const totalsRow = salesSheet.addRow({
      invoice: 'TOTAL',
      subtotal: sumBy(sales, (s) => s.subtotal),
      discount: sumBy(sales, (s) => s.discountAmount),
      deliveryFee: sumBy(sales, (s) => s.deliveryFee),
      total: sumBy(sales, (s) => s.totalAmount),
      itemCost: sumBy(sales, (s) => s.totalCost),
      grossProfit: sumBy(sales, (s) => s.totalProfit),
      courierCost: sales.reduce((acc, s) => acc + (deliveryBySale.get(String(s._id))?.actualCourierCost ?? 0), 0),
    });
    totalsRow.font = { bold: true };

    // ── Customers sheet ──────────────────────────────────────────
    const customersSheet = workbook.addWorksheet('Customers');
    customersSheet.columns = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'WhatsApp', key: 'whatsapp', width: 14 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Total Purchases', key: 'totalPurchases', width: 14 },
      { header: 'Total Spent', key: 'totalSpent', width: 14 },
      { header: 'Customer Since', key: 'createdAt', width: 14 },
    ];
    styleHeaderRow(customersSheet.getRow(1));

    for (const customer of customers) {
      customersSheet.addRow({
        name: customer.name,
        phone: customer.phone,
        whatsapp: customer.whatsapp ?? '—',
        address: customer.address ?? '—',
        totalPurchases: customer.totalPurchases,
        totalSpent: customer.totalSpent,
        createdAt: new Date(customer.createdAt).toLocaleDateString('en-LK'),
      });
    }

    return workbook;
  }
}

function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((acc, item) => acc + fn(item), 0);
}

export const exportService = new ExportService();
