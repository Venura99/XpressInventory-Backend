import ExcelJS from 'exceljs';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { customerService } from './customer.service';
import { saleService, CreateSaleDto } from './sale.service';

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

const TEMPLATE_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'Order ID', key: 'orderId', width: 12 },
  { header: 'Customer Name', key: 'customerName', width: 22 },
  { header: 'Customer Phone', key: 'customerPhone', width: 16 },
  { header: 'Customer WhatsApp', key: 'customerWhatsapp', width: 16 },
  { header: 'Customer Email', key: 'customerEmail', width: 22 },
  { header: 'Customer Address', key: 'customerAddress', width: 28 },
  { header: 'Product SKU', key: 'productSku', width: 16 },
  { header: 'Quantity', key: 'quantity', width: 10 },
  { header: 'Unit Price', key: 'unitPrice', width: 12 },
  { header: 'Cost Price', key: 'costPrice', width: 12 },
  { header: 'Discount', key: 'discount', width: 12 },
  { header: 'Delivery Fee', key: 'deliveryFee', width: 12 },
  { header: 'Free Delivery (Y/N)', key: 'freeDelivery', width: 16 },
  { header: 'Payment Method', key: 'paymentMethod', width: 16 },
  { header: 'Payment Status', key: 'paymentStatus', width: 16 },
  { header: 'Amount Paid', key: 'amountPaid', width: 14 },
  { header: 'Sale Date', key: 'saleDate', width: 14 },
  { header: 'Notes', key: 'notes', width: 24 },
];

interface RawImportRow {
  row: number;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  customerWhatsapp?: string;
  customerEmail?: string;
  customerAddress?: string;
  productSku?: string;
  quantity?: string;
  unitPrice?: string;
  costPrice?: string;
  discount?: string;
  deliveryFee?: string;
  freeDelivery?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  amountPaid?: string;
  saleDate?: string;
  notes?: string;
}

export interface SaleImportRowResult {
  row: number;
  rows?: number[];
  status: 'created' | 'skipped';
  invoiceNumber?: string;
  customerName?: string;
  error?: string;
}

export interface SaleImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  results: SaleImportRowResult[];
}

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'cheque', 'city_ledger'];
const PAYMENT_STATUSES = ['paid', 'partial', 'pending'];

function cellText(cell: ExcelJS.Cell): string | undefined {
  const value = cell.value;
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') {
    const obj = value as unknown as { text?: unknown; result?: unknown };
    if (obj.text !== undefined) return String(obj.text).trim() || undefined;
    if (obj.result !== undefined) return String(obj.result).trim() || undefined;
  }
  const text = String(value).trim();
  return text || undefined;
}

class ImportService {
  generateSalesImportTemplate(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GadgetXpress';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sales Import');
    sheet.columns = TEMPLATE_COLUMNS;
    styleHeaderRow(sheet.getRow(1));

    sheet.addRow({
      orderId: '',
      customerName: 'Kasun Perera',
      customerPhone: '0771234567',
      customerWhatsapp: '0771234567',
      customerEmail: 'kasun@example.com',
      customerAddress: '123 Galle Road, Colombo',
      productSku: 'PRD-0001',
      quantity: 1,
      unitPrice: 1500,
      costPrice: '',
      discount: '',
      deliveryFee: '',
      freeDelivery: 'N',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      amountPaid: '',
      saleDate: '2026-01-15',
      notes: '',
    });

    // Combo example: two rows sharing the same Order ID become ONE sale with two
    // real line items, so stock is deducted from each actual product SKU —
    // no separate "combo" product needed. Only the first row of a group carries
    // the sale-level fields (delivery fee, payment info, etc.); leave those blank
    // on the following rows.
    sheet.addRow({
      orderId: 'COMBO-1',
      customerName: 'Nimal Silva',
      customerPhone: '0779876543',
      customerWhatsapp: '',
      customerEmail: '',
      customerAddress: '45 Kandy Road, Kegalle',
      productSku: 'PRD-0001',
      quantity: 1,
      unitPrice: 1100,
      costPrice: 475,
      discount: '',
      deliveryFee: 276,
      freeDelivery: 'Y',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      amountPaid: '',
      saleDate: '2026-01-15',
      notes: 'Combo deal',
    });
    sheet.addRow({
      orderId: 'COMBO-1',
      customerName: '',
      customerPhone: '',
      customerWhatsapp: '',
      customerEmail: '',
      customerAddress: '',
      productSku: 'PRD-0002',
      quantity: 1,
      unitPrice: 900,
      costPrice: 650,
      discount: '',
      deliveryFee: '',
      freeDelivery: '',
      paymentMethod: '',
      paymentStatus: '',
      amountPaid: '',
      saleDate: '',
      notes: '',
    });

