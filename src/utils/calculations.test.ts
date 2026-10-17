import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAutomatedServiceAlerts,
  calculateStockAging,
  calculateBikeMargin,
  calculateBikeEMI,
  calculateServiceInvoice,
} from './calculations.ts';

test('calculateAutomatedServiceAlerts correctly identifies overdue and upcoming service', () => {
  const refDate = new Date('2026-10-16T00:00:00Z');

  // Case 1: Overdue on km
  const overdueKm = calculateAutomatedServiceAlerts({
    lastServiceDate: '2026-09-01',
    currentKm: 18500,
    lastServiceKm: 15000, // 3500 km elapsed (> 3000)
    insuranceExpiryDate: '2026-12-31',
    referenceDate: refDate,
  });
  assert.equal(overdueKm.serviceDueStatus, 'OVERDUE');
  assert.equal(overdueKm.kmSinceService, 3500);

  // Case 2: Overdue on days (>90 days)
  const overdueDays = calculateAutomatedServiceAlerts({
    lastServiceDate: '2026-06-01', // > 120 days
    currentKm: 12000,
    lastServiceKm: 11000,
    insuranceExpiryDate: '2026-12-31',
    referenceDate: refDate,
  });
  assert.equal(overdueDays.serviceDueStatus, 'OVERDUE');

  // Case 3: Upcoming (2700 km out of 3000 = 90%)
  const upcoming = calculateAutomatedServiceAlerts({
    lastServiceDate: '2026-09-20',
    currentKm: 12700,
    lastServiceKm: 10000,
    insuranceExpiryDate: '2026-10-25', // 9 days left -> EXPIRING_SOON
    referenceDate: refDate,
  });
  assert.equal(upcoming.serviceDueStatus, 'UPCOMING');
  assert.equal(upcoming.insuranceStatus, 'EXPIRING_SOON');

  // Case 4: Expired insurance
  const expiredIns = calculateAutomatedServiceAlerts({
    lastServiceDate: '2026-09-20',
    currentKm: 10500,
    lastServiceKm: 10000,
    insuranceExpiryDate: '2026-10-10', // 6 days ago -> EXPIRED
    referenceDate: refDate,
  });
  assert.equal(expiredIns.insuranceStatus, 'EXPIRED');
});

test('calculateStockAging categorizes lot aging accurately', () => {
  const ref = new Date('2026-10-16T00:00:00Z');

  const fresh = calculateStockAging('2026-10-10', ref);
  assert.equal(fresh.agingCategory, 'FRESH');
  assert.equal(fresh.daysInInventory, 6);

  const slow = calculateStockAging('2026-09-01', ref); // ~45 days
  assert.equal(slow.agingCategory, 'SLOW');

  const critical = calculateStockAging('2026-07-01', ref); // >100 days
  assert.equal(critical.agingCategory, 'CRITICAL');
});

test('calculateBikeMargin computes profit and percentage margin', () => {
  const result = calculateBikeMargin(65000, 5000, 85000);
  // Total cost: 70,000. Profit: 15,000. Margin: (15000 / 85000) * 100 = 17.65%
  assert.equal(result.totalCost, 70000);
  assert.equal(result.grossProfit, 15000);
  assert.equal(result.marginPercentage, 17.65);
});

test('calculateBikeEMI computes monthly installment accurately', () => {
  // Principal: 100,000 - 20,000 = 80,000 at 12% annual for 24 months
  const emi = calculateBikeEMI(100000, 20000, 12, 24);
  assert.equal(emi.principal, 80000);
  assert(emi.monthlyEmi > 3700 && emi.monthlyEmi < 3800);
  assert(emi.totalInterest > 10000);
  assert.equal(emi.totalAmountPayable, emi.monthlyEmi * 24 + 20000);
});

test('calculateServiceInvoice calculates parts, labor, discount and tax', () => {
  const invoice = calculateServiceInvoice({
    laborCharges: 800,
    parts: [
      { partId: 'sp1', name: 'Engine Oil 10W-40', quantity: 1, unitPrice: 450 },
      { partId: 'sp2', name: 'Brake Pads Set', quantity: 2, unitPrice: 350 },
    ],
    taxRatePercent: 18,
    discountAmount: 150,
  });

  // partsSubtotal = 450 + 700 = 1150
  // preTaxSubtotal = 800 + 1150 - 150 = 1800
  // tax = 18% of 1800 = 324
  // grandTotal = 1800 + 324 = 2124
  assert.equal(invoice.partsSubtotal, 1150);
  assert.equal(invoice.preTaxSubtotal, 1800);
  assert.equal(invoice.taxAmount, 324);
  assert.equal(invoice.grandTotal, 2124);
});
