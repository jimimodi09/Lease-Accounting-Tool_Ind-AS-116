const fs = require('fs');

// Simple mocks for browser APIs
global.window = global;

const Utils = eval(fs.readFileSync('./js/utils.js', 'utf8') + '; Utils');
const Calculator = eval(fs.readFileSync('./js/calculator.js', 'utf8') + '; Calculator');

const startDate = new Date(2025, 3, 1); // 01-Apr-2025
const endDate = new Date(2035, 2, 31); // 31-Mar-2035
const leaseTerm = 120; // 10 years
const paymentAmount = 100000;
const roi = 10;
const frequency = 'yearly';
const fyStartMonth = 4;
const paymentTiming = 'beginning';
const residualValue = 0;

const paymentDates = Calculator.generatePaymentDates(
  startDate, frequency, paymentTiming, leaseTerm, endDate, null
);

console.log("Payment Dates:", paymentDates.map(p => ({ d: p.date.toISOString().split('T')[0], per: p.period })));

const pvResult = Calculator.computePVSchedule({
  paymentDates, paymentAmount, roi, frequency, timing: paymentTiming,
  residualValue, varPayments: null, startDate
});

console.log("Total PV:", pvResult.totalPV);
console.log("PV Schedule:");
pvResult.schedule.forEach(r => console.log(`  Date: ${r.date.toISOString().split('T')[0]}, PMT: ${r.payment}, DF: ${r.discountFactor.toFixed(6)}, PV: ${r.pv}`));

const amortRows = Calculator.buildAmortSchedule({
  paymentDates, paymentAmount, roi, frequency, fyStartMonth,
  openingLiability: pvResult.totalPV, startDate, varPayments: null, paymentTiming, endDate
});

console.log("\nAmortisation Schedule:");
amortRows.forEach(r => {
  console.log(`  Row ${r.index}: Date=${r.date.toISOString().split('T')[0]}, FY=${r.fy}, Days=${r.days}, Open=${r.openBal}, Pmt=${r.payment}, Int=${r.interest}, Close=${r.closeBal}`);
});