    return workbook;
  }

  private async parseImportRows(buffer: Buffer): Promise<RawImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const headerRow = sheet.getRow(1);
    const columnKeyByIndex = new Map<number, string>();
    headerRow.eachCell((cell, colNumber) => {
      const header = cellText(cell);
      const match = TEMPLATE_COLUMNS.find((c) => c.header === header);
      if (match) columnKeyByIndex.set(colNumber, match.key);
    });

    const rows: RawImportRow[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      if (row.cellCount === 0) continue;

      const raw: RawImportRow = { row: rowNumber };
      let hasData = false;
      row.eachCell((cell, colNumber) => {
        const key = columnKeyByIndex.get(colNumber);
        if (!key) return;
        const value = cellText(cell);
        if (value) hasData = true;
        (raw as unknown as Record<string, string | undefined>)[key] = value;
      });

      if (hasData) rows.push(raw);
    }
    return rows;
  }

  /**
   * Rows are grouped by a non-empty "Order ID" so a combo/bundle (multiple real
   * product SKUs sold together) becomes one Sale with one line item per SKU —
   * each SKU's own stock is deducted, rather than requiring a separate combo
   * product to exist. Rows with no Order ID each form their own single-item sale
   * (original behaviour), so existing sheets keep working unchanged.
   */
  private groupRows(rows: RawImportRow[]): RawImportRow[][] {
    const groups: RawImportRow[][] = [];
    const groupIndexByOrderId = new Map<string, number>();

    for (const raw of rows) {
      const orderId = raw.orderId?.trim();
      if (orderId) {
        const key = orderId.toUpperCase();
        const existingIndex = groupIndexByOrderId.get(key);
        if (existingIndex !== undefined) {
          groups[existingIndex].push(raw);
          continue;
        }
        groupIndexByOrderId.set(key, groups.length);
      }
      groups.push([raw]);
    }

    return groups;
  }

  async importSales(buffer: Buffer, userId: string): Promise<SaleImportSummary> {
    const rows = await this.parseImportRows(buffer);
    const groups = this.groupRows(rows);
    const results: SaleImportRowResult[] = [];

    for (const group of groups) {
      const rowNumbers = group.map((r) => r.row);
      try {
        const result = await this.importGroup(group, userId);
        results.push(result);
      } catch (error) {
        results.push({
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    return { totalRows: rows.length, created, skipped: results.length - created, results };
  }

  private async importGroup(group: RawImportRow[], userId: string): Promise<SaleImportRowResult> {
    const first = group[0];
    const rowNumbers = group.map((r) => r.row);
    const rowsSuffix = rowNumbers.length > 1 ? ` (rows ${rowNumbers.join(', ')})` : '';

    const missing: string[] = [];
    if (!first.customerName) missing.push('Customer Name');
    if (!first.customerPhone) missing.push('Customer Phone');
    if (!first.saleDate) missing.push('Sale Date');
    if (missing.length > 0) {
      return {
        row: rowNumbers[0],
        rows: rowNumbers.length > 1 ? rowNumbers : undefined,
        status: 'skipped',
        error: `Row ${rowNumbers[0]}: missing required field(s): ${missing.join(', ')}`,
      };
    }

    const items: { product: string; quantity: number; unitPrice: number; costPrice?: number; discount?: number }[] = [];

    for (const raw of group) {
      if (raw !== first && raw.customerPhone && raw.customerPhone.trim() !== first.customerPhone!.trim()) {
        return {
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: `Order ID "${first.orderId}" has mismatched Customer Phone between row ${first.row} and row ${raw.row}`,
        };
      }

      if (!raw.productSku) {
        return {
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: `Row ${raw.row}: missing required field(s): Product SKU`,
        };
      }
      if (!raw.quantity) {
        return {
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: `Row ${raw.row}: missing required field(s): Quantity`,
        };
      }
      if (!raw.unitPrice) {
        return {
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: `Row ${raw.row}: missing required field(s): Unit Price`,
        };
      }

      const quantity = Number(raw.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        return {
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: `Row ${raw.row}: invalid Quantity: "${raw.quantity}"`,
        };
      }

      const unitPrice = Number(raw.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return {
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: `Row ${raw.row}: invalid Unit Price: "${raw.unitPrice}"`,
        };
      }

      let costPrice: number | undefined;
      if (raw.costPrice) {
        costPrice = Number(raw.costPrice);
        if (!Number.isFinite(costPrice) || costPrice < 0) {
          return {
            row: rowNumbers[0],
            rows: rowNumbers.length > 1 ? rowNumbers : undefined,
            status: 'skipped',
            error: `Row ${raw.row}: invalid Cost Price: "${raw.costPrice}"`,
          };
        }
      }

      const sku = raw.productSku.trim().toUpperCase();
      const product = await Product.findOne({ sku, isActive: true });
      if (!product) {
        return {
          row: rowNumbers[0],
          rows: rowNumbers.length > 1 ? rowNumbers : undefined,
          status: 'skipped',
          error: `Row ${raw.row}: Product SKU "${sku}" not found or inactive`,
        };
      }

      items.push({
        product: String(product._id),
        quantity,
        unitPrice,
        costPrice,
        discount: raw.discount ? Number(raw.discount) : undefined,
      });
    }

    const phone = first.customerPhone!.trim();
    const existingCustomer = await Customer.findOne({ phone, isActive: true });
    const customer = existingCustomer
      ? existingCustomer
      : await customerService.create({
          name: first.customerName!.trim(),
          phone,
          whatsapp: first.customerWhatsapp?.trim(),
          email: first.customerEmail?.trim(),
          address: first.customerAddress?.trim(),
          createdBy: userId,
        });

    const paymentMethod = first.paymentMethod?.trim().toLowerCase();
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return {
        row: rowNumbers[0],
        rows: rowNumbers.length > 1 ? rowNumbers : undefined,
        status: 'skipped',
        error: `Row ${first.row}: invalid Payment Method: "${first.paymentMethod}"`,
      };
    }

    const paymentStatus = first.paymentStatus?.trim().toLowerCase();
    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return {
        row: rowNumbers[0],
        rows: rowNumbers.length > 1 ? rowNumbers : undefined,
        status: 'skipped',
        error: `Row ${first.row}: invalid Payment Status: "${first.paymentStatus}"`,
      };
    }

    const parsedSaleDate = new Date(first.saleDate!);
    if (isNaN(parsedSaleDate.getTime())) {
      return {
        row: rowNumbers[0],
        rows: rowNumbers.length > 1 ? rowNumbers : undefined,
        status: 'skipped',
        error: `Row ${first.row}: invalid Sale Date: "${first.saleDate}"${rowsSuffix}`,
      };
    }

    const dto: CreateSaleDto = {
      customer: String(customer._id),
      items,
      deliveryFee: first.deliveryFee ? Number(first.deliveryFee) : undefined,
      isFreeDelivery: first.freeDelivery?.trim().toUpperCase() === 'Y',
      paymentMethod: paymentMethod as CreateSaleDto['paymentMethod'],
      paymentStatus: paymentStatus as CreateSaleDto['paymentStatus'],
      amountPaid: first.amountPaid ? Number(first.amountPaid) : undefined,
      notes: first.notes?.trim(),
      saleDate: first.saleDate?.trim(),
    };

    const sale = await saleService.createSale(dto, userId);
    return {
      row: rowNumbers[0],
      rows: rowNumbers.length > 1 ? rowNumbers : undefined,
      status: 'created',
      invoiceNumber: sale.invoiceNumber,
      customerName: customer.name,
    };
  }
}

export const importService = new ImportService();
