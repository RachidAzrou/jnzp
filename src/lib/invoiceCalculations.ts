import { InvoiceData } from "@/components/InvoicePDF";

export const calculateInvoiceAmounts = (data: InvoiceData): InvoiceData => {
  // Calculate amounts for each item
  const calculatedItems = data.items.map(item => {
    const netUnit = item.unit_price_ex_vat * (1 - item.discount_pct / 100);
    const amountExVat = Math.round(item.qty * netUnit * 100) / 100;
    const vatAmount = Math.round(amountExVat * item.vat_pct / 100 * 100) / 100;
    const amountIncVat = Math.round((amountExVat + vatAmount) * 100) / 100;

    return {
      ...item,
      amount_ex_vat: amountExVat,
      vat_amount: vatAmount,
      amount_inc_vat: amountIncVat,
    };
  });

  // Calculate totals
  const subtotalExVat = calculatedItems.reduce((sum, item) => sum + (item.amount_ex_vat || 0), 0);
  const totalVatAmount = calculatedItems.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
  const totalIncVat = subtotalExVat + totalVatAmount;

  // Determine VAT rate caption
  const uniqueVatRates = [...new Set(calculatedItems.map(item => item.vat_pct))];
  const vatRateCaption = uniqueVatRates.length === 1 ? `${uniqueVatRates[0]}%` : "Gemengd";

  return {
    ...data,
    items: calculatedItems,
    totals: {
      subtotal_ex_vat: Math.round(subtotalExVat * 100) / 100,
      vat_amount: Math.round(totalVatAmount * 100) / 100,
      total_inc_vat: Math.round(totalIncVat * 100) / 100,
      vat_rate_caption: vatRateCaption,
    },
  };
};

export const validateInvoiceData = (data: InvoiceData): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Items validation
  if (!data.items || data.items.length === 0) {
    errors.push("Minimaal 1 factuurregel vereist");
  }

  data.items.forEach((item, idx) => {
    if (item.qty <= 0) {
      errors.push(`Regel ${idx + 1}: Aantal moet groter zijn dan 0`);
    }
    if (item.unit_price_ex_vat < 0) {
      errors.push(`Regel ${idx + 1}: Prijs mag niet negatief zijn`);
    }
    if (item.discount_pct < 0 || item.discount_pct > 100) {
      errors.push(`Regel ${idx + 1}: Korting moet tussen 0 en 100% zijn`);
    }
    if (![0, 6, 21].includes(item.vat_pct)) {
      errors.push(`Regel ${idx + 1}: BTW-percentage moet 0, 6 of 21 zijn`);
    }
  });

  // Date validation
  const invoiceDate = new Date(data.invoice.date);
  const dueDate = new Date(data.invoice.due_date);
  if (dueDate < invoiceDate) {
    errors.push("Vervaldatum moet na factuurdatum liggen");
  }

  // Required fields for non-draft
  if (!data.insurer.name) {
    errors.push("Verzekeraarnaam is verplicht");
  }
  if (!data.dossier.display_id) {
    errors.push("Dossier-ID is verplicht");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
