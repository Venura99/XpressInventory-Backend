import { Sale } from '../models/Sale';

export const generateInvoiceNumber = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `GX-${year}${month}-`;

  const lastInvoice = await Sale.findOne(
    { invoiceNumber: new RegExp(`^${prefix}`) },
    { invoiceNumber: 1 },
    { sort: { invoiceNumber: -1 } }
  );

  let sequence = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};
