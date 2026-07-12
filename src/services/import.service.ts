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
  { header: 'Customer Name', key: 'customerName', width: 22 },
  { header: 'Customer Phone', key: 'customerPhone', width: 16 },
  { header: 'Customer WhatsApp', key: 'customerWhatsapp', width: 16 },
  { header: 'Customer Email', key: 'customerEmail', width: 22 },
  { header: 'Customer Address', key: 'customerAddress', width: 28 },
  { header: 'Product SKU', key: 'productSku', width: 16 },
  { header: 'Quantity', key: 'quantity', width: 10 },
  { header: 'Unit Price', key: 'unitPrice', width: 12 },
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
  customerName?: string;
  customerPhone?: string;
  customerWhatsapp?: string;
  customerEmail?: string;
  customerAddress?: string;
  productSku?: string;
  quantity?: string;
  unitPrice?: string;
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
      customerName: 'Kasun Perera',
      customerPhone: '0771234567',
      customerWhatsapp: '0771234567',
      customerEmail: 'kasun@example.com',
      customerAddress: '123 Galle Road, Colombo',
      productSku: 'PRD-0001',
      quantity: 1,
      unitPrice: '',
      discount: '',
      deliveryFee: '',
      freeDelivery: 'N',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
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

  async importSales(buffer: Buffer, userId: string): Promise<SaleImportSummary> {
    const rows = await this.parseImportRows(buffer);
    const results: SaleImportRowResult[] = [];

    for (const raw of rows) {
      try {
        const result = await this.importRow(raw, userId);
        results.push(result);
      } catch (error) {
        results.push({
          row: raw.row,
          status: 'skipped',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    return { totalRows: rows.length, created, skipped: rows.length - created, results };
  }

  private async importRow(raw: RawImportRow, userId: string): Promise<SaleImportRowResult> {
    const missing: string[] = [];
    if (!raw.customerName) missing.push('Customer Name');
    if (!raw.customerPhone) missing.push('Customer Phone');
    if (!raw.productSku) missing.push('Product SKU');
    if (!raw.quantity) missing.push('Quantity');
    if (missing.length > 0) {
      return { row: raw.row, status: 'skipped', error: `Missing required field(s): ${missing.join(', ')}` };
    }

    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return { row: raw.row, status: 'skipped', error: `Invalid Quantity: "${raw.quantity}"` };
    }

    const sku = raw.productSku!.trim().toUpperCase();
    const product = await Product.findOne({ sku, isActive: true });
    if (!product) {
      return { row: raw.row, status: 'skipped', error: `Product SKU "${sku}" not found or inactive` };
    }

    const phone = raw.customerPhone!.trim();
    const existingCustomer = await Customer.findOne({ phone, isActive: true });
    const customer = existingCustomer
      ? existingCustomer
      : await customerService.create({
          name: raw.customerName!.trim(),
          phone,
          whatsapp: raw.customerWhatsapp?.trim(),
          email: raw.customerEmail?.trim(),
          address: raw.customerAddress?.trim(),
          createdBy: userId,
        });

    const paymentMethod = raw.paymentMethod?.trim().toLowerCase();
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return { row: raw.row, status: 'skipped', error: `Invalid Payment Method: "${raw.paymentMethod}"` };
    }

    const paymentStatus = raw.paymentStatus?.trim().toLowerCase();
    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return { row: raw.row, status: 'skipped', error: `Invalid Payment Status: "${raw.paymentStatus}"` };
    }

    if (raw.saleDate) {
      const parsed = new Date(raw.saleDate);
      if (isNaN(parsed.getTime())) {
        return { row: raw.row, status: 'skipped', error: `Invalid Sale Date: "${raw.saleDate}"` };
      }
    }

    const dto: CreateSaleDto = {
      customer: String(customer._id),
      items: [
        {
          product: String(product._id),
          quantity,
          unitPrice: raw.unitPrice ? Number(raw.unitPrice) : undefined,
          discount: raw.discount ? Number(raw.discount) : undefined,
        },
      ],
      deliveryFee: raw.deliveryFee ? Number(raw.deliveryFee) : undefined,
      isFreeDelivery: raw.freeDelivery?.trim().toUpperCase() === 'Y',
      paymentMethod: paymentMethod as CreateSaleDto['paymentMethod'],
      paymentStatus: paymentStatus as CreateSaleDto['paymentStatus'],
      amountPaid: raw.amountPaid ? Number(raw.amountPaid) : undefined,
      notes: raw.notes?.trim(),
      saleDate: raw.saleDate?.trim(),
    };

    const sale = await saleService.createSale(dto, userId);
    return { row: raw.row, status: 'created', invoiceNumber: sale.invoiceNumber, customerName: customer.name };
  }
}

export const importService = new ImportService();
