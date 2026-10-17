/**
 * Core business logic and calculations for 2-wheeler sales and service shop
 */

export interface BikeAlertParams {
  lastServiceDate: string; // ISO format YYYY-MM-DD
  currentKm: number;
  lastServiceKm: number;
  insuranceExpiryDate: string; // ISO format YYYY-MM-DD
  serviceIntervalKm?: number; // default 3000
  serviceIntervalDays?: number; // default 90
  referenceDate?: Date;
}

export interface AlertResult {
  serviceDueStatus: 'NORMAL' | 'UPCOMING' | 'OVERDUE';
  daysSinceService: number;
  kmSinceService: number;
  serviceAlertReason: string;
  insuranceStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  daysToInsuranceExpiry: number;
}

/**
 * Evaluates automated service alert and insurance expiry for customer two-wheelers
 */
export function calculateAutomatedServiceAlerts(params: BikeAlertParams): AlertResult {
  const refDate = params.referenceDate || new Date();
  const lastServ = new Date(params.lastServiceDate);
  const insExp = new Date(params.insuranceExpiryDate);

  const diffTimeService = refDate.getTime() - lastServ.getTime();
  const daysSinceService = Math.max(0, Math.floor(diffTimeService / (1000 * 60 * 60 * 24)));

  const kmSinceService = Math.max(0, params.currentKm - params.lastServiceKm);
  const maxIntervalKm = params.serviceIntervalKm ?? 3000;
  const maxIntervalDays = params.serviceIntervalDays ?? 90;

  let serviceDueStatus: 'NORMAL' | 'UPCOMING' | 'OVERDUE' = 'NORMAL';
  let serviceAlertReason = 'Vehicle routine checkup in good standing';

  if (kmSinceService >= maxIntervalKm || daysSinceService >= maxIntervalDays) {
    serviceDueStatus = 'OVERDUE';
    serviceAlertReason = `Service overdue: ${kmSinceService} km / ${daysSinceService} days since last maintenance (Limit: ${maxIntervalKm} km / ${maxIntervalDays} days)`;
  } else if (kmSinceService >= maxIntervalKm * 0.85 || daysSinceService >= maxIntervalDays * 0.85) {
    serviceDueStatus = 'UPCOMING';
    serviceAlertReason = `Service due soon: ${kmSinceService} km / ${daysSinceService} days elapsed`;
  }

  const diffTimeIns = insExp.getTime() - refDate.getTime();
  const daysToInsuranceExpiry = Math.ceil(diffTimeIns / (1000 * 60 * 60 * 24));

  let insuranceStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' = 'VALID';
  if (daysToInsuranceExpiry < 0) {
    insuranceStatus = 'EXPIRED';
  } else if (daysToInsuranceExpiry <= 20) {
    insuranceStatus = 'EXPIRING_SOON';
  }

  return {
    serviceDueStatus,
    daysSinceService,
    kmSinceService,
    serviceAlertReason,
    insuranceStatus,
    daysToInsuranceExpiry,
  };
}

/**
 * Calculates stock aging and recommended pricing action for bikes in showroom lot
 */
export function calculateStockAging(dateAdded: string, referenceDate?: Date) {
  const ref = referenceDate || new Date();
  const added = new Date(dateAdded);
  const diffTime = ref.getTime() - added.getTime();
  const daysInInventory = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  let agingCategory: 'FRESH' | 'MODERATE' | 'SLOW' | 'CRITICAL' = 'FRESH';
  let recommendation = 'Standard retail pricing';

  if (daysInInventory > 60) {
    agingCategory = 'CRITICAL';
    recommendation = 'Price reduction / Special promotion recommended to avoid holding cost';
  } else if (daysInInventory > 30) {
    agingCategory = 'SLOW';
    recommendation = 'Feature in weekend showcase / Highlight financing deals';
  } else if (daysInInventory > 14) {
    agingCategory = 'MODERATE';
    recommendation = 'Active showroom display';
  }

  return { daysInInventory, agingCategory, recommendation };
}

/**
 * Calculates gross profit and net margin percentage for pre-owned bike sale
 */
export function calculateBikeMargin(purchasePrice: number, refurbCost: number, sellingPrice: number) {
  const totalCost = purchasePrice + refurbCost;
  const grossProfit = sellingPrice - totalCost;
  const marginPercentage = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

  return {
    totalCost,
    grossProfit,
    marginPercentage: Number(marginPercentage.toFixed(2)),
  };
}

/**
 * Standard EMI calculation for two-wheeler financing
 * P = Principal, r = annual interest rate %, n = tenure in months
 */
export function calculateBikeEMI(price: number, downPayment: number, annualRatePct: number, tenureMonths: number) {
  const principal = Math.max(0, price - downPayment);
  if (principal === 0 || tenureMonths <= 0) {
    return {
      principal: 0,
      monthlyEmi: 0,
      totalInterest: 0,
      totalAmountPayable: downPayment,
    };
  }

  const monthlyRate = annualRatePct / (12 * 100);
  if (monthlyRate === 0) {
    const emi = Math.round(principal / tenureMonths);
    return {
      principal,
      monthlyEmi: emi,
      totalInterest: 0,
      totalAmountPayable: principal + downPayment,
    };
  }

  const emi = Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );

  const totalPayment = emi * tenureMonths;
  const totalInterest = Math.max(0, totalPayment - principal);

  return {
    principal,
    monthlyEmi: emi,
    totalInterest,
    totalAmountPayable: totalPayment + downPayment,
  };
}

/**
 * Service Job Card invoice calculation with labor, parts, tax and discount
 */
export interface ServiceBillParams {
  laborCharges: number;
  parts: { partId: string; name: string; quantity: number; unitPrice: number }[];
  taxRatePercent?: number; // e.g. 18%
  discountAmount?: number;
}

export function calculateServiceInvoice(params: ServiceBillParams) {
  const partsSubtotal = params.parts.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const preTaxSubtotal = Math.max(0, params.laborCharges + partsSubtotal - (params.discountAmount || 0));
  const taxRate = params.taxRatePercent !== undefined ? params.taxRatePercent : 18;
  const taxAmount = Math.round((preTaxSubtotal * taxRate) / 100);
  const grandTotal = preTaxSubtotal + taxAmount;

  return {
    laborCharges: params.laborCharges,
    partsSubtotal,
    discountAmount: params.discountAmount || 0,
    preTaxSubtotal,
    taxRate,
    taxAmount,
    grandTotal,
  };
}
